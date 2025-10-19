import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { cartService } from '../services/cart.service';
import { validate } from '../middleware/validate';

const router = Router();

// Custom ObjectId validator
const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: 'Invalid product ID format' }
);

// Validation schemas
const addToCartSchema = z.object({
  productId: objectIdSchema,
  qty: z.number().int().min(1).max(5),
});

const updateCartItemSchema = z.object({
  qty: z.number().int().min(1).max(5),
});

/**
 * GET /api/cart
 * Get user's cart with product snapshots
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const cart = await cartService.getCart(userId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cart
 * Add or update item in cart
 */
router.post(
  '/',
  validate(addToCartSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { productId, qty } = req.body;

      await cartService.addToCart(userId, productId, qty);
      
      // Return updated cart
      const cart = await cartService.getCart(userId);
      res.status(201).json(cart);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/cart/:productId
 * Update item quantity
 */
router.patch(
  '/:productId',
  validate(updateCartItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { productId } = req.params;
      const { qty } = req.body;

      // Validate productId format
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
      }

      await cartService.updateCartItem(userId, productId, qty);
      
      // Return updated cart
      const cart = await cartService.getCart(userId);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/cart/:productId
 * Remove item from cart
 */
router.delete('/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    await cartService.removeFromCart(userId, productId);
    
    // Return updated cart
    const cart = await cartService.getCart(userId);
    res.json(cart);
  } catch (error) {
    next(error);
  }
});

export default router;
