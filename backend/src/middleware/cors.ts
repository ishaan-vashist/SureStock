import cors from 'cors';
import { env } from '../config/env';

/**
 * CORS middleware configured to allow only the specified frontend origin
 */
export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-user-id', 'Idempotency-Key'],
});
