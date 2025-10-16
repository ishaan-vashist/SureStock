# SureStock — Backend Windsurf Prompts (Copy‑Paste Only)

> Paste each prompt into Windsurf (or your AI pair‑programmer) to generate backend code, tests, and docs for **SureStock**.  
> Stack: **Node 20 + Express + TypeScript + Mongoose 8 + MongoDB Atlas + Jest/Supertest**.

---

## Global Meta‑Prompt (paste once before Phase 0)
```
You are a senior backend engineer and meticulous delivery partner. Project name: "SureStock". Stack: Node 20, Express, TypeScript, Mongoose 8, MongoDB Atlas (replica set), Jest + Supertest.

Non-negotiables:
- Concurrency safety: all availability changes must happen via conditional, atomic updates inside Mongo **transactions**.
- Availability invariant: available = stock − reserved ≥ 0 always.
- Reservation TTL = 10 minutes; no partial reservations.
- Confirm is **idempotent** using Idempotency-Key (UUID) and a document store (userId + endpoint + key).
- Errors: 400 (validation), 409 (insufficient stock, idempotency misuse), 410 (reservation expired), 500 (unexpected).
- All endpoints require x-user-id header.
- Provide small, self-contained commits with messages.
- Provide scripts in package.json to run dev, build, test, seed.
- Keep code production-lean: validation middleware, error handling, logging, rate limiting on /api/checkout/*.
- All DB updates that can deadlock must process items in deterministic productId order.

Deliverables per phase:
- Create/modify files under server/ exactly as asked.
- Explain what changed (bullet points) after edits.
- Add minimal docs in README sections when relevant.
- Add tests when requested and ensure they pass.
```

---

## Phase 0 — Backend Scaffolding & File Structure
```
Create the backend skeleton under server/ with TypeScript.

Requirements:
1) Tooling & scripts
   - package.json with scripts: dev (ts-node-dev or nodemon), build, start, test, lint, seed.
   - tsconfig.json (target ES2022, module commonjs, strict true).
   - eslint + prettier config (basic).

2) App bootstrap
   - src/index.ts boots Express at PORT (from env) and connects to Mongo (MONGODB_URI).
   - src/config/env.ts loads env and validates required vars: MONGODB_URI, PORT, CORS_ORIGIN.
   - src/db/mongoose.ts makes the connection; export connect() helper; configure timeouts.

3) Middleware
   - src/middleware/user.ts: extracts x-user-id; 401 if missing.
   - src/middleware/errors.ts: centralized error handler mapping to { error } shape.
   - src/middleware/cors.ts: allow only CORS_ORIGIN.
   - src/middleware/rateLimit.ts: apply modest rate limit to /api/checkout/*.
   - src/middleware/validate.ts: zod wrapper helper (or lightweight custom).

4) Routing
   - src/routes/health.ts: GET /api/healthz → { ok: true }.
   - src/routes/index.ts: mount /api/* routes; plug middlewares globally.

5) Utilities
   - src/utils/logger.ts: simple console logger (info/error with context).
   - src/utils/hash.ts: requestHash(payload) using sha256.
   - src/utils/time.ts: now(), addMinutes(date, n).

6) README
   - Add a short "Backend setup" section (env, dev run, healthcheck).

Definition of Done:
- pnpm dev runs the server; /api/healthz returns 200.
- Env template: .env.example with MONGODB_URI, PORT, CORS_ORIGIN.
- Linting passes.
```

---

## Phase 1 — Data Model & Indexes
```
Define Mongoose models and indexes under src/models/ and wire model index creation at startup.

Collections & fields:
- Product: sku(unique), name, priceCents, stock, reserved, lowStockThreshold, image, createdAt.
- Cart: userId(unique), items[{ productId, qty }], createdAt, updatedAt.
- Reservation: userId, status('active'|'consumed'|'expired'|'cancelled'), items[{ productId, sku, name, priceCents, qty }], address(any), shippingMethod, expiresAt, createdAt.
- Order: userId, status('created'|'cancelled'), items[snapshots], totalCents, createdAt.
- LowStockAlert: productId, stockAfter, threshold, processed(false), createdAt.
- IdempotencyKey: userId, endpoint('/api/checkout/confirm'), key, requestHash, status('in_progress'|'succeeded'|'failed'), response(any), createdAt.

Indexes (must create):
- Product: sku unique.
- Cart: userId unique.
- Reservation: { status:1, expiresAt:1 }, { userId:1, status:1 }.
- Order: { userId:1, createdAt:-1 }.
- LowStockAlert: { processed:1, createdAt:-1 }.
- IdempotencyKey: { userId:1, endpoint:1, key:1 } unique.

Validation & constraints:
- qty ∈ [1,5] for cart and reservation items.
- priceCents: positive integer.
- computed available = stock − reserved (don’t store).

Deliverables:
- Schemas with types.
- Preflight index creation and logging.
- Update README with a brief ER diagram text.
```

---

## Phase 2 — Seed Data (120–200 products + demo cart)
```
Create scripts/seed.ts and scripts/unseed.ts.

Seed requirements:
- 120–200 products across 6 categories × ~10 brands.
- priceCents: 199–1,999,900; stock: 0–150; lowStockThreshold: 5–15.
- Use placeholder images; deterministic faker seed for reproducibility.
- Create/ensure a Cart for userId 'demo-user' with 2–4 items.

Behavior:
- Seed should be idempotent: either clear first or upsert by sku.
- Print a small summary (counts).

Update package.json to include "seed" and "unseed" scripts.
Document seed procedure in README.
```

