# SureStock Backend

Inventory-aware checkout system with stock reservation and concurrency safety.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB Atlas (replica set for transactions)
- **ODM**: Mongoose 8
- **Testing**: Jest + Supertest
- **Validation**: Zod

## Backend Setup

### Prerequisites

- Node.js 20 or higher
- MongoDB Atlas account with a replica set cluster (required for transactions)
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/surestock?retryWrites=true&w=majority
   PORT=8080
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

   **Required variables**:
   - `MONGODB_URI`: MongoDB Atlas connection string (must be a replica set)
   - `CORS_ORIGIN`: Frontend URL for CORS configuration

### Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start at `http://localhost:8080` (or your configured PORT).

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

### Production

Start the compiled application:
```bash
npm start
```

### Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Linting & Formatting

Check code style:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

Format code:
```bash
npm run format
```

### Seeding

Populate the database with sample data (150 products + demo cart):
```bash
npm run seed
```

Clear all data from the database:
```bash
npm run unseed
```

**Seed Details**:
- Creates 150 products across 6 categories and 10 brands
- Price range: ₹1.99 to ₹19,999.00
- Stock range: 0-150 units per product
- Low stock threshold: 5-15 units
- Creates a demo cart for user `demo-user` with 3 random items
- Uses deterministic faker seed for reproducibility
- Idempotent: clears existing products and carts before seeding

## Health Check

Verify the server is running:
```bash
curl http://localhost:8080/api/healthz
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## Data Model

### Entity Relationship Diagram (Text)

```
Product
├── sku (unique)
├── name
├── priceCents
├── stock (committed inventory)
├── reserved (soft holds)
├── lowStockThreshold
├── image
└── available (virtual: stock - reserved)

Cart (one per user)
├── userId (unique)
└── items[]
    ├── productId → Product
    └── qty (1-5)

Reservation
├── userId
├── status (active|consumed|expired|cancelled)
├── items[] (product snapshots)
│   ├── productId → Product
│   ├── sku, name, priceCents
│   └── qty
├── address
├── shippingMethod
└── expiresAt (now + 10 minutes)

Order
├── userId
├── status (created|cancelled)
├── items[] (snapshots)
├── address
├── shippingMethod
└── totalCents

LowStockAlert
├── productId → Product
├── stockAfter
├── threshold
└── processed (boolean)

IdempotencyKey
├── userId
├── endpoint
├── key (UUID from header)
├── requestHash
├── status (in_progress|succeeded|failed)
└── response (stored result)
```

### Key Indexes

- **Product**: `sku` (unique)
- **Cart**: `userId` (unique)
- **Reservation**: `{status, expiresAt}`, `{userId, status}`
- **Order**: `{userId, createdAt}`
- **LowStockAlert**: `{processed, createdAt}`
- **IdempotencyKey**: `{userId, endpoint, key}` (unique compound)

## Project Structure

```
backend/
├── src/
│   ├── config/          # Environment configuration
│   │   └── env.ts
│   ├── db/              # Database connection
│   │   └── mongoose.ts
│   ├── middleware/      # Express middleware
│   │   ├── cors.ts
│   │   ├── errors.ts
│   │   ├── rateLimit.ts
│   │   ├── user.ts
│   │   └── validate.ts
│   ├── models/          # Mongoose schemas
│   │   ├── Product.ts
│   │   ├── Cart.ts
│   │   ├── Reservation.ts
│   │   ├── Order.ts
│   │   ├── LowStockAlert.ts
│   │   ├── IdempotencyKey.ts
│   │   └── index.ts
│   ├── routes/          # API routes
│   │   ├── cart.ts
│   │   ├── checkout.ts
│   │   ├── admin.ts
│   │   ├── health.ts
│   │   └── index.ts
│   ├── services/        # Business logic
│   │   ├── cart.service.ts
│   │   ├── reservation.service.ts
│   │   ├── order.service.ts
│   │   └── gc.service.ts
│   ├── utils/           # Utility functions
│   │   ├── hash.ts
│   │   ├── logger.ts
│   │   └── time.ts
│   ├── app.ts           # Express app configuration
│   └── index.ts         # Application entry point
├── tests/               # Test files (47 tests)
│   ├── cart.test.ts
│   ├── reservation.test.ts
│   ├── confirm.test.ts
│   ├── gc.test.ts
│   ├── admin.test.ts
│   └── setup.ts
├── scripts/             # Utility scripts
│   ├── seed.ts
│   └── unseed.ts
├── .env.example         # Environment template
├── jest.config.js       # Jest configuration
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

