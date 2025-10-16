# SureStock — Implementation Plan
**Inventory-Aware Checkout with Stock Reservation & Concurrency Safety (MERN, MongoDB)**

This document provides a complete, code‑free implementation plan for **SureStock**, mapping 1:1 to the assignment’s requirements. It covers architecture, data model, API behaviors, concurrency & idempotency strategy, reservations & TTL, low‑stock alerts, UI flows, seeding, tests, deployment, observability, and acceptance mapping.

---

## 1) Objectives & Success Criteria

### User flows
- Persisted per-user **Cart** with add/update/remove and quantity rules (1–5).
- **Checkout** sequence: cart review → address & shipping → **stock reservation (10‑minute TTL)** → **confirm** to create Order, decrement inventory, and clear Cart.
- Users always see **accurate availability** and get clear errors: **409 Conflict** (insufficient stock) and **410 Gone** (reservation expired). **No partial fulfillment** — reservation is all‑or‑nothing.

### System behaviors
- **Oversell prevention** under concurrency.
- **Idempotent** checkout confirm (safe to retry).
- **Low‑stock alerts** when post‑order stock falls below threshold.

### Deliverables
- Deployed demo (FE + BE), public GitHub repo, README, ≥6 API tests, Loom ≤3 min.

---

## 2) Architecture & Components

- **Frontend**: React (Vite) + Tailwind; communicates with API via `VITE_API_URL`.
- **Backend**: Node + Express (TypeScript recommended).
- **Database**: MongoDB Atlas (replica set enabled → ACID transactions).
- **Auth**: Minimal mock via `x-user-id` header (all data scoped to this user id).
- **Background worker**: Cron-like job in the API process to expire reservations and release holds.
- **Hosting**:
  - FE: Vercel or Netlify
  - BE: Render or Railway
  - DB: MongoDB Atlas (free tier)

**Key design choices**
- Availability computed as **`available = stock − reserved`**.
- **DB‑only soft holds** using guarded, atomic updates within **Mongo transactions**.
- **Deterministic product ordering** inside multi‑line transactions to reduce deadlocks.
- **Idempotency** at `/confirm` using a dedicated store keyed by `userId + endpoint + Idempotency-Key`.

---

## 3) Data Model (collections & fields)

> Design only — no code.

### `products`
- Fields: `_id`, `sku` (unique), `name`, `priceCents`, `stock` (committed units), `reserved` (soft holds), `lowStockThreshold`, `image`, `createdAt`.
- Indexes: unique on `sku`; supporting indexes on `createdAt` and projections on `stock/reserved` as needed.

### `carts`
- Fields: `_id`, `userId` (one active cart per user), `items` (array of `{ productId, qty }`), `createdAt`, `updatedAt`.
- Rules: `qty` integer in `[1,5]`.
- Indexes: unique on `userId`.

### `reservations`
- Fields: `_id`, `userId`, `status` (`active | consumed | expired | cancelled`), `address` (snapshot), `shippingMethod`, `items` (array of product snapshots with qty & price), `expiresAt` (`now + 10m`), `createdAt`, optional `idempotencyKey`.
- Indexes: `{ status, expiresAt }` for GC sweep; `{ userId, status }` for queries.

### `orders`
- Fields: `_id`, `userId`, `status` (`created | cancelled`), `address`, `shippingMethod`, `items` (snapshot), `totalCents`, `createdAt`.
- Indexes: `{ userId, createdAt }`.

### `low_stock_alerts`
- Fields: `_id`, `productId`, `stockAfter`, `threshold`, `processed` (boolean), `createdAt`.
- Indexes: `{ processed, createdAt }`.

### `idempotency_keys`
- Fields: `_id`, `userId`, `endpoint` (e.g., `/api/checkout/confirm`), `key` (from header), `requestHash`, `status` (`in_progress | succeeded | failed`), `response` (stored result), `createdAt`.
- Indexes: unique compound `{ userId, endpoint, key }`.

