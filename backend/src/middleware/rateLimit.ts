import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for checkout endpoints to prevent abuse
 * Applies modest limits: 20 requests per minute per IP
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use userId if available, otherwise fall back to IP
  keyGenerator: (req) => req.userId || req.ip || 'unknown',
});
