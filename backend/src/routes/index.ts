import { Router } from 'express';
import healthRouter from './health';
import { extractUserId } from '../middleware/user';
import { checkoutRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Health check (no auth required)
router.use('/api', healthRouter);

// Apply user authentication to all /api/* routes except health
// (Future routes will be added here and will automatically get auth)

// Apply rate limiting to checkout endpoints
// (Will be used when checkout routes are added)
router.use('/api/checkout/*', checkoutRateLimiter);

// Placeholder for future routes:
// router.use('/api/cart', extractUserId, cartRouter);
// router.use('/api/checkout', extractUserId, checkoutRouter);
// router.use('/api/admin', extractUserId, adminRouter);

export default router;
