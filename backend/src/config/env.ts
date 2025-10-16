import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

interface EnvConfig {
  MONGODB_URI: string;
  PORT: number;
  CORS_ORIGIN: string;
  NODE_ENV: string;
}

function validateEnv(): EnvConfig {
  const required = ['MONGODB_URI', 'CORS_ORIGIN'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const port = parseInt(process.env.PORT || '8080', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid number between 1 and 65535');
  }

  return {
    MONGODB_URI: process.env.MONGODB_URI!,
    PORT: port,
    CORS_ORIGIN: process.env.CORS_ORIGIN!,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

export const env = validateEnv();
