import { env } from './config/env';
import { connect } from './db/mongoose';
import { logger } from './utils/logger';
import { createIndexes } from './models';
import { gcService } from './services/gc.service';
import app from './app';

// Bootstrap function
async function bootstrap(): Promise<void> {
  try {
    // Connect to MongoDB
    await connect();

    // Create database indexes
    await createIndexes();

    // Start GC service (runs every 60 seconds)
    gcService.start(60000);

    // Start server
    app.listen(env.PORT, () => {
      logger.info('Server started', {
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        corsOrigin: env.CORS_ORIGIN,
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      gcService.stop();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      gcService.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
