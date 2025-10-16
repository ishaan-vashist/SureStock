import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { reservationService } from '../services/reservation.service';
import { orderService } from '../services/order.service';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errors';

const router = Router();

// Validation schemas
const reserveSchema = z.object({
  address: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().min(5, 'Valid pincode is required'),
  }),
  shippingMethod: z.enum(['standard', 'express'], {
    errorMap: () => ({ message: 'Shipping method must be standard or express' }),
  }),
});

const confirmSchema = z.object({
  reservationId: z.string().min(1, 'Reservation ID is required'),
});

/**
 * POST /api/checkout/reserve
 * Create a reservation with 10-minute TTL
 */
router.post(
  '/reserve',
  validate(reserveSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { address, shippingMethod } = req.body;

      const result = await reservationService.createReservation({
        userId,
        address,
        shippingMethod,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/checkout/confirm
 * Confirm order with idempotency
 * Requires Idempotency-Key header
 */
router.post(
  '/confirm',
  validate(confirmSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { reservationId } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;

      // Validate idempotency key header
      if (!idempotencyKey) {
        throw new AppError(400, 'Idempotency-Key header is required');
      }

      const result = await orderService.confirmOrder({
        userId,
        reservationId,
        idempotencyKey,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/checkout/reservation/:id
 * Get reservation details
 */
router.get(
  '/reservation/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const reservation = await reservationService.getReservation(id, userId);
      const isValid = reservationService.isReservationValid(reservation);

      res.json({
        ...reservation.toObject(),
        isValid,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
