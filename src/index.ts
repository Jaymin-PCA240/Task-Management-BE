import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { log } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

// Allow credentials for refresh cookie
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

// health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// routes
app.use('/api/auth', authRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

// start
const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => log.info(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    log.error('Failed to start', err);
    process.exit(1);
  }
};

start();
