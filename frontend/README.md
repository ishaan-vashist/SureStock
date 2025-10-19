# 🎨 SureStock Frontend

Modern React-based e-commerce frontend with real-time inventory management and responsive design.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 📦 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **TailwindCSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons

---

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── api/                    # API client functions
│   │   ├── client.ts          # Axios instance
│   │   ├── products.ts        # Product API
│   │   ├── cart.ts            # Cart API
│   │   ├── checkout.ts        # Checkout API
│   │   └── admin.ts           # Admin API
│   │
│   ├── components/            # React components
│   │   ├── common/           # Reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/           # Layout components
│   │   │   └── Navbar.tsx
│   │   ├── product/          # Product components
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductFilters.tsx
│   │   │   └── StockBadge.tsx
│   │   ├── cart/             # Cart components
│   │   │   └── CartItem.tsx
│   │   ├── checkout/         # Checkout components
│   │   │   ├── AddressForm.tsx
│   │   │   ├── ShippingSelector.tsx
│   │   │   └── CheckoutSummary.tsx
│   │   └── home/             # Home page components
│   │       └── CategoryCard.tsx
│   │
│   ├── pages/                # Page components
│   │   ├── HomePage.tsx
│   │   ├── ItemsPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── OrderSuccessPage.tsx
│   │   └── AdminAlertsPage.tsx
│   │
│   ├── layouts/              # Layout wrappers
│   │   └── AppLayout.tsx
│   │
│   ├── hooks/                # Custom React hooks
│   │   └── useProductFilters.ts
│   │
│   ├── utils/                # Utility functions
│   │   ├── format.ts         # Formatting helpers
│   │   └── urls.ts           # Route builders
│   │
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   │
│   ├── data/                 # Static data
│   │   └── categories.ts
│   │
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
│
├── public/                   # Static assets
├── index.html               # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🎯 Key Features

### 🛍️ Shopping Experience
- Product browsing with grid layout
- Real-time search functionality
- Advanced filtering (category, price, stock)
- Sorting options
- Responsive design (mobile, tablet, desktop)

### 🛒 Cart Management
- Add/remove items
- Update quantities
- Real-time total calculation
- Stock availability warnings
- Persistent cart state

### 💳 Checkout Flow
- Address form with validation
- Shipping method selection
- 10-minute stock reservation display
- One-click order placement
- Order confirmation page

### 👨‍💼 Admin Features
- Low stock alerts dashboard
- Filter unprocessed alerts
- Acknowledge alerts

---

## 🔌 API Integration

### Base URL Configuration

Set in `.env`:
```env
VITE_API_URL=http://localhost:8080/api
```

### API Client

All API calls use a centralized Axios instance with:
- Automatic error handling
- Request/response interceptors
- Mock user ID injection

```typescript
// Example: Add to cart
import { addItem } from './api/cart';

await addItem(productId, quantity);
```

---

## 🎨 Styling

### TailwindCSS

Utility-first CSS framework with custom configuration:

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: '#3b82f6',
      // ... more colors
    }
  }
}
```

### Component Patterns

```tsx
// Consistent styling patterns
<Button variant="primary" size="lg">
  Click Me
</Button>

<Card className="shadow-md hover:shadow-lg">
  Content
</Card>
```

---

## 🧩 Components

### Common Components

#### Button
```tsx
<Button 
  variant="primary" 
  size="lg"
  isLoading={loading}
  disabled={disabled}
>
  Submit
</Button>
```

#### Loading
```tsx
<Loading text="Loading products..." />
```

#### Toast
```tsx
toast.success('Item added to cart!');
toast.error('Failed to load products');
```

### Product Components

#### ProductCard
```tsx
<ProductCard 
  product={product}
  onAddToCart={handleAddToCart}
/>
```

#### StockBadge
```tsx
<StockBadge available={product.available} />
```

---

## 🔄 State Management

### Local State (useState)
- Component-level state
- Form inputs
- Loading states

### URL State (useSearchParams)
- Search queries
- Filter parameters
- Pagination

### Global State (Context)
- Toast notifications
- User session (future)

---

## 🛣️ Routing

### Routes

```typescript
/ - Home page
/items - Product listing
/cart - Shopping cart
/checkout - Checkout page
/order/:orderId - Order success
/admin/alerts - Admin alerts
```

### Navigation

```tsx
import { routes } from './utils/urls';

navigate(routes.cart());
navigate(routes.order(orderId));
```

---

## 📱 Responsive Design

### Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### Mobile-First Approach

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

---

## 🔧 Development

### Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Environment Variables

```env
VITE_API_URL=http://localhost:8080/api
```

### Hot Module Replacement

Vite provides instant HMR for fast development.

---

## 🧪 Testing

### Manual Testing

1. **Product Browsing**
   - Search products
   - Apply filters
   - Sort results

2. **Cart Operations**
   - Add items
   - Update quantities
   - Remove items

3. **Checkout Flow**
   - Fill address
   - Select shipping
   - Place order

4. **Responsive Design**
   - Test on mobile (< 768px)
   - Test on tablet (768px - 1024px)
   - Test on desktop (> 1024px)

---

## 🚀 Build & Deploy

### Production Build

```bash
npm run build
```

Output: `dist/` folder

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify

```bash
# Build
npm run build

# Deploy dist/ folder via Netlify UI
```

### Environment Variables (Production)

Set in deployment platform:
```
VITE_API_URL=https://your-api.com/api
```

---

## 🎨 Design System

### Colors

```
Primary: #3b82f6 (Blue)
Success: #10b981 (Green)
Warning: #f59e0b (Orange)
Error: #ef4444 (Red)
```

### Typography

```
Headings: font-bold
Body: font-normal
Small: text-sm
Large: text-lg
```

### Spacing

```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
```

---

## 📚 Best Practices

### TypeScript

- Define interfaces for all props
- Use strict mode
- Avoid `any` type

### React

- Use functional components
- Leverage hooks (useState, useEffect, etc.)
- Keep components small and focused

### Performance

- Lazy load images
- Debounce search inputs
- Memoize expensive calculations

### Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation

---

## 🐛 Common Issues

### Issue: API calls failing

**Solution**: Check `VITE_API_URL` in `.env`

### Issue: Styles not applying

**Solution**: Restart dev server after Tailwind config changes

### Issue: Build errors

**Solution**: Clear `node_modules` and reinstall
```bash
rm -rf node_modules
npm install
```

---

## 📖 Learn More

- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🤝 Contributing

1. Follow existing code style
2. Use TypeScript types
3. Test on multiple screen sizes
4. Write meaningful commit messages

---

**Built with ❤️ using React, TypeScript, and TailwindCSS**
