import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { cartService } from '../services/cart.service';
import { validate } from '../middleware/validate';

const router = Router();

// Validation schemas
const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
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

      res.status(201).json({ message: 'Item added to cart' });
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

      await cartService.updateCartItem(userId, productId, qty);

      res.json({ message: 'Cart item updated' });
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

    await cartService.removeFromCart(userId, productId);

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    next(error);
  }
});

export default router;
