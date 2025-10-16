import express, { Application } from 'express';
import { env } from './config/env';
import { connect } from './db/mongoose';
import { logger } from './utils/logger';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errors';
import routes from './routes';
import { createIndexes } from './models';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);

// Routes
app.use(routes);

// Error handler (must be last)
app.use(errorHandler);

// Bootstrap function
async function bootstrap(): Promise<void> {
  try {
    // Connect to MongoDB
    await connect();

    // Create database indexes
    await createIndexes();

    // Start server
    app.listen(env.PORT, () => {
      logger.info('Server started', {
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        corsOrigin: env.CORS_ORIGIN,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the application
bootstrap();

export default app;
