# 🛒 SureStock - Real-Time Inventory Management E-Commerce Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat)](https://expressjs.com/)

A modern e-commerce platform with **real-time stock management**, **automatic reservation system**, and **guaranteed stock availability** during checkout. Built with TypeScript, React, Node.js, and MongoDB.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Key Concepts](#-key-concepts)
- [Environment Variables](#-environment-variables)
- [Scripts](#-scripts)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🛍️ E-Commerce Core
- **Product Catalog**: Browse 150+ products across 6 categories
- **Smart Search**: Real-time search by product name or SKU
- **Advanced Filters**: Filter by category, price range, and stock availability
- **Shopping Cart**: Add, update, and remove items with real-time totals
- **Responsive Design**: Optimized for mobile, tablet, and desktop

### 📦 Stock Management
- **Real-Time Inventory**: Live stock updates across all users
- **Automatic Reservation**: Stock reserved during checkout (10-minute TTL)
- **Overselling Prevention**: Atomic operations prevent double-booking
- **Low Stock Alerts**: Admin notifications when inventory runs low
- **Garbage Collection**: Automatic cleanup of expired reservations

### 🔒 Checkout & Orders
- **Server-Side Reservation**: Stock protected during order processing
- **Idempotent Checkout**: Duplicate requests return same order ID
- **Address Validation**: Form validation with error handling
- **Shipping Options**: Standard (free) and Express ($9.99)
- **Order Confirmation**: Instant confirmation with order details

### 👨‍💼 Admin Features
- **Low Stock Dashboard**: View and manage inventory alerts
- **Alert Acknowledgment**: Mark alerts as processed
- **Filter Controls**: Show unprocessed alerts only

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server
- **Lucide React** - Modern icon library
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server code
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Zod** - Schema validation
- **Winston** - Logging library

### DevOps
- **ts-node-dev** - TypeScript development server
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 🏗️ Architecture

### System Overview

```
┌─────────────┐      HTTP/REST      ┌─────────────┐
│   Frontend  │ ◄─────────────────► │   Backend   │
│  (React)    │                     │  (Express)  │
└─────────────┘                     └──────┬──────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │   MongoDB   │
                                    │  (Database) │
                                    └─────────────┘
```

### Data Flow

```
User Action → Frontend → API Request → Backend → Database
                ▲                                    │
                └────────── Response ◄───────────────┘
```

### Stock Reservation Flow

```
1. User clicks "Place Order"
   ↓
2. Frontend sends POST /api/checkout/place-order
   ↓
3. Backend creates reservation (10-min TTL)
   ↓
4. Backend validates stock availability
   ↓
5. Backend creates order & confirms reservation
   ↓
6. Backend returns order ID
   ↓
7. Frontend shows success page
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MongoDB** (local or Atlas)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/surestock.git
   cd surestock
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up Environment Variables**

   **Backend** (`backend/.env`):
   ```env
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017/surestock
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

   **Frontend** (`frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:8080/api
   ```

5. **Seed the Database**
   ```bash
   cd backend
   npm run seed
   ```

6. **Start Development Servers**

   **Terminal 1 - Backend**:
   ```bash
   cd backend
   npm run dev
   ```

   **Terminal 2 - Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

7. **Open in Browser**
   ```
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
surestock/
├── backend/                 # Backend application
│   ├── src/
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Entry point
│   ├── scripts/
│   │   └── seed.ts         # Database seeding
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # Frontend application
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── layouts/       # Layout components
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx        # Root component
│   ├── package.json
│   └── tsconfig.json
│
├── Docs/                   # Documentation
├── README.md              # This file
└── .gitignore
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:8080/api
```

### Endpoints

#### Products
- `GET /products` - List all products

#### Cart
- `GET /cart` - Get user's cart
- `POST /cart` - Add item to cart
- `PATCH /cart/:productId` - Update item quantity
- `DELETE /cart/:productId` - Remove item from cart

#### Checkout
- `POST /checkout/place-order` - Place order (recommended)
- `POST /checkout/reserve` - Reserve stock (deprecated)
- `POST /checkout/confirm` - Confirm order (deprecated)

#### Orders
- `GET /orders/:orderId` - Get order details

#### Admin
- `GET /admin/low-stock-alerts` - List low stock alerts
- `POST /admin/low-stock-alerts/:id/ack` - Acknowledge alert

### Example Request

```bash
# Add item to cart
curl -X POST http://localhost:8080/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "qty": 2
  }'
```

---

## 🔑 Key Concepts

### Stock Reservation System

**Problem**: Multiple users trying to buy the same product simultaneously can lead to overselling.

**Solution**: Atomic stock reservation with TTL (Time To Live).

```typescript
// When user starts checkout
1. Reserve stock atomically
2. Set 10-minute expiration
3. Process order
4. Confirm or release stock
```

### Idempotency

**Problem**: Network issues can cause duplicate order submissions.

**Solution**: Idempotency keys ensure same request returns same result.

```typescript
// Client generates UUID
const idempotencyKey = uuidv4();

// Server checks if order already exists
if (existingOrder) {
  return existingOrder; // No duplicate created
}
```

### Garbage Collection

**Problem**: Expired reservations need cleanup.

**Solution**: Background service runs every 5 minutes.

```typescript
// Automatic cleanup
setInterval(() => {
  cleanupExpiredReservations();
}, 5 * 60 * 1000);
```

---

## 🔐 Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8080/api` |

---

## 📜 Scripts

### Backend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run seed         # Seed database with sample data
npm run lint         # Run ESLint
```

### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Browse products and search
- [ ] Add items to cart
- [ ] Update cart quantities
- [ ] Complete checkout flow
- [ ] View order confirmation
- [ ] Check admin alerts
- [ ] Test concurrent orders
- [ ] Verify stock reservation expiry

### Test Data

After running `npm run seed`:
- **150 products** across 6 categories
- **Demo cart** with 3 items for user `demo-user`
- Various stock levels and thresholds

---

## 🚢 Deployment

### Backend (Node.js)

**Recommended**: Railway, Render, or Heroku

```bash
# Build
npm run build

# Start
npm start
```

### Frontend (React)

**Recommended**: Vercel, Netlify, or Cloudflare Pages

```bash
# Build
npm run build

# Output in dist/ folder
```

### Database

**Recommended**: MongoDB Atlas (free tier available)

1. Create cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Update `MONGODB_URI` in backend `.env`

---

## 🎯 Features Roadmap

### Planned Features
- [ ] User authentication (JWT)
- [ ] Payment gateway integration (Stripe)
- [ ] Order history for users
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Email notifications
- [ ] Admin dashboard analytics
- [ ] Inventory management UI
- [ ] Multi-currency support
- [ ] Product recommendations

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow ESLint rules
- Write meaningful commit messages
- Add comments for complex logic

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - Initial work

---

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB for the flexible database
- TailwindCSS for the utility-first CSS
- Lucide for the beautiful icons

---

## 📞 Support

For support, email support@surestock.com or open an issue on GitHub.

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Built with ❤️ using TypeScript, React, and Node.js**
