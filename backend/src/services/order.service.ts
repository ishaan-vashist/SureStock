import mongoose from 'mongoose';
import { Product, Reservation, Order, Cart, LowStockAlert, IdempotencyKey } from '../models';
import { requestHash } from '../utils/hash';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errors';

interface ConfirmOrderParams {
  userId: string;
  reservationId: string;
  idempotencyKey: string;
}

interface ConfirmOrderResult {
  orderId: string;
  status: 'created';
}

class OrderService {
  /**
   * Confirm order with idempotency
   * Transactionally commits stock, creates order, clears cart, and creates low-stock alerts
   */
  async confirmOrder(params: ConfirmOrderParams): Promise<ConfirmOrderResult> {
    const { userId, reservationId, idempotencyKey } = params;
    const endpoint = '/api/checkout/confirm';

    // Compute request hash
    const hash = requestHash({ reservationId });

    // Check idempotency
    const idempotencyResult = await this.checkIdempotency(
      userId,
      endpoint,
      idempotencyKey,
      hash
    );

    if (idempotencyResult) {
      return idempotencyResult as ConfirmOrderResult;
    }

    // Create idempotency record (in_progress)
    await IdempotencyKey.create({
      userId,
      endpoint,
      key: idempotencyKey,
      requestHash: hash,
      status: 'in_progress',
    });

    let result: ConfirmOrderResult;

    try {
      // Execute transactional confirm
      result = await this.executeConfirm(userId, reservationId);

      // Update idempotency record to succeeded
      await IdempotencyKey.updateOne(
        { userId, endpoint, key: idempotencyKey },
        {
          status: 'succeeded',
          response: result,
        }
      );

      return result;
    } catch (error) {
      // Mark idempotency as failed
      await IdempotencyKey.updateOne(
        { userId, endpoint, key: idempotencyKey },
        { status: 'failed' }
      );

      throw error;
    }
  }

  /**
   * Check if request is idempotent
   * Returns stored response if key exists and hash matches
   */
  private async checkIdempotency(
    userId: string,
    endpoint: string,
    key: string,
    hash: string
  ): Promise<ConfirmOrderResult | null> {
    const existing = await IdempotencyKey.findOne({ userId, endpoint, key });

    if (!existing) {
      return null;
    }

    // If succeeded and hash matches, replay response
    if (existing.status === 'succeeded' && existing.requestHash === hash) {
      logger.info('Idempotent request detected - replaying response', {
        userId,
        endpoint,
        key,
      });
      return existing.response as unknown as ConfirmOrderResult;
    }

    // If hash differs, key is being reused for different payload
    if (existing.requestHash !== hash) {
      throw new AppError(
        409,
        'Idempotency key reused for different payload'
      );
    }

    // If in_progress or failed, let it proceed (could be retry after failure)
    return null;
  }

  /**
   * Execute the transactional confirm logic
   */
  private async executeConfirm(
    userId: string,
    reservationId: string
  ): Promise<ConfirmOrderResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Fetch and validate reservation
      const reservation = await Reservation.findById(reservationId).session(session);

      if (!reservation) {
        throw new AppError(404, 'Reservation not found');
      }

      if (reservation.userId !== userId) {
        throw new AppError(403, 'Reservation does not belong to user');
      }

      if (reservation.status !== 'active') {
        throw new AppError(410, 'Reservation is not active');
      }

      if (reservation.expiresAt <= new Date()) {
        throw new AppError(410, 'Reservation has expired');
      }

      // 2. Sort items by productId for deterministic ordering (reduce deadlocks)
      const sortedItems = [...reservation.items].sort((a, b) =>
        a.productId.toString().localeCompare(b.productId.toString())
      );

      // 3. Commit stock atomically for each item
      const lowStockProducts: Array<{ productId: mongoose.Types.ObjectId; stockAfter: number; threshold: number }> = [];

      for (const item of sortedItems) {
        const result = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            reserved: { $gte: item.qty },
            stock: { $gte: item.qty },
          },
          {
            $inc: {
              reserved: -item.qty,
              stock: -item.qty,
            },
          },
          { session, new: true }
        );

        if (!result) {
          throw new AppError(
            409,
            `Insufficient stock for ${item.name}. This should not happen after reservation.`
          );
        }

        // Check if stock fell below threshold
        if (result.stock < result.lowStockThreshold) {
          lowStockProducts.push({
            productId: result._id as mongoose.Types.ObjectId,
            stockAfter: result.stock,
            threshold: result.lowStockThreshold,
          });
        }
      }

      // 4. Calculate total
      const totalCents = reservation.items.reduce(
        (sum, item) => sum + item.priceCents * item.qty,
        0
      );

      // 5. Create order
      const order = await Order.create(
        [
          {
            userId,
            status: 'created',
            items: reservation.items,
            address: reservation.address,
            shippingMethod: reservation.shippingMethod,
            totalCents,
          },
        ],
        { session }
      );

      // 6. Mark reservation as consumed
      await Reservation.updateOne(
        { _id: reservationId },
        { status: 'consumed' },
        { session }
      );

      // 7. Clear user's cart
      await Cart.deleteOne({ userId }, { session });

      // 8. Create low-stock alerts
      if (lowStockProducts.length > 0) {
        await LowStockAlert.insertMany(
          lowStockProducts.map((p) => ({
            productId: p.productId,
            stockAfter: p.stockAfter,
            threshold: p.threshold,
            processed: false,
          })),
          { session }
        );

        logger.info('Low-stock alerts created', {
          count: lowStockProducts.length,
          products: lowStockProducts.map((p) => p.productId.toString()),
        });
      }

      // Commit transaction
      await session.commitTransaction();

      const orderId = (order[0]._id as mongoose.Types.ObjectId).toString();

      logger.info('Order confirmed successfully', {
        orderId,
        userId,
        reservationId,
        totalCents,
        itemCount: reservation.items.length,
      });

      return {
        orderId,
        status: 'created' as const,
      };
    } catch (error) {
      await session.abortTransaction();
      
      if (error instanceof Error) {
        logger.error('Order confirmation failed', {
          userId,
          reservationId,
          error: error.message,
        });
      }
      
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const orderService = new OrderService();
