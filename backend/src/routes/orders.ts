import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order } from '../models';

const router = Router();

/**
 * GET /api/orders/:orderId
 * Get order details by ID
 */
router.get('/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

export default router;
