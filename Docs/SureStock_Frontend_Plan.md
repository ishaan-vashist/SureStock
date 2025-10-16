# SureStock Frontend - Implementation Plan

**React + Vite + Tailwind + TypeScript**

Complete frontend implementation guide with backend API context.

---

## 📋 Quick Reference

### Backend API Base URL
```
Development: http://localhost:8080/api
Production: https://your-backend.render.com/api
```

### Authentication
All endpoints require `x-user-id` header:
```typescript
headers: { 'x-user-id': 'demo-user' }
```

---

## 1. Complete API Reference

### Cart APIs

```typescript
// Get cart
GET /cart
Response: {
  items: Array<{
    productId: string;
    qty: number;
    product: {
      _id: string;
      sku: string;
      name: string;
      priceCents: number;
      stock: number;
      reserved: number;
      available: number; // stock - reserved
      image: string;
    };
  }>;
  total: number; // in cents
}

// Add/Update item (qty: 1-5)
POST /cart
Body: { productId: string, qty: number }

// Update quantity (qty: 1-5)
PATCH /cart/:productId
Body: { qty: number }

// Remove item
DELETE /cart/:productId
```

### Checkout APIs

```typescript
// Reserve stock (10 minute TTL)
POST /checkout/reserve
Body: {
  address: {
    name: string;
    phone: string; // 10 digits
    line1: string;
    city: string;
    state: string;
    pincode: string; // 6 digits
  };
  shippingMethod: 'standard' | 'express';
}
Response: {
  reservationId: string;
  expiresAt: string; // ISO date
}
Errors:
  400 - Validation failure
  409 - Insufficient stock

// Get reservation
GET /checkout/reservation/:id
Response: {
  _id: string;
  status: 'active' | 'consumed' | 'expired';
  items: Array<{ productId, sku, name, priceCents, qty }>;
  address: {...};
  shippingMethod: string;
  expiresAt: string;
  isValid: boolean;
}

// Confirm order (requires Idempotency-Key header)
POST /checkout/confirm
Headers: { 'Idempotency-Key': 'uuid-v4' }
Body: { reservationId: string }
Response: {
  orderId: string;
  status: 'created';
}
Errors:
  410 - Reservation expired
  409 - Idempotency key reused
```

---

## 2. Tech Stack

```bash
# Create project
npm create vite@latest frontend -- --template react-ts

# Core dependencies
npm install react-router-dom axios
npm install react-hook-form zod @hookform/resolvers/zod
npm install lucide-react date-fns uuid
npm install -D @types/uuid

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Environment (.env)
```env
VITE_API_URL=http://localhost:8080/api
VITE_USER_ID=demo-user
```

---

## 3. Project Structure

```
src/
├── api/
│   ├── client.ts        # Axios instance
│   ├── cart.ts          # Cart API calls
│   └── checkout.ts      # Checkout API calls
├── components/
│   ├── cart/
│   │   ├── CartItem.tsx
│   │   └── CartSummary.tsx
│   ├── product/
│   │   ├── ProductCard.tsx
│   │   └── StockBadge.tsx
│   ├── checkout/
│   │   ├── AddressForm.tsx
│   │   ├── ShippingSelector.tsx
│   │   └── CountdownTimer.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Toast.tsx
│       └── Loading.tsx
├── pages/
│   ├── CatalogPage.tsx
│   ├── CartPage.tsx
│   ├── CheckoutPage.tsx
│   ├── ConfirmPage.tsx
│   └── OrderSuccessPage.tsx
├── hooks/
│   ├── useCart.ts
│   ├── useCountdown.ts
│   └── useToast.ts
├── utils/
│   ├── format.ts
│   └── validation.ts
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

---

## 4. Pages Implementation

### Page 1: Catalog (`/`)

**Features**:
- Product grid (responsive: 1-4 columns)
- Each product card shows:
  - Image, name, price
  - Stock badge: "Only X left" (if available < 10)
  - "Out of Stock" (if available === 0)
  - Add to cart button (disabled if no stock)
- Toast on add success/error

**API**: `GET /cart` (to get products from cart items)

**State**:
```typescript
const [products, setProducts] = useState<Product[]>([]);
const { addItem } = useCart();
```

---

### Page 2: Cart (`/cart`)

**Features**:
- List all cart items
- Each item shows:
  - Image, name, price
  - Quantity stepper (1-5)
  - Remove button
  - Stock badge
  - Subtotal
- Running total at bottom
- "Checkout" button (disabled if empty)
- Empty state with "Browse Products" link

**APIs**:
- `GET /cart` (on mount)
- `PATCH /cart/:productId` (on qty change)
- `DELETE /cart/:productId` (on remove)

