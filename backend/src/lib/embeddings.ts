import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}

export async function embedText(text: string, maxRetries = 4): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error: any) {
      if (error?.status === 503 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 5000;
        console.log(`Embedding call got 503. Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Embedding request failed after retries');
}