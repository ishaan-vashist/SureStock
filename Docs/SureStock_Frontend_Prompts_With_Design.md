# SureStock — Frontend Windsurf Prompts (with UI Design Layout)

> Paste each prompt into Windsurf (or your AI pair-programmer) to generate **frontend** code, tests, and docs for **SureStock**.  
> Stack: **React + Vite + TypeScript + TailwindCSS + React Router + Axios**.  
> These prompts align with the backend (idempotent confirm, 10-minute reservations, low-stock alerts) and add a UI design layout: **Home**, **Items (with filters)**, **Cart**, **Checkout**, **Confirm**, **Order**, **Admin**.

---

## Global Meta-Prompt (paste once before Phase 0)

```
You are a senior frontend engineer and meticulous delivery partner. Project: "SureStock". Stack: React 18 + Vite + TypeScript + TailwindCSS + React Router + Axios.

Backend (fixed):
- All endpoints require header x-user-id.
- Confirm requires Idempotency-Key (UUID).
- Reservation TTL is 10 minutes.
- Error codes: 400 (validation), 409 (insufficient stock / idempotency misuse), 410 (reservation expired).
- Backend is complete and deployed.

Non-negotiables:
- Use .env vars: VITE_API_URL, VITE_USER_ID.
- Central API client with axios interceptors to inject x-user-id and normalize errors.
- Page set: Home (/), Items (/items), Cart (/cart), Checkout (/checkout), Confirm (/confirm/:reservationId), Order (/order/:orderId), Admin Alerts (/admin/alerts), 404.
- Reusable UI system (Button, Input, Select, Badge, Toast, Modal, Loading).
- Responsive, accessible (keyboard + ARIA), and production-lean.
- Countdown timer on Confirm (MM:SS; warn < 2:00; handle expiry UX).

Deliverables per phase:
- Create/modify files in client/ (or frontend/) exactly as asked.
- After each phase, summarize changes (bullets) and list follow-ups.
- Keep commits small and meaningful.
```

---

## Phase 0 — Project Scaffolding & Tailwind Tokens

```
Goal: Initialize Vite + React + TS + Tailwind; define design tokens and base layout.

Tasks:
1) Create app in client/ (or frontend/). Install deps:
   react-router-dom, axios, react-hook-form, zod, @hookform/resolvers, uuid, date-fns, lucide-react.
2) Tailwind setup: content paths, base styles, and extend theme with tokens:
   - Colors: primary (#2563eb), primary-foreground, muted, muted-foreground, success, warning, error.
   - Radius: 12px default; card rounded-2xl.
   - Shadows: sm, md, lg.
3) .env.example: VITE_API_URL, VITE_USER_ID (default 'demo-user').
4) App shell:
   - Top Navbar with brand "SureStock", Search input, Cart icon with item count, "Shop" link to /items.
   - Footer with simple links (About, Admin Alerts, GitHub).
5) Scripts: dev, build, preview, lint.

DoD:
- App runs, Tailwind utilities render, tokens visible in sample components.
```

---

## Phase 1 — Routing, Layout & Core UI

```
Goal: Router + shared layout + atoms.

Create:
- src/layouts/AppLayout.tsx: header (brand, search, nav), <Outlet />, footer.
- src/components/ui/{Button,Input,Select,Badge,Toast,Loading,Modal}.tsx
- src/utils/{format.ts (price,date), storage.ts (localStorage helpers), urls.ts (route builders)}

Routes:
- "/", "/items", "/cart", "/checkout", "/confirm/:reservationId", "/order/:orderId", "/admin/alerts", "*" (404).

Accessibility:
- Keyboard nav, focus outlines, aria-live for toasts, alt text for images.

DoD:
- Navigation works; atoms reusable; base layout responsive.
```

---

## Phase 2 — API Client, Types & Error Normalization

```
Goal: Centralize API calls and type them.

Create:
- src/api/client.ts: axios instance with baseURL from VITE_API_URL; request interceptor injects x-user-id from VITE_USER_ID; response interceptor normalizes errors to { status, message }.
- src/types/index.ts: Product, Cart, CartItemView, Reservation, Address, Order, Alert types.
- src/api/cart.ts: getCart, addItem(productId, qty), updateQty(productId, qty), removeItem(productId).
- src/api/checkout.ts: reserve(address, shippingMethod), getReservation(id), confirm(reservationId, idemKey).
- src/api/admin.ts: listAlerts(processed?), ackAlert(id).
- (Optional) src/api/products.ts: listProducts(params?) if backend exposes it; otherwise use a local mock dataset.

Error map:
- 400 → "Invalid request"
- 409 → "Item went out of stock. Please adjust your cart."
- 410 → "Reservation expired. Please reserve again."
- 500 → "Server error. Please try again."

DoD:
- API client injects headers and returns typed results; quick test page logs cart.
```

---

## Phase 3 — Home Page ("/")

