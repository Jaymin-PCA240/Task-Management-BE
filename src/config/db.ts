import mongoose from 'mongoose';
import { log } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI || '';
  await mongoose.connect(uri);
  log.info('MongoDB connected');
};