---

## 4) Availability, Reservation & Concurrency Strategy

**Invariant**: `available = stock − reserved` must never be negative.

### Reservation (all‑or‑nothing)
- On reserve request, start a **transaction**.
- For each cart line (**sorted by product id** to reduce deadlocks):
  - Perform a **conditional, atomic update** that increases `reserved` by `qty` **only if** current `(stock − reserved) ≥ qty`.
  - If **any** product fails this condition, **abort** the transaction → reservation fails with **409 Conflict** (no partial holds).
- On success, create a `reservation` document with item and price snapshots and `expiresAt = now + 10 minutes`, set `status='active'`, then commit.

### Confirm (commit stock)
- Start a **transaction**.
- Ensure the reservation belongs to the user, is `active`, and `expiresAt > now`. If not, **410 Gone**.
- For each line (sorted), perform a guarded, atomic update that **decreases** both `reserved` and `stock` by `qty` **only if** both current values are ≥ `qty`.
- Create an `order` document, mark reservation `consumed`, **clear the user’s cart**.
- For each affected product, if `stock < lowStockThreshold`, create a `low_stock_alert`.
- Commit the transaction.

### Expire / Cancel
- Background **GC job** runs every minute:
  - Select reservations with `status='active'` and `expiresAt ≤ now`.
  - For each, in a transaction:
    - For each item, **decrease `reserved` by `qty`** (guarded to avoid negative values).
    - Update reservation `status='expired'`.
  - Optional: archive or delete expired reservations later.

**Oversell prevention guarantee**
- Every availability change uses **conditional, atomic updates inside a transaction**. Failed conditions abort the operation cleanly.
- Deterministic product order in multi‑line transactions reduces deadlock risk.
- No external cache is needed; MongoDB is the single source of truth.

---

## 5) Idempotency (checkout confirm)

- Require header: `Idempotency-Key: <uuid>`.
- Compute a stable **hash of request payload** (e.g., `{ reservationId }`).
- On `/confirm`:
  1) Create or fetch an idempotency record for `{ userId, endpoint, key }`.
  2) If `status='succeeded'` and the stored request hash matches, **return the stored response** (exact replay).
  3) If a record exists but the request hash differs, return **409 Conflict** (“Key reused for different payload”).
  4) Otherwise, mark `in_progress`, run the transactional confirm flow, persist `succeeded` with response; on failure mark `failed`.

This ensures retries are safe and never duplicate orders or double‑decrement inventory.

---

## 6) API Design (contract & behaviors)

All endpoints require `x-user-id`. Errors return `{ error: "message" }`.

### Cart
- `GET /api/cart` → Returns consolidated view: items with product snapshot (`sku`, `name`, `priceCents`, `stock`, `reserved`, computed `available`) and `total`.
- `POST /api/cart` body `{ productId, qty }` → Upsert one line; enforce `qty ∈ [1,5]`; reject invalid ids/qty.
- `PATCH /api/cart/:productId` body `{ qty }` → Update qty; enforce bounds.
- `DELETE /api/cart/:productId` → Remove line.

### Reservation & Checkout
- `POST /api/checkout/reserve` body `{ address, shippingMethod }`  
  - Validations: non‑empty cart; required address fields; shipping in allowed set.
  - **Transactional** reservation for **all** lines (or none).
  - Creates `reservation` with item & price snapshots, TTL 10m, `status='active'`.
  - Response: `{ reservationId, expiresAt }`.
  - Errors: `400` (cart empty/invalid input), `409` (insufficient availability).
- `POST /api/checkout/confirm` headers `Idempotency-Key` body `{ reservationId }`  
  - Idempotency handling as above.
  - Validate reservation active & not expired.
  - **Transactional** commit: decrement `stock` and `reserved`, create `order`, clear cart, insert low‑stock alerts.
  - Response: `{ orderId, status: "created" }`.
  - Errors: `410` (expired/invalid reservation), `409` (rare guard failure), `409` (idempotency misuse).

