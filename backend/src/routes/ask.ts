import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { embedText } from '../lib/embeddings';
import { actionItems } from '../db/schema';

async function generateGeminiWithRetry(model: any, prompt: string, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: any) {
      if (error?.status === 503 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 5000;
        console.log(`Gemini returned 503. Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Gemini request failed after retries');
}

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { question, meetingId } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const queryEmbedding = await embedText(question);
    const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

    const result = await db.execute(sql`
      SELECT tc.chunk_text, tc.meeting_id, m.title,
             tc.embedding <=> ${embeddingLiteral}::vector AS distance
      FROM transcript_chunks tc
      JOIN meetings m ON m.id = tc.meeting_id
      WHERE (m.creator_id = ${userId}
        OR tc.meeting_id IN (
            SELECT meeting_id FROM meeting_participants WHERE user_id = ${userId}
        ))
        ${meetingId ? sql`AND tc.meeting_id = ${meetingId}` : sql``}
      ORDER BY distance ASC
      LIMIT 5
    `);

    const rows = (result as any).rows ?? (result as any);

    if (!rows || rows.length === 0) {
      return res.json({ answer: "I couldn't find anything relevant in your meetings.", sources: [] });
    }

    const context = rows.map((r: any, i: number) => `[${i + 1}] From "${r.title}":\n${r.chunk_text}`).join('\n\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `Answer the question using ONLY the context below. If the context doesn't contain the answer, say so honestly. Mention which meeting(s) the answer came from.

Context:
${context}

Question: ${question}`;

    const genResult = await generateGeminiWithRetry(model, prompt);
    const answer = genResult.response.text();

    const uniqueMeetingIds: string[] = [...new Set<string>(rows.map((r: any) => String(r.meeting_id)))];

    // Fetch action items for the source meetings (following the same
    // in-memory filter pattern used elsewhere in this codebase)
    const allActionItems = await db.select().from(actionItems);
    const actionItemsByMeeting: Record<string, any[]> = {};
    allActionItems
      .filter((item: any) => uniqueMeetingIds.includes(item.meetingId))
      .forEach((item: any) => {
        if (!actionItemsByMeeting[item.meetingId]) {
          actionItemsByMeeting[item.meetingId] = [];
        }
        actionItemsByMeeting[item.meetingId].push({
          task: item.task,
          owner: item.ownerName,
          priority: item.priority,
          status: item.status,
        });
      });

    const sources = uniqueMeetingIds.map((meetingId: string) => {
      const meetingRow = rows.find((r: any) => r.meeting_id === meetingId);
      return {
        meetingId,
        title: meetingRow.title,
        actionItems: actionItemsByMeeting[meetingId] || [],
      };
    });

    res.json({ answer, sources });
  } catch (error) {
    console.error('Error in /ask:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

export default router;