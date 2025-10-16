import mongoose from 'mongoose';
import { Cart, Product, Reservation } from '../models';
import { errors } from '../middleware/errors';
import { now, addMinutes } from '../utils/time';
import { logger } from '../utils/logger';

const RESERVATION_TTL_MINUTES = 10;
const ALLOWED_SHIPPING_METHODS = ['standard', 'express'];

interface ReserveInput {
  userId: string;
  address: Record<string, unknown>;
  shippingMethod: string;
}

interface ReserveResponse {
  reservationId: string;
  expiresAt: Date;
}

export class ReservationService {
  /**
   * Create a reservation with transactional stock holding
   * All-or-nothing: either all items are reserved or none
   */
  async createReservation(input: ReserveInput): Promise<ReserveResponse> {
    const { userId, address, shippingMethod } = input;

    // Validate shipping method
    if (!ALLOWED_SHIPPING_METHODS.includes(shippingMethod)) {
      throw errors.badRequest(
        `Invalid shipping method. Must be one of: ${ALLOWED_SHIPPING_METHODS.join(', ')}`
      );
    }

    // Validate address has required fields
    this.validateAddress(address);

    // Load user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      throw errors.badRequest('Cart is empty');
    }

    // Sort items by productId for deterministic ordering (reduces deadlocks)
    const sortedItems = [...cart.items].sort((a, b) =>
      a.productId.toString().localeCompare(b.productId.toString())
    );

    // Start a session for transaction
    const session = await mongoose.startSession();

    try {
      let reservation: any;

      await session.withTransaction(async () => {
        // Step 1: Try to reserve stock for all items atomically
        const reservationItems = [];

        for (const cartItem of sortedItems) {
          const productId = cartItem.productId;
          const qty = cartItem.qty;

          // Fetch product to get current values
          const product = await Product.findById(productId).session(session);
          if (!product) {
            throw errors.badRequest(`Product ${productId} not found`);
          }

          // Check if enough stock is available
          const available = product.stock - product.reserved;
          if (available < qty) {
            throw errors.conflict(
              `Insufficient stock for ${product.name}. Available: ${available}, Requested: ${qty}`
            );
          }

          // Perform conditional atomic update to reserve stock
          const updateResult = await Product.updateOne(
            {
              _id: productId,
              $expr: { $gte: [{ $subtract: ['$stock', '$reserved'] }, qty] },
            },
            {
              $inc: { reserved: qty },
            }
          ).session(session);

          // Check if update succeeded
          if (updateResult.matchedCount === 0) {
            logger.warn('Failed to reserve stock - race condition detected', {
              productId: productId.toString(),
              qty,
            });
            throw errors.conflict(
              `Unable to reserve ${product.name}. Stock may have been claimed by another user.`
            );
          }

          // Add item snapshot to reservation
          reservationItems.push({
            productId: product._id,
            sku: product.sku,
            name: product.name,
            priceCents: product.priceCents,
            qty,
          });
        }

        // Step 2: Create reservation document
        const expiresAt = addMinutes(now(), RESERVATION_TTL_MINUTES);

        const [newReservation] = await Reservation.create(
          [
            {
              userId,
              status: 'active',
              items: reservationItems,
              address,
              shippingMethod,
              expiresAt,
            },
          ],
          { session }
        );

        reservation = newReservation;

        logger.info('Reservation created successfully', {
          reservationId: reservation._id.toString(),
          userId,
          itemCount: reservationItems.length,
          expiresAt,
        });
      });

      return {
        reservationId: reservation._id.toString(),
        expiresAt: reservation.expiresAt,
      };
    } catch (error) {
      logger.error('Reservation failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Validate address has required fields
   */
  private validateAddress(address: Record<string, unknown>): void {
    const requiredFields = ['name', 'phone', 'line1', 'city', 'state', 'pincode'];
    const missing = requiredFields.filter((field) => !address[field]);

    if (missing.length > 0) {
      throw errors.badRequest(`Missing required address fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Get reservation by ID
   */
  async getReservation(reservationId: string, userId: string) {
    const reservation = await Reservation.findOne({
      _id: reservationId,
      userId,
    });

    if (!reservation) {
      throw errors.notFound('Reservation not found');
    }

    return reservation;
  }

  /**
   * Check if reservation is valid (active and not expired)
   */
  isReservationValid(reservation: any): boolean {
    return reservation.status === 'active' && reservation.expiresAt > now();
  }
}

export const reservationService = new ReservationService();