### Admin
- `GET /api/admin/low-stock-alerts?processed=false` → list unprocessed alerts, newest first.
- `POST /api/admin/low-stock-alerts/:id/ack` → mark `processed=true`.

**HTTP status codes**
- `400 Bad Request` — validation failures.
- `409 Conflict` — insufficient stock (reserve/commit) or idempotency key misuse.
- `410 Gone` — reservation expired or already consumed.
- `500` — unexpected errors.

---

## 7) Frontend UX Plan

### Catalog
- Grid of products: image, name, price; “Add to cart” actions.
- Optional filter/search.

### Cart
- Item rows with image, name, price, quantity stepper (1–5), remove; running subtotal.
- **Badge** “Only N left” using `available = stock − reserved` from API.
- CTA **“Proceed to Checkout”**.

### Checkout
- Address form (name, phone, address line 1, city, state, pincode).
- Shipping selector (`standard | express`) with fees in summary.
- Button **“Reserve stock (10 minutes)”**.
- On success: display reservation id and a visible **countdown (10:00 → 0:00)**.

### Confirm
- Button **“Confirm order”** (sends `/confirm` with `Idempotency-Key`).
- On success: Order confirmation view showing `orderId`, items, and totals.

### Error UX
- **409** on reserve/confirm → toast: “Item went out of stock — please adjust your cart.”
- **410** on confirm → toast: “Reservation expired — please reserve again.”
- Validation errors → inline messages; disable confirm until form is valid.

---

## 8) Seeding Strategy

- **120–200 products** in **6 categories × ~10 brands**.
- `priceCents`: 199 to 1,999,900; `stock`: 0 to 150; `lowStockThreshold`: 5 to 15.
- Use placeholder images.
- Initialize a starter `cart` for `demo-user` with 2–4 items to accelerate demos.

---

## 9) Testing Plan (≥ 6 API tests)

> Use Jest + Supertest against a test Atlas DB (transactions enabled).

1. **Cart CRUD & totals** — add, update, remove; enforce quantity rules; verify totals.
2. **Reserve success** — sufficient availability reserves correctly; response includes `expiresAt ~ now + 600s`; product `reserved` increases accordingly.
3. **Reserve failure under race** — two competing reserves exceed availability; exactly one succeeds (200), the other returns **409**; no partial holds exist.
4. **Confirm success** — after reserve, confirm once; order created; cart cleared; product `stock` reduced by total qty; `reserved` returns to 0 for those lines.
5. **Idempotent confirm** — call confirm twice with the same `Idempotency-Key`; both return the same `orderId`; no duplicate orders; inventory updates only once.
6. **Concurrency on confirm** — prepare multiple reservations against limited stock; fire many confirms in parallel; only the **allowable number** succeed (others **409**); final inventory is consistent.
7. **Low‑stock alerts** — after confirm drives `stock` below threshold, alert exists and is returned by admin list; ack marks it processed.
8. **GC expiry** — create a reservation with past `expiresAt`; run GC; verify reservation → `expired` and product `reserved` decremented.

(*At least 6 required — 8 planned for robustness.*)

---

## 10) Deployment Plan