All endpoints (except health) require `x-user-id` header for authentication.

### Health

**GET /api/healthz**
- No authentication required
- Returns server and database status

```bash
curl http://localhost:8080/api/healthz
```

### Cart Management

**GET /api/cart**
- Get user's cart with product snapshots and availability
- Returns: `{ items: [...], total: number }`

```bash
curl -H "x-user-id: demo-user" http://localhost:8080/api/cart
```

**POST /api/cart**
- Add or update item in cart
- Body: `{ productId: string, qty: number }` (qty must be 1-5)
- Returns: `{ message: string }`

```bash
curl -X POST http://localhost:8080/api/cart \
  -H "x-user-id: demo-user" \
  -H "Content-Type: application/json" \
  -d '{"productId": "60d5ec49f1b2c72b8c8e4f1a", "qty": 3}'
```

**PATCH /api/cart/:productId**
- Update item quantity
- Body: `{ qty: number }` (qty must be 1-5)
- Returns: `{ message: string }`

```bash
curl -X PATCH http://localhost:8080/api/cart/60d5ec49f1b2c72b8c8e4f1a \
  -H "x-user-id: demo-user" \
  -H "Content-Type: application/json" \
  -d '{"qty": 5}'
```

**DELETE /api/cart/:productId**
- Remove item from cart
- Returns: `{ message: string }`

```bash
curl -X DELETE http://localhost:8080/api/cart/60d5ec49f1b2c72b8c8e4f1a \
  -H "x-user-id: demo-user"
```

### Checkout - Reservation

**POST /api/checkout/reserve**
- Create a reservation with 10-minute TTL
- All-or-nothing: either all items are reserved or none
- Uses MongoDB transactions for concurrency safety
- Body: `{ address: {...}, shippingMethod: 'standard' | 'express' }`
- Returns: `{ reservationId: string, expiresAt: Date }`
- Errors:
  - `400` - Empty cart or validation failure
  - `409` - Insufficient stock (race condition handled)

```bash
curl -X POST http://localhost:8080/api/checkout/reserve \
  -H "x-user-id: demo-user" \
  -H "Content-Type: application/json" \
  -d '{
    "address": {
      "name": "John Doe",
      "phone": "1234567890",
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "pincode": "10001"
    },
    "shippingMethod": "standard"
  }'
```

**GET /api/checkout/reservation/:id**
- Get reservation details
- Returns reservation with `isValid` flag

```bash
curl -H "x-user-id: demo-user" \
  http://localhost:8080/api/checkout/reservation/60d5ec49f1b2c72b8c8e4f1a
```

### Checkout - Confirm Order

**POST /api/checkout/confirm**
- Confirm order with idempotency
- **Requires**: `Idempotency-Key` header (UUID)
- Body: `{ reservationId: string }`
- Returns: `{ orderId: string, status: 'created' }`
- Errors:
  - `400` - Missing idempotency key
  - `404` - Reservation not found
  - `409` - Idempotency key reused for different payload
  - `410` - Reservation expired or already consumed

```bash
curl -X POST http://localhost:8080/api/checkout/confirm \
  -H "x-user-id: demo-user" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{"reservationId": "60d5ec49f1b2c72b8c8e4f1a"}'
```

**Idempotency Behavior**:
- Same `Idempotency-Key` with same payload → returns same `orderId` (no duplicate orders)
- Same `Idempotency-Key` with different payload → 409 error
- Retries are safe and never duplicate orders or double-decrement inventory

### Admin - Low Stock Alerts

**GET /api/admin/low-stock-alerts**
- List low-stock alerts
- Query params: `?processed=true|false` (optional filter)
- Returns: `{ count: number, alerts: [...] }`

```bash
# Get all unprocessed alerts
curl -H "x-user-id: admin" \
  "http://localhost:8080/api/admin/low-stock-alerts?processed=false"
```

**POST /api/admin/low-stock-alerts/:id/ack**
- Mark alert as processed
- Returns: `{ message: string, alert: {...} }`

