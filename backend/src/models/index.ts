import { logger } from '../utils/logger';
import { Product } from './Product';
import { Cart } from './Cart';
import { Reservation } from './Reservation';
import { Order } from './Order';
import { LowStockAlert } from './LowStockAlert';
import { IdempotencyKey } from './IdempotencyKey';

/**
 * Ensures all indexes are created for all models
 * Called at application startup
 */
export async function createIndexes(): Promise<void> {
  try {
    logger.info('Creating database indexes...');

    await Promise.all([
      Product.createIndexes(),
      Cart.createIndexes(),
      Reservation.createIndexes(),
      Order.createIndexes(),
      LowStockAlert.createIndexes(),
      IdempotencyKey.createIndexes(),
    ]);

    logger.info('Database indexes created successfully', {
      models: ['Product', 'Cart', 'Reservation', 'Order', 'LowStockAlert', 'IdempotencyKey'],
    });
  } catch (error) {
    logger.error('Failed to create database indexes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Export all models
export { Product, Cart, Reservation, Order, LowStockAlert, IdempotencyKey };