---

### Page 3: Checkout (`/checkout`)

**Features**:
- Address form (all fields required):
  - Name, Phone (10 digits), Address, City, State, Pincode (6 digits)
- Shipping selector:
  - Standard (Free) - 5-7 days
  - Express ($9.99) - 2-3 days
- Order summary (items, subtotal, shipping, total)
- "Reserve Stock" button
- On success: navigate to `/confirm/:reservationId`
- On 409: show "Item went out of stock" toast

**API**: `POST /checkout/reserve`

**Validation** (Zod):
```typescript
const schema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/),
  line1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/),
});
```

---

### Page 4: Confirm (`/confirm/:reservationId`)

**Features**:
- **Countdown timer** (MM:SS format)
  - Red/warning when < 2 minutes
  - Auto-redirect when expired
- Show reservation details:
  - Items with prices
  - Shipping address
  - Total amount
- Generate UUID for idempotency (once, store in localStorage)
- "Confirm Order" button
- On success: navigate to `/order/:orderId`
- On 410: show "Reservation expired" toast

**APIs**:
- `GET /checkout/reservation/:id` (on mount)
- `POST /checkout/confirm` (with Idempotency-Key header)

**Countdown Hook**:
```typescript
const useCountdown = (expiresAt: string) => {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  return {
    minutes: Math.floor(timeLeft / 60),
    seconds: timeLeft % 60,
    isExpired: timeLeft === 0,
    isWarning: timeLeft < 120,
  };
};
```

---

### Page 5: Order Success (`/order/:orderId`)

**Features**:
- Show order confirmation
- Display:
  - Order ID
  - Order timestamp
  - Items ordered
  - Shipping address
  - Total paid
- "Continue Shopping" button → navigate to `/`
- Clear reservation data from localStorage

---

## 5. Key Components

### StockBadge
```typescript
interface StockBadgeProps {
  available: number;
  threshold?: number; // default 10
}

// Shows:
// - "Out of Stock" (red) if available === 0
// - "Only X left" (orange) if available < threshold
// - Nothing if available >= threshold
```

### CountdownTimer
```typescript
interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

// Displays: "09:45"
// Red color if < 2 minutes
```

### Toast
```typescript
const { showToast } = useToast();
showToast({ 
  type: 'success' | 'error' | 'warning', 
  message: string 
});
```

---

## 6. API Client Setup

```typescript
// api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  config.headers['x-user-id'] = import.meta.env.VITE_USER_ID;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || 'Error';
    return Promise.reject({ 
      status: error.response?.status, 
      message 
    });
  }
);

export default apiClient;
```

---

## 7. Error Handling

```typescript
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  404: 'Not found',
  409: 'Item went out of stock. Please adjust your cart.',
  410: 'Reservation expired. Please reserve again.',
  500: 'Server error. Please try again.',
};

// Usage
try {
  await cartApi.addItem(productId, qty);
  showToast({ type: 'success', message: 'Added!' });
} catch (error: any) {
  showToast({ 
    type: 'error', 
    message: ERROR_MESSAGES[error.status] || error.message 
  });
}
```

---

## 8. Important Notes

### Idempotency Key
- Generate once per reservation: `crypto.randomUUID()`
- Store in localStorage: `idempotency-key-${reservationId}`
- Use same key for retries
- Clear after successful order

### Countdown Timer
- Start from `expiresAt` (backend provides)
- Update every second
- Show warning at < 2 minutes
- Auto-redirect on expiry

### Stock Availability
- Always use `available` field (not `stock`)
- Show "Only X left" badge if < 10
- Disable actions if === 0

### Cart Clearing
- Backend clears cart automatically on confirm
- Refetch cart after successful order

---

## 9. Deployment

### Build
```bash
npm run build
```

### Vercel
```bash
vercel --prod
```

### Environment Variables (Vercel)
```
VITE_API_URL=https://your-backend.render.com/api
VITE_USER_ID=demo-user
```

---

## 10. Testing Checklist

- [ ] Add item to cart from catalog
- [ ] Update quantity in cart
- [ ] Remove item from cart
- [ ] Proceed to checkout with valid address
- [ ] Reserve stock successfully
- [ ] See countdown timer (10:00)
- [ ] Confirm order with idempotency
- [ ] See order success page
- [ ] Handle 409 error (out of stock)
- [ ] Handle 410 error (reservation expired)
- [ ] Test countdown expiry behavior
- [ ] Test idempotent retry (same key)

---

**Ready to build! All backend APIs are tested and working. Follow this plan page-by-page for smooth development.** 🚀
