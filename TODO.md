# ResidentOne — Implementation TODO

Track progress here. Check off items as they are completed.

**Tech Stack:**
- Backend: Node.js + Express + MongoDB (Mongoose) — plain JavaScript
- Frontend: React (Create React App) — plain JavaScript
- No TypeScript

---

## Phase 0 — Architectural Foundation

> Build the infrastructure that every future module depends on.
> Nothing below is a feature. It is scaffolding.

### 0.1 Fresh Project Setup

- [ ] Delete all existing `backend/` and `frontend/` code
- [ ] Initialize fresh backend with `npm init`
- [ ] Install backend dependencies: express, mongoose, jsonwebtoken, bcryptjs, cors, helmet, morgan, dotenv, pino, pino-pretty, zod, express-rate-limit, uuid, socket.io
- [ ] Install backend dev dependencies: nodemon
- [ ] Create `backend/.env` with: PORT, MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL
- [ ] Create `backend/src/` directory structure:
  ```
  backend/src/
  ├── app.js
  ├── server.js
  ├── config/
  │   ├── index.js
  │   ├── database.js
  │   └── logger.js
  ├── middlewares/
  │   ├── auth.middleware.js
  │   ├── error.middleware.js
  │   └── validate.middleware.js
  ├── modules/
  │   └── (empty, created per module later)
  ├── shared/
  │   ├── types/
  │   │   └── index.js
  │   ├── utils/
  │   │   └── errors.js
  │   └── plugins/
  │       └── tenant.plugin.js
  └── socket/
      └── index.js
  ```
- [ ] Initialize fresh frontend with `npx create-react-app frontend`
- [ ] Install frontend dependencies: react-router-dom, axios, zustand, @tanstack/react-query
- [ ] Create `frontend/.env` with: REACT_APP_API_URL=http://localhost:5000/api/v1
- [ ] Create `frontend/src/` directory structure:
  ```
  frontend/src/
  ├── index.js
  ├── App.js
  ├── lib/
  │   ├── api.js
  │   └── types.js
  ├── stores/
  │   └── auth.store.js
  ├── providers/
  │   └── AuthProvider.js
  ├── components/
  │   └── ProtectedRoute.js
  └── features/
      ├── auth/
      │   ├── LoginPage.js
      │   └── RegisterPage.js
      └── dashboard/
          └── DashboardPage.js
  ```
- [ ] Add scripts to root `package.json`: `dev` (concurrently runs backend + frontend)
- [ ] Verify `npm run dev` starts both servers without errors

### 0.2 Backend Foundation

- [ ] Create `backend/src/config/index.js` — export env config object
- [ ] Create `backend/src/config/database.js` — Mongoose connection with error handling
- [ ] Create `backend/src/config/logger.js` — Pino logger setup
- [ ] Create `backend/src/app.js` — Express app with helmet, cors, morgan, json parser
- [ ] Create `backend/src/server.js` — HTTP server + Socket.IO bootstrap
- [ ] Create `backend/src/shared/utils/errors.js` — AppError class (message, statusCode, code)
- [ ] Create `backend/src/middlewares/error.middleware.js` — global error handler
- [ ] Create `backend/src/middlewares/validate.middleware.js` — Zod validation middleware
- [ ] Create health check endpoint: `GET /api/v1/health`

### 0.3 API Versioning

- [ ] All backend routes prefixed with `/api/v1/`
- [ ] Frontend axios base URL points to `/api/v1`
- [ ] Vite proxy not needed (CRA uses proxy in package.json)

### 0.4 User Model & Auth

- [ ] Create `backend/src/modules/user/user.model.js`
  - Fields: name, email, phone, passwordHash, isActive, timestamps
  - Indexes: email (unique), phone (unique)
  - Instance method: comparePassword(candidate)
  - Pre-save hook: hash password with bcrypt (12 rounds)
- [ ] Create `backend/src/modules/auth/auth.service.js`
  - register(name, email, phone, password)
  - login(email, password)
  - refreshTokens(refreshToken)
  - Token payload: { userId, societyId: null, role: null }
  - Access token: 15min, Refresh token: 7d
- [ ] Create `backend/src/modules/auth/auth.controller.js` — request handlers
- [ ] Create `backend/src/modules/auth/auth.routes.js` — POST /register, POST /login, POST /refresh
- [ ] Create `backend/src/modules/auth/auth.validation.js` — Zod schemas for register, login, refresh
- [ ] Create `backend/src/modules/user/user.service.js` — findByEmail, findByPhone, findById, create
- [ ] Create `backend/src/modules/user/user.controller.js` — getProfile, updateProfile
- [ ] Create `backend/src/modules/user/user.routes.js` — GET /profile, PATCH /profile
- [ ] Create `backend/src/middlewares/auth.middleware.js`
  - authenticate: extract Bearer token, verify JWT, set req.userId/societyId/role
  - requireSociety: block if no societyId
  - requireRole(...roles): block if role not in list