- **MongoDB Atlas**: create cluster; obtain `MONGODB_URI` with replica set (transactions enabled).
- **Backend** (Render/Railway):
  - Environment: `MONGODB_URI`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`.
  - Healthcheck: `/api/healthz`.
  - CORS: restrict to FE origin.
  - Rate-limit: apply to `/api/checkout/*`.
- **Frontend** (Vercel/Netlify):
  - Environment: `VITE_API_URL=https://<backend-host>/api`.
  - Build & deploy; ensure HTTPS to avoid mixed content.

---

## 11) Observability, Performance & Security

**Logging & metrics**
- Log structured events: reservation created/expired/consumed, confirm attempts, low‑stock emitted.
- Track counters: `reservation_attempts/success/fail`, `confirm_success/fail`, `oversell_prevented`, `expired_releases`.
- Track basic latency (p95) for reserve/confirm.

**Indices & throughput**
- Unique `sku` for fast product lookups.
- Deterministic product ordering in transactions to reduce deadlocks.
- Index `{ status, expiresAt }` to accelerate GC scans.

**Validation & security**
- Server‑side validation of all payloads; sanitize address fields.
- Scope every data access by `userId` from `x-user-id` header.
- CORS restricted to FE origin; basic rate limiting.
- Only expose `reserved` when needed for UX; otherwise prefer `available` in responses.

---

## 12) Repository Structure (organization)

```
SureStock/
  client/              # React + Vite + Tailwind
    src/pages          # Catalog, Cart, Checkout, Confirm, Order
    src/components     # QtyStepper, Timer, Toast
    src/lib            # API client wrappers
  server/              # Express + Mongoose
    src/middleware     # user header, validation, errors, rate limit, CORS
    src/models         # Product, Cart, Reservation, Order, Alert, Idempotency
    src/routes         # cart, checkout, admin, health
    src/services       # cart, reservation, order, GC worker
    scripts/           # seed data
  README.md
  .env.example
```

---

## 13) Environment Variables (template)

- **Backend**: `MONGODB_URI`, `PORT` (default 8080), `NODE_ENV` (`production`/`development`), `CORS_ORIGIN` (FE URL).
- **Frontend**: `VITE_API_URL`.

---

## 14) Two‑Day Timeline (fits 12–16 hrs with tight focus)

**Day 1**
- Provision Atlas; define collections & indexes; seed 120–200 products.
- Cart endpoints & validations.
- Reservation flow (transactions + conditional increments).
- FE pages for Catalog/Cart/Checkout (reserve step with visible timer).
- Deploy FE+BE first cut; wire CORS and healthcheck.

**Day 2**
- Confirm with idempotency; order creation; cart clear; low‑stock alerts.
- GC worker for expiries.
- ≥6 tests including concurrency & idempotency.
- UI polish (badges, countdown, error toasts); empty states.
- Loom (≤3 min) and finalize README with design decisions & test instructions.

---

## 15) Loom Walkthrough Script (≤3 minutes)

1) Show catalog → add items to cart; “Only N left” badge visible.
2) Open cart → proceed to checkout; enter address & shipping.
3) Click **Reserve** → show reservation id + **10:00 timer**.
4) Click **Confirm** → success screen with order id.
5) Show admin endpoint returning a low‑stock alert for an item that dipped below its threshold.
6) (Optional) Briefly show the race test output proving oversell is prevented.

---

## 16) Acceptance Criteria Mapping (checklist)

- Cart CRUD works and persists per `x-user-id`. ✅
- `POST /api/checkout/reserve` makes an **active** reservation with **expiresAt = now + 10m** (no partials). ✅
- `POST /api/checkout/confirm` is **idempotent** and **prevents oversell** under concurrency. ✅
- Inventory decremented correctly; reservation consumed; cart cleared on success. ✅
- Low‑stock alerts created when `stock < threshold` and listable/ackable via admin endpoints. ✅
- README: setup, seed, run, deploy, tests; Loom included. ✅
- ≥ **6 API tests** cover cart, reservation, conflicts, confirm, idempotency, GC, low‑stock alerts. ✅

---

## 17) Trade‑offs & Future Enhancements

- **DB‑only reservations** keep the system simple and reliable; Redis could be added later for ultra‑high throughput reads.
- Keeping `reserved` alongside `stock` simplifies availability math and guarded updates.
- Future: payments integration & webhooks (SAGA/outbox), multi‑warehouse allocation, discounting/promotions, OpenAPI docs, alert dashboard, advanced catalog search, and analytics.