```
Goal: Amazon-like welcome with hero, categories, featured products.

Sections:
- Hero: welcoming headline, CTA "Start Shopping" → /items, supporting subtext.
- Categories grid: 6 category cards (icons, titles) → filter link to /items?category=Shoes etc.
- Featured products: 6–12 items (from /products if available; else mock data). Show image, name, price, and "Add to Cart".

UX:
- Simple, fast-loading; mobile-first stacking; fallback images.
- Accessibility: heading hierarchy, descriptive alt text.

DoD:
- Clicking CTA navigates to /items.
- Category card click applies filter on Items page (via router params).
```

---

## Phase 4 — Items Page ("/items") with Filters & Sorting

```
Goal: Showcase all items with client-side filters (fallback) and sorting.

Layout:
- Two-column on desktop: left filter sidebar, right product grid. Single column on mobile with collapsible filters.
- Filters:
  - Search (by name/sku)
  - Category (multi-select chips)
  - Brand (multi-select)
  - Price range (min/max inputs or slider)
  - Availability toggle: In stock only (available > 0)
- Sorting: select "Relevance" (default), "Price: Low → High", "Price: High → Low".
- Pagination: simple "Load more" or numbered pages.

Data:
- If /api/products exists, fetch with query params; else load once then filter client-side from mock list.
- Each card shows StockBadge: "Out of Stock" if available=0; "Only X left" if available < 10.

DoD:
- Filters update the grid; URL reflects current filters (query params); back/forward navigation preserves state.
- Add to Cart shows success/error toasts.
```

---

## Phase 5 — Cart Page ("/cart")

```
Goal: Full cart management consistent with backend.

Behavior:
- Fetch on mount; render rows with image, name, price, qty stepper (1–5), remove.
- Show available = stock − reserved; if unavailable, highlight with warning.
- Summary: subtotal + shipping (from selection later), checkout CTA → /checkout.
- Empty state with link to /items.

DoD:
- Qty bounds enforced; totals correct; remove works; optimistic updates only when safe.
```

---

## Phase 6 — Checkout Page ("/checkout")

```
Goal: Collect address & shipping, then reserve.

Behavior:
- AddressForm (Name, Phone(10), Line1, City, State, Pincode(6)), ShippingSelector ('standard'|'express').
- Cart summary on right; "Reserve Stock (10 minutes)" CTA.
- Submit: POST /api/checkout/reserve; on success route to /confirm/:reservationId (persist expiresAt in route state or storage).
- On 409: toast and highlight the offending items (if known); link back to /cart.

DoD:
- Valid forms reserve; invalid blocked with inline messages; navigation to Confirm works.
```

---

## Phase 7 — Confirm Page ("/confirm/:reservationId")

```
Goal: Show reservation snapshot with countdown; confirm idempotently.

Behavior:
- On mount: fetch reservation snapshot (items, totals, expiresAt).
- CountdownTimer (MM:SS): warning when < 2:00; when expired, disable confirm and show call-to-action to re-reserve.
- Generate (or reuse) UUID Idempotency-Key per reservation; store in localStorage (keyed by reservationId).
- Confirm CTA: POST /api/checkout/confirm with Idempotency-Key; on success go to /order/:orderId.
- Error 410: "Reservation expired"; offer to return to /checkout.

DoD:
- Confirm is idempotent (retries reuse same key).
- Countdown UX accurate; expiry blocks confirm.
```

---

## Phase 8 — Order Success ("/order/:orderId") & Admin Alerts

```
Order Success:
- Show order id, date/time, address, items, totals; CTA "Continue Shopping" → /items.
- Ensure cart refetch on next visit reflects server-cleared cart.

Admin Alerts ("/admin/alerts"):
- Table of low-stock alerts (product, stockAfter, threshold, createdAt, processed).
- Filter: processed=false default; per-row "Ack" button calls POST /api/admin/low-stock-alerts/:id/ack.

DoD:
- Success page reads params and renders; admin list + ack works against live API.
```

---

## Phase 9 — Polish, Accessibility, Deployment

```
Polish:
- Consistent empty/loading/error states.
- Keyboard navigation and focus management; ARIA on toasts and modals.
- Responsive checks: 375px and 1440px.

Perf:
- Code-split routes; image lazy loading; memoize lists where needed.

Deployment:
- Build & deploy to Vercel/Netlify.
- Env vars: VITE_API_URL and VITE_USER_ID configured.

QA checklist:
- Add to cart, qty update, remove, totals.
- Reserve + countdown + confirm retry idempotent.
- 409 and 410 error toasts appear as designed.
- Admin alerts flow works end-to-end.
```

---

## Optional Story Prompts (for component previews)

```
Create simple preview routes or stories:
- /_preview/product-card
- /_preview/address-form
- /_preview/filters
Use mocked props to validate visuals independently from API.
```


---

## UI Wireframes (ASCII) — Desktop & Mobile Sketches

> Use these as visual guides; not pixel-perfect. Keep spacing, alignment, and responsive breakpoints consistent with Tailwind utilities.