---

## Phase 3 — Cart API (CRUD, totals, availability)
```
Implement /api/cart endpoints with validation and snapshots.

Endpoints:
- GET /api/cart
  Returns: { items: [{ productId, sku, name, priceCents, stock, reserved, available, qty }], total }
  Notes: available = stock − reserved.

- POST /api/cart  body: { productId, qty }
  Upsert one line; enforce qty ∈ [1,5].

- PATCH /api/cart/:productId  body: { qty }
  Update qty; enforce bounds.

- DELETE /api/cart/:productId
  Remove line.

Implementation notes:
- Scope by req.userId from x-user-id.
- Compute total from product snapshots at read time (for cart page).

Add basic happy-path tests for Cart endpoints (no concurrency yet).
Document sample cURL requests in README.
```

---

## Phase 4 — Reservation API (10‑min TTL, all‑or‑nothing, transactional)
```
Implement POST /api/checkout/reserve with Mongo transactions.

Input:
- body: { address, shippingMethod }
- validate minimal address fields; shipping ∈ ['standard','express']

Algorithm (single transaction):
- Load user's cart; if empty → 400.
- For each cart item sorted by productId:
  - Conditional atomic reserve: increase reserved by qty **only if** (stock − reserved) ≥ qty.
  - If any update fails (matchedCount=0) → abort and return 409 (no partial holds).
- Create Reservation with item snapshots (sku, name, priceCents, qty), expiresAt = now + 10m, status='active'.

Response:
- { reservationId, expiresAt }

Tests:
- Reserve success: verify reserved increments and TTL ~600s.
- Reserve race: simulate two reserves exceeding availability → exactly one 200, one 409; verify no partial holds exist.
Update README with reserve flow explanation and error codes.
```

---

## Phase 5 — Confirm API (idempotent, transactional commit, alerts)
```
Implement POST /api/checkout/confirm with Idempotency-Key.

Headers: x-user-id, Idempotency-Key: <uuid>
Body: { reservationId }

Idempotency flow:
- Compute requestHash for body.
- Upsert/find IdempotencyKey { userId, endpoint:'/api/checkout/confirm', key }.
  - If status='succeeded' and requestHash matches → replay stored response.
  - If record exists and requestHash differs → 409 (key reuse for different payload).
  - Else mark in_progress and continue.

Transactional commit:
- Validate reservation belongs to user, status='active', expiresAt > now; else 410.
- For each reservation item (sorted):
  - Conditional atomic commit: reserved -= qty; stock -= qty (both must be ≥ qty).
  - If any fails → 409 (rare).
- Create Order (from snapshots) with totalCents.
- Mark Reservation 'consumed'.
- Clear user's Cart.
- For products with stock < lowStockThreshold → insert LowStockAlert.
- Set IdempotencyKey to status='succeeded' with stored response.

Response:
- { orderId, status: 'created' }

Tests:
- Idempotent confirm: same Idempotency-Key returns same orderId; no duplicates.
- Confirm success updates stock & reserved correctly; cart cleared; alerts created when applicable.
Document confirm flow, headers, and error codes in README.
```

---

## Phase 6 — Reservation Expiry GC (background job)
```
Implement a cron-like job (every 60s) to expire reservations and release reserved counts.

Behavior:
- Find reservations where status='active' and expiresAt ≤ now.
- For each, run a transaction:
  - For each item (sorted): decrement reserved by qty (guard reserved ≥ qty).
  - Set reservation status='expired'.
- Log counts of expired reservations and released quantities.

Tests:
- Create reservation in the past; run GC once; verify reservation→expired and product.reserved decreased.
Document GC behavior and why we do not use a TTL index (we need compensating updates first).
```

---

## Phase 7 — Admin Low‑Stock Alerts
```
Implement simple admin endpoints.

Endpoints:
- GET /api/admin/low-stock-alerts?processed=false
  - Return newest first.

- POST /api/admin/low-stock-alerts/:id/ack
  - Mark processed=true.

Tests:
- Trigger low-stock alert via confirm; verify list returns it; ack flips processed.
Update README with example admin requests.
```

---

## Phase 8 — Tests (≥ 6; include concurrency & idempotency)
```
Set up Jest + Supertest test harness with a test MongoDB (Atlas or local replica set).

Write tests covering at least:
1) Cart CRUD & totals.
2) Reserve success (TTL ~600s, reserved increments).
3) Reserve race (two reserves exceed availability → one 200, one 409; no partial holds).
4) Confirm success (order created, cart cleared, reserved→0, stock reduced).
5) Idempotent confirm (same key ⇒ same order; no duplicates).
6) Concurrency on confirm (multiple confirms vs limited stock ⇒ only allowable succeed; others 409).
7) Low-stock alert creation.
8) GC expiry releases holds.

Make tests independent and reset DB between specs.
Document test commands in README.
```

---

## Phase 9 — Deploy & README polish
```
Deployment:
- Backend: Render/Railway; env: MONGODB_URI, PORT, CORS_ORIGIN. Healthcheck /api/healthz.
- Frontend (later): Vercel/Netlify; VITE_API_URL set to backend URL.

README updates:
- Setup, seed, run, deploy.
- API examples (reserve/confirm with 409/410 paths).
- Concurrency & idempotency design notes.
- Test coverage summary and how to run the race tests.
- Loom script (≤3 min) outline.

Definition of Done:
- Deployed API reachable; /api/healthz green.
- README complete and accurate.
```
