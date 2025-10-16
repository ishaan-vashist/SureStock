import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const CONNECT_TIMEOUT_MS = 10000;
const SERVER_SELECTION_TIMEOUT_MS = 10000;
const SOCKET_TIMEOUT_MS = 45000;

export async function connect(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      connectTimeoutMS: CONNECT_TIMEOUT_MS,
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: SOCKET_TIMEOUT_MS,
    });

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function disconnect(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
