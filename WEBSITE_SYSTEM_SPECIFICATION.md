# ResidentOne - Website System Specification & Logic Blueprint

This document provides an exhaustive, field-by-field, flow-by-flow, and screen-by-screen specification of the **ResidentOne** website (frontend and backend). It functions as the single source of truth for developing any new client application (such as a mobile app) that integrates with the existing ResidentOne backend.

---

## Table of Contents
1. [Core Architecture & Tech Stack](#1-core-architecture--tech-stack)
2. [Global Systems & Middlewares](#2-global-systems--middlewares)
3. [Authentication & Session Management](#3-authentication--session-management)
4. [Multi-Tenancy & Society Context](#4-multi-tenancy--society-context)
5. [Role-Based Access Control (RBAC) & Permissions](#5-role-based-access-control-rbac--permissions)
6. [Dashboard & Badging Engine](#6-dashboard--badging-engine)
7. [Detailed Screen-by-Screen Navigation Flows](#7-detailed-screen-by-screen-navigation-flows)
    - [7.1 Authentication & Onboarding](#71-authentication--onboarding)
    - [7.2 Societies Management (Super-Admin Flow)](#72-societies-management-super-admin-flow)
    - [7.3 Memberships & Directory Directory](#73-memberships--directory)
    - [7.4 Units & House Invitations](#74-units--house-invitations)
    - [7.5 Notices Board](#75-notices-board)
    - [7.6 Maintenance Dues & Payments (Razorpay Flow)](#76-maintenance-dues--payments-razorpay-flow)
    - [7.7 Helpdesk & Complaints Ticket Flow](#77-helpdesk--complaints-ticket-flow)
    - [7.8 Amenities Booking Slots Flow](#78-amenities-booking-slots-flow)
    - [7.9 Polls Voting & Results Flow](#79-polls-voting-and-results-flow)
    - [7.10 Surveys Taking & Analytics Flow](#710-surveys-taking-and-analytics-flow)
    - [7.11 Chat System (Groups & Direct Admin)](#711-chat-system-groups--direct-admin)
    - [7.12 Family Members & Vehicles Setup](#712-family-members--vehicles-setup)
8. [Real-time Events Matrix (Socket.IO)](#8-real-time-events-matrix-socketio)
9. [Static & Placeholder Pages](#9-static--placeholder-pages)

---

## 1. Core Architecture & Tech Stack

ResidentOne is built as a split client-server architecture:
*   **Backend:** Express (v5) server connected to MongoDB using Mongoose (v9). It features real-time communication via Socket.IO (v4) and processes card/UPI/net-banking payments through Razorpay (v2).
*   **Frontend Website:** Single Page Application (SPA) built using React (v19) via Create React App, styled with Tailwind CSS (v3) and Google Material Symbols for iconography.
*   **State & Cache:** Zustand (v5) is used for in-memory and persistent global client state. `@tanstack/react-query` (v5) manages API caching, background synchronization, and optimistic UI rendering.

---

## 2. Global Systems & Middlewares

### 2.1 Multi-Tenant Schema Plugin
Every tenant-specific model (such as Notice, Complaint, Poll, Survey, Unit, Amenity, Booking, ChatGroup, etc.) contains a `societyId` field. 
To guarantee data isolation, the backend applies a global Mongoose tenant plugin (`backend/src/shared/plugins/tenant.plugin.js`) that automatically:
1. Injects `{ societyId }` into all write operations.
2. Appends query conditions checking `societyId` during `find`, `findOne`, `countDocuments`, `updateOne`, `deleteMany`, etc.
3. Automatically inserts a `$match: { societyId }` stage at the top of aggregated query pipelines.

### 2.2 API HTTP Conventions
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
*   `name`: String (Required)
*   `email`: String (Required, unique, lowercase)
*   `phone`: String (Required, unique)
*   `passwordHash`: String (Selected out by default, hashed via `bcryptjs` with salt rounds = 12)
*   `occupation`: String (Optional)
*   `familyMembers`: Array of references (Mapped via a separate model or populated field)
*   `vehicles`: Array of Strings (License plate strings)
*   `role`: String enum (`"resident"`, `"society_admin"`, `"super_admin"`) (This is the platform-wide account role, separate from society roles)
*   `isActive`: Boolean (Default: `true`)

### 3.2 Token Flow & Interceptors
1.  **JWT Structure:** The Access Token payload contains: `{ userId, role: [accountRole], societyId: null }`. Note that society roles are *not* encoded in the JWT; they are checked per-request by resolving the membership profile.
2.  **Expiries:** Access token expires in **15 minutes**; Refresh token expires in **7 days**.
3.  **Token Refresh:** If the backend responds with `401 Unauthorized`, the client's Axios response interceptor (`frontend/src/lib/api.js`) catches the error, blocks subsequent requests, and attempts to get a new token pair:
    *   **Endpoint:** `POST /api/v1/auth/refresh`
    *   **Body:** `{ refreshToken: "..." }` (Retrieved from client `localStorage`)
    *   **Result:** Reissues both tokens. If this fails, it clears credentials, redirecting the user to `/login`.

### 3.3 Auth API Endpoints
*   `POST /auth/register`
    *   *Payload:* `{ name, email, phone, password }` (Password must be 6–100 characters)
    *   *Returns:* `{ success: true, data: { user, accessToken, refreshToken } }`
*   `POST /auth/login`
    *   *Payload:* `{ identifier, password }` (where identifier is email or phone)
    *   *Returns:* `{ success: true, data: { user, accessToken, refreshToken } }`
*   `GET /users/profile` (Requires authentication)
    *   *Returns:* Current user profile data.
*   `PATCH /users/profile` (Requires authentication)
    *   *Payload:* `{ name, phone, occupation, vehicles }`
    *   *Returns:* Updated user profile data.

---

## 4. Multi-Tenancy & Society Context

A single user can belong to multiple housing societies. 

```
User (Tokens in localStorage)
   |
   +---> Memberships (Determined on backend via resolveSocietyContext)
            |
            +---> Society A (Role: "owner")
            +---> Society B (Role: "treasurer")
```

### 4.1 Society Context Resolver Middleware (`resolveSocietyContext`)
For any request targeting a society-scoped endpoint, the backend checks:
1.  The `x-society-id` header in the incoming request.
2.  Queries the `Membership` collection for a record containing `{ userId: req.userId, societyId: header.societyId, isActive: true }`.
3.  If found, it attaches the following properties to the Express request object:
    *   `req.societyId` (String representation)
    *   `req.membership` (Full Mongoose document)
    *   `req.role` (The specific role string, e.g., `"treasurer"`)
4.  If no valid membership exists, it returns a `403 Forbidden` response.

### 4.2 Client Society Selector Store
The client persists the `activeSocietyId` inside a local store (`residentone.active-society` via Zustand persist). Changing societies invokes `setActiveSociety(societyId)`, which updates the default Axios header configuration and triggers a global React Query invalidation (`queryClient.invalidateQueries()`) to reload all feature views with context from the new tenant.

---

## 5. Role-Based Access Control (RBAC) & Permissions

Platform permissions are split into two layers:
1.  **Platform Role:** Checked via account role (`super_admin` has unrestricted access across societies; `society_admin` has administrative rights within their tenant).
2.  **Society Permissions Matrix:** Configurable privileges mapped to specific roles within a society.

### 5.1 Society Roles List
```
"super_admin", "society_admin", "committee_member", "manager", "treasurer", "accountant", "helpdesk_manager", "auditor", "owner", "tenant", "staff", "security_guard"
```

### 5.2 The 12 Permissions Keys
1.  `manage_committee`: Edit member roles, permissions overrides, and invite/remove members.
2.  `manage_houses`: Edit, assign, unassign owners/tenants to flat units, generate invite links.
3.  `manage_maintenance`: Create billing cycles, record manual check/cash payments, cancel payments.
4.  `create_notice`: Post bulletins to the society-wide notice board.
5.  `manage_amenities`: Manage amenities database (create, update, delete amenities).
6.  `manage_bookings`: View, search, and cancel bookings for all members.
7.  `create_poll`: Publish and manually close opinion/election polls.
8.  `create_survey`: Build and publish surveys, view raw survey charts.
9.  `manage_complaints`: Assign tickets, log internal remarks, update complaint statuses.
10. `manage_visitors`: Approve/reject visitors (Reserved for guard dashboard integration).
11. `view_financials`: Access budget spreadsheets, income reports, ledger records.
12. `manage_directory`: View full directories (Residents have this permission by default).

### 5.3 Custom Permission Overrides
While default roles have template permissions (e.g., `treasurer` is assigned `view_financials` and `manage_maintenance`), the `Society.rolePermissions` object (a Mongoose `Mixed` field structured as `{ [role]: string[] }`) stores custom permissions. The frontend `ManageCommitteePage.js` provides checkboxes to add/remove permission keys for specific roles on the fly.

---

## 6. Dashboard & Badging Engine

The Dashboard acts as the central router for all client operations.

### 6.1 Layout Configuration
*   **Greeting:** Determined dynamically based on local device time (`Good morning` if <12 PM, `Good afternoon` if <5 PM, else `Good evening`).
*   **General Action Grid:** Displays cards for all features. Red numeric badges are attached dynamically.
*   **Privileged (Admin) Actions Grid:** Displayed only if `hasPermission(permission)` checks evaluate to true.

### 6.2 The Badging Algorithm
Badges are computed dynamically per-user relative to when they last visited specific features.

```
User visits page (e.g., /polls)
   |
   +---> useBadgeSeen("polls") hook executes
            |
            +---> POSTs to /dashboard/badges/seen (feature: "polls")
            +---> Backend upserts BadgeSeen { userId, societyId, feature: "polls", lastSeenAt: Date.now() }
            +---> Refetches /dashboard/badges (polls count is now 0)
```

1.  **Collection Schema (`BadgeSeen`):**
    *   `userId`: ObjectId (Index)
    *   `societyId`: ObjectId (Index, Nullable for Platform SuperAdmin)
    *   `feature`: String (Index; one of `"complaints"`, `"polls"`, `"surveys"`)
    *   `lastSeenAt`: Date
2.  **Counting Logic (`GET /dashboard/badges`):**
    *   Fetches the `lastSeenAt` timestamp for each of the 3 features. Fallback chain: `Membership.joinedAt` -> `User.createdAt` -> Unix Epoch 0.
    *   **Complaints:** Count active records created after `lastSeenAt`. Residents only count their own private tickets or public complaints; admins count all.
    *   **Polls:** Count active polls created after `lastSeenAt`.
    *   **Surveys:** Count active surveys created after `lastSeenAt`.
    *   *Returns:* `{ complaints: Number, polls: Number, surveys: Number }`
3.  **Frontend Hook Integration (`useBadgeSeen`):**
    *   Mounting the target page (e.g., `PollsPage.js`) invokes `useBadgeSeen("polls")`.
    *   This fires a `POST /dashboard/badges/seen` call with body `{ feature: "polls" }`, updating the database `lastSeenAt` to `now()`.
    *   The hook automatically invalidates the React Query cache key `["dashboard-badges"]`, causing the dashboard badge to clear when returning back.

---

## 7. Detailed Screen-by-Screen Navigation Flows

### 7.1 Authentication & Onboarding
*   **LoginPage (`/login`):**
    1.  User enters `email` (or phone) and `password`.
    2.  User clicks the **Sign In** button.
    3.  On API success, user is navigated to the `/dashboard`. On error, an inline error banner is rendered.
*   **RegisterPage (`/register`):**
    1.  User enters `Full Name`, `Email`, `Phone Number`, and `Password`.
    2.  User clicks **Create Account**.
    3.  Upon success, the token is saved, and the user is redirected to the `/create-society` setup wizard.
*   **CreateSocietyPage (`/create-society`):**
    1.  User completes form fields: `Society Name`, `Building Type` (Flat, Row House), `Address`, `City`, `State`, `Pincode`, `Total Units`, `Contact Person` details.
    2.  User clicks **Submit Registration**.
    3.  A "Pending Approval" dialog is displayed explaining that the platform administrator must verify the society profile. The user remains locked in a pending state until moderator approval.

---

### 7.2 Societies Management (Super-Admin Flow)
*   **Super-Admin Dashboard (Platform Admin View):**
    *   Renders two distinct admin shortcuts: **Societies** and **Pending Approvals**.
*   **PendingApprovalsPage (`/admin/societies/pending`):**
    1.  Super-Admin views a list of all societies with status `"pending"`.
    2.  Clicks **Review** on a specific row.
    3.  Opens a side-drawer/modal showing full address details and contact numbers.
    4.  Admin clicks either **Approve** (marks status `"active"`, makes the registering resident the primary `"society_admin"`) or **Reject** (opens textarea to specify `rejectionReason`, updates status to `"rejected"`).
*   **AdminSocietiesPage (`/admin/societies`):**
    1.  Lists all societies in the system.
    2.  Contains status filtering pills (**All**, **Active**, **Pending**, **Rejected**, **Suspended**) and a search bar.
    3.  Clicking a row navigates to the `/admin/societies/:id` detail page.
    4.  From detail page, admin can update society attributes or click **Suspend** (blocks all society membership operations).

---

### 7.3 Memberships & Directory
*   **DirectoryPage (`/directory`):**
    1.  User clicks the **Directory** card on the dashboard.
    2.  Renders a search bar ("Search by name or house label...") and a responsive grid of member cards.
    3.  Each card displays the member's initials, name, unit label (e.g., `B-402`), society role tag, and a masked phone number.
*   **ManageCommitteePage (`/committee`):**
    1.  *Privileged Admin View.* Displays a list of all committee memberships.
    2.  Admin clicks **Add Member** -> Enters member details -> Member gets added.
    3.  Admin can tap the **Role Dropdown** on any row to change a member's society role.
    4.  Contains a **Permissions Matrix** sub-view: lists all 12 key permissions with checkboxes. Admins check/uncheck these boxes to override rules for particular roles. Clicking **Save Permissions** commits updates via `PUT /societies/permissions`.

---

### 7.4 Units & House Invitations
*   **ManageHousesPage (`/houses`):**
    1.  Renders a grid representing all flats/units of the society, filterable by occupancy status (**All**, **Owned**, **Rented**, **Vacant**) and search keywords.
    2.  Clicking a unit block navigates to `/houses/:unitId`.
*   **HouseDetailPage (`/houses/:unitId`):**
    1.  Displays the flat owner's and tenant's profile cards.
    2.  If vacant, shows an **Assign Owner** button which opens a search modal to find and select platform users.
    3.  **Generate Invite Link:** Admin clicks **Generate Invite Link**, selects role (`Owner` or `Tenant/Renter`), and clicks **Generate**. 
    4.  An invite URL (`/house-invite/:token`) is printed on screen with a **Copy Link** button.
*   **HouseInvitePage (`/house-invite/:token`):**
    1.  Opened by a public user. Renders a welcome card displaying the Society's name, Address, and Unit Label.
    2.  User clicks **Claim Unit**.
    3.  If they are not logged in, they are redirected to the Login page first. After logging in, the token is consumed, the unit assignment is saved, and they are navigated to the `/dashboard`.

---

### 7.5 Notices Board
*   **NoticesPage (`/notices`):**
    1.  User clicks **Notices** dashboard card.
    2.  Displays chronological list of notices. The top two latest notices are highlighted with distinct styling borders.
    3.  Clicks on any notice card -> Opens the **Notice Detail Modal** showing the full post title, posting timestamp, author profile name, and the rich text body.
*   **CreateNoticePage (`/notices/new`):**
    1.  *Privileged Admin View.* Click **Create Notice** card on dashboard.
    2.  Enter `Title` and `Body` contents.
    3.  Click **Publish Notice**. Upon success, redirects back to `/notices`.

---

### 7.6 Maintenance Dues & Payments (Razorpay Flow)

```
[Dashboard Card: Pay Maintenance]
               |
               v
  [MaintenancePage: Lists assigned houses]
               |
               v (User clicks House Card)
  [MaintenanceDetailPage: Shows dues and bills]
               |
               v (User clicks "Pay Now")
  [PayMaintenancePage: Select Payment Option]
      /                                 \
     / (Pay Online)                      \ (Pay Cash)
    v                                     v
[Razorpay SDK Modal]             [Instructions Screen]
    |                                     |
    v (Verifies signature)                v
[Detail page with "Paid" status]  [Redirect to Detail page]
```

*   **MaintenancePage (`/maintenance`):**
    1.  User clicks the **Pay Maintenance** card on the dashboard.
    2.  The screen queries the latest cycle info. If the user is registered to multiple flats (e.g., owning A-101 and renting B-502), it renders a list containing **both house cards** showing their independent monthly status (e.g. `Overdue` or `Paid`).
    3.  The user clicks on the target house card.
*   **MaintenanceDetailPage (`/maintenance/:unitId?cycle=:cycleId`):**
    1.  Shows unit-specific invoice details: billing period, billing rates (Owner rate vs Renter rate based on tenancy status), and due date.
    2.  If unpaid: displays a red **Pay Now** button.
    3.  If paid: displays a green checkmark and a **Download Receipt** button. Clicking this downloads and prints a layout receipt showing transaction numbers, society seals, base dues, and fees.
*   **PayMaintenancePage (`/maintenance/:unitId/pay?cycle=:cycleId`):**
    1.  User clicks **Pay Now** from the detail page.
    2.  Displays two payment boxes:
        *   **Pay Online (Razorpay):** Calculates fee breakdown (Base charge + 2% processing fee + 18% GST on the fee). Shows a **Pay Online** button.
        *   **Pay Cash at Office:** Instructs the resident to pay cash to the society treasurer. Includes a link to return back to the details page.
    3.  **Online Checkout Execution:** Clicking **Pay Online** executes the `createOrderMutation` which calls `/create-order`.
    4.  The Razorpay checkout script is initialized dynamically. A modal overlays the application displaying payment options (UPI, Netbanking, Cards).
    5.  User completes payment. Upon completion, Razorpay returns transaction parameters which are POSTed back to `/verify`.
    6.  On successful validation, a confirmation checkmark screen is shown, and the user is redirected back to `/maintenance/:unitId` with the status updated to `"Paid"`.

---

### 7.7 Helpdesk & Complaints Ticket Flow
*   **ComplaintsPage (`/complaints`):**
    1.  User clicks **Complaints** dashboard card.
    2.  Shows aggregate ticket metrics (Open, In Progress, Resolved) and filter chips.
    3.  Clicks **New Complaint** button.
*   **CreateComplaintPage (`/complaints/new`):**
    1.  User enters `Title`, `Description`, selects `Category` dropdown, selects `Priority` dropdown.
    2.  Selects the **Make Public** toggle checkbox (if checked, other society residents can view this complaint on their dashboard boards).
    3.  Clicks **Submit Complaint**. Redirects to list.
*   **ComplaintDetailPage (`/complaints/:id`):**
    1.  Displays the ticket detail card and a chronological history timeline.
    2.  **Resident Interactions:** If status is `"resolved"` or `"closed"`, a **Reopen Ticket** button is displayed to transition it back to `"reopened"`.
    3.  **Admin Interactions:** Admins see action buttons:
        *   **Status Selector Dropdown:** Options: Open, In Progress, On Hold, Resolved, Closed. Changing options instantly updates status on the server.
        *   **Assign to Staff Button:** Opens a list of committee members. Selecting a user calls `/assign`, setting the ticket to `"in_progress"`.

---

### 7.8 Amenities Booking Slots Flow
*   **AmenitiesPage (`/amenities`):**
    1.  User clicks the **Amenities** dashboard card.
    2.  Displays available amenities (e.g. Clubhouse, Tennis Court, Swimming Pool) in a grid.
    3.  User clicks on an amenity.
*   **AmenityDetailPage (`/amenities/:id`):**
    1.  Renders the description card, capacity limit, pricing, and a calendar date picker.
    2.  User selects a date.
    3.  App invokes `GET /amenities/:id/slots?date=...`, listing slots (e.g. `09:00 - 10:00`) alongside labels showing remaining capacity (e.g. `3 slots left`).
    4.  User selects a slot. (If configured in `full_day` mode, slot selection is disabled, and the full day is automatically selected).
    5.  User clicks **Book Slot**. The API validates against the defaulter list. If clear, the booking is recorded, and the user is redirected to the history list.
*   **AmenityHistoryPage (`/amenities/history`):**
    1.  Displays booking lists. Residents see **My Bookings**. Admins see an **All Bookings** tab, a search bar, and a **Cancel Booking** button on rows.

---

### 7.9 Polls Voting & Results Flow
*   **PollsPage (`/polls`):**
    1.  User clicks the **Polls** card on the dashboard.
    2.  Renders tab segments: **Active Polls** and **Closed Polls**.
    3.  **Active Poll Interaction:**
        *   If the user has not voted: renders options with click selectors.
        *   The user clicks an option. This registers their unit's vote.
        *   Upon click, the UI transitions to the results view: displays vote counts and percentages for each option.
        *   On **Open Polls**: Renders a "Voters" expander button. Clicking it expands a dropdown showing the names and house labels of residents who selected that option.
        *   On **Secret Polls**: The voters button is hidden, displaying a message: "Voter breakdown is hidden for secret polls".
*   **CreatePollPage (`/polls/new`):**
    1.  *Privileged Admin View.* Click **Create Poll** card on dashboard.
    2.  Enter `Question`, fill `Options` inputs (min 2, max 4), select `Poll Type` (Open vs Secret), select `End Date`.
    3.  Click **Create Poll**. Redirects to `/polls`.

---

### 7.10 Surveys Taking & Analytics Flow
*   **SurveysPage (`/surveys`):**
    1.  User clicks the **Surveys** dashboard card.
    2.  Lists surveys labeled with status pills (**Active**, **Closed**). Cards show response indicators (**Pending** or **Responded**).
    3.  User clicks an active survey card.
*   **SurveyDetailPage (`/surveys/:id`):**
    1.  If active and not yet answered: Renders a form listing questions. Questions can be choice selectors (single or multiple option), rating stars, or text paragraphs.
    2.  User fills out the form and clicks **Submit Response**.
    3.  If already answered (or survey is closed): Renders results visualizations:
        *   Aggregate choice questions are rendered as percentage graphs.
        *   Rating questions show average stars and score distributions.
        *   Text questions display a list of all submitted responses.

---

### 7.11 Chat System (Groups & Direct Admin)
*   **ChatPage (`/chat`):**
    1.  Renders a split screen layout:
        *   **Left Pane:** Shows a **Groups** tab and a **Direct (Admins)** tab, displaying chat thread summaries with last-message previews.
        *   **Right Pane:** Displays the active conversation window.
    2.  **Group Chat Flow:** Click on a group channel.
        *   Displays message list. Hovering over a message bubble reveals action menus: **Reply** (appends reply metadata to composer bar), **React** (opens emoji popup), **Pin** (places banner at top of chat pane), and **Delete**.
        *   Clicking the top group header opens the **GroupInfoModal**, listing participant names and masked phone numbers.
    3.  **Direct DM Flow:** Click **Direct** tab, click an Admin card to start messaging. Message bubbles display double checkmarks for read status.
    4.  **Create Group Channel:** Admins click the floating action button on the left pane -> Enters group title/description -> selects members -> clicks **Create Group**.

---

### 7.12 Family Members & Vehicles Setup
*   **FamilyMembersPage (`/family-members`):**
    1.  Renders list of registered family members.
    2.  Clicks **Add Member** button -> Opens form.
    3.  Enters `Name`, select `Relation` (Spouse, Child, Parent, Sibling, Other), and enters `Phone Number`.
    4.  Clicks **Save**. Members list updates. Clicks **Delete** on a row to remove a member.
*   **VehiclesPage (`/vehicles`):**
    1.  Displays vehicle information registered to the user's unit.
    2.  Contains details explaining how to edit vehicle registration plates under the `/profile` settings screen.

---

## 8. Real-time Events Matrix (Socket.IO)

Clients connect to the Socket server using their auth token, joining rooms for their active society context: `society:{societyId}` and user ID: `user:{userId}`.

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `poll:change` | Server -> Society Room | `{ pollId, totalVotes }` | Emitted when a vote is cast; triggers progress bar updates on client dashboards. |
| `survey:change` | Server -> Society Room | `{ surveyId, responseCount }` | Emitted when a survey is submitted; updates response counter badges. |
| `chat:message` | Server -> Society Room | `ChatMessage` | Broad-casts new messages to active group listeners. |
| `chat:typing` | Client -> Server -> Room | `{ groupId, userId, userName, isTyping }` | Relays user typing indicators in channels. |
| `chat:direct` | Server -> User Room | `DirectMessage` | Delivers direct messages to target user. |

---

## 9. Static & Placeholder Pages

The following pages are currently designed as client-side placeholders and do not have dedicated backend schemas:
1.  **Visitors Module (`VisitorsPage.js`):** Client interface placeholder without server storage integration.
2.  **Documents Vault (`DocumentsPage.js`):** Basic client folder structure layout (no backend schema).
3.  **Emergency Contacts (`EmergencyContactsPage.js`):** Displays a static list of support contacts.
4.  **Help Desk (`HelpPage.js`):** Static user guide documentation page.
