/// <reference types="jest" />
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { Product, Cart, createIndexes } from '../src/models';

const TEST_USER_ID = 'test-user-cart';
let testProductId: string;

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    await createIndexes();
  }

  // Create a test product
  const product = await Product.create({
    sku: 'TEST-CART-001',
    name: 'Test Product for Cart',
    priceCents: 1000,
    stock: 100,
    reserved: 0,
    lowStockThreshold: 10,
    image: 'https://example.com/image.jpg',
  });

  testProductId = (product._id as mongoose.Types.ObjectId).toString();
}, 30000);

afterAll(async () => {
  // Clean up
  await Product.deleteMany({ sku: /^TEST-CART/ });
  await Cart.deleteMany({ userId: TEST_USER_ID });
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clear cart before each test
  await Cart.deleteMany({ userId: TEST_USER_ID });
});

describe('Cart API', () => {
  describe('POST /api/cart', () => {
    it('should add item to cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: testProductId, qty: 2 })
        .expect(201);

      expect(response.body.message).toBe('Item added to cart');

      // Verify cart was created
      const cart = await Cart.findOne({ userId: TEST_USER_ID });
      expect(cart).toBeTruthy();
      expect(cart!.items).toHaveLength(1);
      expect(cart!.items[0].qty).toBe(2);
    });

    it('should update quantity if item already exists', async () => {
      // Add item first
      await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: testProductId, qty: 2 });

      // Update quantity
      await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: testProductId, qty: 4 })
        .expect(201);

      const cart = await Cart.findOne({ userId: TEST_USER_ID });
      expect(cart!.items).toHaveLength(1);
      expect(cart!.items[0].qty).toBe(4);
    });

    it('should reject quantity outside 1-5 range', async () => {
      await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: testProductId, qty: 6 })
        .expect(400);

      await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: testProductId, qty: 0 })
        .expect(400);
    });

    it('should reject invalid product ID', async () => {
      await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: new mongoose.Types.ObjectId().toString(), qty: 2 })
        .expect(400);
    });

    it('should require x-user-id header', async () => {
      await request(app)
        .post('/api/cart')
        .send({ productId: testProductId, qty: 2 })
        .expect(401);
    });
  });

  describe('GET /api/cart', () => {
    it('should return empty cart for new user', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should return cart with product snapshots and total', async () => {
      // Add item to cart
      await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: testProductId, qty: 3 });

      const response = await request(app)
        .get('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        productId: testProductId,
        sku: 'TEST-CART-001',
        name: 'Test Product for Cart',
        priceCents: 1000,
        stock: 100,
        reserved: 0,
        available: 100,
        qty: 3,
      });
      expect(response.body.total).toBe(3000); // 1000 * 3
    });
  });

  describe('PATCH /api/cart/:productId', () => {
    it('should update item quantity', async () => {
      // Add item first
      await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: testProductId, qty: 2 });

      // Update quantity
      await request(app)
        .patch(`/api/cart/${testProductId}`)
        .set('x-user-id', TEST_USER_ID)
        .send({ qty: 5 })
        .expect(200);

      const cart = await Cart.findOne({ userId: TEST_USER_ID });
      expect(cart!.items[0].qty).toBe(5);
    });

    it('should return 404 if item not in cart', async () => {
      await request(app)
        .patch(`/api/cart/${testProductId}`)
        .set('x-user-id', TEST_USER_ID)
        .send({ qty: 3 })
        .expect(404);
    });
  });

  describe('DELETE /api/cart/:productId', () => {
    it('should remove item from cart', async () => {
      // Add item first
      await request(app)
        .post('/api/cart')
        .set('x-user-id', TEST_USER_ID)
        .send({ productId: testProductId, qty: 2 });

      // Remove item
      await request(app)
        .delete(`/api/cart/${testProductId}`)
        .set('x-user-id', TEST_USER_ID)
        .expect(200);

      const cart = await Cart.findOne({ userId: TEST_USER_ID });
      expect(cart!.items).toHaveLength(0);
    });

    it('should return 404 if item not in cart', async () => {
      await request(app)
        .delete(`/api/cart/${testProductId}`)
        .set('x-user-id', TEST_USER_ID)
        .expect(404);
    });
  });
});
