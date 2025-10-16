/// <reference types="jest" />
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import app from '../src/app';
import { Product, Cart, Reservation, Order, LowStockAlert, IdempotencyKey, createIndexes } from '../src/models';

const TEST_USER = 'test-user-confirm';
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
  process.env.NODE_ENV = 'test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    await createIndexes();
  }

  // Create test product
  const product = await Product.create({
    sku: 'TEST-CONFIRM-001',
    name: 'Test Product for Confirm',
    priceCents: 2000,
    stock: 50,
    reserved: 0,
    lowStockThreshold: 10,
    image: 'https://example.com/image.jpg',
  });

  testProductId = (product._id as mongoose.Types.ObjectId).toString();
}, 30000);

afterAll(async () => {
  await Product.deleteMany({ sku: /^TEST-CONFIRM/ });
  await Cart.deleteMany({ userId: TEST_USER });
  await Reservation.deleteMany({ userId: TEST_USER });
  await Order.deleteMany({ userId: TEST_USER });
  await LowStockAlert.deleteMany({});
  await IdempotencyKey.deleteMany({ userId: TEST_USER });
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Reset product stock
  await Product.updateOne({ _id: testProductId }, { stock: 50, reserved: 0 });

  // Clear test data
  await Cart.deleteMany({ userId: TEST_USER });
  await Reservation.deleteMany({ userId: TEST_USER });
  await Order.deleteMany({ userId: TEST_USER });
  await LowStockAlert.deleteMany({});
  await IdempotencyKey.deleteMany({ userId: TEST_USER });
});

describe('Confirm Order API', () => {
  describe('POST /api/checkout/confirm', () => {
    it('should confirm order successfully', async () => {
      // 1. Create cart
      await Cart.create({
        userId: TEST_USER,
        items: [{ productId: testProductId, qty: 3 }],
      });

      // 2. Create reservation
      const reserveResponse = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        });

      const { reservationId } = reserveResponse.body;
      const idempotencyKey = crypto.randomUUID();

      // 3. Confirm order
      const confirmResponse = await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', idempotencyKey)
        .send({ reservationId })
        .expect(200);

      expect(confirmResponse.body).toHaveProperty('orderId');
      expect(confirmResponse.body.status).toBe('created');

      // 4. Verify order was created
      const order = await Order.findById(confirmResponse.body.orderId);
      expect(order).toBeTruthy();
      expect(order!.userId).toBe(TEST_USER);
      expect(order!.items).toHaveLength(1);
      expect(order!.items[0].qty).toBe(3);
      expect(order!.totalCents).toBe(6000); // 3 * 2000

      // 5. Verify reservation was consumed
      const reservation = await Reservation.findById(reservationId);
      expect(reservation!.status).toBe('consumed');

      // 6. Verify stock was decremented
      const product = await Product.findById(testProductId);
      expect(product!.stock).toBe(47); // 50 - 3
      expect(product!.reserved).toBe(0); // Released

      // 7. Verify cart was cleared
      const cart = await Cart.findOne({ userId: TEST_USER });
      expect(cart).toBeNull();
    });

    it('should be idempotent - same key returns same orderId', async () => {
      // 1. Create cart and reservation
      await Cart.create({
        userId: TEST_USER,
        items: [{ productId: testProductId, qty: 2 }],
      });

      const reserveResponse = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER)
        .send({
          address: validAddress,
          shippingMethod: 'express',
        });

      const { reservationId } = reserveResponse.body;
      const idempotencyKey = crypto.randomUUID();

      // 2. First confirm
      const firstResponse = await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', idempotencyKey)
        .send({ reservationId })
        .expect(200);

      const firstOrderId = firstResponse.body.orderId;

      // 3. Second confirm with same key
      const secondResponse = await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', idempotencyKey)
        .send({ reservationId })
        .expect(200);

      // Should return same orderId
      expect(secondResponse.body.orderId).toBe(firstOrderId);

      // Verify only one order exists
      const orders = await Order.find({ userId: TEST_USER });
      expect(orders).toHaveLength(1);

      // Verify stock was only decremented once
      const product = await Product.findById(testProductId);
      expect(product!.stock).toBe(48); // 50 - 2 (not 46)
      expect(product!.reserved).toBe(0);
    });

    it('should reject idempotency key reuse for different payload', async () => {
      // 1. Create first reservation
      await Cart.create({
        userId: TEST_USER,
        items: [{ productId: testProductId, qty: 2 }],
      });

      const reserve1 = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        });

      // 2. Create second reservation (need to delete old cart first since reserve doesn't clear it)
      await Cart.deleteOne({ userId: TEST_USER });
      await Cart.create({
        userId: TEST_USER,
        items: [{ productId: testProductId, qty: 3 }],
      });

      const reserve2 = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER)
        .send({
          address: validAddress,
          shippingMethod: 'express',
        });

      const idempotencyKey = crypto.randomUUID();

      // 3. Confirm first reservation
      await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', idempotencyKey)
        .send({ reservationId: reserve1.body.reservationId })
        .expect(200);

      // 4. Try to use same key for different reservation (should fail with 409)
      await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', idempotencyKey)
        .send({ reservationId: reserve2.body.reservationId })
        .expect(409);
    });

    it('should reject confirm without idempotency key', async () => {
      await Cart.create({
        userId: TEST_USER,
        items: [{ productId: testProductId, qty: 1 }],
      });

      const reserveResponse = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        });

      await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        // No Idempotency-Key header
        .send({ reservationId: reserveResponse.body.reservationId })
        .expect(400);
    });

    it('should reject expired reservation', async () => {
      // Create reservation with past expiry
      const reservation = await Reservation.create({
        userId: TEST_USER,
        status: 'active',
        items: [
          {
            productId: testProductId,
            sku: 'TEST-CONFIRM-001',
            name: 'Test Product',
            priceCents: 2000,
            qty: 2,
          },
        ],
        address: validAddress,
        shippingMethod: 'standard',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ reservationId: (reservation._id as mongoose.Types.ObjectId).toString() })
        .expect(410);
    });

    it('should reject non-existent reservation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ reservationId: fakeId })
        .expect(404);
    });

    it('should create low-stock alert when stock falls below threshold', async () => {
      // Set stock to 12 (threshold is 10)
      await Product.updateOne({ _id: testProductId }, { stock: 12, reserved: 0 });

      // Create cart with 5 items (will bring stock to 7, below threshold)
      await Cart.create({
        userId: TEST_USER,
        items: [{ productId: testProductId, qty: 5 }],
      });

      const reserveResponse = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        });

      await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ reservationId: reserveResponse.body.reservationId })
        .expect(200);

      // Verify low-stock alert was created
      const alerts = await LowStockAlert.find({ productId: testProductId });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].stockAfter).toBe(7);
      expect(alerts[0].threshold).toBe(10);
      expect(alerts[0].processed).toBe(false);
    });

    it('should not create low-stock alert when stock remains above threshold', async () => {
      // Stock is 50, threshold is 10
      await Cart.create({
        userId: TEST_USER,
        items: [{ productId: testProductId, qty: 3 }],
      });

      const reserveResponse = await request(app)
        .post('/api/checkout/reserve')
        .set('x-user-id', TEST_USER)
        .send({
          address: validAddress,
          shippingMethod: 'standard',
        });

      await request(app)
        .post('/api/checkout/confirm')
        .set('x-user-id', TEST_USER)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ reservationId: reserveResponse.body.reservationId })
        .expect(200);

      // No alert should be created (stock is 47, above threshold of 10)
      const alerts = await LowStockAlert.find({ productId: testProductId });
      expect(alerts).toHaveLength(0);
    });
  });
});
