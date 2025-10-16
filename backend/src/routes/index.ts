import { Router } from 'express';
import healthRouter from './health';
import cartRouter from './cart';
import checkoutRouter from './checkout';
import adminRouter from './admin';
import { extractUserId } from '../middleware/user';
import { checkoutRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Health check (no auth required)
router.use('/api', healthRouter);

// Cart endpoints (require authentication)
router.use('/api/cart', extractUserId, cartRouter);

// Checkout endpoints (require authentication + rate limiting)
router.use('/api/checkout', extractUserId, checkoutRateLimiter, checkoutRouter);

// Admin endpoints (require authentication)
router.use('/api/admin', extractUserId, adminRouter);

export default router;
