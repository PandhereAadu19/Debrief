import "dotenv/config";
import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import healthRouter from './routes/health';
import meetingsRouter from './routes/meetings';

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins: string[] = [
  'http://localhost:3000',
  'https://debrief-eight-lovat.vercel.app',
  process.env.FRONTEND_URL,
].filter((url): url is string => Boolean(url));

// Enable CORS for frontend
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Health check route (no auth required)
app.use('/api/health', healthRouter);

// Protected routes (auth required)
app.use('/api', authMiddleware);

// Meetings routes
app.use('/api/meetings', meetingsRouter);

// Global error handler - catches anything that slips through route-level handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. Please keep uploads under 25MB.' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});