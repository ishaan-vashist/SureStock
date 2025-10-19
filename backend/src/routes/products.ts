import { Router, Request, Response, NextFunction } from 'express';
import { Product } from '../models';

const router = Router();

/**
 * GET /api/products
 * Get all products with availability
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await Product.find()
      .select('_id sku name priceCents stock reserved image')
      .lean();

    // Add computed available field
    const productsWithAvailable = products.map((product) => ({
      ...product,
      available: product.stock - product.reserved,
    }));

    res.json(productsWithAvailable);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .select('_id sku name priceCents stock reserved image')
      .lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Add computed available field
    const productWithAvailable = {
      ...product,
      available: product.stock - product.reserved,
    };

    res.json(productWithAvailable);
  } catch (error) {
    next(error);
  }
});

export default router;
