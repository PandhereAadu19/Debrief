import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db';
import { meetings, meetingParticipants, actionItems } from '../db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import path from 'path';

const router = Router();

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
    fileSize: 100 * 1024 * 1024, // 100MB
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
async function processMeeting(meetingId: string, audioBuffer: Buffer, transcriptId?: string) {
  try {
    const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!ASSEMBLYAI_API_KEY || !GEMINI_API_KEY) {
      throw new Error('Missing API keys');
    }

    // Step 1: Upload audio to AssemblyAI (if no transcriptId provided)
    let uploadUrl: string | null = null;
    let currentTranscriptId = transcriptId;

    if (!currentTranscriptId) {
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

    // Step 2: Request transcript (if no transcriptId provided)
    if (!currentTranscriptId && uploadUrl) {
      const transcriptResponse = await axios.post(
        'https://api.assemblyai.com/v2/transcript',
        { audio_url: uploadUrl },
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
    }

    if (!currentTranscriptId) {
      throw new Error('Failed to get transcript ID');
    }

    // Step 3: Poll transcript status
    let transcriptText: string | null = null;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
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
      "priority": "low" or "medium" or "high"
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
          ownerUserId: null, // owner is just a name string, not a real user ID yet
          ownerName: item.owner || null, // save the owner name from Gemini
          priority: item.priority || 'medium',
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
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
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

    res.json(userMeetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
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

    res.json({
      ...meetingData,
      role: isCreator ? 'creator' : 'participant',
      actionItems: items,
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

    // Update status to uploading
    await db.update(meetings)
      .set({
        status: 'uploading',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    // Retry processing (if we have audioUrl, we can skip upload)
    // For now, we'll need the audio buffer again - this is a limitation
    // In a real implementation, you'd store the audio file or re-upload from client
    res.json({ message: 'Meeting retry initiated. Please re-upload the audio file.' });
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

export default router;
