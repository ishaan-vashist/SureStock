import { Router } from 'express';
import healthRouter from './health';
import productsRouter from './products';
import cartRouter from './cart';
import checkoutRouter from './checkout';
import ordersRouter from './orders';
import adminRouter from './admin';
import { extractUserId } from '../middleware/user';
import { checkoutRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Health check (no auth required)
router.use('/api', healthRouter);

// Products endpoints (no auth required - public catalog)
router.use('/api/products', productsRouter);

// Cart endpoints (require authentication)
router.use('/api/cart', extractUserId, cartRouter);

// Checkout endpoints (require authentication + rate limiting)
router.use('/api/checkout', extractUserId, checkoutRateLimiter, checkoutRouter);

// Orders endpoints (require authentication)
router.use('/api/orders', extractUserId, ordersRouter);

// Admin endpoints (require authentication)
router.use('/api/admin', extractUserId, adminRouter);

export default router;