### 0.5 Society Model

- [ ] Create `backend/src/modules/society/society.model.js`
  - Fields: name, address, city, state, pincode, contactEmail, contactPhone, isActive, timestamps
  - Indexes: name, city
- [ ] Create `backend/src/modules/society/society.service.js` — CRUD operations
- [ ] Create `backend/src/modules/society/society.controller.js` — request handlers
- [ ] Create `backend/src/modules/society/society.routes.js`
  - GET / — list all (public)
  - GET /:id — get one (public)
  - POST / — create (authenticated)
  - PATCH /:id — update (authenticated)
  - DELETE /:id — soft delete (authenticated)
- [ ] Create `backend/src/modules/society/society.validation.js` — Zod schemas

### 0.6 Membership Model

- [ ] Create `backend/src/modules/membership/membership.model.js`
  - Fields: userId, societyId, role, isActive, joinedAt, timestamps
  - Unique index: { userId, societyId }
  - Indexes: societyId, userId
- [ ] Role enum: super_admin, society_admin, committee_member, owner, tenant, staff, security_guard
- [ ] Create membership service, controller, routes, validation
- [ ] Endpoints:
  - POST /societies/:societyId/members — add member (admin)
  - GET /societies/:societyId/members — list members (admin)
  - PATCH /societies/:societyId/members/:memberId — update role (admin)
  - DELETE /societies/:societyId/members/:memberId — remove (admin)
- [ ] Enforce: only society_admin+ can manage members
- [ ] Enforce: cannot remove last society_admin
- [ ] Enforce: cannot promote above own role level

### 0.7 Async Local Storage for Tenant Context

The tenant plugin needs societyId from the request. Mongoose hooks don't have access to Express req. Solution: AsyncLocalStorage.

- [ ] Create `backend/src/shared/async-context.js`
  - Export AsyncLocalStorage instance
  - createContext(userId, societyId, role)
  - getContext() returns { userId, societyId, role }
- [ ] Create `backend/src/shared/async-context.middleware.js`
  - Express middleware that runs after authenticate
  - Stores context in AsyncLocalStorage
- [ ] Update tenant.plugin.js to read societyId from AsyncLocalStorage
- [ ] Apply tenant plugin to SocietyMember model
- [ ] Verify: when a request hits a tenant-filtered model, societyId is auto-applied

### 0.8 Permission System

- [ ] Create `backend/src/shared/permissions.js`
  - Permission constants: MANAGE_SOCIETY, MANAGE_USERS, MANAGE_UNITS, MANAGE_RESIDENTS, MANAGE_MAINTENANCE, MANAGE_PAYMENTS, MANAGE_COMPLAINTS, MANAGE_VISITORS, MANAGE_STAFF, MANAGE_VENDORS, MANAGE_NOTICES, MANAGE_DOCUMENTS, VIEW_REPORTS, MANAGE_SETTINGS
  - ROLE_PERMISSIONS map: role → array of permissions
- [ ] Create requirePermission(permission) middleware
  - Reads role from AsyncLocalStorage context
  - Checks against ROLE_PERMISSIONS
- [ ] Keep requireRole() for backward compat, deprecate in favor of requirePermission()

### 0.9 Society Context Switching

- [ ] POST /api/v1/auth/select-society
  - Input: { societyId }
  - Verify user is active member via Membership model
  - Reissue tokens with societyId and role set
  - Return new tokens + society info
- [ ] GET /api/v1/users/my-societies
  - Returns all societies user belongs to with role per society
- [ ] GET /api/v1/auth/current-context
  - Returns current societyId, role, society details from token