```bash
curl -X POST \
  -H "x-user-id: admin" \
  http://localhost:8080/api/admin/low-stock-alerts/60d5ec49f1b2c72b8c8e4f1a/ack
```

## Architecture Principles

### Concurrency Safety
- All availability changes use **atomic, conditional updates** inside MongoDB transactions
- Availability invariant: `available = stock - reserved ≥ 0`
- Deterministic product ordering in multi-line transactions to reduce deadlocks

### Reservation System
- TTL: 10 minutes
- All-or-nothing reservation (no partial fulfillment)
- Background GC job expires stale reservations every 60 seconds
- Automatic stock release on expiry

### Background GC Service
- **Purpose**: Automatically expire reservations and release reserved stock
- **Interval**: Runs every 60 seconds
- **Process**:
  1. Finds reservations where `status='active'` and `expiresAt ≤ now`
  2. For each expired reservation (in a transaction):
     - Decrements `reserved` by quantity for each item
     - Marks reservation as `'expired'`
  3. Logs statistics: expired count, released items, errors
- **Startup**: Automatically starts with the server
- **Shutdown**: Gracefully stops on SIGTERM/SIGINT

### Idempotency
- Checkout confirm is idempotent using `Idempotency-Key` header (UUID)
- Prevents duplicate orders on retry

### Error Handling
- `400` - Validation failures
- `401` - Missing/invalid authentication
- `409` - Insufficient stock or idempotency key misuse
- `410` - Reservation expired
- `500` - Unexpected errors

All errors return: `{ error: "message" }`

### Authentication
- All endpoints (except health) require `x-user-id` header
- Data is scoped per user

### Rate Limiting
- Applied to `/api/checkout/*` endpoints
- 20 requests per minute per user/IP

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB Atlas connection string |
| `PORT` | No | `8080` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `CORS_ORIGIN` | Yes | - | Frontend URL for CORS |

## Implementation Status

### ✅ Phase 0 - Backend Scaffolding
- TypeScript configuration and tooling
- Express server setup with middleware
- MongoDB connection with Mongoose
- Error handling and logging
- CORS and rate limiting
- Environment configuration

### ✅ Phase 1 - Data Models & Indexes
- Product, Cart, Reservation, Order models
- LowStockAlert and IdempotencyKey models
- Automatic index creation at startup
- Schema validation and constraints
- Virtual fields (e.g., `available` on Product)

### ✅ Phase 2 - Seed Data
- Seed script with 150 products
- Demo cart for `demo-user`
- Unseed script to clear database
- Deterministic faker seed for reproducibility

### ✅ Phase 3 - Cart API
- GET /api/cart with product snapshots and availability
- POST /api/cart to add/update items
- PATCH /api/cart/:productId to update quantity
- DELETE /api/cart/:productId to remove items
- Validation: qty must be 1-5
- Tests: CRUD operations and validation

### ✅ Phase 4 - Reservation API
- POST /api/checkout/reserve with MongoDB transactions
- All-or-nothing reservation (no partial holds)
- Conditional atomic updates: `stock - reserved >= qty`
- Deterministic product ordering to reduce deadlocks
- 10-minute TTL on reservations
- Race condition handling with 409 Conflict
- Tests: success, insufficient stock, race conditions

### ✅ Phase 5 - Confirm API with Idempotency
- POST /api/checkout/confirm with idempotency support
- Requires `Idempotency-Key` header (UUID)
- Request hash validation to prevent key reuse
- Transactional order creation and stock commit
- Atomic updates: decrements both `reserved` and `stock`
- Cart clearing on successful order
- Low-stock alert creation when `stock < threshold`
- Tests: success, idempotency, key reuse rejection, expired reservations

### ✅ Phase 6 - Reservation Expiry GC
- Background garbage collection service
- Runs every 60 seconds automatically
- Finds expired reservations (`status='active'` and `expiresAt ≤ now`)
- Releases reserved stock transactionally
- Marks reservations as `'expired'`
- Graceful shutdown handling
- Tests: single/multiple expiry, non-expired handling, service control

