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
  'https://debrief-backend-9xne.onrender.com',
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
