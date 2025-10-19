import mongoose from 'mongoose';
import { Cart, Product } from '../models';
import { errors } from '../middleware/errors';

interface ProductSnapshot {
  _id: string;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
  reserved: number;
  available: number;
  image: string;
}

interface CartItemResponse {
  productId: string;
  qty: number;
  product: ProductSnapshot;
}

interface CartResponse {
  items: CartItemResponse[];
  total: number;
}

export class CartService {
  /**
   * Get user's cart with product snapshots and computed availability
   */
  async getCart(userId: string): Promise<CartResponse> {
    const cart = await Cart.findOne({ userId }).lean();

    if (!cart || cart.items.length === 0) {
      return { items: [], total: 0 };
    }

    // Fetch all products for cart items
    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    // Create product map for quick lookup
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // Build response with snapshots
    const items: CartItemResponse[] = [];
    let total = 0;

    for (const cartItem of cart.items) {
      const product = productMap.get(cartItem.productId.toString());

      if (!product) {
        // Product no longer exists, skip it
        continue;
      }

      const available = product.stock - product.reserved;
      const itemTotal = product.priceCents * cartItem.qty;

      items.push({
        productId: product._id.toString(),
        qty: cartItem.qty,
        product: {
          _id: product._id.toString(),
          sku: product.sku,
          name: product.name,
          priceCents: product.priceCents,
          stock: product.stock,
          reserved: product.reserved,
          available,
          image: product.image,
        },
      });

      total += itemTotal;
    }

    return { items, total };
  }

  /**
   * Add or update item in cart
   */
  async addToCart(userId: string, productId: string, qty: number): Promise<void> {
    // Validate quantity
    if (qty < 1 || qty > 5) {
      throw errors.badRequest('Quantity must be between 1 and 5');
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw errors.badRequest('Product not found');
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        userId,
        items: [{ productId: new mongoose.Types.ObjectId(productId), qty }],
      });
      await cart.save();
      return;
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingItemIndex >= 0) {
      // Update existing item
      cart.items[existingItemIndex].qty = qty;
    } else {
      // Add new item
      cart.items.push({ productId: new mongoose.Types.ObjectId(productId), qty });
    }

    await cart.save();
  }

  /**
   * Update item quantity in cart
   */
  async updateCartItem(userId: string, productId: string, qty: number): Promise<void> {
    // Validate quantity
    if (qty < 1 || qty > 5) {
      throw errors.badRequest('Quantity must be between 1 and 5');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw errors.notFound('Cart not found');
    }

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

    if (itemIndex === -1) {
      throw errors.notFound('Item not found in cart');
    }

    cart.items[itemIndex].qty = qty;
    await cart.save();
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, productId: string): Promise<void> {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw errors.notFound('Cart not found');
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => item.productId.toString() !== productId);

    if (cart.items.length === initialLength) {
      throw errors.notFound('Item not found in cart');
    }

    await cart.save();
  }

  /**
   * Clear entire cart for a user
   */
  async clearCart(userId: string): Promise<void> {
    await Cart.findOneAndUpdate({ userId }, { items: [] });
  }
}

export const cartService = new CartService();