### 1) Home ("/") — Desktop
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ NAV: [SureStock]      [Search ☐_________________]      [Shop]   [Cart(2)]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ HERO                                                                    CTA │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Welcome to SureStock                                                │   │
│  │  Shop the best deals today.                                          │   │
│  │  [ Start Shopping ]                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────────┤
│ CATEGORIES (6)                                                              │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐              │
│  │ Icon  │ │ Icon  │ │ Icon  │ │ Icon  │ │ Icon  │ │ Icon  │              │
│  │ Shoes │ │ Bags  │ │ Elec. │ │ Home  │ │ Toys  │ │ More  │              │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘              │
├──────────────────────────────────────────────────────────────────────────────┤
│ FEATURED PRODUCTS (grid 3×2)                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │  [IMG]       │  │  [IMG]       │  │  [IMG]       │  ...                 │
│  │  Name        │  │  Name        │  │  Name        │                      │
│  │  $12.99   [+]│  │  $59.00  [+] │  │  $199.00 [+] │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└──────────────────────────────────────────────────────────────────────────────┘
FOOTER: [About] [Admin Alerts] [GitHub]
```

### 1A) Home — Mobile
```
[☰] SureStock                      [Cart(2)]
[ Search ☐_______________________ ]
[ Start Shopping ]
[Categories ▾]
[Featured ▾]
```

### 2) Items ("/items") with Filters — Desktop
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ NAV ...                                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  FILTERS (left)                     |  LIST (right)                          │
│  ┌───────────────────────────────┐  |  Sort: [ Relevance ▾ ]                │
│  │ Search: ☐___________          │  |  ┌──────────────┐  ┌──────────────┐  │
│  │ Category: [ ] Shoes [ ] ...   │  |  │  [IMG]       │  │  [IMG]       │  │
│  │ Brand:    [ ] BrandA ...      │  |  │  Name        │  │  Name        │  │
│  │ Price:  Min ☐  Max ☐         │  |  │  $xx.xx  [+] │  │  $xx.xx  [+] │  │
│  │ Availability: [✓] In stock    │  |  └──────────────┘  └──────────────┘  │
│  └───────────────────────────────┘  |  [ ◀ Prev ]  1  2  3  [ Next ▶ ]     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2A) Items — Mobile (collapsible filters)
```
SureStock  [Cart]
[ Search ]
[ Filters ▾ ]
Sort: [ Relevance ▾ ]
[CARD][+]
[CARD][+]
[Prev] 1 2 3 [Next]
```

### 3) Cart ("/cart")
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ITEMS (left)                                      |  SUMMARY (right)       │
│  ┌───────────────────────────────────────────────┐  |  Subtotal:   $xxx.xx  │
│  │ [IMG] Name                         $xx.xx     │  |  Shipping:   $x.xx    │
│  │  Qty: [-] 2 [+]     [Remove]      Available: 3│  |  Total:      $xxx.xx  │
│  └───────────────────────────────────────────────┘  |  [ Proceed to Checkout]│
│  (repeat rows)                                       |                      │
└──────────────────────────────────────────────────────────────────────────────┘
Empty state: "Your cart is empty." [Start Shopping]
```

### 4) Checkout ("/checkout")
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ADDRESS & SHIPPING (left)                      |  ORDER SUMMARY (right)     │
│  ┌───────────────────────────────────────────┐  | Items ...                 │
│  │ Name      ☐__________________            │  | Subtotal                  │
│  │ Phone     ☐__________                   │  | Shipping (std/express)    │
│  │ Line1     ☐__________________           │  | Total                     │
│  │ City      ☐__________   State ☐_____    │  | [ Reserve Stock (10m) ]   │
│  │ Pincode   ☐______                      │  |                            │
│  │ Shipping: (•) Standard  ( ) Express    │  |                            │
│  └───────────────────────────────────────────┘  |                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5) Confirm ("/confirm/:reservationId")
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Reservation #ABC123                     Time left: [ 09:21 ]                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Items:                                                                        │
│  - [IMG] Name ×2   $xx.xx                                                     │
│ Address & Shipping:                                                           │
│  John Doe, Line1, City, State - PIN, Phone                                    │
│ Summary: Subtotal, Shipping, Total                                            │
│                                                                              │
│ [ Confirm Order ]    [ Cancel ]                                               │
│ (If expired)  ⚠ Reservation expired. [ Reserve again ]                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6) Order Success ("/order/:orderId")
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✓ Order Confirmed!                   Order ID: ORD-2025-0001                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Items (snapshot)  |  Address  |  Totals                                      │
│                                                                              │
│ [ Continue Shopping ]                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7) Admin Alerts ("/admin/alerts")
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Low-Stock Alerts       [ Show: Unprocessed ▾ ]                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  Product        StockAfter  Threshold   CreatedAt         Processed  [Ack]   │
│  ----------     ----------  ---------   ----------------  ---------  -----   │
│  SKU-123        2           10          2025-10-19 10:01  false      [Ack]   │
│  SKU-456        5           8           2025-10-19 10:02  false      [Ack]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8) 404 Not Found
```
[404] We couldn't find that page.
[Go Home]   [Shop Items]
```
