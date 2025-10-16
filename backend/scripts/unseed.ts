/**
 * Database unseeding script
 * 
 * Clears all data from the database:
 * - Products
 * - Carts
 * - Reservations
 * - Orders
 * - Low Stock Alerts
 * - Idempotency Keys
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  Product,
  Cart,
  Reservation,
  Order,
  LowStockAlert,
  IdempotencyKey,
} from '../src/models';
import { logger } from '../src/utils/logger';

dotenv.config();

async function unseed() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Clear all collections
    logger.info('Clearing all collections...');

    const results = await Promise.all([
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Reservation.deleteMany({}),
      Order.deleteMany({}),
      LowStockAlert.deleteMany({}),
      IdempotencyKey.deleteMany({}),
    ]);

    const summary = {
      products: results[0].deletedCount || 0,
      carts: results[1].deletedCount || 0,
      reservations: results[2].deletedCount || 0,
      orders: results[3].deletedCount || 0,
      lowStockAlerts: results[4].deletedCount || 0,
      idempotencyKeys: results[5].deletedCount || 0,
    };

    logger.info('Unseeding completed successfully', summary);
    console.log('\n🗑️  Unseed Summary:');
    console.log(`   Products deleted: ${summary.products}`);
    console.log(`   Carts deleted: ${summary.carts}`);
    console.log(`   Reservations deleted: ${summary.reservations}`);
    console.log(`   Orders deleted: ${summary.orders}`);
    console.log(`   Low Stock Alerts deleted: ${summary.lowStockAlerts}`);
    console.log(`   Idempotency Keys deleted: ${summary.idempotencyKeys}`);
  } catch (error) {
    logger.error('Unseeding failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
}

unseed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
