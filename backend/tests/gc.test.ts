/// <reference types="jest" />
import mongoose from 'mongoose';
import { Product, Cart, Reservation, createIndexes } from '../src/models';
import { gcService } from '../src/services/gc.service';

const TEST_USER = 'test-user-gc';
let testProductId: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    await createIndexes();
  }

  // Create test product
  const product = await Product.create({
    sku: 'TEST-GC-001',
    name: 'Test Product for GC',
    priceCents: 2000,
    stock: 100,
    reserved: 0,
    lowStockThreshold: 10,
    image: 'https://example.com/image.jpg',
  });

  testProductId = (product._id as mongoose.Types.ObjectId).toString();
}, 30000);

afterAll(async () => {
  await Product.deleteMany({ sku: /^TEST-GC/ });
  await Cart.deleteMany({ userId: TEST_USER });
  await Reservation.deleteMany({ userId: TEST_USER });
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Reset product stock
  await Product.updateOne({ _id: testProductId }, { stock: 100, reserved: 0 });

  // Clear test data
  await Cart.deleteMany({ userId: TEST_USER });
  await Reservation.deleteMany({ userId: TEST_USER });
});

describe('GC Service', () => {
  describe('expireReservations', () => {
    it('should expire reservation with past expiresAt and release reserved stock', async () => {
      // 1. Create a reservation with past expiry
      const reservation = await Reservation.create({
        userId: TEST_USER,
        status: 'active',
        items: [
          {
            productId: testProductId,
            sku: 'TEST-GC-001',
            name: 'Test Product',
            priceCents: 2000,
            qty: 5,
          },
        ],
        address: {
          name: 'John Doe',
          phone: '1234567890',
          line1: '123 Main St',
          city: 'Test City',
          state: 'Test State',
          pincode: '12345',
        },
        shippingMethod: 'standard',
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      });

      // 2. Set product reserved count
      await Product.updateOne({ _id: testProductId }, { reserved: 5 });

      // 3. Run GC
      const stats = await gcService.runGC();

      // 4. Verify stats
      expect(stats.expiredCount).toBe(1);
      expect(stats.releasedItems).toBe(1);
      expect(stats.errors).toBe(0);

      // 5. Verify reservation status changed to expired
      const updatedReservation = await Reservation.findById(reservation._id);
      expect(updatedReservation!.status).toBe('expired');

      // 6. Verify reserved stock was released
      const product = await Product.findById(testProductId);
      expect(product!.reserved).toBe(0);
      expect(product!.stock).toBe(100); // Stock unchanged
    });

    it('should expire multiple reservations in one run', async () => {
      // Create 3 expired reservations
      await Reservation.create([
        {
          userId: TEST_USER,
          status: 'active',
          items: [
            {
              productId: testProductId,
              sku: 'TEST-GC-001',
              name: 'Test Product',
              priceCents: 2000,
              qty: 2,
            },
          ],
          address: {
            name: 'User 1',
            phone: '1234567890',
            line1: '123 Main St',
            city: 'City',
            state: 'State',
            pincode: '12345',
          },
          shippingMethod: 'standard',
          expiresAt: new Date(Date.now() - 1000),
        },
        {
          userId: TEST_USER,
          status: 'active',
          items: [
            {
              productId: testProductId,
              sku: 'TEST-GC-001',
              name: 'Test Product',
              priceCents: 2000,
              qty: 3,
            },
          ],
          address: {
            name: 'User 2',
            phone: '1234567890',
            line1: '456 Main St',
            city: 'City',
            state: 'State',
            pincode: '12345',
          },
          shippingMethod: 'express',
          expiresAt: new Date(Date.now() - 2000),
        },
        {
          userId: TEST_USER,
          status: 'active',
          items: [
            {
              productId: testProductId,
              sku: 'TEST-GC-001',
              name: 'Test Product',
              priceCents: 2000,
              qty: 4,
            },
          ],
          address: {
            name: 'User 3',
            phone: '1234567890',
            line1: '789 Main St',
            city: 'City',
            state: 'State',
            pincode: '12345',
          },
          shippingMethod: 'standard',
          expiresAt: new Date(Date.now() - 3000),
        },
      ]);

      // Set reserved count
      await Product.updateOne({ _id: testProductId }, { reserved: 9 }); // 2 + 3 + 4

      // Run GC
      const stats = await gcService.runGC();

      // Verify all expired
      expect(stats.expiredCount).toBe(3);
      expect(stats.releasedItems).toBe(3);
      expect(stats.errors).toBe(0);

      // Verify all reservations are expired
      const expiredReservations = await Reservation.find({
        userId: TEST_USER,
        status: 'expired',
      });
      expect(expiredReservations).toHaveLength(3);

      // Verify reserved stock fully released
      const product = await Product.findById(testProductId);
      expect(product!.reserved).toBe(0);
    });

    it('should not expire active reservations that have not expired yet', async () => {
      // Create reservation that expires in the future
      await Reservation.create({
        userId: TEST_USER,
        status: 'active',
        items: [
          {
            productId: testProductId,
            sku: 'TEST-GC-001',
            name: 'Test Product',
            priceCents: 2000,
            qty: 3,
          },
        ],
        address: {
          name: 'John Doe',
          phone: '1234567890',
          line1: '123 Main St',
          city: 'City',
          state: 'State',
          pincode: '12345',
        },
        shippingMethod: 'standard',
        expiresAt: new Date(Date.now() + 600000), // Expires in 10 minutes
      });

      await Product.updateOne({ _id: testProductId }, { reserved: 3 });

      // Run GC
      const stats = await gcService.runGC();

      // Should not expire anything
      expect(stats.expiredCount).toBe(0);
      expect(stats.releasedItems).toBe(0);

      // Verify reservation still active
      const reservation = await Reservation.findOne({ userId: TEST_USER });
      expect(reservation!.status).toBe('active');

      // Verify reserved stock unchanged
      const product = await Product.findById(testProductId);
      expect(product!.reserved).toBe(3);
    });

    it('should not expire consumed reservations', async () => {
      // Create consumed reservation with past expiry
      await Reservation.create({
        userId: TEST_USER,
        status: 'consumed',
        items: [
          {
            productId: testProductId,
            sku: 'TEST-GC-001',
            name: 'Test Product',
            priceCents: 2000,
            qty: 2,
          },
        ],
        address: {
          name: 'John Doe',
          phone: '1234567890',
          line1: '123 Main St',
          city: 'City',
          state: 'State',
          pincode: '12345',
        },
        shippingMethod: 'standard',
        expiresAt: new Date(Date.now() - 5000),
      });

      // Run GC
      const stats = await gcService.runGC();

      // Should not expire consumed reservation
      expect(stats.expiredCount).toBe(0);

      // Verify reservation still consumed
      const reservation = await Reservation.findOne({ userId: TEST_USER });
      expect(reservation!.status).toBe('consumed');
    });

    it('should handle case where no expired reservations exist', async () => {
      // Don't create any reservations
      const stats = await gcService.runGC();

      expect(stats.expiredCount).toBe(0);
      expect(stats.releasedItems).toBe(0);
      expect(stats.errors).toBe(0);
    });

    it('should handle multiple items in a single reservation', async () => {
      // Create second product
      const product2 = await Product.create({
        sku: 'TEST-GC-002',
        name: 'Test Product 2',
        priceCents: 1500,
        stock: 50,
        reserved: 4,
        lowStockThreshold: 5,
        image: 'https://example.com/image2.jpg',
      });

      const product2Id = (product2._id as mongoose.Types.ObjectId).toString();

      // Create reservation with multiple items
      await Reservation.create({
        userId: TEST_USER,
        status: 'active',
        items: [
          {
            productId: testProductId,
            sku: 'TEST-GC-001',
            name: 'Test Product',
            priceCents: 2000,
            qty: 3,
          },
          {
            productId: product2Id,
            sku: 'TEST-GC-002',
            name: 'Test Product 2',
            priceCents: 1500,
            qty: 4,
          },
        ],
        address: {
          name: 'John Doe',
          phone: '1234567890',
          line1: '123 Main St',
          city: 'City',
          state: 'State',
          pincode: '12345',
        },
        shippingMethod: 'standard',
        expiresAt: new Date(Date.now() - 1000),
      });

      await Product.updateOne({ _id: testProductId }, { reserved: 3 });

      // Run GC
      const stats = await gcService.runGC();

      expect(stats.expiredCount).toBe(1);
      expect(stats.releasedItems).toBe(2); // Both items released

      // Verify both products had reserved stock released
      const product1 = await Product.findById(testProductId);
      const product2Updated = await Product.findById(product2Id);

      expect(product1!.reserved).toBe(0);
      expect(product2Updated!.reserved).toBe(0);

      // Cleanup
      await Product.deleteOne({ _id: product2Id });
    });
  });

  describe('GC Service Control', () => {
    afterEach(() => {
      // Ensure service is stopped after each test
      gcService.stop();
    });

    it('should start and stop GC service', () => {
      const initialStatus = gcService.getStatus();
      expect(initialStatus.running).toBe(false);

      gcService.start(5000);
      const runningStatus = gcService.getStatus();
      expect(runningStatus.running).toBe(true);

      gcService.stop();
      const stoppedStatus = gcService.getStatus();
      expect(stoppedStatus.running).toBe(false);
    });

    it('should not start multiple instances', () => {
      gcService.start(5000);
      gcService.start(5000); // Try to start again

      const status = gcService.getStatus();
      expect(status.running).toBe(true);

      gcService.stop();
    });
  });
});
