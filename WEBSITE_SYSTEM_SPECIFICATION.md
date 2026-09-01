# ResidentOne - Website System Specification & Logic Blueprint

This document provides an exhaustive, field-by-field, flow-by-flow, and screen-by-screen specification of the **ResidentOne** website (frontend and backend). It functions as the single source of truth for developing any new client application (such as a mobile app) that integrates with the existing ResidentOne backend.

---

## Table of Contents
1. [Core Architecture & Tech Stack](#1-core-architecture--tech-stack)
2. [Global Systems & Middlewares](#2-global-systems--middlewares)
    - [2.1 Multi-Tenant Schema Plugin](#21-multi-tenant-schema-plugin)
    - [2.2 Automatic Socket.IO Model Change Hooks](#22-automatic-socketio-model-change-hooks)
    - [2.3 API HTTP Conventions](#23-api-http-conventions)
3. [Authentication & Session Management](#3-authentication--session-management)
    - [3.1 Data Schemas](#31-data-schemas)
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
7. [Detailed Screen-by-Screen Navigation Flows](#7-detailed-screen-by-screen-navigation-flows)
    - [7.1 Authentication & Onboarding](#71-authentication--onboarding)
    - [7.2 Societies Management (Super-Admin Flow)](#72-societies-management-super-admin-flow)
    - [7.3 Society & Wing Operations](#73-society--wing-operations)
    - [7.4 Memberships & Directory](#74-memberships--directory)
    - [7.5 Units & House Invitations](#75-units--house-invitations)
    - [7.6 Maintenance Dues & Billing (Razorpay & Cash Flow)](#76-maintenance-dues--billing-razorpay--cash-flow)
    - [7.7 Collections (Festivals & Occasion Funds Flow)](#77-collections-festivals--occasion-funds-flow)
    - [7.8 Document Vault](#78-document-vault)
    - [7.9 Helpdesk & Complaints Ticket Flow](#79-helpdesk--complaints-ticket-flow)
    - [7.10 Amenities Booking Slots Flow](#710-amenities-booking-slots-flow)
    - [7.11 Polls Voting & Results Flow](#711-polls-voting-and-results-flow)
    - [7.12 Surveys Taking & Analytics Flow](#712-surveys-taking-and-analytics-flow)
    - [7.13 Real-time Chat System (Groups & Direct Admin)](#713-real-time-chat-system-groups--direct-admin)
    - [7.14 Family Members & Vehicles Management](#714-family-members--vehicles-management)
    - [7.15 My Unit Dashboard](#715-my-unit-dashboard)
8. [Real-time Events Matrix (Socket.IO)](#8-real-time-events-matrix-socketio)
9. [Static & Placeholder Pages](#9-static--placeholder-pages)

---

## 1. Core Architecture & Tech Stack

ResidentOne is built as a modular split client-server architecture:
*   **Backend:** Express (v5) server connected to MongoDB using Mongoose (v9). It features real-time communication via Socket.IO (v4) with JWT handshake authentication, document file uploads via Multer, Excel spreadsheet exports via ExcelJS, and card/UPI/net-banking payment workflows through Razorpay (v2).
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
        ├── stores/              // Zustand stores: auth.store.js, society.store.js
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

### 2.3 API HTTP Conventions
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

### 3.1 Data Schemas
#### User Model (`User`)
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
*   `POST /auth/register` — Payload: `{ name, email, phone, password }` (Password: 6–100 chars). Returns `{ user, accessToken, refreshToken }`.
*   `POST /auth/login` — Payload: `{ identifier, password }` (where identifier is email or phone). Returns `{ user, accessToken, refreshToken }`.
*   `POST /auth/refresh` — Payload: `{ refreshToken }`. Returns `{ accessToken, refreshToken }`.
*   `GET /users/profile` — Returns current logged-in user profile with vehicles and platform role.
*   `PATCH /users/profile` — Payload: `{ name, email, phone, occupation, familyMembers, vehicles }`. Returns updated user document.

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

## 7. Detailed Screen-by-Screen Navigation Flows

### 7.1 Authentication & Onboarding
*   **LoginPage (`/login`):**
    1.  User enters `email` (or phone) and `password`.
    2.  Clicks **Sign In**.
    3.  On API success, stores JWT tokens in Zustand & localStorage, queries memberships, sets active society, and navigates to `/dashboard`.
*   **RegisterPage (`/register`):**
    1.  User enters `Full Name`, `Email`, `Phone Number`, and `Password`.
    2.  Clicks **Create Account**.
    3.  Upon success, user is redirected to `/create-society` setup wizard.
*   **CreateSocietyPage (`/create-society`):**
    1.  User completes form fields: `Society Name`, `Building Type` (Apartment, Row House, Mixed), `Address`, `City`, `State`, `Pincode`, `Total Units`, `Contact Person Name`, `Contact Phone`, `Contact Email`.
    2.  Clicks **Submit Registration**.
    3.  A "Pending Approval" status modal is displayed explaining that the platform super-administrator must verify the society profile.

---

### 7.2 Societies Management (Super-Admin Flow)
*   **PendingApprovalsPage (`/admin/societies/pending`):**
    1.  Super-Admin views a list of all societies with status `"pending"`.
    2.  Clicks **Review** on a specific row.
    3.  Opens review drawer showing full address details and contact numbers.
    4.  Clicks **Approve** (marks status `"active"`, makes the registering user primary `"society_admin"`) or **Reject** (enters `rejectionReason`, updates status to `"rejected"`).
*   **AdminSocietiesPage (`/admin/societies`):**
    1.  Lists all platform societies with status filtering pills (**All**, **Active**, **Pending**, **Rejected**, **Suspended**) and search.
    2.  Clicking a row navigates to `/admin/societies/:id` detail page.
    3.  Actions: Edit details, **Suspend** (blocks society operations), or **Activate**.
*   **AdminCreateSocietyPage (`/admin/societies/new`):**
    1.  Super-Admin directly provisions an active society with an assigned society admin user ID.

---

### 7.3 Society & Wing Operations
*   **ManageSocietyPage (`/society/manage`):**
    1.  *Privileged Society Admin View.*
    2.  Displays editable society profile form: Name, Address, City, State, Pincode, Contact info.
    3.  **Wings Overview Section:** Lists all detected wings/blocks in the society with unit count, occupied flats count, and assigned wing admins.
*   **ManageWingPage (`/wing/manage`):**
    1.  *Privileged View for Wing Admins & Society Admins.*
    2.  Displays house cards grouped by the user's assigned wing.
    3.  Cards display occupancy status (**Owned**, **Rented**, **Vacant**), registered vehicle count, family member count, and pending invite status.
    4.  Clicking a house card opens the `AssignHouseModal` to assign owners/tenants or generate invite links.
*   **Bulk Unit Generator (`POST /api/v1/units/bulk-generate`):**
    *   Generates a series of units across wings and floors (e.g., Wing A, Floors 1–5, 4 units per floor $\rightarrow$ A-101 to A-504).

---

### 7.4 Memberships & Directory
*   **DirectoryPage (`/directory`):**
    1.  User clicks **Directory** card on dashboard.
    2.  Renders search bar ("Search by name or house label...") and responsive grid of member cards.
    3.  Each card displays member's initials, full name, house label (e.g., `B-402`), society role badges, and phone number.
*   **ManageCommitteePage (`/committee`):**
    1.  *Privileged Admin View.* Displays all committee members and roles.
    2.  Admin clicks **Add Member** -> selects user, assigns role (`manager`, `treasurer`, `wing_admin`, etc.), and optionally assigns wings.
    3.  Admin can tap the **Role Dropdown** on any row to change a member's role or remove them.
    4.  **Permissions Matrix Sub-view:** Lists all 14 permission keys with role checkboxes. Admins check/uncheck these boxes to override privileges for particular roles. Clicking **Save Permissions** commits updates via `PUT /api/v1/societies/permissions`.

---

### 7.5 Units & House Invitations
*   **ManageHousesPage (`/houses`):**
    1.  Renders a grid representing all flats/units of the society, filterable by occupancy status (**All**, **Owned**, **Rented**, **Vacant**) and search keywords.
    2.  Clicking a unit block navigates to `/houses/:unitId`.
*   **HouseDetailPage (`/houses/:unitId`):**
    1.  Displays the flat owner's and tenant's profile cards.
    2.  If vacant, shows **Assign Owner** button opening a modal to search platform users.
    3.  **Generate Invite Link:** Admin clicks **Generate Invite Link**, selects role (`Owner` or `Tenant/Renter`), and clicks **Generate**. An invite URL (`/house-invite/:token`) is created with a **Copy Link** button.
*   **HouseInvitePage (`/house-invite/:token`):**
    1.  Public link opened by resident. Displays welcome card with Society Name, Address, and Unit Label.
    2.  User clicks **Claim Unit**.
    3.  If unauthenticated, redirects to Login/Register first. Once logged in, the token is consumed, the unit assignment is linked to their membership, and they navigate to `/dashboard`.

---

### 7.6 Maintenance Dues & Billing (Razorpay & Cash Flow)

```
[Dashboard: Pay Maintenance]
          │
          ▼
 [MaintenancePage: Lists assigned units & status]
          │
          ▼ (User clicks unit card)
 [MaintenanceDetailPage: Itemized bill breakdown]
          │
          ▼ (User clicks "Pay Now")
 [PayMaintenancePage: Select payment method]
       ┌──────────────────┴──────────────────┐
       ▼                                     ▼
 [Pay Online (Razorpay)]             [Pay Cash at Office]
       │                                     │
       ├── Creates Razorpay Order            └── Instructs manual payment to Treasurer
       ├── Opens UPI/Cards/Netbanking Modal
       ├── Verifies payment signature
       └── Updates status to "Paid" + Generates Receipt
```

*   **MaintenancePage (`/maintenance`):**
    *   Lists all assigned units with monthly billing status (**Paid**, **Unpaid**, **Overdue**).
*   **MaintenanceDetailPage (`/maintenance/:unitId?cycle=:cycleId`):**
    *   Shows billing period, dual rate applicability (Owner rate vs Renter rate), late fee charges, and due date.
    *   If paid: displays green status badge and **Download Receipt** button.
*   **PayMaintenancePage (`/maintenance/:unitId/pay?cycle=:cycleId`):**
    *   **Pay Online:** Calculates total amount including convenience fee breakdown (Base charge + 2% processing fee + 18% GST on fee). Initializes Razorpay SDK modal. On success, POSTs to `/verify` and redirects to receipt.
    *   **Pay Cash:** Shows instructions for paying at the management office.
*   **SocietyDuesPage (`/dues`):**
    *   *Privileged Admin / Treasurer View.*
    *   Lists all units in the active cycle with paid/unpaid status pills.
    *   Features **Record Cash Payment** modal, **Cancel Payment** button, and **Export Excel** button.
*   **MaintenanceCycleDetailPage (`/dues/cycles/:cycleId`):**
    *   Detailed view of a specific historical billing cycle with collection metrics and unit-by-unit payment table.
*   **MaintenanceHistoryPage (`/dues/history`):**
    *   Chronological list of all billing cycles created in the society with aggregate collection progress bars.

---

### 7.7 Collections (Festivals & Occasion Funds Flow)

Dedicated module for event, festival, and special occasion fundraising (e.g., Navratri, Diwali, Ganesh Chaturthi, Building Painting, Welfare).

```
[Admin: /collections/new] ──> Creates Collection Fund (e.g., "Navratri 2026", ₹2,500/flat)
                                       │
      ┌────────────────────────────────┴────────────────────────────────┐
      ▼                                                                 ▼
[Resident: /collections/pay]                                  [Admin: /collections/manage]
  ├── Views active funds                                        ├── Views unit contribution matrix
  ├── Clicks "Pay Online" (Razorpay)                            ├── Records manual cash payments
  └── Receives collection receipt                               └── Exports collection spreadsheet to Excel
```

*   **CollectionsPage (`/collections`):**
    *   Overview of all active and past special collection funds with progress bars, collected amount vs target, and due dates.
*   **CreateCollectionPage (`/collections/new`):**
    *   *Privileged View (`manage_collections`).*
    *   Form fields: `Title`, `Category` (Festival, Event, Celebration, Repair, Welfare, Other), `Amount per Unit (₹)`, `Due Date`, `Description`.
*   **ManageCollectionsPage (`/collections/manage`):**
    *   Admin table listing all units and their payment status for each collection.
    *   Actions: Record Cash Payment, Remove/Unpay, Close Collection, Export to Excel.
*   **CollectionDetailPage (`/collections/:id`):**
    *   Itemized fund statistics: Total Target, Total Collected, Total Remaining, Contributing Units count.
*   **CollectionUnitPayPage (`/collections/:id/units/:unitId`):**
    *   Resident checkout screen with Razorpay integration and receipt generation.

---

### 7.8 Document Vault

Secure repository for society financial statements, monthly utility bills, maintenance ledgers, event expense sheets, and bylaws.

*   **DocumentsPage (`/documents`):**
    1.  Displays document cards categorized by filter tabs: **All**, **Bills**, **Collections**, **Expenses**, **Navratri / Events**, **Other**.
    2.  Each card displays document title, category pill, file size, upload author name, upload date, and format badge (**PDF** or **Image**).
    3.  **Download Flow:** Clicking **Download** queries `GET /api/v1/documents/:id/download` and streams the file to disk.
    4.  **Upload Modal (`manage_documents`):**
        *   Form fields: `Title`, `Category`, `Description`, File Drag-and-Drop.
        *   Accepts PDF and images (`jpg`, `jpeg`, `png`, `webp`) up to 10MB.
        *   Files are securely stored under `backend/uploads/documents/`.
    5.  **Delete:** Permission holders can remove outdated documents via `DELETE /api/v1/documents/:id`.

---

### 7.9 Helpdesk & Complaints Ticket Flow
*   **ComplaintsPage (`/complaints`):**
    1.  User clicks **Complaints** dashboard card.
    2.  Displays aggregate metrics (Open, In Progress, Resolved) and filter chips.
    3.  Lists tickets with priority badges (**Low**, **Medium**, **High**, **Urgent**) and category tags (**Plumbing**, **Electrical**, **Housekeeping**, **Security**, **Common Area**, **Parking**, **Other**).
*   **CreateComplaintPage (`/complaints/new`):**
    1.  User enters `Title`, `Description`, selects `Category`, `Priority`.
    2.  **Make Public Toggle:** If enabled, other society residents can view the issue on their boards.
    3.  Clicks **Submit Complaint**.
*   **ComplaintDetailPage (`/complaints/:id`):**
    1.  Displays ticket details, timeline history, and resident/admin comments.
    2.  **Resident Action:** If resolved/closed, user can click **Reopen Ticket**.
    3.  **Admin Actions (`manage_complaints`):**
        *   **Status Selector:** Open, In Progress, On Hold, Resolved, Closed.
        *   **Assign to Staff:** Assigns ticket to specific committee/staff member.

---

### 7.10 Amenities Booking Slots Flow
*   **AmenitiesPage (`/amenities`):**
    *   Displays society amenities (Clubhouse, Swimming Pool, Tennis Court, Banquet Hall, Gym) with images and pricing tags.
*   **Amenity Booking Flow:**
    1.  User selects an amenity and chooses a date on the calendar picker.
    2.  API fetches `GET /api/v1/amenities/:id/slots?date=...`, displaying available time slots and remaining capacity.
    3.  User selects slot(s) and clicks **Book Slot**.
    4.  Backend verifies that the resident has no overdue maintenance blocks before confirming.
*   **ManageAmenitiesPage (`/amenities/manage`):**
    *   *Privileged View (`manage_amenities`).*
    *   Create, edit, or delete amenities; configure slot durations, max capacity, hourly fees, and operating hours.
*   **AmenityHistoryPage (`/amenities/history`):**
    *   Residents see their past/upcoming bookings. Admins see all society bookings with **Cancel Booking** buttons.

---

### 7.11 Polls Voting & Results Flow
*   **PollsPage (`/polls`):**
    1.  Renders **Active Polls** and **Closed Polls** tabs.
    2.  **Scope Indicator:** Displays whether poll is Society-wide or Wing-specific.
    3.  **Voting Interaction:** User selects an option (2–4 options). 
    4.  **One Vote Per Unit:** Votes are recorded per flat unit (`unitId`). If a user owns multiple flats, they can vote on behalf of each assigned unit.
    5.  **Results View:** Displays percentage breakdown and vote tallies.
        *   **Open Polls:** Clicking **Voters** expands a dropdown showing names and house numbers of residents who selected each option.
        *   **Secret Polls:** Voter identities are hidden.
*   **CreatePollPage (`/polls/new`):**
    *   *Privileged View (`create_poll`).*
    *   Fields: `Question`, `Options` (2 to 4), `Poll Type` (Open vs Secret), `Scope` (Society vs Specific Wing), `End Date`.

---

### 7.12 Surveys Taking & Analytics Flow
*   **SurveysPage (`/surveys`):**
    *   Lists surveys with status (**Active**, **Closed**) and response state (**Pending** or **Responded**).
*   **SurveyDetailPage (`/surveys/:id`):**
    1.  **Survey Taking:** Renders dynamic questionnaire supporting 4 question types:
        *   `single`: Radio button single choice.
        *   `multiple`: Checkbox multi-select.
        *   `rating`: 1 to 5 star rating.
        *   `text`: Open-ended feedback textarea.
    2.  User submits response (stored uniquely per unit).
    3.  **Survey Analytics:** Once submitted or closed, visual graphs show percentage distribution for choices, average star rating cards, and a list of text answers.
*   **CreateSurveyPage (`/surveys/new`):**
    *   *Privileged View (`create_survey`).*
    *   Interactive question builder supporting 1 to 10 questions with variable question types, wing scoping, and end date configuration.

---

### 7.13 Real-time Chat System (Groups & Direct Admin)
*   **ChatPage (`/chat`):**
    1.  **Split Screen Layout:**
        *   **Left Pane:** Shows **Groups** channels and **Direct (Admins)** DM threads with real-time last-message previews and unread indicators.
        *   **Right Pane:** Active conversation window.
    2.  **Group Chat Features:**
        *   Real-time message broadcast via Socket.IO.
        *   **Reply:** Quotes referenced message.
        *   **Emoji Reactions:** Add/remove emoji reactions to message bubbles.
        *   **Pin Message:** Pins important announcements to the top of the chat window.
        *   **Delete Message:** Soft-deletes message for all participants.
        *   **Typing Indicator:** Displays `"Someone is typing..."` above composer.
        *   **Group Info Modal:** Lists participants and masked contact info.
    3.  **Direct DM Flow:**
        *   Residents can start private conversations directly with Society Admins / Committee.
        *   Double checkmark read receipts (`isRead`).

---

### 7.14 Family Members & Vehicles Management
*   **FamilyMembersPage (`/family-members`):**
    1.  Lists registered family members linked to the user's unit.
    2.  **Add Member:** Enters `Name`, `Relation` (Spouse, Child, Parent, Sibling, Other), and `Phone Number`.
    3.  **Remove:** Deletes family member entry.
*   **VehiclesPage (`/vehicles`):**
    1.  Society-wide registered vehicle search engine.
    2.  Search by license plate number, house label, resident name, or phone number.
    3.  Vehicle plates are editable directly on the resident's `/profile` page.

---

### 7.15 My Unit Dashboard
*   **MyUnitPage (`/my-unit`):**
    1.  Displays cards for all units owned or rented by the logged-in resident.
    2.  Cards highlight tenancy state (**Owned** vs **Resident/Renter**).
    3.  Owners see a **Manage Renters** button opening a modal to assign, change, or unassign tenants for their flats.

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

## 9. Static & Placeholder Pages

The following pages are currently lightweight client layouts reserved for upcoming roadmap integrations:
1.  **Visitors Gatekeeper (`/visitors` - `VisitorsPage.js`):** Client interface placeholder for future MyGate-style guard tablet and visitor entry QR workflows.
2.  **Emergency Contacts (`/emergency-contacts` - `EmergencyContactsPage.js`):** Support contact view for local police, fire, ambulance, and society security desk.
3.  **Settings (`/settings` - `SettingsPage.js`):** User notification and security preferences.
4.  **Help Desk (`/help` - `HelpPage.js`):** Static user guide and FAQ documentation.
