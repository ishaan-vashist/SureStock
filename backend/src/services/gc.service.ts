import mongoose from 'mongoose';
import { Reservation, Product } from '../models';
import { logger } from '../utils/logger';

interface GCStats {
  expiredCount: number;
  releasedItems: number;
  errors: number;
}

class GCService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the GC job with specified interval
   * @param intervalMs - Interval in milliseconds (default: 60000 = 1 minute)
   */
  start(intervalMs: number = 60000): void {
    if (this.intervalId) {
      logger.info('GC service already running');
      return;
    }

    logger.info('Starting GC service', { intervalMs });

    // Run immediately on start
    this.runGC();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runGC();
    }, intervalMs);
  }

  /**
   * Stop the GC job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('GC service stopped');
    }
  }

  /**
   * Manually trigger a GC run
   * Returns statistics about the run
   */
  async runGC(): Promise<GCStats> {
    if (this.isRunning) {
      logger.debug('GC already running, skipping this cycle');
      return { expiredCount: 0, releasedItems: 0, errors: 0 };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const stats = await this.expireReservations();
      const duration = Date.now() - startTime;

      logger.info('GC cycle completed', {
        ...stats,
        durationMs: duration,
      });

      return stats;
    } catch (error) {
      logger.error('GC cycle failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { expiredCount: 0, releasedItems: 0, errors: 1 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Find and expire reservations that have passed their expiresAt time
   * Release reserved stock for each expired reservation
   */
  private async expireReservations(): Promise<GCStats> {
    const now = new Date();
    let expiredCount = 0;
    let releasedItems = 0;
    let errors = 0;

    // Find all active reservations that have expired
    const expiredReservations = await Reservation.find({
      status: 'active',
      expiresAt: { $lte: now },
    });

    if (expiredReservations.length === 0) {
      logger.debug('No expired reservations found');
      return { expiredCount: 0, releasedItems: 0, errors: 0 };
    }

    logger.info('Found expired reservations', {
      count: expiredReservations.length,
    });

    // Process each expired reservation in a transaction
    for (const reservation of expiredReservations) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Sort items by productId for deterministic ordering (reduce deadlocks)
        const sortedItems = [...reservation.items].sort((a, b) =>
          a.productId.toString().localeCompare(b.productId.toString())
        );

        // Release reserved stock for each item
        for (const item of sortedItems) {
          const result = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              reserved: { $gte: item.qty },
            },
            {
              $inc: { reserved: -item.qty },
            },
            { session, new: true }
          );

          if (!result) {
            logger.warn('Could not release reserved stock - product not found or insufficient reserved', {
              productId: item.productId.toString(),
              qty: item.qty,
              reservationId: (reservation._id as mongoose.Types.ObjectId).toString(),
            });
          } else {
            releasedItems++;
          }
        }

        // Mark reservation as expired
        await Reservation.updateOne(
          { _id: reservation._id },
          { status: 'expired' },
          { session }
        );

        await session.commitTransaction();
        expiredCount++;

        logger.debug('Reservation expired successfully', {
          reservationId: (reservation._id as mongoose.Types.ObjectId).toString(),
          userId: reservation.userId,
          itemCount: reservation.items.length,
        });
      } catch (error) {
        await session.abortTransaction();
        errors++;

        logger.error('Failed to expire reservation', {
          reservationId: (reservation._id as mongoose.Types.ObjectId).toString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        session.endSession();
      }
    }

    return { expiredCount, releasedItems, errors };
  }

  /**
   * Get current status of the GC service
   */
  getStatus(): { running: boolean; processing: boolean } {
    return {
      running: this.intervalId !== null,
      processing: this.isRunning,
    };
  }
}

export const gcService = new GCService();
