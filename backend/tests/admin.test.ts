/// <reference types="jest" />
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { Product, LowStockAlert, createIndexes } from '../src/models';

const TEST_USER = 'test-admin-user';
let testProduct1Id: string;
let testProduct2Id: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
    await createIndexes();
  }

  // Create test products
  const product1 = await Product.create({
    sku: 'TEST-ADMIN-001',
    name: 'Test Product 1',
    priceCents: 2000,
    stock: 5,
    reserved: 0,
    lowStockThreshold: 10,
    image: 'https://example.com/image1.jpg',
  });

  const product2 = await Product.create({
    sku: 'TEST-ADMIN-002',
    name: 'Test Product 2',
    priceCents: 1500,
    stock: 15,
    reserved: 0,
    lowStockThreshold: 10,
    image: 'https://example.com/image2.jpg',
  });

  testProduct1Id = (product1._id as mongoose.Types.ObjectId).toString();
  testProduct2Id = (product2._id as mongoose.Types.ObjectId).toString();
}, 30000);

afterAll(async () => {
  await Product.deleteMany({ sku: /^TEST-ADMIN/ });
  await LowStockAlert.deleteMany({});
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clear alerts before each test
  await LowStockAlert.deleteMany({});
});

describe('Admin API', () => {
  describe('GET /api/admin/low-stock-alerts', () => {
    it('should return empty list when no alerts exist', async () => {
      const response = await request(app)
        .get('/api/admin/low-stock-alerts')
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.alerts).toEqual([]);
    });

    it('should return all alerts ordered by newest first', async () => {
      // Create alerts with different timestamps
      const alert1 = await LowStockAlert.create({
        productId: testProduct1Id,
        stockAfter: 5,
        threshold: 10,
        processed: false,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const alert2 = await LowStockAlert.create({
        productId: testProduct2Id,
        stockAfter: 8,
        threshold: 10,
        processed: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const alert3 = await LowStockAlert.create({
        productId: testProduct1Id,
        stockAfter: 3,
        threshold: 10,
        processed: true,
      });

      const response = await request(app)
        .get('/api/admin/low-stock-alerts')
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.alerts).toHaveLength(3);

      // Verify newest first (alert3, alert2, alert1)
      expect(response.body.alerts[0]._id).toBe(
        (alert3._id as mongoose.Types.ObjectId).toString()
      );
      expect(response.body.alerts[1]._id).toBe(
        (alert2._id as mongoose.Types.ObjectId).toString()
      );
      expect(response.body.alerts[2]._id).toBe(
        (alert1._id as mongoose.Types.ObjectId).toString()
      );

      // Verify product details are populated
      expect(response.body.alerts[0].productId).toHaveProperty('sku');
      expect(response.body.alerts[0].productId).toHaveProperty('name');
      expect(response.body.alerts[0].productId).toHaveProperty('stock');
    });

    it('should filter alerts by processed=false', async () => {
      await LowStockAlert.create([
        {
          productId: testProduct1Id,
          stockAfter: 5,
          threshold: 10,
          processed: false,
        },
        {
          productId: testProduct2Id,
          stockAfter: 8,
          threshold: 10,
          processed: false,
        },
        {
          productId: testProduct1Id,
          stockAfter: 3,
          threshold: 10,
          processed: true,
        },
      ]);

      const response = await request(app)
        .get('/api/admin/low-stock-alerts?processed=false')
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.alerts).toHaveLength(2);

      // All returned alerts should be unprocessed
      response.body.alerts.forEach((alert: { processed: boolean }) => {
        expect(alert.processed).toBe(false);
      });
    });

    it('should filter alerts by processed=true', async () => {
      await LowStockAlert.create([
        {
          productId: testProduct1Id,
          stockAfter: 5,
          threshold: 10,
          processed: false,
        },
        {
          productId: testProduct2Id,
          stockAfter: 8,
          threshold: 10,
          processed: true,
        },
        {
          productId: testProduct1Id,
          stockAfter: 3,
          threshold: 10,
          processed: true,
        },
      ]);

      const response = await request(app)
        .get('/api/admin/low-stock-alerts?processed=true')
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.alerts).toHaveLength(2);

      // All returned alerts should be processed
      response.body.alerts.forEach((alert: { processed: boolean }) => {
        expect(alert.processed).toBe(true);
      });
    });

    it('should include alert details', async () => {
      await LowStockAlert.create({
        productId: testProduct1Id,
        stockAfter: 5,
        threshold: 10,
        processed: false,
      });

      const response = await request(app)
        .get('/api/admin/low-stock-alerts')
        .set('x-user-id', TEST_USER)
        .expect(200);

      const alert = response.body.alerts[0];
      expect(alert).toHaveProperty('_id');
      expect(alert).toHaveProperty('productId');
      expect(alert).toHaveProperty('stockAfter');
      expect(alert).toHaveProperty('threshold');
      expect(alert).toHaveProperty('processed');
      expect(alert).toHaveProperty('createdAt');

      expect(alert.stockAfter).toBe(5);
      expect(alert.threshold).toBe(10);
      expect(alert.processed).toBe(false);

      // Verify populated product
      expect(alert.productId.sku).toBe('TEST-ADMIN-001');
      expect(alert.productId.name).toBe('Test Product 1');
      expect(alert.productId.stock).toBe(5);
    });
  });

  describe('POST /api/admin/low-stock-alerts/:id/ack', () => {
    it('should mark alert as processed', async () => {
      const alert = await LowStockAlert.create({
        productId: testProduct1Id,
        stockAfter: 5,
        threshold: 10,
        processed: false,
      });

      const alertId = (alert._id as mongoose.Types.ObjectId).toString();

      const response = await request(app)
        .post(`/api/admin/low-stock-alerts/${alertId}/ack`)
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(response.body.message).toBe('Alert marked as processed');
      expect(response.body.alert.processed).toBe(true);
      expect(response.body.alert._id).toBe(alertId);

      // Verify in database
      const updatedAlert = await LowStockAlert.findById(alertId);
      expect(updatedAlert!.processed).toBe(true);
    });

    it('should return populated product details', async () => {
      const alert = await LowStockAlert.create({
        productId: testProduct1Id,
        stockAfter: 5,
        threshold: 10,
        processed: false,
      });

      const alertId = (alert._id as mongoose.Types.ObjectId).toString();

      const response = await request(app)
        .post(`/api/admin/low-stock-alerts/${alertId}/ack`)
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(response.body.alert.productId).toHaveProperty('sku');
      expect(response.body.alert.productId).toHaveProperty('name');
      expect(response.body.alert.productId.sku).toBe('TEST-ADMIN-001');
    });

    it('should be idempotent - acknowledging twice should work', async () => {
      const alert = await LowStockAlert.create({
        productId: testProduct1Id,
        stockAfter: 5,
        threshold: 10,
        processed: false,
      });

      const alertId = (alert._id as mongoose.Types.ObjectId).toString();

      // First ack
      await request(app)
        .post(`/api/admin/low-stock-alerts/${alertId}/ack`)
        .set('x-user-id', TEST_USER)
        .expect(200);

      // Second ack (should still work)
      const response = await request(app)
        .post(`/api/admin/low-stock-alerts/${alertId}/ack`)
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(response.body.alert.processed).toBe(true);
    });

    it('should return 404 for non-existent alert', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .post(`/api/admin/low-stock-alerts/${fakeId}/ack`)
        .set('x-user-id', TEST_USER)
        .expect(404);
    });

    it('should return 400 for invalid alert ID', async () => {
      await request(app)
        .post('/api/admin/low-stock-alerts/invalid-id/ack')
        .set('x-user-id', TEST_USER)
        .expect(400);
    });
  });

  describe('Integration: Full workflow', () => {
    it('should list unprocessed alerts and acknowledge them', async () => {
      // Create multiple alerts
      const alert1 = await LowStockAlert.create({
        productId: testProduct1Id,
        stockAfter: 5,
        threshold: 10,
        processed: false,
      });

      const alert2 = await LowStockAlert.create({
        productId: testProduct2Id,
        stockAfter: 8,
        threshold: 10,
        processed: false,
      });

      // 1. List unprocessed alerts
      const listResponse = await request(app)
        .get('/api/admin/low-stock-alerts?processed=false')
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(listResponse.body.count).toBe(2);

      // 2. Acknowledge first alert
      await request(app)
        .post(
          `/api/admin/low-stock-alerts/${(alert1._id as mongoose.Types.ObjectId).toString()}/ack`
        )
        .set('x-user-id', TEST_USER)
        .expect(200);

      // 3. List unprocessed alerts again
      const listResponse2 = await request(app)
        .get('/api/admin/low-stock-alerts?processed=false')
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(listResponse2.body.count).toBe(1);
      expect(listResponse2.body.alerts[0]._id).toBe(
        (alert2._id as mongoose.Types.ObjectId).toString()
      );

      // 4. List processed alerts
      const processedResponse = await request(app)
        .get('/api/admin/low-stock-alerts?processed=true')
        .set('x-user-id', TEST_USER)
        .expect(200);

      expect(processedResponse.body.count).toBe(1);
      expect(processedResponse.body.alerts[0]._id).toBe(
        (alert1._id as mongoose.Types.ObjectId).toString()
      );
    });
  });
});
