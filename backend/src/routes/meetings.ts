import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClerkClient } from '@clerk/backend';
import { db } from '../db';
import { meetings, meetingParticipants, actionItems } from '../db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import path from 'path';

const router = Router();

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

// Extend Express Request type for multer
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// Multer configuration for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.mp4'];
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
      'audio/mp4',
      'audio/x-m4a',
      'audio/m4a',
      'audio/ogg',
      'audio/webm',
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = allowedMimeTypes.includes(file.mimetype);
    const extOk = allowedExtensions.includes(ext);

    if (mimeOk || extOk) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only mp3, wav, m4a, and ogg are allowed. (Received mimetype: "${file.mimetype}", extension: "${ext}")`));
    }
  },
});

// Helper function to process meeting asynchronously
async function processMeeting(meetingId: string, audioBuffer?: Buffer, existingUploadUrl?: string) {
  try {
    const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!ASSEMBLYAI_API_KEY || !GEMINI_API_KEY) {
      throw new Error('Missing API keys');
    }

    // Step 1: Upload audio to AssemblyAI (if no transcriptId provided)
    let uploadUrl: string | null = existingUploadUrl || null;
    let currentTranscriptId: string | undefined;

    if (!uploadUrl && audioBuffer) {
      const uploadResponse = await axios.post(
        'https://api.assemblyai.com/v2/upload',
        audioBuffer,
        {
          headers: {
            'authorization': ASSEMBLYAI_API_KEY,
            'content-type': 'application/octet-stream',
          },
        }
      );
      uploadUrl = uploadResponse.data.upload_url;
    }

    if(!uploadUrl){
      throw new Error('No audio available to process (no buffer and no stored audioUrl)');
    }

    const transcriptResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: uploadUrl,
      },
      {
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
      }
    );
    currentTranscriptId = transcriptResponse.data.id;
      
    // Update meeting with transcript ID
    await db.update(meetings)
      .set({ 
        audioUrl: uploadUrl,
        status: 'transcribing',
        updatedAt: new Date()
      })
      .where(eq(meetings.id, meetingId));

    if (!currentTranscriptId) {
      throw new Error('Failed to get transcript ID');
    }

    // Step 3: Poll transcript status
    let transcriptText: string | null = null;
    const maxAttempts = 180; // 15 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${currentTranscriptId}`,
        {
          headers: {
            'authorization': ASSEMBLYAI_API_KEY,
          },
        }
      );

      const status = statusResponse.data.status;

      if (status === 'completed') {
        transcriptText = statusResponse.data.text;
        break;
      } else if (status === 'error') {
        throw new Error(`Transcription failed: ${statusResponse.data.error}`);
      }

      attempts++;
    }

    if (!transcriptText) {
      throw new Error('Transcription timed out');
    }

    // Step 4: Save transcript and update status
    await db.update(meetings)
      .set({ 
        transcript: transcriptText,
        status: 'summarizing',
        updatedAt: new Date()
      })
      .where(eq(meetings.id, meetingId));

    // Step 5: Send to Gemini for summarization
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const today = new Date().toISOString().split('T')[0]; // e.g. "2026-08-01"

    const prompt = `Analyze this meeting transcript and return ONLY valid JSON with this exact structure:
{
  "summary": "Brief summary of the meeting",
  "keyDecisions": "Key decisions made",
  "risks": "Risks identified",
  "openQuestions": "Open questions to address",
  "actionItems": [
    {
      "task": "Specific task description",
      "owner": "Name of person responsible (or null if not specified)",
      "priority": "low" or "medium" or "high",
      "dueDate": "YYYY-MM-DD format if a deadline is mentioned (convert relative dates like 'Thursday' or 'next week' to an actual date based on today being ${today}), or null if no deadline is mentioned"
    }
  ]
}

Transcript:
${transcriptText}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON from response (in case there's markdown formatting)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);

    // Step 6: Save summary data to meeting
    await db.update(meetings)
      .set({
        summary: parsedResponse.summary || null,
        keyDecisions: parsedResponse.keyDecisions || null,
        risks: parsedResponse.risks || null,
        openQuestions: parsedResponse.openQuestions || null,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    // Step 7: Insert action items
    if (parsedResponse.actionItems && Array.isArray(parsedResponse.actionItems)) {
      for (const item of parsedResponse.actionItems) {
        await db.insert(actionItems).values({
          meetingId,
          task: item.task || 'Untitled task',
          ownerUserId: null,
          ownerName: item.owner || null,
          priority: item.priority || 'medium',
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

  } catch (error) {
    console.error('Error processing meeting:', error);
    // Update meeting status to failed
    await db.update(meetings)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));
  }
}

// POST /api/meetings - Create a new meeting with audio upload
router.post('/', (req: Request, res: Response, next: Function) => {
  upload.single('audio')(req, res, (err: any) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Audio file is too large. Please keep recordings under 25MB.' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create meeting record
    const [newMeeting] = await db.insert(meetings).values({
      creatorId: userId,
      title,
      status: 'uploading',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Start async processing (don't await)
    processMeeting(newMeeting.id, audioFile.buffer).catch(error => {
      console.error('Async processing error:', error);
    });

    // Return immediately with the created meeting
    res.status(201).json(newMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// GET /api/meetings - Get all meetings for the user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get meetings where user is creator or participant
    const userMeetings = await db
      .select({
        id: meetings.id,
        creatorId: meetings.creatorId,
        title: meetings.title,
        status: meetings.status,
        summary: meetings.summary,
        createdAt: meetings.createdAt,
        updatedAt: meetings.updatedAt,
      })
      .from(meetings)
      .leftJoin(meetingParticipants, eq(meetings.id, meetingParticipants.meetingId))
      .where(
        or(
          eq(meetings.creatorId, userId),
          eq(meetingParticipants.userId, userId)
        )
      )
      .orderBy(desc(meetings.createdAt));

    // Get participant data for all meetings in a single query
    const meetingIds = userMeetings.map(m => m.id);
    let participantsData: any[] = [];
    if (meetingIds.length > 0) {
      participantsData = await db
        .select({
          meetingId: meetingParticipants.meetingId,
          email: meetingParticipants.email,
        })
        .from(meetingParticipants);
      
      // Filter in memory to match meetingIds (Drizzle limitation with IN clause)
      participantsData = participantsData.filter(p => meetingIds.includes(p.meetingId));
    }

    // Group participants by meetingId
    const participantsByMeeting: Record<string, string[]> = {};
    participantsData.forEach(p => {
      if (!participantsByMeeting[p.meetingId]) {
        participantsByMeeting[p.meetingId] = [];
      }
      participantsByMeeting[p.meetingId].push(p.email);
    });

    // Add participants to each meeting
    const meetingsWithParticipants = userMeetings.map(meeting => ({
      ...meeting,
      participants: participantsByMeeting[meeting.id] || []
    }));

    res.json(meetingsWithParticipants);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// GET /api/meetings/action-items - Get all action items across meetings the user can access
router.get('/action-items', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const items = await db
      .select({
        id: actionItems.id,
        meetingId: actionItems.meetingId,
        meetingTitle: meetings.title,
        task: actionItems.task,
        ownerName: actionItems.ownerName,
        priority: actionItems.priority,
        status: actionItems.status,
        createdAt: actionItems.createdAt,
        updatedAt: actionItems.updatedAt,
      })
      .from(actionItems)
      .innerJoin(meetings, eq(actionItems.meetingId, meetings.id))
      .leftJoin(meetingParticipants, eq(meetings.id, meetingParticipants.meetingId))
      .where(
        or(
          eq(meetings.creatorId, userId),
          eq(meetingParticipants.userId, userId)
        )
      )
      .orderBy(desc(actionItems.createdAt));

    res.json(items);
  } catch (error) {
    console.error('Error fetching action items:', error);
    res.status(500).json({ error: 'Failed to fetch action items' });
  }
});

// GET /api/meetings/:id - Get a specific meeting with action items
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetingId = req.params.id;

    // Check if user is creator or participant
    const meetingCheck = await db
      .select()
      .from(meetings)
      .leftJoin(meetingParticipants, eq(meetings.id, meetingParticipants.meetingId))
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meetingCheck || meetingCheck.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meetingRow = meetingCheck[0];
    const isCreator = meetingRow.meetings.creatorId === userId;
    const isParticipant = meetingRow.meeting_participants?.userId === userId;

    if (!isCreator && !isParticipant) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get meeting details
    const [meetingData] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    // Get action items
    const items = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.meetingId, meetingId))
      .orderBy(actionItems.createdAt);

    // Get participants (only for creator)
    let participants: any[] = [];
    if (isCreator) {
      participants = await db
        .select()
        .from(meetingParticipants)
        .where(eq(meetingParticipants.meetingId, meetingId))
        .orderBy(meetingParticipants.invitedAt);
    }

    res.json({
      ...meetingData,
      role: isCreator ? 'creator' : 'participant',
      actionItems: items,
      participants: isCreator ? participants : undefined,
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// POST /api/meetings/:id/retry - Retry a failed meeting
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetingId = req.params.id;

    // Check if user is creator
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can retry a meeting' });
    }

    if (meeting.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed meetings can be retried' });
    }

    if (!meeting.audioUrl) {
      return res.status(400).json({ error: 'No stored audio available for this meeting. Please create a new meeting instead.' });
    }

    // Update status to uploading
    await db.update(meetings)
      .set({
        status: 'uploading',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    // Actually re-trigger processing using the stored audio URL
    processMeeting(meetingId, undefined, meeting.audioUrl).catch(error => {
      console.error('Retry processing error:', error);
    });

    res.json({ message: 'Meeting retry initiated.' });
  } catch (error) {
    console.error('Error retrying meeting:', error);
    res.status(500).json({ error: 'Failed to retry meeting' });
  }
});

// PATCH /api/meetings/:id/action-items/:itemId - Update action item status
router.patch('/:id/action-items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetingId = req.params.id;
    const itemId = req.params.itemId;
    const { status } = req.body;

    if (!status || !['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, in_progress, or completed' });
    }

    // Check if user is creator or participant with canEdit
    const meetingCheck = await db
      .select({
        creatorId: meetings.creatorId,
        canEdit: meetingParticipants.canEdit,
        ownerUserId: actionItems.ownerUserId,
      })
      .from(meetings)
      .leftJoin(meetingParticipants, eq(meetings.id, meetingParticipants.meetingId))
      .leftJoin(actionItems, eq(actionItems.id, itemId))
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meetingCheck || meetingCheck.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const check = meetingCheck[0];
    const isCreator = check.creatorId === userId;
    const canEditParticipant = check.canEdit === true;
    const isOwner = check.ownerUserId === userId;

    if (!isCreator && !canEditParticipant && !isOwner) {
      return res.status(403).json({ error: 'You do not have permission to update this action item' });
    }

    // Update action item status
    const [updatedItem] = await db
      .update(actionItems)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(actionItems.id, itemId))
      .returning();

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating action item:', error);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

// POST /api/meetings/:id/participants - Invite a participant by email (creator-only)
router.post('/:id/participants', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetingId = req.params.id;
    const { email, canEdit = false } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user is the creator
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can invite participants' });
    }

    // Look up Clerk user by email
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      return res.status(404).json({ error: 'No user found with that email — they need to sign up first' });
    }

    const invitedUser = users.data[0];
    const invitedUserId = invitedUser.id;

    // Prevent inviting the creator themselves
    if (invitedUserId === userId) {
      return res.status(400).json({ error: 'You cannot invite yourself to the meeting' });
    }

    // Check if user is already a participant
    const existingParticipant = await db
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.userId, invitedUserId)
        )
      )
      .limit(1);

    if (existingParticipant.length > 0) {
      return res.status(400).json({ error: 'This user is already invited to the meeting' });
    }

    // Insert new participant
    const [newParticipant] = await db
      .insert(meetingParticipants)
      .values({
        meetingId,
        userId: invitedUserId,
        email,
        canEdit,
        invitedAt: new Date(),
      })
      .returning();

    res.status(201).json(newParticipant);
  } catch (error) {
    console.error('Error inviting participant:', error);
    res.status(500).json({ error: 'Failed to invite participant' });
  }
});

// DELETE /api/meetings/:id/participants/:userId - Remove a participant (creator-only)
router.delete('/:id/participants/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetingId = req.params.id;
    const participantUserId = req.params.userId;

    // Check if user is the creator
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can remove participants' });
    }

    // Delete the participant
    const deletedParticipant = await db
      .delete(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.userId, participantUserId)
        )
      )
      .returning();

    if (deletedParticipant.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json(deletedParticipant[0]);
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// PATCH /api/meetings/:id/participants/:userId - Toggle canEdit permission (creator-only)
router.patch('/:id/participants/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetingId = req.params.id;
    const participantUserId = req.params.userId;
    const { canEdit } = req.body;

    if (typeof canEdit !== 'boolean') {
      return res.status(400).json({ error: 'canEdit must be a boolean' });
    }

    // Check if user is the creator
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .limit(1);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can modify participant permissions' });
    }

    // Update the participant's canEdit permission
    const [updatedParticipant] = await db
      .update(meetingParticipants)
      .set({ canEdit })
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.userId, participantUserId)
        )
      )
      .returning();

    if (!updatedParticipant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json(updatedParticipant);
  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

export default router;