- [ ] Frontend: auth store supports societyId and role from token
- [ ] Frontend: society selector page (list user's societies, call select-society)
- [ ] Frontend: redirect to selector after login if multiple societies, or dashboard if one

### 0.10 Standardized API Response Format

- [ ] Success format: { success: true, data: T, meta?: { page, limit, total, totalPages } }
- [ ] Error format: { success: false, error: { code: string, message: string } }
- [ ] Create `backend/src/shared/utils/pagination.js`
  - Parse page, limit, sortBy, sortOrder from query params
  - Return pagination metadata
- [ ] Update all controllers to use standardized format
- [ ] Update frontend api.js interceptor for new error format

### 0.11 Audit Logging

- [ ] Create `backend/src/modules/audit/audit.model.js`
  - Fields: societyId, actorId, action, entityType, entityId, metadata (flexible), timestamp
  - Apply tenant plugin
  - Indexes: { societyId, timestamp }, { entityId, entityType }
- [ ] Create `backend/src/shared/utils/audit.js` — helper: logAudit(action, entityType, entityId, metadata?)
- [ ] Apply to auth events: register, login, select-society
- [ ] Apply to membership changes: add, remove, role change

### 0.12 Rate Limiting

- [ ] Apply rate limit to POST /auth/login — 5 per minute per IP
- [ ] Apply rate limit to POST /auth/register — 3 per hour per IP
- [ ] Apply rate limit to POST /auth/refresh — 10 per minute per IP
- [ ] Create configurable rate limit middleware for general API

### 0.13 File Storage Abstraction

- [ ] Create `backend/src/shared/services/file-storage/` directory
- [ ] Define interface: upload(file, path), delete(key), getSignedUrl(key)
- [ ] Implement local storage service (writes to uploads/ directory)
- [ ] Create factory that returns provider based on env
- [ ] Add uploads/ to .gitignore

### 0.14 Notification Abstraction

- [ ] Create `backend/src/shared/services/notification/` directory
- [ ] Define interface: sendInApp(userId, notification), sendPush(userId), sendEmail(userId)
- [ ] Create `backend/src/modules/notification/notification.model.js`
  - Fields: userId, societyId, title, body, type, isRead, metadata, timestamps
- [ ] Implement in-app notification service (stores in MongoDB)
- [ ] Stub push and email providers (log only)

### 0.15 Socket.IO Room Strategy

- [ ] Update socket/index.js to support society-scoped rooms
- [ ] On connection: auto-join user to society:{societyId} room
- [ ] Helper: emitToSociety(societyId, event, data)
- [ ] Helper: emitToUser(userId, event, data)

### 0.16 Hardening

- [ ] Helmet CSP configuration for production
- [ ] Global rate limiter: 100 req/min per IP
- [ ] Request ID middleware (UUID per request, include in logs and response header)
- [ ] Update README.md with architecture, setup, env vars
- [ ] Add AGENTS.md with coding conventions

---

## Phase 1 — Property Model & Society Setup

> Buildings, floors/blocks, residential units, parking.

### 1.1 Building Model

- [ ] Create `backend/src/modules/building/building.model.js`
  - Fields: societyId, name, type (tower/block/cluster/other), totalFloors?, totalUnits?, isActive
  - Apply tenant plugin
  - Unique index: { societyId, name }
- [ ] CRUD endpoints with RBAC (admin/committee only)

### 1.2 ResidentialUnit Model

- [ ] Create shared property types: APARTMENT, ROW_HOUSE, VILLA, BUNGALOW, OTHER
- [ ] Create shared occupancy types: OCCUPIED, VACANT, UNDER_RENOVATION, UNDER_CONSTRUCTION
- [ ] Create `backend/src/modules/unit/residential-unit.model.js`
  - Fields: societyId, unitNumber, propertyType, buildingId?, floorNumber?, area?, bedrooms?, bathrooms?, occupancyStatus, ownerId?, tenantId?, maintenanceConfig?, isActive
  - Apply tenant plugin
  - Unique index: { societyId, unitNumber }
  - Indexes: { societyId, buildingId }, { societyId, propertyType }, { societyId, occupancyStatus }
- [ ] CRUD endpoints + bulk create endpoint
- [ ] RBAC: admin/committee manage units

### 1.3 Unit Ownership Model

- [ ] Create `backend/src/modules/unit/unit-ownership.model.js`
  - Fields: societyId, unitId, userId, ownershipType (primary/co-owner), sharePercentage?, isPrimary, startDate, endDate?, isActive
  - Apply tenant plugin
- [ ] Ownership transfer endpoint
- [ ] Owner query endpoint per unit

### 1.4 Unit Resident Association

- [ ] Create `backend/src/modules/unit/unit-resident.model.js`
  - Fields: societyId, unitId, userId, residentType (owner/tenant/family_member), isActive, movedInDate?, movedOutDate?
  - Apply tenant plugin
- [ ] CRUD endpoints per unit
- [ ] Link to Membership model (auto-create society member when resident added)

### 1.5 Parking Model

- [ ] Create `backend/src/modules/parking/parking-slot.model.js`
  - Fields: societyId, slotNumber, buildingId?, floorNumber?, level, slotType, allocatedUnitId?, allocatedVehicleId?, isActive
- [ ] Create `backend/src/modules/parking/vehicle.model.js`
  - Fields: societyId, ownerUserId, vehicleNumber, vehicleType, brand?, model?, color?, isActive
  - Unique index: { societyId, vehicleNumber }
- [ ] CRUD endpoints for slots and vehicles
- [ ] Allocation/deallocation endpoints

### 1.6 Society Setup Wizard (Frontend)

- [ ] Society creation form
- [ ] Building list + add/edit
- [ ] Unit list + add/edit/bulk import
- [ ] Parking management page
- [ ] Member invitation page

---

## Phase 2 — Resident Experience

> Dashboard, notices, documents, events, resident profile management.

### 2.1 Resident Profile

- [ ] Extend user profile with society-specific info
- [ ] Emergency contacts, family members, profile photo
- [ ] Frontend: profile page

### 2.2 Dashboard

- [ ] Admin dashboard endpoint + frontend
- [ ] Resident dashboard endpoint + frontend

### 2.3 Notices

- [ ] Notice model + CRUD endpoints
- [ ] Frontend: notice list, detail, admin creation

### 2.4 Documents

- [ ] Document model + upload endpoint
- [ ] Frontend: document library

### 2.5 Events

- [ ] Event model + CRUD endpoints
- [ ] Frontend: event calendar/list

### 2.6 Notifications

- [ ] Connect notification model to UI
- [ ] Frontend: notification bell, list page

---

## Phase 3 — Operations

> Complaints, visitors, security, staff, vendors.

### 3.1 Complaints

- [ ] Complaint model with status workflow
- [ ] CRUD + assignment endpoints
- [ ] Frontend: complaint list, detail, creation

### 3.2 Visitors

- [ ] Visitor model
- [ ] Pre-approve, entry, exit endpoints
- [ ] Frontend: resident pre-approval, guard check-in

### 3.3 Security

- [ ] Security event model
- [ ] Frontend: security dashboard

### 3.4 Staff

- [ ] Staff model + CRUD
- [ ] Frontend: staff list, forms

### 3.5 Vendors

- [ ] Vendor model + CRUD
- [ ] Frontend: vendor directory

### 3.6 Domestic Help

- [ ] Domestic help model
- [ ] Entry/exit logging
- [ ] Frontend: registry, guard check-in

---

## Phase 4 — Finance

> Maintenance billing, invoices, expenses, reports.

### 4.1 Maintenance Config

- [ ] Maintenance config model
- [ ] Per-unit override
- [ ] Admin config page

### 4.2 Invoices

- [ ] Invoice model + generation endpoint
- [ ] Frontend: invoice list, detail

### 4.3 Expenses

- [ ] Expense model + approval workflow
- [ ] Frontend: expense list, approval queue

### 4.4 Reports

- [ ] Aggregation endpoints
- [ ] Frontend: reports page

---

## Phase 5 — Payments

> Razorpay integration, webhooks, receipts.

### 5.1 Payment Abstraction

- [ ] Payment provider interface
- [ ] Razorpay implementation
- [ ] Stub provider for dev

### 5.2 Payment Flow

- [ ] Payment model + initiation/verification endpoints
- [ ] Receipt generation

### 5.3 Settlement

- [ ] Razorpay Route config
- [ ] Settlement tracking
- [ ] Reconciliation dashboard

---

## Phase 6 — Advanced

> Amenities, polls, marketplace, real-time, SaaS subscriptions.

### 6.1 Amenities

- [ ] Amenity + booking models
- [ ] Frontend: browsing, booking

### 6.2 Polls

- [ ] Poll model + voting
- [ ] Frontend: poll creation, results

### 6.3 Marketplace

- [ ] Vendor marketplace
- [ ] Resident reviews

### 6.4 Real-Time

- [ ] WebSocket events for key actions
- [ ] Live dashboard updates

### 6.5 SaaS Subscriptions

- [ ] Plan model + feature gating

---

## Phase 7 — Mobile

> Mobile app using same backend APIs.

- [ ] React Native setup
- [ ] Auth flow
- [ ] Resident features
- [ ] Security features
- [ ] Push notifications

---

## Cross-Cutting Concerns (Ongoing)

- [ ] Write tests for every new module
- [ ] ESLint + Prettier configuration
- [ ] CI/CD pipeline
- [ ] Error monitoring (Sentry)
- [ ] API documentation (Swagger)
