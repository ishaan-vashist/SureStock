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
│   │   ├── health.ts
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── hash.ts
│   │   ├── logger.ts
│   │   └── time.ts
│   └── index.ts         # Application entry point
├── tests/               # Test files
├── scripts/             # Utility scripts
│   ├── seed.ts
│   └── unseed.ts
├── .env.example         # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Health
- `GET /api/healthz` - Health check endpoint

### Future Endpoints
- Cart management (`/api/cart`)
- Checkout flow (`/api/checkout`)
- Admin operations (`/api/admin`)

## Architecture Principles

### Concurrency Safety
- All availability changes use **atomic, conditional updates** inside MongoDB transactions
- Availability invariant: `available = stock - reserved ≥ 0`
- Deterministic product ordering in multi-line transactions to reduce deadlocks

### Reservation System
- TTL: 10 minutes
- All-or-nothing reservation (no partial fulfillment)
- Background GC job expires stale reservations

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

### 🔜 Next Phases
- Cart CRUD endpoints
- Reservation and checkout flow with transactions
- Idempotency handling for confirm
- Low-stock alerts
- Background GC worker for expired reservations
- Comprehensive test suite (≥6 tests)
