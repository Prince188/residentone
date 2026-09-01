# ResidentOne - Website System Specification & Logic Blueprint

This document provides an exhaustive, field-by-field, flow-by-flow, and screen-by-screen specification of the **ResidentOne** website (frontend and backend). It functions as the single source of truth for developing any client application (such as a mobile app, desktop client, or API integration) that integrates with the ResidentOne platform.

---

## Table of Contents
1. [Core Architecture & Tech Stack](#1-core-architecture--tech-stack)
2. [Global Systems & Middlewares](#2-global-systems--middlewares)
    - [2.1 Multi-Tenant Schema Plugin](#21-multi-tenant-schema-plugin)
    - [2.2 Automatic Socket.IO Model Change Hooks](#22-automatic-socketio-model-change-hooks)
    - [2.3 API HTTP Conventions & Response Envelopes](#23-api-http-conventions--response-envelopes)
3. [Authentication & Session Management](#3-authentication--session-management)
    - [3.1 User Data Model](#31-user-data-model)
    - [3.2 Token Lifecycle & Refresh Interceptors](#32-token-lifecycle--refresh-interceptors)
    - [3.3 Auth & User API Endpoints](#33-auth--user-api-endpoints)
4. [Multi-Tenancy & Society Context](#4-multi-tenancy--society-context)
    - [4.1 Society Context Resolver Middleware](#41-society-context-resolver-middleware)
    - [4.2 Client Society Selector Store](#42-client-society-selector-store)
    - [4.3 Wing / Block Scoping Engine](#43-wing--block-scoping-engine)
5. [Role-Based Access Control (RBAC) & Permissions](#5-role-based-access-control-rbac--permissions)
    - [5.1 Society Roles List & Hierarchy](#51-society-roles-list--hierarchy)
    - [5.2 The 14 Permissions Keys](#52-the-14-permissions-keys)
    - [5.3 Default Role-Permissions Matrix](#53-default-role-permissions-matrix)
    - [5.4 Custom Permission Overrides](#54-custom-permission-overrides)
    - [5.5 Wing Admin Delegation](#55-wing-admin-delegation)
6. [Dashboard & Badging Engine](#6-dashboard--badging-engine)
    - [6.1 Layout Configuration](#61-layout-configuration)
    - [6.2 The Badging Algorithm](#62-the-badging-algorithm)
    - [6.3 Seen-All Badges API](#63-seen-all-badges-api)
7. [Exhaustive Screen-by-Screen Navigation & Logic Flows](#7-exhaustive-screen-by-screen-navigation--logic-flows)
    - [7.1 Public & Marketing Pages](#71-public--marketing-pages)
    - [7.2 Authentication & Onboarding](#72-authentication--onboarding)
    - [7.3 Platform Management (Super-Admin Flows)](#73-platform-management-super-admin-flows)
    - [7.4 Society & Wing Operations](#74-society--wing-operations)
    - [7.5 Committee & RBAC Governance](#75-committee--rbac-governance)
    - [7.6 Member Directory & User Profile](#76-member-directory--user-profile)
    - [7.7 Units, Houses & Tenancy Management](#77-units-houses--tenancy-management)
    - [7.8 Maintenance Billing & Financial Dues](#78-maintenance-billing--financial-dues)
    - [7.9 Collections (Festivals & Special Occasion Funds)](#79-collections-festivals--special-occasion-funds)
    - [7.10 Document Vault](#710-document-vault)
    - [7.11 Helpdesk & Complaints Ticket Flow](#711-helpdesk--complaints-ticket-flow)
    - [7.12 Amenities & Facility Booking Flow](#712-amenities--facility-booking-flow)
    - [7.13 Community Polls](#713-community-polls)
    - [7.14 Community Surveys](#714-community-surveys)
    - [7.15 Notice Board & Announcements](#715-notice-board--announcements)
    - [7.16 Real-time Chat System (Groups & Direct Admin)](#716-real-time-chat-system-groups--direct-admin)
    - [7.17 Family Members & Vehicles Management](#717-family-members--vehicles-management)
    - [7.18 My Unit Dashboard](#718-my-unit-dashboard)
    - [7.19 Safety, Gate & Support Placeholders](#719-safety-gate--support-placeholders)
8. [Real-time Events Matrix (Socket.IO)](#8-real-time-events-matrix-socketio)
9. [Database Schema Matrix](#9-database-schema-matrix)

---

## 1. Core Architecture & Tech Stack

ResidentOne is built as a split client-server architecture:
*   **Backend:** Express (v5) server connected to MongoDB using Mongoose (v9). Real-time event broadcasting is powered by Socket.IO (v4) with JWT handshake authentication, document file uploads via Multer, Excel spreadsheet exports via ExcelJS, and card/UPI/net-banking payment workflows through Razorpay (v2).
*   **Frontend Website:** Single Page Application (SPA) built using React (v19) via Create React App, styled with Tailwind CSS (v3) and Google Material Symbols for iconography.
*   **State & Cache:** Zustand (v5) is used for in-memory and persistent global client state (Auth tokens, active society context). `@tanstack/react-query` (v5) manages API caching, background synchronization, socket invalidations, and optimistic UI rendering.

```
residentone/
├── backend/
│   ├── src/
│   │   ├── app.js               // Express app + CORS + middleware + route mounting
│   │   ├── server.js            // HTTP + Socket.IO server + Mongo connection + Model change triggers
│   │   ├── config/              // Environment config, database connector, pino logger
│   │   ├── middlewares/         // Auth, society context, RBAC permission, Zod validation, error handler
│   │   ├── shared/              // RBAC constants, tenant plugin, custom error types, Razorpay helper
│   │   ├── socket/              // Socket.IO server setup, room management, emitters
│   │   └── modules/             // Domain modules: auth, user, society, membership, unit, maintenance, 
│   │                            // collections, document, complaint, amenity, poll, survey, chat, family-member, dashboard, health
│   └── uploads/documents/       // Multer disk storage for PDF and image attachments
└── frontend/
    └── src/
        ├── App.js               // Route definitions + QueryClientProvider + AuthProvider
        ├── lib/                 // Axios client, domain API helpers, permission checkers, query client
        ├── stores/              // Zustand stores: auth.store.js, society.store.js, societyModal.store.js
        ├── providers/           // AuthProvider (bootstraps session & active society)
        ├── components/          // Layouts (AppLayout, PublicLayout), ProtectedRoute, SuperAdminRoute, UI badges & modals
        ├── hooks/               // Custom hooks: useBadgeSeen
        └── features/            // 26 feature page folders
```

---

## 2. Global Systems & Middlewares

### 2.1 Multi-Tenant Schema Plugin
Every tenant-specific model (such as Notice, MaintenanceCycle, MaintenancePayment, Collection, CollectionPayment, Document, Complaint, Amenity, AmenityBooking, Poll, PollVote, Survey, SurveyResponse, Unit, Membership, ChatGroup, ChatMessage, DirectMessage) utilizes the global tenant plugin (`backend/src/shared/plugins/tenant.plugin.js`) which automatically:
1. Injects `societyId: { type: ObjectId, ref: "Society", required: true, index: true }` into the Mongoose schema.
2. Injects `{ societyId }` into all write operations.
3. Appends query conditions checking `societyId` during `find`, `findOne`, `countDocuments`, `updateOne`, `deleteMany`, etc.
4. Automatically inserts a `$match: { societyId }` stage at the root of aggregated query pipelines.

### 2.2 Automatic Socket.IO Model Change Hooks
In `backend/src/server.js`, a centralized Mongoose plugin listens to `post('save')` and `post('findOneAndUpdate')` across all models. If the document has a `societyId`, it automatically emits a real-time event to the society room:
```javascript
socketHelper.emitToSociety(String(doc.societyId), `${modelName.toLowerCase()}:change`, {
  id: doc._id,
  action: "save",
});
```

### 2.3 API HTTP Conventions & Response Envelopes
*   **Base URL:** `/api/v1`
*   **Headers:**
    *   `Authorization: Bearer <accessToken>` (Used for authenticating requests)
    *   `x-society-id: <societyId>` (Specifies which society context the user is querying in)
*   **Success Response Envelope:**
    ```json
    {
      "success": true,
      "data": {} // or []
    }
    ```
*   **Error Response Envelope:**
    ```json
    {
      "success": false,
      "error": {
        "code": "ERROR_CODE",
        "message": "User-friendly description",
        "details": [] // Optional Zod validation errors
      }
    }
    ```

---

## 3. Authentication & Session Management

### 3.1 User Data Model
*   `name`: String (Required, trimmed)
*   `email`: String (Required, unique, lowercase, trimmed)
*   `phone`: String (Required, unique, trimmed)
*   `passwordHash`: String (Selected out by default `select: false`, hashed via `bcryptjs` with salt rounds = 12)
*   `occupation`: String (Optional)
*   `familyMembers`: Number (Count of family members, optional)
*   `vehicles`: Array of Strings (Uppercase vehicle license plate strings, e.g., `["MH12AB1234", "GJ01XY9999"]`)
*   `role`: String enum (`"resident"`, `"society_admin"`, `"super_admin"`) (Platform-wide account role, defaults to `"resident"`)
*   `isActive`: Boolean (Default: `true`)
*   `timestamps`: `createdAt`, `updatedAt`

### 3.2 Token Lifecycle & Refresh Interceptors
1.  **JWT Structure:** The Access Token payload contains: `{ userId, role: [accountRole], societyId: null }`. Society roles are **not** encoded in the JWT; they are resolved per-request by querying the `Membership` collection.
2.  **Expiries:** Access token expires in **15 minutes**; Refresh token expires in **7 days**.
3.  **Token Refresh Flow:** If the backend responds with `401 Unauthorized`, the client's Axios response interceptor (`frontend/src/lib/api.js`) catches the error, queues pending requests, and calls:
    *   **Endpoint:** `POST /api/v1/auth/refresh`
    *   **Body:** `{ refreshToken: "..." }` (Retrieved from client `localStorage`)
    *   **Result:** Reissues both access and refresh tokens. If refresh fails or expires, it wipes credentials and redirects the user to `/login`.

### 3.3 Auth & User API Endpoints
*   `POST /api/v1/auth/register` — Payload: `{ name, email, phone, password }` (Password: 6–100 chars). Returns `{ user, accessToken, refreshToken }`.
*   `POST /api/v1/auth/login` — Payload: `{ identifier, password }` (where identifier is email or phone). Returns `{ user, accessToken, refreshToken }`.
*   `POST /api/v1/auth/refresh` — Payload: `{ refreshToken }`. Returns `{ accessToken, refreshToken }`.
*   `GET /api/v1/users/profile` — Returns current logged-in user profile with vehicles and platform role.
*   `PATCH /api/v1/users/profile` — Payload: `{ name, email, phone, occupation, familyMembers, vehicles }`. Returns updated user document.

---

## 4. Multi-Tenancy & Society Context

A single user account can belong to multiple housing societies with different roles in each (e.g., Owner in Society A, Treasurer in Society B).

```
User Account (Platform User)
    │
    ├── Membership @ Society A (Role: "owner", Unit: A-101)
    └── Membership @ Society B (Role: "treasurer", additionalRoles: ["wing_admin"], Wing: "B")
```

### 4.1 Society Context Resolver Middleware (`resolveSocietyContext`)
For any request targeting a society-scoped endpoint:
1.  Reads the `x-society-id` header in the incoming request.
2.  Queries the `Membership` collection for `{ userId: req.userId, societyId: header.societyId, isActive: true }`.
3.  Attaches the resolved properties to the Express `req` object:
    *   `req.societyId` (String representation)
    *   `req.membership` (Full Mongoose document)
    *   `req.role` (Primary role string, e.g., `"treasurer"`)
4.  If no valid membership exists and the user is not a platform `super_admin`, returns `403 Forbidden`.

### 4.2 Client Society Selector Store
The client persists the `activeSocietyId` inside a Zustand store (`useSocietyStore` persisted under `residentone.active-society`). When the user switches societies in the navigation dropdown:
1.  Updates `activeSocietyId` in localStorage.
2.  Axios automatically attaches the new `x-society-id` to subsequent HTTP headers.
3.  Triggers `queryClient.invalidateQueries()`, seamlessly refreshing all active feature views with the new tenant's data.

### 4.3 Wing / Block Scoping Engine
Societies can organize housing into wings (e.g., Wing A, Wing B, Block 1). 
*   **Wing Admins:** Memberships can carry `assignedWings: ["A", "B"]`.
*   **Wing-Scoped Content:** Polls, Surveys, and Notices can be scoped to `scope: "society"` (entire society) or `scope: "wing"` (targeted to specific wings).
*   **Access Control:** The backend automatically filters wing-scoped items so only residents assigned to units in that wing or wing admins of that wing can view and participate.

---

## 5. Role-Based Access Control (RBAC) & Permissions

### 5.1 Society Roles List & Hierarchy
ResidentOne defines 13 society roles with weighted hierarchy levels:

| Role String | Hierarchy Level | Description |
| :--- | :--- | :--- |
| `super_admin` | 100 | Platform owner; unrestricted access across all societies |
| `society_admin` | 80 | Primary administrator of the specific housing society |
| `wing_admin` | 65 | Wing coordinator managing flats, complaints, and notices for specific wings |
| `committee_member` | 60 | Management committee member |
| `manager` | 55 | Society facility / operations manager |
| `treasurer` | 50 | Financial head managing dues, billing cycles, collections, and ledgers |
| `accountant` | 45 | Accounting staff managing receipts and dues reconciliation |
| `helpdesk_manager`| 43 | Helpdesk administrator assigning and resolving complaint tickets |
| `auditor` | 40 | Financial auditor with read-only ledger and dues access |
| `owner` | 40 | Unit homeowner resident |
| `tenant` | 20 | Unit tenant / renter resident |
| `security_guard` | 15 | Security guard for gate access and visitor logs |
| `staff` | 10 | General society staff |

### 5.2 The 14 Permissions Keys
1.  `manage_committee`: Invite, edit member roles, assign wings, and update permissions overrides.
2.  `manage_houses`: Create, bulk-generate, assign, unassign owners/tenants to flat units, and create invite links.
3.  `manage_maintenance`: Create billing cycles, record manual check/cash/UPI payments, unpay/cancel payments, and export Excel dues reports.
4.  `create_notice`: Publish bulletins and emergency alerts to the society notice board.
5.  `manage_amenities`: Manage amenities database (create, update, delete amenities, configure slot timings and pricing).
6.  `manage_bookings`: View, search, and cancel bookings for all members.
7.  `create_poll`: Publish, scope by wing, and manually close opinion/election polls.
8.  `create_survey`: Build multi-question surveys (single/multi choice, rating, text), scope by wing, and view visual analytics.
9.  `manage_complaints`: Assign tickets to staff, log internal remarks, update complaint statuses.
10. `manage_visitors`: Approve/reject visitor gate passes.
11. `view_financials`: Access budget summaries, collection ledgers, dues status, and payment histories.
12. `manage_directory`: View the full member and resident directory.
13. `manage_collections`: Create, manage, close, and record cash/online payments for festival, event, celebration, and repair collection funds.
14. `manage_documents`: Upload, categorize, and delete financial bills, expense sheets, and society document vault files.

### 5.3 Default Role-Permissions Matrix

| Role | Default Permissions |
| :--- | :--- |
| `society_admin` / `super_admin` | **All 14 permissions** |
| `wing_admin` | `manage_houses`, `manage_complaints`, `create_notice`, `create_poll`, `create_survey`, `manage_visitors`, `manage_directory`, `view_financials` |
| `manager` | `manage_houses`, `manage_maintenance`, `create_notice`, `manage_amenities`, `manage_bookings`, `create_poll`, `create_survey`, `manage_complaints`, `manage_visitors`, `view_financials`, `manage_directory`, `manage_committee`, `manage_collections`, `manage_documents` |
| `treasurer` | `manage_maintenance`, `manage_collections`, `manage_documents`, `view_financials`, `manage_directory` |
| `accountant` | `manage_maintenance`, `manage_collections`, `manage_documents`, `view_financials` |
| `helpdesk_manager` | `manage_complaints`, `manage_visitors`, `manage_directory` |
| `auditor` | `view_financials`, `manage_directory` |
| `committee_member` | `create_notice`, `create_poll`, `create_survey`, `manage_directory` |
| `owner` / `tenant` / `resident` / `staff` | `manage_directory` |
| `security_guard` | `manage_visitors`, `manage_directory` |

### 5.4 Custom Permission Overrides
Societies can customize permissions per role. The `Society.rolePermissions` object (a Mongoose `Mixed` field structured as `{ [role]: string[] }`) stores custom permissions. The frontend `ManageCommitteePage.js` provides checkboxes to add/remove permission keys for specific roles on the fly via `PUT /api/v1/societies/permissions`.

### 5.5 Wing Admin Delegation
A membership can have `additionalRoles: ["wing_admin"]` and `assignedWings: ["A", "B"]`. The helper function `hasPermissionForMembership(membership, permission)` checks both primary and additional roles.

---

## 6. Dashboard & Badging Engine

The Dashboard (`/dashboard`) acts as the central router for all client operations.

### 6.1 Layout Configuration
*   **Greeting Banner:** Greets user dynamically based on local device time (`Good morning` if <12 PM, `Good afternoon` if <5 PM, else `Good evening`).
*   **Quick Summary / Badges Bar:** Displays active counts for complaints, open polls, and active surveys.
*   **Resident Action Grid:** Houses, Maintenance, Collections, Complaints, Notices, Amenities, Documents, Polls, Surveys, Directory, Chat, Family Members, Vehicles, My Unit.
*   **Privileged (Admin) Actions Grid:** Displayed only if `hasPermission(permission)` checks evaluate to true: Manage Society, Manage Wing, Manage Houses, Society Dues, Manage Collections, Manage Amenities, Manage Committee, Super-Admin Societies.

### 6.2 The Badging Algorithm
Badges are computed dynamically per-user relative to when they last visited specific features.

```
User visits page (e.g., /polls)
    │
    └── useBadgeSeen("polls") hook executes
            │
            ├── POSTs to /api/v1/dashboard/badges/seen (feature: "polls")
            ├── Backend upserts BadgeSeen { userId, societyId, feature: "polls", lastSeenAt: Date.now() }
            └── Refetches /api/v1/dashboard/badges (polls count resets to 0)
```

1.  **Collection Schema (`BadgeSeen`):**
    *   `userId`: ObjectId (Index)
    *   `societyId`: ObjectId (Index, Nullable for Platform SuperAdmin)
    *   `feature`: String (Index; one of `"complaints"`, `"polls"`, `"surveys"`)
    *   `lastSeenAt`: Date
2.  **Counting Logic (`GET /api/v1/dashboard/badges`):**
    *   Fetches the `lastSeenAt` timestamp for each feature. Fallback chain: `Membership.joinedAt` -> `User.createdAt` -> Unix Epoch 0.
    *   **Complaints:** Count active records created after `lastSeenAt` (filtered by visibility: public vs private).
    *   **Polls:** Count active, unexpired polls created after `lastSeenAt` (filtered by user's assigned wing scope).
    *   **Surveys:** Count active, unexpired surveys created after `lastSeenAt` (filtered by user's assigned wing scope).
    *   *Returns:* `{ complaints: Number, polls: Number, surveys: Number }`

### 6.3 Seen-All Badges API
*   `POST /api/v1/dashboard/badges/seen-all`: Sets `lastSeenAt = now()` for all features simultaneously.

---

## 7. Exhaustive Screen-by-Screen Navigation & Logic Flows

### 7.1 Public & Marketing Pages
*   **LandingPage (`/`):**
    *   **Hero Section:** CTA buttons **Get Started** (`/register`) and **Watch Demo** (`/about`).
    *   **Core Value Pillars:** Maintenance Tracking, Smart Security, Community App, Facility Booking.
    *   **Onboarding 3-Step Process:** Onboard $\rightarrow$ Automate $\rightarrow$ Connect.
    *   **Social Proof / Testimonials:** Testimonials carousel with resident names and society badges.
*   **AboutPage (`/about`):** Company vision, mission, and leadership overview.
*   **FeaturesPage (`/features`):** Detailed breakdown of all modules (Security, Billing, Amenities, Communication, Helpdesk).
*   **PricingPage (`/pricing`):** Tiered subscription plans (Standard vs Enterprise) for housing societies.
*   **ContactPage (`/contact`):** Sales inquiry form and support contact details.

---

### 7.2 Authentication & Onboarding
*   **LoginPage (`/login`):**
    1.  User enters `email` (or phone) and `password`.
    2.  Clicks **Sign In**.
    3.  On success, JWT tokens are stored in `localStorage` and `useAuthStore`.
    4.  Fetches user's society memberships via `GET /api/v1/memberships/my-societies`.
    5.  Sets initial `activeSocietyId` in `useSocietyStore` and navigates to `/dashboard`.
*   **RegisterPage (`/register`):**
    1.  User enters `Full Name`, `Email`, `Phone Number`, and `Password` (6–100 chars).
    2.  Clicks **Create Account**.
    3.  Upon success, token is persisted and user is redirected to `/create-society` wizard.
*   **CreateSocietyPage (`/create-society`) & CreateSocietyModal:**
    *   **Step 1: Society Details:**
        *   Fields: `Society Name`, `Society Type` (`apartment`, `row_house`, `mixed`), `Address`, `City`, `State`, `Pincode`, `Total Units`, `Contact Person Name`, `Contact Phone`, `Contact Email`.
        *   Validation ensures valid pincode (6 digits) and 10-digit Indian phone numbers.
    *   **Step 2: StructureBuilder (Wings, Floors & Flats Config):**
        *   Wings builder: add/remove wings (A, B, C...).
        *   Floors per wing (1 to 50).
        *   Ground floor toggle (`hasGround`, `groundFlats`, e.g., G1, G2).
        *   Per-floor flat overrides (`perFloorMap`: e.g., Floor 1 has 4 flats, Floor 2 has 3 flats).
        *   Numbering mode selector: `floor_based` (e.g., A-101, A-102) vs `sequential` (e.g., A-1, A-2).
        *   Live preview of generated flat labels.
    *   **Step 3: Submission & Pending Approval:**
        *   POSTs payload to `/api/v1/societies/register`.
        *   Renders a Success Modal showing Registration ID and `"Pending Approval"` status badge.

---

### 7.3 Platform Management (Super-Admin Flows)
*   **PendingApprovalsPage (`/admin/societies/pending`):**
    1.  Super-Admin views list of all pending society registrations.
    2.  Clicks **Review** on a specific row.
    3.  Opens review drawer displaying address, contact person, and wing structure.
    4.  **Approve Action:** Calls `PATCH /api/v1/societies/:id/approve`.
        *   Marks society status as `"active"`.
        *   Provisions primary `society_admin` account.
        *   Displays an **Admin Credentials Modal** showing generated email, temporary password, and contact phone for the new society admin.
    5.  **Reject Action:** Calls `PATCH /api/v1/societies/:id/reject` with required `rejectionReason` text.
*   **AdminSocietiesPage (`/admin/societies`):**
    1.  Lists all societies across the entire platform.
    2.  Filter pills: **All**, **Active**, **Pending**, **Rejected**, **Suspended**.
    3.  Search bar: query by name, city, state, or contact person.
    4.  Clicking a row navigates to `/admin/societies/:id`.
*   **AdminSocietyDetailPage (`/admin/societies/:id`):**
    1.  Displays complete society metadata, status badge, total units, creation date, and approved date.
    2.  Actions:
        *   **Approve / Reject** (if pending).
        *   **Suspend** (`PATCH /api/v1/societies/:id/suspend`): Blocks society members from performing operations.
        *   **Activate** (`PATCH /api/v1/societies/:id/activate`): Restores a suspended society.
        *   **Edit Society Details** (`PATCH /api/v1/societies/:id`).
*   **AdminCreateSocietyPage (`/admin/societies/new`):**
    *   Super-Admin manual provision form to directly create an active society and bind an existing user as `society_admin`.

---

### 7.4 Society & Wing Operations
*   **ManageSocietyPage (`/society/manage`):**
    1.  *Privileged Society Admin View.*
    2.  Editable fields: `Name`, `Address`, `City`, `State`, `Pincode`, `Contact Person`, `Contact Phone`, `Contact Email`.
    3.  **Wings Overview Section:**
        *   Lists all distinct wings detected in the society.
        *   Displays total units per wing, occupied units count, and assigned wing admins.
        *   Quick link to Manage Wing.
*   **ManageWingPage (`/wing/manage`):**
    1.  *Privileged View for Wing Admins & Society Admins.*
    2.  Displays house cards filtered by the active user's assigned wing(s).
    3.  Filter chips: **All**, **Owned**, **Rented**, **Vacant**.
    4.  House card indicates resident name, vehicle count, family count, and pending invite status.
    5.  Clicking a house card opens `AssignHouseModal` to assign residents or create invite links.
*   **Bulk Unit Generator (`POST /api/v1/units/bulk-generate`):**
    *   Creates a batch of unit records based on wing prefix, floor range, and flats per floor.

---

### 7.5 Committee & RBAC Governance
*   **ManageCommitteePage (`/committee`):**
    1.  *Privileged View (`manage_committee`).*
    2.  Lists all current committee members with their role tags and assigned wings.
    3.  **Add Committee Member Flow:**
        *   Admin searches member directory.
        *   Selects user and chooses committee role (`wing_admin`, `committee_member`, `manager`, `treasurer`, `accountant`, `helpdesk_manager`, `auditor`).
        *   If `wing_admin` is selected: renders wing checkboxes to assign specific wings.
        *   Commits via `POST /api/v1/memberships`.
    4.  **Edit Member Role:** Inline dropdown to modify role or change assigned wings.
    5.  **Remove Member:** Reverts user back to standard resident membership.
    6.  **Custom Permissions Matrix Sub-View:**
        *   Table listing all 14 permission keys across all roles.
        *   Checkboxes allow granting/revoking specific privileges per role.
        *   **Save Permissions** calls `PUT /api/v1/societies/permissions`. Real-time socket event `permissions:change` is emitted to notify active clients.
        *   **Reset to Defaults** button restores platform default matrix.

---

### 7.6 Member Directory & User Profile
*   **DirectoryPage (`/directory`):**
    1.  Search bar: real-time filter by member name or house number.
    2.  Member Card displays: Initial avatar, Full name, Admin badge (if `society_admin`), House label pill (e.g., `House A-302`), and masked phone number (`+91 98*** **123`).
*   **ProfilePage (`/profile`):**
    1.  Displays user details: Name, Email, Phone, Occupation, Family Members count, and Registered Vehicles.
    2.  **Edit Profile:**
        *   Form to update name, email, phone, occupation, family count, and comma-separated vehicle license plates (automatically converted to uppercase).
        *   Commits via `PATCH /api/v1/users/profile`.
    3.  **My Societies List:** Displays all societies the user belongs to with their role in each and quick switch button.

---

### 7.7 Units, Houses & Tenancy Management
*   **ManageHousesPage (`/houses`):**
    1.  Interactive grid of all society units.
    2.  Filter pills: **All**, **Owned**, **Rented**, **Vacant**.
    3.  Search by house door label or resident name.
    4.  Unit Card shows: House label (e.g., `B-201`), Resident name, Occupancy badge, Registered vehicles, Family count, and Pending invite indicator.
    5.  Clicking a card navigates to `/houses/:unitId`.
*   **HouseDetailPage (`/houses/:unitId`):**
    1.  Displays Unit Information: Label, Wing/Block, Floor, Door Number.
    2.  **Owner Profile Card:** Name, Phone, Email.
        *   If vacant: **Assign Owner** form with debounced user search (by phone/name) or **Generate Invite Link** button.
        *   If assigned: **Unassign Owner** button (with confirmation modal).
    3.  **Tenant / Renter Profile Card:**
        *   **Assign Renter** / **Generate Renter Invite Link** (`inviteResidentType: "renter"`).
        *   **Unassign Tenant** button.
    4.  **Registered Vehicles:** Displays license plates associated with this unit's residents.
    5.  **Family Members:** Lists registered family members for this house.
    6.  **Payment History:** Lists historical maintenance bills and payment receipts for this unit.
*   **HouseInvitePage (`/house-invite/:token`):**
    1.  Public onboarding page accessed via invite link.
    2.  Displays welcome banner with Society Name, Address, and Unit Door Label.
    3.  User clicks **Claim Unit**.
    4.  If unauthenticated: prompts user to Sign In or Register.
    5.  Once authenticated: validates token via `POST /api/v1/units/invite/:token`, links unit to user's membership, and navigates to `/dashboard`.

---

### 7.8 Maintenance Billing & Financial Dues
*   **MaintenancePage (`/maintenance`):**
    *   Lists all units assigned to the logged-in user with their current month's payment status (**Paid**, **Unpaid**, **Overdue**).
    *   Clicking a unit card navigates to `/maintenance/:unitId?cycle=:cycleId`.
*   **MaintenanceDetailPage (`/maintenance/:unitId?cycle=:cycleId`):**
    1.  Shows itemized invoice breakdown: Billing Period, Base Rate, Occupancy Dual Rate (Owner vs Renter rate), Late Fee surcharge, and Due Date.
    2.  If Unpaid / Overdue: displays primary **Pay Now** button linking to `/maintenance/:unitId/pay?cycle=:cycleId`.
    3.  If Paid: displays payment method (`UPI`, `Cash`, `Razorpay`, `Bank Transfer`), transaction ID, paid timestamp, and **Download Receipt** button (opens formatted printable receipt).
    4.  **Payment History Toggle:** Expands table of past billing cycles for this house.
*   **PayMaintenancePage (`/maintenance/:unitId/pay?cycle=:cycleId`):**
    1.  **Pay Online (Razorpay Flow):**
        *   Shows convenience fee calculation (Base charge + 2% processing fee + 18% GST on fee).
        *   User clicks **Pay Online** $\rightarrow$ calls `POST /api/v1/maintenance/cycles/:cycleId/units/:unitId/create-order`.
        *   Opens Razorpay SDK Checkout Modal (supporting UPI, QR code, Netbanking, Debit/Credit Cards).
        *   On completion, Razorpay signature is sent to `POST /api/v1/maintenance/cycles/:cycleId/units/:unitId/verify`.
        *   On verification, sets `status = "paid"`, issues receipt number, and redirects to confirmation.
    2.  **Pay Cash at Office:** Displays treasurer contact details and instructions for manual payment.
*   **SocietyDuesPage (`/dues`):**
    *   *Privileged View (`manage_maintenance`).*
    *   **Cycle Selector Dropdown:** Select active or past billing cycles.
    *   **Summary Metrics Bar:** Total Units, Paid Flats count & amount, Pending count & amount, Overdue count & amount, Collection rate (%).
    *   **Filter Tabs:** **All**, **Pending**, **Paid**, **Overdue**.
    *   **Create Billing Cycle Modal:**
        *   Start Month & Year (auto-suggests next month based on last cycle duration).
        *   Duration (1, 3, 6, or 12 months).
        *   Base Amount (₹).
        *   Owner Amount override & Renter Amount override.
        *   Late payment fee per day / flat fee.
        *   Due Date.
    *   **Export Excel Button:** Calls `GET /api/v1/maintenance/cycles/:cycleId/export` downloading `.xlsx` sheet.
*   **SocietyDueDetailPage (`/dues/:unitId?cycle=:cycleId`):**
    *   Admin unit dues management screen.
    *   **Mark as Paid (Cash/Manual):** Opens modal to record manual payment (`Cash`, `UPI`, `Bank Transfer`), sets paid date, and issues receipt number.
    *   **Remove Payment (Unpay):** Reverts paid record back to pending status.
*   **MaintenanceCycleDetailPage (`/dues/cycles/:cycleId`):**
    *   Detailed view of a specific historical billing cycle with collection metrics and unit-by-unit payment table.
*   **MaintenanceHistoryPage (`/dues/history`):**
    *   Chronological list of all billing cycles created in the society with aggregate collection progress bars.

---

### 7.9 Collections (Festivals & Special Occasion Funds)
Dedicated fundraising module for festivals (Navratri, Diwali, Ganesh Chaturthi), events, celebrations, building repairs, and welfare.

*   **CollectionsPage (`/collections`):**
    *   Overview of active and closed collection funds.
    *   Displays fund title, category pill, target amount per unit, total collected vs target progress bar, and due date.
*   **CreateCollectionPage (`/collections/new`):**
    *   *Privileged View (`manage_collections`).*
    *   Form fields: `Title`, `Category` (`festival`, `event`, `celebration`, `repair`, `welfare`, `other`), `Amount per Unit (₹)`, `Due Date`, `Description`.
*   **ManageCollectionsPage (`/collections/manage`):**
    *   *Privileged View (`manage_collections`).*
    *   Fund switcher tabs to toggle between collections.
    *   Metrics Bar: Target Amount, Total Collected, Pending Amount, Paid flats count, Pending flats count.
    *   Unit grid showing payment status pills (`Paid`, `Pending`, `Overdue`).
    *   **Export to Excel:** Calls `GET /api/v1/collections/:id/export` to download contribution ledger.
    *   Actions: Close Collection, Delete Collection.
*   **PayCollectionsPage (`/collections/pay`):**
    *   Resident view listing active collection funds with payment cards for their assigned flats.
*   **CollectionUnitPayPage (`/collections/:id/units/:unitId`):**
    *   Checkout screen for resident online payment via Razorpay or admin manual cash recording.
*   **CollectionDetailPage (`/collections/:id`):**
    *   Itemized fund statistics and unit contributions list.
*   **CollectionsHistoryPage (`/collections/history`):**
    *   Archive of all closed collection drives and audit records.

---

### 7.10 Document Vault
Secure repository for society financial statements, utility bills, maintenance ledgers, event expense sheets, and bylaws.

*   **DocumentsPage (`/documents`):**
    1.  Category Filter Tabs: **All**, **Bills**, **Collections**, **Expenses**, **Navratri / Events**, **Other**.
    2.  Document Card displays: Title, Category pill, File size, Uploader name, Upload date, and Format badge (**PDF** or **Image**).
    3.  **Download Flow:** Clicking **Download** queries `GET /api/v1/documents/:id/download` and streams file with proper `Content-Disposition`.
    4.  **Upload Document Modal (`manage_documents`):**
        *   Form fields: `Title`, `Category` dropdown, `Description`, File Drag-and-Drop.
        *   Accepts PDF and images (`jpg`, `jpeg`, `png`, `webp`) up to 10MB.
        *   Saved to disk storage under `backend/uploads/documents/`.
    5.  **Delete Document:** Permission holders can soft-delete files via `DELETE /api/v1/documents/:id`.

---

### 7.11 Helpdesk & Complaints Ticket Flow
*   **ComplaintsPage (`/complaints`):**
    1.  Displays ticket metrics: Open, In Progress, Resolved.
    2.  Filter chips by status: **All**, **Open**, **In Progress**, **Resolved**, **Closed**.
    3.  Ticket Card displays: Title, Description preview, Category badge (`plumbing`, `electrical`, `housekeeping`, `security`, `common_area`, `parking`, `other`), Priority pill (`low`, `medium`, `high`, `urgent`), Raised by name, and Time ago.
*   **CreateComplaintPage (`/complaints/new`):**
    1.  Fields: `Title`, `Description`, `Category` dropdown, `Priority` dropdown.
    2.  **Make Public Toggle:** If enabled, other society residents can view the issue on their boards.
    3.  Submit creates ticket and broadcasts update via Socket.IO.
*   **ComplaintDetailPage (`/complaints/:id`):**
    1.  Displays ticket description, category, priority, reporter, assigned staff, and timeline history.
    2.  **Resident Reopen:** If ticket is resolved/closed, resident can click **Reopen Ticket** to transition status to `"reopened"`.
    3.  **Admin Actions (`manage_complaints`):**
        *   **Status Selector:** Open, In Progress, On Hold, Resolved, Closed.
        *   **Assign to Staff:** Selects committee/staff member to assign ticket.

---

### 7.12 Amenities & Facility Booking Flow
*   **AmenitiesPage (`/amenities`):**
    1.  Grid of amenities (Clubhouse, Swimming Pool, Tennis Court, Banquet Hall, Gym) with photos and pricing tags.
    2.  User clicks an amenity $\rightarrow$ opens booking drawer with Calendar date picker.
    3.  Selects date $\rightarrow$ queries `GET /api/v1/amenities/:id/slots?date=...`.
    4.  Displays slot buttons with live capacity tags (e.g., `2/4 left`, `Full`).
    5.  User clicks **Book Slot** $\rightarrow$ backend checks defaulter list (unpaid maintenance bills block booking) $\rightarrow$ confirms booking.
*   **ManageAmenitiesPage (`/amenities/manage`):**
    *   *Privileged View (`manage_amenities`).*
    *   Create / Edit / Delete amenities.
    *   Configurable fields: `Name`, `Description`, `Type` (`free` vs `paid`), `Price`, `Booking Mode` (`slot` vs `full_day`), and comma-separated slot timings (e.g., `06:00-07:00, 07:00-08:00`).
*   **AmenityHistoryPage (`/amenities/history`):**
    *   Residents see their past/upcoming bookings.
    *   Admins see all society bookings.
    *   **Cancel Booking:** Cancelling frees the slot immediately.

---

### 7.13 Community Polls
*   **PollsPage (`/polls`):**
    1.  Tabs: **Active Polls**, **Closed Polls**.
    2.  Scope Badge: Displays whether poll is **Society-wide** or targeted to a specific **Wing**.
    3.  **Voting Interaction:**
        *   Radio buttons for 2 to 4 options.
        *   **One Vote Per Unit:** Votes are keyed by `unitId`. Residents with multiple units can vote once per unit.
        *   On vote, option bars transition into percentage results and vote tallies.
    4.  **Voters Modal:**
        *   **Open Polls:** Clicking "Voters" displays modal listing voter names and flat labels under each option.
        *   **Secret Polls:** Voter identities are hidden; only anonymous count is shown.
*   **CreatePollPage (`/polls/new`):**
    *   *Privileged View (`create_poll`).*
    *   Fields: `Question`, `Options` (2 to 4), `Poll Type` (`open` vs `secret`), `Scope` (`society` vs specific wing), `End Date`.

---

### 7.14 Community Surveys
*   **SurveysPage (`/surveys`):**
    *   Lists surveys with status pills (**Active**, **Closed**) and response state (**Pending** vs **Responded**).
*   **CreateSurveyPage (`/surveys/new`):**
    *   *Privileged View (`create_survey`).*
    *   Dynamic survey builder supporting 1 to 10 questions.
    *   4 Question Types:
        *   `single`: Single-choice radio (2–4 options).
        *   `multiple`: Multi-select checkboxes (2–4 options).
        *   `rating`: 1–5 star rating.
        *   `text`: Open-ended feedback textarea.
    *   Configurable wing scope and end date.
*   **SurveyDetailPage (`/surveys/:id`):**
    1.  **Questionnaire View:** If active and unsubmitted, renders interactive form for resident submission (1 response per unit).
    2.  **Analytics View:** If submitted or closed, visual graphs show percentage distribution for choices, star rating cards, and list of text answers.

---

### 7.15 Notice Board & Announcements
*   **NoticesPage (`/notices`):**
    1.  Chronological list of announcements.
    2.  Latest notices highlighted with distinct primary borders and `"Latest"` badge.
    3.  Clicking a card opens the **Notice Detail Modal** showing full title, author name, timestamp, and body text.
*   **CreateNoticePage (`/notices/new`):**
    *   *Privileged View (`create_notice`).*
    *   Form fields: `Title` (min 3 chars), `Body` (min 5 chars).
    *   Publish broadcasts update across active sockets.

---

### 7.16 Real-time Chat System (Groups & Direct Admin)
*   **ChatPage (`/chat`):**
    1.  **Split Screen Layout:**
        *   **Left Pane:** Shows **Groups** channels and **Direct (Admins)** DM threads with real-time last-message previews and unread indicators.
        *   **Right Pane:** Active conversation window.
    2.  **Group Chat Features:**
        *   Real-time message broadcast via Socket.IO.
        *   **Reply:** Quotes referenced message with preview banner.
        *   **Emoji Reactions:** Popover emoji picker (`👍`, `❤️`, `🔥`, `🎉`, etc.) to attach/remove reactions.
        *   **Pin Message:** Pins important announcements to the header banner of the chat window.
        *   **Delete Message:** Soft-deletes message for all participants.
        *   **Typing Indicator:** Displays `"Someone is typing..."` above composer.
        *   **Group Info Modal:** Lists participants and masked contact numbers.
        *   **Create Group Modal (`manage_amenities`):** Title, Description, member multi-select from directory.
    3.  **Direct DM Flow:**
        *   Residents can start private 1-on-1 conversations directly with Society Admins / Committee.
        *   Double checkmark read receipts (`isRead`).

---

### 7.17 Family Members & Vehicles Management
*   **FamilyMembersPage (`/family-members`):**
    1.  Lists registered family members linked to the user's unit.
    2.  **Add Member Form:** `Name`, `Relation` (`spouse`, `child`, `parent`, `sibling`, `relative`, `other`), and `Phone Number`.
    3.  **Delete Member:** Removes family member.
*   **VehiclesPage (`/vehicles`):**
    1.  Society-wide registered vehicle search engine.
    2.  Search by license plate number, house label, resident name, or phone number.
    3.  Vehicle plates are editable directly on the resident's `/profile` page.

---

### 7.18 My Unit Dashboard
*   **MyUnitPage (`/my-unit`):**
    1.  Displays cards for all units owned or rented by the logged-in resident.
    2.  Cards highlight tenancy state (**Owned** vs **Resident/Renter**).
    3.  Owners see a **Manage Renters** button opening a modal to assign, change, or unassign tenants for their flats.

---

### 7.19 Safety, Gate & Support Placeholders
The following pages are lightweight client layouts reserved for upcoming roadmap integrations:
1.  **Visitors Gatekeeper (`/visitors` - `VisitorsPage.js`):** Client interface placeholder for future MyGate-style guard tablet and visitor entry QR workflows.
2.  **Emergency Contacts (`/emergency-contacts` - `EmergencyContactsPage.js`):** Support contact view for local police, fire, ambulance, and society security desk.
3.  **Settings (`/settings` - `SettingsPage.js`):** User notification and security preferences.
4.  **Help Desk (`/help` - `HelpPage.js`):** Static user guide and FAQ documentation.

---

## 8. Real-time Events Matrix (Socket.IO)

Clients connect to the Socket.IO server via JWT authentication handshake and automatically join their designated rooms:
*   `society:{societyId}`: Society-wide broadcast room.
*   `user:{userId}`: User-specific private notification room.
*   `super_admin`: Platform administrator room for global society registrations and status transitions.

| Event Name | Direction | Room / Target | Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `<model>:change` | Server $\rightarrow$ Client | `society:{societyId}` | `{ id, action: "save" }` | Automatic Mongoose hook triggered on document create/update; prompts React Query cache invalidation. |
| `society:change` | Server $\rightarrow$ Client | `super_admin` & `society:{id}` | `{ id, status, action, society }` | Emitted on society registration, approval, rejection, or suspension. |
| `permissions:change` | Server $\rightarrow$ Client | `society:{societyId}` | `{ societyId, rolePermissions }` | Emitted when committee permissions matrix is modified. |
| `chat:message` | Server $\rightarrow$ Client | `society:{societyId}` | `ChatMessage` | Real-time group chat message delivery. |
| `chat:direct` | Server $\rightarrow$ Client | `user:{userId}` | `DirectMessage` | Real-time 1-on-1 direct message delivery between resident and admin. |
| `chat:typing` | Client $\rightarrow$ Server $\rightarrow$ Room | `society:{societyId}` or `user:{id}` | `{ groupId, senderId, senderName }` | Real-time typing status indicator. |
| `poll:change` | Server $\rightarrow$ Client | `society:{societyId}` | `{ id, action: "vote" \| "close" }` | Emitted when votes are cast or polls close. |
| `survey:change` | Server $\rightarrow$ Client | `society:{societyId}` | `{ id, action: "submit" \| "close" }` | Emitted on survey submission or closure. |
| `collection:change` | Server $\rightarrow$ Client | `society:{societyId}` | `{ id, action: "create" \| "close" }` | Emitted when new collection fund is launched or closed. |

---

## 9. Database Schema Matrix

| Model Name | Key Fields | Indexes |
| :--- | :--- | :--- |
| `User` | `name`, `email`, `phone`, `passwordHash`, `occupation`, `vehicles`, `role`, `isActive` | `{ email: 1 }`, `{ phone: 1 }` |
| `Society` | `name`, `societyType`, `address`, `city`, `state`, `pincode`, `totalUnits`, `status`, `rolePermissions`, `societyAdmin` | `{ name: 1 }`, `{ city: 1 }`, `{ status: 1 }` |
| `Membership` | `userId`, `societyId`, `role`, `additionalRoles`, `assignedWings`, `units`, `isActive`, `joinedAt` | `{ userId: 1, societyId: 1 }` (unique) |
| `Unit` | `societyId`, `propertyType`, `label`, `block`, `floor`, `doorNo`, `ownerId`, `tenantId`, `inviteToken`, `inviteResidentType` | `{ societyId: 1, label: 1 }` (unique), `{ inviteToken: 1 }` |
| `MaintenanceCycle` | `societyId`, `month`, `year`, `amount`, `ownerAmount`, `renterAmount`, `dueDate`, `durationMonths`, `lateCharge` | `{ societyId: 1, month: 1, year: 1 }` (unique) |
| `MaintenancePayment` | `societyId`, `cycleId`, `unitId`, `paidOn`, `method`, `receiptNo`, `amount`, `fee`, `totalAmount`, `razorpayOrderId`, `razorpayPaymentId`, `gatewayStatus` | `{ cycleId: 1, unitId: 1 }` (unique) |
| `Collection` | `societyId`, `title`, `description`, `category`, `amount`, `dueDate`, `status`, `createdBy` | `{ societyId: 1, status: 1 }`, `{ societyId: 1, dueDate: 1 }` |
| `CollectionPayment` | `societyId`, `collectionId`, `unitId`, `amount`, `fee`, `totalAmount`, `paidOn`, `method`, `receiptNo`, `razorpayOrderId`, `gatewayStatus` | `{ societyId: 1, collectionId: 1, unitId: 1 }` (unique) |
| `Document` | `societyId`, `title`, `category`, `description`, `fileUrl`, `fileName`, `fileType`, `fileSize`, `filePath`, `uploadedBy` | `{ societyId: 1, category: 1 }`, `{ societyId: 1, createdAt: -1 }` |
| `Complaint` | `societyId`, `title`, `description`, `category`, `priority`, `status`, `isPublic`, `raisedBy`, `assignedTo`, `unitId` | `{ societyId: 1, status: 1 }`, `{ societyId: 1, isPublic: 1 }` |
| `Amenity` | `societyId`, `name`, `description`, `type`, `price`, `bookingMode`, `slots`, `capacity` | `{ societyId: 1, isActive: 1 }` |
| `AmenityBooking` | `societyId`, `amenityId`, `userId`, `unitId`, `date`, `slot`, `amount`, `status` | `{ societyId: 1, amenityId: 1, date: 1 }` |
| `Poll` | `societyId`, `question`, `options`, `type`, `status`, `scope`, `wing`, `endDate`, `createdBy` | `{ societyId: 1, status: 1 }`, `{ societyId: 1, endDate: 1 }` |
| `PollVote` | `societyId`, `pollId`, `userId`, `unitId`, `selectedOptionIndex` | `{ societyId: 1, pollId: 1, unitId: 1 }` (unique) |
| `Survey` | `societyId`, `title`, `description`, `questions`, `scope`, `wing`, `endDate`, `status`, `createdBy` | `{ societyId: 1, status: 1 }`, `{ societyId: 1, endDate: 1 }` |
| `SurveyResponse` | `societyId`, `surveyId`, `userId`, `unitId`, `answers` | `{ societyId: 1, surveyId: 1, unitId: 1 }` (unique) |
| `ChatGroup` | `societyId`, `name`, `description`, `members`, `pinnedMessageId`, `createdBy` | `{ societyId: 1, members: 1 }` |
| `ChatMessage` | `societyId`, `groupId`, `senderId`, `text`, `replyTo`, `reactions`, `isDeleted` | `{ societyId: 1, groupId: 1, createdAt: -1 }` |
| `DirectMessage` | `societyId`, `senderId`, `receiverId`, `text`, `replyTo`, `reactions`, `isRead`, `isDeleted` | `{ societyId: 1, senderId: 1, receiverId: 1 }` |
| `FamilyMember` | `societyId`, `addedBy`, `name`, `relation`, `phone` | `{ societyId: 1, addedBy: 1 }` |
| `BadgeSeen` | `userId`, `societyId`, `feature`, `lastSeenAt` | `{ userId: 1, societyId: 1, feature: 1 }` |
