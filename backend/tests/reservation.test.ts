/// <reference types="jest" />
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { Product, Cart, Reservation, createIndexes } from '../src/models';

const TEST_USER_1 = 'test-user-reserve-1';
const TEST_USER_2 = 'test-user-reserve-2';
let testProductId: string;

const validAddress = {
  name: 'John Doe',
  phone: '1234567890',
  line1: '123 Main St',
  city: 'Test City',
  state: 'Test State',
  pincode: '12345',
};

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    await createIndexes();
  }

  // Create test product with limited stock
  const product = await Product.create({
    sku: 'TEST-RESERVE-001',
    name: 'Test Product for Reservation',
    priceCents: 2000,
    stock: 10,
    reserved: 0,
    lowStockThreshold: 5,
    image: 'https://example.com/image.jpg',
  });

  testProductId = (product._id as mongoose.Types.ObjectId).toString();
}, 30000);

afterAll(async () => {
  await Product.deleteMany({ sku: /^TEST-RESERVE/ });
  await Cart.deleteMany({ userId: { $in: [TEST_USER_1, TEST_USER_2] } });
  await Reservation.deleteMany({ userId: { $in: [TEST_USER_1, TEST_USER_2] } });
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Reset product stock
  await Product.updateOne({ _id: testProductId }, { stock: 10, reserved: 0 });

  // Clear carts and reservations
  await Cart.deleteMany({ userId: { $in: [TEST_USER_1, TEST_USER_2] } });
  await Reservation.deleteMany({ userId: { $in: [TEST_USER_1, TEST_USER_2] } });
});

describe('Reservation API', () => {
  describe('POST /api/checkout/reserve', () => {
    it('should create reservation successfully with valid cart', async () => {
      // Add item to cart
      await Cart.create({
        userId: TEST_USER_1,
        items: [{ productId: testProductId, qty: 3 }],
      });

      const response = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER_1)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        })
        .expect(200);

      expect(response.body).toHaveProperty('reservationId');
      expect(response.body).toHaveProperty('expiresAt');

      // Verify reservation was created
      const reservation = await Reservation.findById(response.body.reservationId);
      expect(reservation).toBeTruthy();
      expect(reservation!.status).toBe('active');
      expect(reservation!.items).toHaveLength(1);
      expect(reservation!.items[0].qty).toBe(3);

      // Verify stock was reserved
      const product = await Product.findById(testProductId);
      expect(product!.reserved).toBe(3);
      expect(product!.stock).toBe(10);

      // Verify TTL is approximately 10 minutes
      const expiresAt = new Date(response.body.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
      expect(diffMinutes).toBeGreaterThan(9.5);
      expect(diffMinutes).toBeLessThan(10.5);
    });

    it('should reject reservation with empty cart', async () => {
      await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER_1)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        })
        .expect(400);
    });

    it('should reject reservation with insufficient stock', async () => {
      // Add more items than available
      await Cart.create({
        userId: TEST_USER_1,
        items: [{ productId: testProductId, qty: 5 }],
      });

      // Set stock to less than requested
      await Product.updateOne({ _id: testProductId }, { stock: 3 });

      await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER_1)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        })
        .expect(409);

      // Verify no stock was reserved
      const product = await Product.findById(testProductId);
      expect(product!.reserved).toBe(0);
    });

    it('should reject invalid shipping method', async () => {
      await Cart.create({
        userId: TEST_USER_1,
        items: [{ productId: testProductId, qty: 2 }],
      });

      await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER_1)
        .send({
          address: validAddress,
          shippingMethod: 'overnight',
        })
        .expect(400);
    });

    it('should reject missing address fields', async () => {
      await Cart.create({
        userId: TEST_USER_1,
        items: [{ productId: testProductId, qty: 2 }],
      });

      const invalidAddress: Partial<typeof validAddress> = { ...validAddress };
      delete invalidAddress.city;

      await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER_1)
        .send({
          address: invalidAddress,
          shippingMethod: 'standard',
        })
        .expect(400);
    });

    it('should handle race condition - only one reservation succeeds', async () => {
      // Set stock to 8
      await Product.updateOne({ _id: testProductId }, { stock: 8, reserved: 0 });

      // Create carts for both users requesting 5 items each (total 10 > 8 available)
      await Cart.create({
        userId: TEST_USER_1,
        items: [{ productId: testProductId, qty: 5 }],
      });

      await Cart.create({
        userId: TEST_USER_2,
        items: [{ productId: testProductId, qty: 5 }],
      });

      // Fire both reservation requests simultaneously
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/checkout/reserve')
          .set('x-user-id', TEST_USER_1)
          .send({
            address: validAddress,
            shippingMethod: 'standard',
          }),
        request(app)
          .post('/api/checkout/reserve')
          .set('x-user-id', TEST_USER_2)
          .send({
            address: validAddress,
            shippingMethod: 'standard',
          }),
      ]);

      // Exactly one should succeed (200) and one should fail (409)
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Verify final stock state
      const product = await Product.findById(testProductId);
      expect(product!.reserved).toBe(5); // Only one reservation succeeded
      expect(product!.stock).toBe(8); // Stock unchanged

      // Verify only one reservation exists
      const reservations = await Reservation.find({
        userId: { $in: [TEST_USER_1, TEST_USER_2] },
        status: 'active',
      });
      expect(reservations).toHaveLength(1);
    });

    it('should reserve multiple items atomically (all-or-nothing)', async () => {
      // Create second product
      const product2 = await Product.create({
        sku: 'TEST-RESERVE-002',
        name: 'Test Product 2',
        priceCents: 1500,
        stock: 5,
        reserved: 0,
        lowStockThreshold: 3,
        image: 'https://example.com/image2.jpg',
      });

      // Add both products to cart - second product qty exceeds available stock
      await Cart.create({
        userId: TEST_USER_1,
        items: [
          { productId: testProductId, qty: 3 },
          { productId: product2._id, qty: 5 }, // Requesting 5 but only 5 available, will fail due to stock
        ],
      });

      // Update product2 stock to less than requested to trigger insufficient stock
      await Product.updateOne({ _id: product2._id }, { stock: 3 });

      // Reservation should fail
      await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER_1)
        .send({
          address: validAddress,
          shippingMethod: 'express',
        })
        .expect(409);

      // Verify NO stock was reserved for either product (all-or-nothing)
      const product1 = await Product.findById(testProductId);
      const product2Updated = await Product.findById(product2._id);

      expect(product1!.reserved).toBe(0);
      expect(product2Updated!.reserved).toBe(0);

      // Clean up
      await Product.deleteOne({ _id: product2._id });
    });
  });

  describe('GET /api/checkout/reservation/:id', () => {
    it('should return reservation details', async () => {
      // Create a reservation first
      await Cart.create({
        userId: TEST_USER_1,
        items: [{ productId: testProductId, qty: 2 }],
      });

      const reserveResponse = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER_1)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        });

      const reservationId = reserveResponse.body.reservationId;

      // Get reservation
      const response = await request(app)
        .get(`/api/checkout/reservation/${reservationId}`)
        .set('x-user-id', TEST_USER_1)
        .expect(200);

      expect(response.body._id).toBe(reservationId);
      expect(response.body.status).toBe('active');
      expect(response.body.isValid).toBe(true);
    });

    it('should return 404 for non-existent reservation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .get(`/api/checkout/reservation/${fakeId}`)
        .set('x-user-id', TEST_USER_1)
        .expect(404);
    });
  });
});