### ✅ Phase 7 - Admin Low-Stock Alerts
- GET /api/admin/low-stock-alerts with filtering
- POST /api/admin/low-stock-alerts/:id/ack to mark processed
- Alerts created automatically when stock falls below threshold
- Populated product details in responses
- Tests: listing, filtering, acknowledgment, integration workflow

### ✅ Phase 8 - Comprehensive Testing
- **47 tests** across 5 test suites (required: ≥6)
- Cart CRUD & totals (11 tests)
- Reservation success & race conditions (9 tests)
- Confirm success & idempotency (8 tests)
- GC expiry & service control (8 tests)
- Admin alerts & workflow (11 tests)
- All tests independent with DB reset between specs
- Test coverage: concurrency, idempotency, edge cases

## Deployment

### MongoDB Atlas Setup

1. **Create a cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free M0 cluster
   - **Important**: Ensure it's a replica set (required for transactions)

2. **Get connection string**:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Add database name: `?retryWrites=true&w=majority`

3. **Whitelist IP**:
   - Add `0.0.0.0/0` to allow connections from anywhere (for development)
   - For production, whitelist specific IPs

### Backend Deployment (Render/Railway)

#### Using Render:

1. **Create Web Service**:
   - Connect your GitHub repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

2. **Environment Variables**:
   ```
   MONGODB_URI=mongodb+srv://...
   PORT=8080
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

3. **Health Check**:
   - Path: `/api/healthz`
   - Expected: 200 OK

#### Using Railway:

1. **Deploy from GitHub**:
   - Connect repository
   - Railway auto-detects Node.js

2. **Add Environment Variables** (same as above)

3. **Custom Start Command** (if needed):
   ```
   npm run build && npm start
   ```

### Production Checklist

- [ ] MongoDB Atlas cluster created (replica set)
- [ ] Database seeded with products (`npm run seed`)
- [ ] Environment variables configured
- [ ] CORS_ORIGIN set to frontend URL
- [ ] Health check endpoint responding
- [ ] GC service running (check logs)
- [ ] Rate limiting active on checkout endpoints
- [ ] Tests passing (`npm test`)

## Performance & Monitoring

### Logging
- Structured JSON logs via custom logger
- Log levels: INFO, ERROR, DEBUG
- Key events logged:
  - Reservation created/expired/consumed
  - Order confirmation attempts
  - Low-stock alerts created
  - GC cycle statistics

### Metrics to Monitor
- Reservation success/failure rate
- Order confirmation success rate
- GC cycle duration and expired count
- API response times (especially /reserve and /confirm)
- Database connection pool status

### Recommended Tools
- **Logging**: Datadog, LogRocket, or Papertrail
- **APM**: New Relic or Datadog APM
- **Uptime**: UptimeRobot or Pingdom
- **Database**: MongoDB Atlas built-in monitoring

## Troubleshooting

### Common Issues

**"MongooseError: Operation buffering timed out"**
- Check MongoDB connection string
- Ensure cluster is a replica set
- Verify network access (IP whitelist)

**"Transaction failed"**
- Ensure MongoDB is a replica set (required for transactions)
- Check if multiple operations are conflicting
- Review logs for specific error details

**"Reservation expired" (410 error)**
- Reservation TTL is 10 minutes
- User took too long to confirm
- GC service expired the reservation
- Solution: Create a new reservation

**"Insufficient stock" (409 error)**
- Race condition: another user reserved the item first
- Stock is genuinely unavailable
- Check `available = stock - reserved` in database

**Tests failing with "MONGODB_URI not found"**
- Ensure `.env` file exists in backend directory
- Run `cp .env.example .env` and configure
- Or set `MONGODB_URI` environment variable

## Contributing

### Code Style
- TypeScript with strict mode
- ESLint + Prettier for formatting
- Run `npm run lint` before committing

### Testing
- Write tests for new features
- Maintain >80% code coverage
- Run `npm test` before pushing

### Commit Messages
- Use conventional commits format
- Examples:
  - `feat: add product search endpoint`
  - `fix: resolve race condition in reservation`
  - `test: add concurrency tests for confirm`

## License

MIT

## Support

For issues or questions:
- Check the [Implementation Plan](../Docs/SureStock_Implementation_Plan.md)
- Review test files for usage examples
- Check logs for detailed error messages

---

**Built with ❤️ using Node.js, Express, TypeScript, and MongoDB**
