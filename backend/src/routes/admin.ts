import { Router, Request, Response, NextFunction } from 'express';
import { LowStockAlert } from '../models';
import { AppError } from '../middleware/errors';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/admin/low-stock-alerts
 * List low-stock alerts with optional filtering
 * Query params:
 *   - processed: boolean (optional) - filter by processed status
 */
router.get(
  '/low-stock-alerts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { processed } = req.query;

      // Build query
      const query: Record<string, unknown> = {};
      if (processed !== undefined) {
        query.processed = processed === 'true';
      }

      // Fetch alerts, newest first, with product details
      const alerts = await LowStockAlert.find(query)
        .populate('productId', 'sku name stock lowStockThreshold')
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        count: alerts.length,
        alerts,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/low-stock-alerts/:id/ack
 * Acknowledge/mark a low-stock alert as processed
 */
router.post(
  '/low-stock-alerts/:id/ack',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError(400, 'Invalid alert ID');
      }

      // Update alert
      const alert = await LowStockAlert.findByIdAndUpdate(
        id,
        { processed: true },
        { new: true }
      ).populate('productId', 'sku name stock lowStockThreshold');

      if (!alert) {
        throw new AppError(404, 'Alert not found');
      }

      res.json({
        message: 'Alert marked as processed',
        alert,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
