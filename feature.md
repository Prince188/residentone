# ResidentOne — Feature Documentation (Implemented Till Now)

> **Purpose:** Single detailed reference of everything built in ResidentOne till Aug 2026. Use this as source-of-truth for app development, onboarding, and MyGate-competitive planning.
> **Codebase:** `backend/` (Express + Mongoose JS), `frontend/` (CRA React JS), `MongoDB`, `Socket.IO`, `Razorpay`

---

## Table of Contents
1. [Tech Stack & Project Structure](#1-tech-stack--project-structure)
2. [Architecture Principles](#2-architecture-principles)
3. [Authentication & User Management](#3-authentication--user-management)
4. [Society & Membership (Multi-Tenancy)](#4-society--membership-multi-tenancy)
5. [Units / Houses](#5-units--houses)
6. [Dashboard](#6-dashboard)
7. [Notices](#7-notices)
8. [Maintenance & Dues](#8-maintenance--dues)
9. [Collections (Festivals & Special Funds)](#9-collections-festivals--special-funds)
10. [Complaints / Helpdesk](#10-complaints--helpdesk)
11. [Amenities & Bookings](#11-amenities--bookings)
12. [Polls](#12-polls)
13. [Surveys](#13-surveys)
14. [Chat (Groups + Direct Admin)](#14-chat-groups--direct-admin)
15. [Directory](#15-directory)
16. [Family Members & Vehicles](#16-family-members--vehicles)
17. [Committee & Permissions](#17-committee--permissions)
18. [Dashboard Badges (NEW - Poll/Survey/Complaint Only)](#18-dashboard-badges-new)
19. [Documents, Visitors, Emergency, My Unit, etc](#19-static--placeholder-modules)
20. [Admin / Super-Admin](#20-admin--super-admin)
21. [Frontend Routing & Layout](#21-frontend-routing--layout)
22. [Real-time (Socket.IO)](#22-real-time-socketio)
23. [Permissions Matrix](#23-permissions-matrix)
24. [API Conventions](#24-api-conventions)
25. [Deployment](#25-deployment)
26. [Gap vs MyGate & Next Steps](#26-gap-vs-mygate--next-steps)

---

## 1. Tech Stack & Project Structure

**Root scripts (`package.json:4`):**
```
dev:api  -> npm run dev --prefix backend  (nodemon src/server.js :5000)
dev:web  -> npm start --prefix frontend   (CRA :3000 proxy -> :5000)
dev      -> concurrently both
build:web-> npm run build --prefix frontend
```

**Backend (`backend/package.json:12`):**
- `express@5`, `mongoose@9`, `jsonwebtoken`, `bcryptjs`, `helmet`, `cors`, `morgan`, `dotenv`, `pino`, `zod`, `uuid`, `socket.io@4`, `razorpay@2`, `express-rate-limit`

**Frontend (`frontend/package.json:5`):**
- `react@19`, `react-router-dom@7`, `axios`, `zustand@5`, ` @tanstack/react-query@5`, `socket.io-client@4`, `tailwindcss@3`, `react-scripts`

**Structure:**
```
backend/src/
  app.js               // Express + helmet + cors (x-society-id) + morgan + routes
  server.js            // HTTP + Socket.IO + Mongo connect
  config/              // index.js (env), database.js, logger.js
  middlewares/         // auth, society.context, permission, validate, error
  shared/              // types/index.js, permissions.js, plugins/tenant.plugin.js, utils/errors.js, services/razorpay.service.js
  socket/index.js
  modules/
    auth/ user/ society/ membership/ unit/ notice/ maintenance/ complaint/ amenity/ poll/ survey/ chat/ family-member/ dashboard/ health/

frontend/src/
  App.js               // BrowserRouter + QueryClientProvider + AuthProvider
  lib/                 // api.js (axios + x-society-id), dashboard.js, notices.js, polls.js, surveys.js, complaints.js, maintenance.js, amenities.js, chat.js, directory.js, houses.js, permissions.js, queryClient.js
  stores/              // auth.store.js (zustand), society.store.js (persist activeSocietyId)
  providers/ AuthProvider.js
  components/          // ProtectedRoute, SuperAdminRoute, PublicLayout, AppLayout/Header/Sidebar, cards, ui/StatusBadge, ui/ConfirmDialog
  features/            // landing (5 pages), auth (login/register), society (create), dashboard, houses, maintenance, complaints, notices, amenities, committee, polls, surveys, chat, directory, family-members, vehicles, my-unit, emergency, profile, settings, admin (4 pages), documents, visitors, help
  hooks/ useBadgeSeen.js
```

---

## 2. Architecture Principles

### Multi-Tenancy
- Every domain model (Notice, Complaint, Poll, Survey, Unit, Amenity, Booking, ChatGroup/Message, etc) uses `tenantPlugin` (`backend/src/shared/plugins/tenant.plugin.js:1`) which adds `societyId: ObjectId` field + auto-filters `find/findOne/...` and injects `$match.societyId` for `aggregate`.
- Request society context resolved via `resolveSocietyContext` (`backend/src/middlewares/society.context.middleware.js:5`): reads `x-society-id` header, verifies active `Membership`, attaches `req.societyId`, `req.membership`, `req.role`.
- `AsyncLocalStorage` not yet wired (TODO Phase 0.7) — tenant plugin currently relies on explicit query filters, not ALS.

### Auth Token
- Payload: `{ userId, role: [accountRoles], societyId: null }` — society role is **not** in JWT; society role fetched per-request via Membership. Access 15m, Refresh 7d (`backend/src/config/index.js:21`).
- Axios interceptor (`frontend/src/lib/api.js:26`): injects `Authorization: Bearer` + `x-society-id` from `useSocietyStore`. On 401, tries `POST /auth/refresh` with `refreshToken` from localStorage.

### RBAC
- Two layers: `requireRole(...roles)` (hardcoded) + `requirePermission(permission)` which checks `DEFAULT_ROLE_PERMISSIONS` merged with `Society.rolePermissions` custom overrides (`backend/src/shared/permissions.js:1`).

---

## 3. Authentication & User Management

**Model (`backend/src/modules/user/user.model.js:6`):**
- `name, email(unique, lowercase), phone(unique), passwordHash(bcrypt 12, select:false), occupation, familyMembers, vehicles[string], role[accountRoles: resident|society_admin|super_admin], isActive, timestamps`

**Endpoints (`backend/src/modules/auth/auth.routes.js:1`):**
- `POST /api/v1/auth/register` — Zod `registerSchema` (name, email, phone, password 6-100). Service creates User, returns tokens.
- `POST /api/v1/auth/login` — email+password, comparePassword, tokens.
- `POST /api/v1/auth/refresh` — refreshToken in body, verifies, reissues pair.
- `GET /api/v1/users/profile` — authenticated self profile
- `PATCH /api/v1/users/profile` — update name/phone/occupation etc (`user.validation.js`)

**Frontend:**
- `RegisterPage.js`, `LoginPage.js`, `AuthProvider.js` hydrates `useAuthStore` from localStorage, `ProtectedRoute.js` guards app routes.

---

## 4. Society & Membership (Multi-Tenancy)

**Society Model (`backend/src/modules/society/society.model.js:4`):**
- `name, societyType(apartment|row_house|mixed), address/city/state/pincode, totalUnits, contactPersonName/Email/Phone, status(pending|active|rejected|suspended, index), source(public_registration|manual), rejectionReason, approvedAt, societyAdmin(ref User), approvedBy/ref, rolePermissions(Mixed `{role: [permKeys]}`), isActive(bool sync via pre-save status===active)`

**Society Routes (`backend/src/modules/society/society.routes.js:1`):**
- `POST /societies/register` — public registration (creates pending society)
- `GET /societies` — super_admin list all with filters `?status&search`
- `GET /societies/stats` — super_admin counts `{total, pending, active, rejected, suspended}`
- `POST /societies` — super_admin manual create (active)
- `PATCH /societies/:id/approve` / `PATCH /societies/:id/reject` — super_admin moderation
- `GET /societies/permissions` — any society member reads merged permissions
- `PUT /societies/permissions` — society_admin+ updates `rolePermissions` (`Manage Committee` UI)

**Membership Model (`backend/src/modules/membership/membership.model.js:5`):**
- `userId(ref User, required), societyId(ref Society, required), role(SOCIETY_ROLES 14 values), isPrimary(bool), units[ref Unit], isActive, joinedAt`
- Unique index `{userId, societyId}`, `tenantPlugin` added.

**Society Roles (`backend/src/shared/types/index.js:1`):**
```
super_admin, society_admin, committee_member, manager, treasurer, accountant, helpdesk_manager, auditor, owner, tenant, staff, security_guard
```

**Membership Routes (`backend/src/modules/membership/membership.routes.js:1`):**
- `GET /memberships/my-societies` — authenticated, returns `[{ membershipId, role, joinedAt, society{id,name,city,address}, units[] }]` via `findUserSocieties` (populate + isActive filter).
- `GET /memberships/directory` — society members directory (`getDirectory`: expands houses, maskedPhone `98XXXX10`, sorted by unitNumber)
- `GET /societies/:societyId/members` — `manage_committee` perm, list members
- `POST /societies/:societyId/members` — add member
- `PATCH /societies/:societyId/members/:memberId` — update role (max 2 society_admin guard)
- `DELETE /societies/:societyId/members/:memberId` — deactivate

**Frontend Society:**
- `CreateSocietyPage.js`, `SocietySelector.js` (persist `activeSocietyId` in zustand `residentone.active-society`), `HouseInvitePage.js` (`/house-invite/:token` public).

---

## 5. Units / Houses

**Model (`backend/src/modules/unit/unit.model.js:6`):**
- `propertyType(flat|row_house), label(unique per society), block, floor, doorNo, unitNumber, ownerId(ref User), tenantId(ref User), inviteToken(unique sparse), inviteExpiresAt, inviteResidentType(owner|renter), isActive`

**Routes (`backend/src/modules/unit/unit.routes.js:1`):**
- Public: `GET /units/invite/:token` preview, `POST /units/invite/:token` submit (self-assign)
- Auth+Society: `GET /units` list, `GET /units/:unitId`, `GET /units/search-users` (for assign), `POST /units/:unitId/check-owner`, `POST /units/:unitId/assign-owner`, `POST /units/:unitId/unassign-owner`, `POST /units/:unitId/invite-link` (generates token link)
- `requirePermission("manage_houses")` for search/check.

**Frontend:**
- `ManageHousesPage.js` — card grid 2/3/5 cols, status filters All/Owned/Rented/Vacant + search, `HouseCard` shows status/owner/vehicles/family count, `AssignHouseModal`, `HouseDetailPage.js`.

---

## 6. Dashboard

**Page (`frontend/src/features/dashboard/DashboardPage.js:1`):**
- Greeting by hour, hero gradient, RolePill (privileged white vs resident translucent), Society/Unit header.
- **Cards (14 general + 7 admin + 2 superAdmin):**
  - `superAdminCards`: Societies, Pending Approvals (no badge now)
  - `adminCards` (permission-filtered via `hasPermission`): Manage Houses, Manage Maintenance, Create Notice, Manage Amenities, Create Poll, Create Survey, Manage Committee
  - `generalCards`: Pay Maintenance, My Unit, Add Members, Notices, Visitors, Complaints **(badge)**, Amenities, Polls **(badge)**, Surveys **(badge)**, Chat, Documents, Emergency, Directory, Vehicles
- Only **Complaints / Polls / Surveys** show red `bg-error` badge (`-right-1.5 -top-1.5`) with count `>99 => 99+` (`frontend/src/features/dashboard/DashboardPage.js:108`).
- `badgesQuery` (`GET /dashboard/badges`, 30s stale+poll) provides counts, mapped via `generalCards.badgeKey`.
- Maintenance alert banner (`Pay your maintenance`) derived from `GET /maintenance/cycles/latest`.
- Recent Notices section (2 latest).

---

## 7. Notices

**Model (`backend/src/modules/notice/notice.model.js:4`):**
- `title(1-150), body(1-2000), createdBy(ref User), isActive, societyId (tenant), timestamps + index {societyId, createdAt:-1}`

**Routes (`backend/src/modules/notice/notice.routes.js:1`):**
- `GET /notices?limit` — all members
- `POST /notices` — `requirePermission("create_notice")` + `validate(createNoticeSchema)`

**Service (`notice.service.js`):** `create`, `listForSociety(societyId, limit)` (lean + populate name), `mapNotice`, `getById`.

**Frontend:**
- `NoticesPage.js` — card list with `isLatest` styling, `NoticeDetailModal`, timeAgo, create button if `create_notice`.
- `CreateNoticePage.js`.

---

## 8. Maintenance & Dues

**Models (`backend/src/modules/maintenance/maintenance.model.js`):**
- `MaintenanceCycle`: `month(1-12), year, amount, ownerAmount, renterAmount, dueDate, createdBy, isActive`, index year/month.
- `MaintenancePayment`: `cycleId(ref), unitId(ref), paidOn, method, amount, fee, totalAmount, gatewayStatus(cash|created|paid), razorpayOrderId/PaymentId/Signature, receiptNo(RCPT-YYYYMM-xxxx), recordedBy, isActive`

**Service (`maintenance.service.js:17`):** `getAmountForUnit` (renter priority), `createCycle` (unique month/year), `listCycles`, `getLatestCycle`, `mapCycle`, `statusFor` (overdue/pending vs paid/late_paid), `getCycleUnits` (populate owner/tenant, paymentByUnit), `getCycleUnitDetail` (own-unit or admin), `getUnitHistory`, `recordPayment` (cash, upsert), `createRazorpayOrder` (`shared/services/razorpay.service.js` `createOrder` with base/fees), `verifyRazorpayPayment` (signature verify), `removePayment`, `getReceipt`.

**Routes (`backend/src/modules/maintenance/maintenance.routes.js:1`):**
- `GET /maintenance/cycles/latest` — all members (myUnits)
- `GET /maintenance/cycles` — all
- `GET /maintenance/units/:unitId/history`
- `POST /maintenance/cycles` — `manage_maintenance`
- `GET /maintenance/cycles/:cycleId/units` — `manage_maintenance`
- `POST /maintenance/cycles/:cycleId/units/:unitId/pay` / `unpay` — `manage_maintenance`
- `POST .../create-order`, `POST .../verify`, `GET .../receipt` — any member (own unit or admin)

**Frontend:**
- `MaintenancePage.js` (resident, myUnits, alert), `MaintenanceDetailPage`, `PayMaintenancePage` (Razorpay checkout), `SocietyDuesPage` (admin grid + `CreateMaintenanceModal` + period selector), `SocietyDueDetailPage`.
- Uses `STATUS_UI` (paid/pending/overdue/late_paid colors/stripes).

---

## 9. Collections (Festivals & Special Funds)

**Why & Proper Name: “Collections”** — generic one-time collection for *any* occasion, not only festivals. Covers Navratri, Diwali, Holi, Ganesh, Christmas, annual day, sports event, building repair, welfare drive, etc. Each collection is a per-house bill with category + due date + per-house amount + payment tracking. Chosen over narrow “Festival Fund” to stay reusable.

**Models (`backend/src/modules/collections/collection.model.js:4`):**
- `Collection`: `title(3-150), description(0-1000), category(festival|event|celebration|repair|welfare|other), amount(1-1e6), dueDate, status(active|closed), createdBy, isActive, societyId + indexes {societyId, status, createdAt:-1}`
- `CollectionPayment`: `collectionId(ref), unitId(ref), amount, fee, totalAmount, paidOn, method(Cash|Razorpay), receiptNo(CC-xxxx-xxxx), gatewayStatus(cash|created|paid), razorpayOrderId/PaymentId/Signature, recordedBy, isActive` + unique `{societyId, collectionId, unitId}`

**Service (`collection.service.js:1`):** `hasCollectionPermission` (checks `manage_collections` or fallback `manage_maintenance`), `create`, `list` (populate name), `getById`, `mapCollection` (isOverdue), `statusFor` (pending|overdue vs paid|late_paid), `getCollectionUnits` (populate owner/tenant, paymentByUnit map), `getMyCollections`, `getUnitDetail` (own-unit or admin check), `recordPayment` (cash upsert, receipt `CC-...`), `createRazorpayOrder` (`razorpay.service createOrder` base+fee), `verifyRazorpayPayment` (signature), `removePayment`, `closeCollection`, `deleteCollection` + socket emits `collection:change`.

**Validation (`collection.validation.js:1`):** `createCollectionSchema` (title 3-150, description 0-1000, category enum, amount number 1-1e6, dueDate ISO), `payCollectionSchema` (method).

**Routes (`collection.routes.js:1`):** All `authenticate + resolveSocietyContext + requireSociety`
- `GET /collections` — all members (query `?my=1` for resident filtered view)
- `GET /collections/:id` — detail
- `GET /collections/:id/units` — `manage_collections`
- `GET /collections/:collectionId/units/:unitId` — detail (admin or assigned)
- `POST /collections` — `manage_collections` + validate
- `POST /collections/:id/close`, `DELETE /collections/:id` — `manage_collections`
- `POST /collections/:collectionId/units/:unitId/pay` (+ validate) / `unpay` — `manage_collections` (cash)
- `POST .../create-order`, `POST .../verify` — any member (own house or admin)

**Permissions:** New `manage_collections` in `shared/permissions.js:13` (label: Manage Collections – Festival & occasion funds). `manager, treasurer, accountant` gain it; `society_admin/super_admin` have all.

**Frontend:**
- `lib/collections.js:1` — `COLLECTION_CATEGORIES` (festival/event/celebration/repair/welfare/other with icons), `getCollections`, `getCollection`, `createCollection`, `close/delete`, `getCollectionUnits`, `getCollectionUnitDetail`, `record/remove/createOrder/verify`, `formatAmount/formatDate`, `CATEGORY_UI`, `STATUS_UI`.
- `CollectionsPage.js` — hero `volunteer_activism`, subtitle Festivals+repairs, `canCreate` via `manage_collections`, `CollectionCard` (category pill + status stripe overdue/active, amount, due date), info banner, grid 1/2/3, empty state with Create CTA.
- `CreateCollectionPage.js` — form title/description/category/amount/dueDate, `createCollection` mutation, invalidates `collections`, navigates `/collections`.
- `CollectionDetailPage.js` — header category icon + due overdue flag, admin sees all units grid (search + status filter All/pending/overdue/paid/late_paid) via `UnitCard`, resident sees own units pay cards.
- `CollectionUnitPayPage.js` — unit detail (House label, owner, status pill, amount, receipt), admin: Mark as Paid (Cash) + Pay Online + Remove, resident: Pay Online (Razorpay checkout via `window.Razorpay`). Mutations invalidate detail.
- **Dashboard cards:** `adminCards` add `Create Collection` (`volunteer_activism`, `/collections/new`, perm `manage_collections`), `generalCards` add `Collections` (`volunteer_activism`, `/collections`) in `DashboardPage.js:21,31`.
- **App routing (`App.js:43`):** `/collections`, `/collections/new`, `/collections/:id`, `/collections/:id/units/:unitId` (protected via `AppLayout`).

---

## 10. Complaints / Helpdesk

**Model (`backend/src/modules/complaint/complaint.model.js:25`):**
- `title(3-150), description(10-2000), category(plumbing/electrical/housekeeping/security/common_area/parking/other), priority(low/medium/high/urgent), status(open|in_progress|on_hold|resolved|closed|reopened), isPublic(bool), raisedBy(ref User), assignedTo(ref User), unitId(ref Unit), isActive, societyId + indexes`

**Service (`complaint.service.js:31`):** `VALID_TRANSITIONS` map, `mapComplaint`, `create` (isPublic bool), `list` (admin sees all, resident sees own + public, filters status/category/priority/isPublic/q regex), `getById` (403 if private not owned), `updateStatus` (admin any transition, resident only `reopened` own resolved/closed), `assign` (auto open->in_progress), `getStats` (counts by status + avgClosureHours).

**Routes (`complaint.routes.js:1`):**
- `GET /complaints/stats`, `GET /complaints` (query params), `POST /complaints` (all members)
- `GET /complaints/:id`
- `PATCH /complaints/:id/status` (any member, service checks)
- `PATCH /complaints/:id/assign` — `manage_complaints`

**Frontend:**
- `ComplaintsPage.js` — filters (All/Open/InProgress/Resolved/Closed) + Show select (All/public/private) + search, `ComplaintCard` with `STATUS_UI` pill/stripe, stats subtitle.
- `CreateComplaintPage.js` (isPublic toggle hint), `ComplaintDetailPage.js` (status/assign timeline).

---

## 11. Amenities & Bookings

**Models (`backend/src/modules/amenity/amenity.model.js:4`):**
- `Amenity`: `name(unique), description, category, type(free|paid), capacity, price, slots[string[] default 5], bookingMode(slot|full_day), openTime/closeTime, createdBy, isActive`
- `Booking`: `amenityId(ref), userId(ref), unitId(ref), date(YYYY-MM-DD), slot, status(booked|cancelled), amount, isActive`

**Service (`amenity.service.js:7`):** `list`, `getById`, `create` (full_day => slots=[full_day]), `update`, `remove`, `isDefaulter` (latest cycle overdue check), `getSlotsWithAvailability` (counts capacity), `book` (validate date>=today, defaulter block, capacity, double-booking guard, unitId from membership), `cancel` (admin or owner), `myBookings`, `allBookings`.

**Routes (`amenity.routes.js:1`):**
- `GET /amenities` (all members)
- `GET /amenities/bookings/my`, `GET /amenities/bookings/all` — `manage_amenities`
- `GET /amenities/:id`, `GET /amenities/:id/slots?date=`
- `POST /amenities/:id/book`, `POST /amenities/bookings/:bookingId/cancel`
- `POST /amenities` / `PATCH /amenities/:id` / `DELETE /amenities/:id` — `manage_amenities`

**Frontend:**
- `AmenitiesPage.js` — 2-col grid, slot/full_day booking with date picker, `SlotButton`, defaulter handling.
- `ManageAmenitiesPage.js` — admin CRUD + bookingMode toggle, `AmenityHistoryPage.js` (myBookings + allBookings).

---

## 12. Polls

**Models (`backend/src/modules/poll/poll.model.js:7`):**
- `Poll`: `question(5-500), options[2-4]{text, votes}, type(open|secret), status(active|closed), endDate(required), createdBy(ref User), isActive` + indexes.
- `PollVote`: `pollId, userId, unitId(nullable, one vote per flat MyGate style), unitLabel, selectedOptionIndex(0-3), isActive` + unique partial indexes `{societyId,pollId,unitId}` and `{societyId,pollId,userId where unitId null}`

**Service (`poll.service.js:6`):** `getPrimaryUnit` (membership.units[0] + label), `create` (options trimmed), `autoCloseIfExpired`, `listForSociety` (populate name, auto-close batch, voteMap by unitId/userId, votersGrouped per option), `getById`, `vote` (409 if already voted per flat, $inc votes, emit `poll:change`), `closePoll`, `deletePoll`, `mapPoll` (totalVotes, percent, isClosed, secret hide votes till close).

**Routes (`poll.routes.js:1`):**
- `GET /polls`, `GET /polls/:id` — all members
- `POST /polls/:id/vote` — all members
- `POST /polls` + `POST /polls/:id/close` + `DELETE /polls/:id` — `create_poll`

**Frontend:**
- `PollsPage.js` — Active/Closed sections, `PollCard` with options (progress bar, isVoted, voters expand), `VotersModal` (open poll shows voter names per option, secret shows hidden message), AdminActions (Close Now/Delete).
- `CreatePollPage.js`.

---

## 13. Surveys

**Models (`backend/src/modules/survey/survey.model.js:7`):**
- `Survey`: `title(5-150), description, questions[1-10]{text(5-300), type(single|multiple|text|rating), options[2-4] for choice}, endDate, status(active|closed), createdBy`
- `SurveyResponse`: `surveyId, userId, unitId, unitLabel, answers[{questionId, selectedOptions, textAnswer, rating}], isActive` + unique per unitId poll-like.

**Service (`survey.service.js:6`):** Mirror polls per-flat logic: `getPrimaryUnit`, `create`, `listForSociety` (expired auto-close, hasResponded set + responseCount aggregate), `getById` (results if closed||hasResponded), `getResults` (text list, rating avg/distribution, choice counts), `submit` (validate all questions answered, uniq options, per-flat 409), `close`, `deleteSurvey`.

**Routes (`survey.routes.js:1`):**
- `GET /surveys`, `GET /surveys/:id`, `POST /surveys/:id/submit` — all members
- `POST /surveys`, `POST /surveys/:id/close`, `DELETE /surveys/:id` — `create_survey`

**Frontend:**
- `SurveysPage.js` — list with badge `Closed/Active`, responseCount, hasResponded flag
- `CreateSurveyPage.js`, `SurveyDetailPage.js` (answer form + results charts).

---

## 14. Chat (Groups + Direct Admin)

**Models (`backend/src/modules/chat/chat.model.js:4`):**
- `ChatGroup`: `name(2-80), description, createdBy, members[User], pinnedMessageId(ref), isActive` + indexes.
- `ChatMessage`: `groupId, senderId, text(1-2000), replyTo(ref), reactions[{userId, emoji}], isDeleted, isActive`
- `DirectMessage`: `senderId, receiverId, text, replyTo, reactions, isDeleted, isRead(bool default false), isActive` + indexes.

**Service (`chat.service.js:17`):** `isAdmin` (society_admin or manage_amenities perm), `ensureMember`, `createGroup` (filter valid society members, emit `chat:change`), `listGroups` (populate + lastMessage aggregate), `getGroupMessages` (50 limit, reply names), `sendGroupMessage` (replyTo validation, emit + `chat:message`), `deleteGroupMessage` (owner or admin), `reactGroupMessage`, `pinGroupMessage` (toggle, admin only), `addMembers/removeMembers`, `getGroupInfo` (masked phones), `leaveGroup`, Direct: `sendDirectMessage` (only admin↔resident allowed check `hasChatAdminPermission`), `deleteDirectMessage`, `reactDirectMessage`, `getDirectMessages` (marks isRead, reply names), `listAdmins` (filter by manage_amenities), `getPinnedMessage`, `listDirectChats` (admin sees aggregate participants, resident sees admins).

**Routes (`chat.routes.js:1`):**
- `GET /chat/groups`, `GET /chat/groups/:groupId/messages`, `POST /chat/groups/:groupId/messages`, `DELETE .../messages/:messageId`, `POST .../react`, `POST .../pin` (manage_amenities), `GET .../pinned`, `POST /chat/groups` (manage_amenities), `POST .../members`, `POST .../members/remove`, `GET .../info`, `POST .../leave`
- Direct: `GET /chat/direct/admins`, `GET /chat/direct/list`, `POST /chat/direct/messages`, `GET /chat/direct/:userId/messages`, `DELETE /chat/direct/messages/:messageId`, `POST .../react`

**Frontend (`ChatPage.js` ~ 790 lines):**
- Tabs Groups / Direct(ADMIN CHAT), Groups list with lastMessage/Time, search, Group chat view (header tap -> GroupInfoModal, search bar, pinned banner, 78% bubble width, reply/reactions/pin/delete hover, emoji picker, typing indicator via `socket.io-client` `chat:typing`), Direct chat view (read receipts ✓/✓✓, reply).

---

## 15. Directory

**Service (`membership.service.js:28`):** `getDirectory` — finds Memberships + populates user name/phone + units label, expands per house, masks phone, sorted by unitNumber.

**Route:** `GET /memberships/directory` (`auth`+`resolveSocietyContext`).

**Frontend (`DirectoryPage.js`):** Grid 2/3/5, `MemberCard` (initial circle, admin shield, House pill, masked phone), search name/house.

---

## 16. Family Members & Vehicles

**FamilyMember Model (`backend/src/modules/family-member/family-member.model.js`):**
- `userId, societyId, unitId(ref Unit), name, relation, phone, isActive`

**Routes (`family-member.routes.js`):** `GET /family-members`, `POST /family-members` (validate), `DELETE /family-members/:id` — all members scoped to own adds.

**Vehicles:** Stored as `User.vehicles: string[]` (`user.model.js:42`), edited via `ProfilePage` + `VehiclesPage.js` (house-linked lookup by label).

**Frontend:**
- `FamilyMembersPage.js` (add/list), `VehiclesPage.js`, `ProfilePage.js`, `MyUnitPage.js`.

---

## 17. Committee & Permissions

**Permissions (`backend/src/shared/permissions.js:1`):**
- 12 keys: `manage_committee, manage_houses, manage_maintenance, create_notice, manage_amenities, manage_bookings, create_poll, create_survey, manage_complaints, manage_visitors, view_financials, manage_directory`
- `DEFAULT_ROLE_PERMISSIONS` per role (society_admin/super_admin = all, manager = 12, treasurer=3, etc.)
- Helpers `getPermissionsForRole`, `hasPermission` (society_admin/super_admin always true).

**Society Permissions Storage:** `Society.rolePermissions: { [role]: string[] }` (Mixed). Updated via `PUT /societies/permissions` (`ManageCommitteePage.js`).

**Frontend `ManageCommitteePage.js`:** Lists members, role dropdown, permissions matrix checkboxes per role,  `hasPermission` checks hide cards.

---

## 18. Dashboard Badges (NEW - Poll/Survey/Complaint Only)

**Goal:** Show red numeric indicator on dashboard cards for **new items since last visit**; cleared after visiting that page (as per spec: “if there is a 2 new notice we will show 2 as indicator, apply on all cards where needed, after visit that page it gone” — now scoped to 3 features per user request).

**Scope (final):** Only `Complaints` (`/complaints`), `Polls` (`/polls`), `Surveys` (`/surveys`). All other cards intentionally badge-free.

**Backend (`backend/src/modules/dashboard/`):**
- `dashboard.model.js:1` — `BadgeSeen`: `{userId(ObjectId, index), societyId(ObjectId | null, index), feature(string, index), lastSeenAt(Date), timestamps}` unique `{userId, societyId, feature}`.
- `dashboard.service.js:15` — `FEATURES = ["complaints","polls","surveys"]`. `getLastSeenAt(userId, societyId, feature, membership)` falls back to `membership.joinedAt` → `user.createdAt` → epoch(0). `setSeen(userId, societyId, features)` bulkWrite upsert now(). `computeCounts({societyId,userId,membership})`:
  - Complaints: `Complaint.countDocuments({societyId, isActive:true, createdAt: {$gt: lastSeen}, ...visibility: admin sees all, resident sees $or: [raisedBy, isPublic]})`
  - Polls: `Poll.countDocuments({societyId, isActive:true, createdAt: {$gt: lastSeen}})` (new polls, status filtered by isActive)
  - Surveys: `Survey.countDocuments({societyId, isActive:true, createdAt: {$gt: lastSeen}})`
  - If `!societyId` → counts 0. Returns `{complaints, polls, surveys}`.
- `dashboard.controller.js:4` — `getBadges` (optional society, fetches membership if missing, calls service), `markSeen` (body `{feature|features|to}`, normalizes via `PATH_TO_FEATURE`, dedup, validates against FEATURES, groups by societyId, calls setSeen), `markAllSeen` (all 3).
  - `PATH_TO_FEATURE` (backend): `/complaints→complaints`, `/polls→polls`, `/surveys→surveys` (incl. `/xxx/new`).
- `dashboard.routes.js:8` — `optionalSociety` middleware (doesn't error if no society), `router.use(authenticate)`, `GET /dashboard/badges`, `POST /dashboard/badges/seen`, `POST /dashboard/badges/seen-all`.
- `app.js:14,61` — mounts at `/api/v1/dashboard`.

**Frontend:**
- `lib/dashboard.js:1` — `getBadges()`, `markSeen(feature)`, `markSeenBulk(features)`, `PATH_TO_FEATURE` (3 entries).
- `hooks/useBadgeSeen.js:1` — `useBadgeSeen(featureOrPath)` — on mount normalizes feature(s), calls `markSeen`/`markSeenBulk`, then `queryClient.invalidateQueries(["dashboard-badges"])`. Silent catch.
- `DashboardPage.js:1` — 
  - Imports `getBadges`.
  - `superAdminCards` & `adminCards` **without** badgeKey (no badges).
  - `generalCards` only 3 with `badgeKey`: `Complaints->complaints`, `Polls->polls`, `Surveys->surveys`.
  - `SquareCard` (`DashboardPage.js:108`) receives `badge`, shows absolute `bg-error` ring badge if `>0` (`99+` cap).
  - `CardSection` passes `badges[card.badgeKey]`.
  - `badgesQuery` (`DashboardPage.js:240`): `["dashboard-badges", activeSociety?.id, isSuper]`, enabled if society or superAdmin, 30s stale+interval.
- **Visited clearing:**
  - `ComplaintsPage.js:6` — `useBadgeSeen("complaints")`
  - `PollsPage.js:7` — `useBadgeSeen("polls")`
  - `SurveysPage.js:6` — `useBadgeSeen("surveys")`
  - All other pages (Notices, Chat, Maintenance, etc.) **no** badge hook (removed per scope).

**Flow:** Dashboard mount → GET badges (counts new since lastSeen). User taps Polls card → navigates `/polls` → `PollsPage` effect → POST seen `polls` (upsert lastSeen=now) → invalidate → back to Dashboard → GET badges now 0 → badge gone. New poll created after that → dashboard poll badge reappears (1).

---

## 19. Static / Placeholder Modules

- **VisitorsPage.js** — placeholder `badge` icon, no backend.
- **DocumentsPage.js** — Document Vault placeholder (folder_open icon), no model.
- **EmergencyContactsPage.js** — static list.
- **HelpPage.js, SettingsPage.js, ProfilePage.js** — user profile edit, settings.
- **VehiclesPage.js** — displays `owner.vehicles`.
- **Committee:** `ManageCommitteePage.js` already covered.
- **Landing:** `LandingPage.js`, `AboutPage.js`, `PricingPage.js`, `ContactPage.js`, `FeaturesPage.js` — PublicLayout.

---

## 20. Admin / Super-Admin

**Society Admin (society_admin):** Full permissions (all 12). Access: Manage Houses, Manage Maintenance (dues), Create Notice, Manage Amenities, Create Poll/Survey, Manage Committee (grant roles), plus General.

**Committee Roles:** manager, treasurer, accountant, helpdesk_manager, auditor, committee_member — filtered via permissions matrix.

**Super Admin (`role: super_admin` account role):**
- Routes guarded by `SuperAdminRoute.js` + `requirePlatformAdmin`.
- `AdminSocietiesPage.js` — table with filters All/Active/Pending/Rejected/Suspended + stats cards + search.
- `PendingApprovalsPage.js` — awaiting review list + Approve/Reject dialogs (shares `rolePermissions` logic).
- `AdminSocietyDetailPage.js`, `AdminCreateSocietyPage.js`.

---

## 21. Frontend Routing & Layout

**Public (`PublicLayout` + Navbar/Footer):**
- `/, /about, /pricing, /contact, /features, /login, /register, /create-society (protected), /house-invite/:token`

**Protected (`ProtectedRoute` → `AppLayout` with `Header`/`Sidebar`/`SocietySelector`):**
- `/dashboard`, `/houses`, `/houses/:unitId`, `/maintenance`, `/maintenance/:unitId`, `/maintenance/:unitId/pay`, `/dues`, `/dues/:unitId`, `/complaints/*`, `/visitors`, `/notices/*`, `/amenities/*`, `/committee`, `/family-members`, `/documents`, `/polls/*`, `/directory`, `/chat`, `/surveys/*`, `/vehicles`, `/my-unit`, `/emergency-contacts`, `/profile`, `/settings`, `/help`, `/admin/societies*` (SuperAdminRoute).

**Stores:**
- `auth.store.js` (zustand): `user`, `tokens`, `isAuthenticated`, `login/logout`
- `society.store.js` (zustand persist): `societies`, `activeSocietyId`, `loadMySocieties()`, selectors `selectActiveSociety/Membership/PrimaryUnit`

**Libs:**
- `api.js` — axios base `/api/v1`, interceptors for token + `x-society-id` + 401 refresh.
- `polls.js, surveys.js, notices.js, complaints.js, maintenance.js, amenities.js, chat.js, directory.js, houses.js, familyMembers.js, societies.js, dashboard.js` — thin wrappers + `extractApiError`, `timeAgo`, `formatAmount`, etc.

---

## 22. Real-time (Socket.IO)

- `backend/src/socket/index.js` — server `io` with `auth` (token) + join `society:{id}` + `user:{id}` rooms.
- Helpers: `emitToSociety(societyId, event, data)`, `emitToUser(userId, event, data)`, `getIO()`.
- Events used: `poll:change`, `survey:change`, `chat:change`, `chat:message`, `chat:typing`, `chat:direct`.
- Frontend: `ChatPage.js` uses `socket.io-client` for typing, `directMessagesQuery` + `groupMessagesQuery` refetchInterval 3s + socket emits.

---

## 23. Permissions Matrix

| Feature | Route | Permission |
|---------|-------|------------|
| Manage Houses | `/houses` | `manage_houses` |
| Manage Maintenance | `/dues` | `manage_maintenance` |
| Create Notice | `/notices/new` | `create_notice` |
| Manage Amenities | `/amenities/manage` | `manage_amenities` |
| Manage Bookings | `/amenities/bookings/all` | `manage_amenities` |
| Create Poll | `/polls/new` | `create_poll` |
| Create Survey | `/surveys/new` | `create_survey` |
| Manage Committee | `/committee` | `manage_committee` |
| Assign Complaint | `PATCH /complaints/:id/assign` | `manage_complaints` |
| Chat Create Group | `POST /chat/groups` | `manage_amenities` (as chat admin) |
| Pin Message | `POST /chat/groups/:id/pin` | `manage_amenities` |
| Society Permissions | `PUT /societies/permissions` | `society_admin` only |

Residents (`owner|tenant`) default only `manage_directory`.

---

## 24. API Conventions

- Base: `/api/v1`
- Auth: `Authorization: Bearer <access>` + `x-society-id` header (required for society-scoped routes)
- Success: `{ success:true, data:T }` + optional `meta`
- Error: `{ success:false, error:{code, message, details?} }` via `AppError` + `error.middleware`
- Validation: `validate(schema)` Zod middleware, 400 on fail
- Tenant isolation: `societyId` auto-filter via plugin + `resolveSocietyContext`
- Pagination: not yet standardized (some list endpoints return full arrays, health check excluded)

---

## 25. Deployment

**Backend env (`backend/.env`):** `PORT, MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY, FRONTEND_URL, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_FEE_PERCENT, RAZORPAY_GST_PERCENT`

**Frontend env (`frontend/.env`):** `REACT_APP_API_URL=/api/v1` (CRA proxy `http://localhost:5000`), `vercel.json` rewrites.

**CORS (`backend/src/app.js:27`):** Allows `FRONTEND_URL` + localhost:3000/5173/5174 + `*.vercel.app`, headers `Content-Type, Authorization, x-society-id`.

**Build:** `npm run build` (frontend) → `build/static/js/main.*.js` ~216k gzip. `npm run dev` concurrent.

---

## 26. Gap vs MyGate & Next Steps

Implemented vs MYGATE_FEATURES.md checklist:

| Module | Done | Missing |
|--------|------|---------|
| Auth/Membership | ✅ JWT, multi-society, roles 14 | MFA/2FA, biometric, visitor device |
| Society Setup | ✅ Pending→Active flow + permissions | Building/Tower hierarchy (currently flat Units only) |
| Units | ✅ flat/row_house + invite links | Building model, bulk import, parking allocation |
| Notices | ✅ CRUD + permission | Targeted by tower/block, attachments |
| Maintenance | ✅ Monthly cycle + Razorpay order/verify + receipt, renter priority | GST/TDS, ledger, credit notes, Tally export, recurring invoices |
| Complaints | ✅ Categories, status workflow, stats, assign | SLA/escalation, staff roster, ratings |
| Amenities | ✅ Capacity/slot/full_day + booking + defaulter block | Group-wise limits, approval flow, BNPL, invites |
| Polls | ✅ Open/secret, per-flat vote, voters modal | Election poll |
| Surveys | ✅ single/multiple/text/rating + results | Participation tracking export |
| Chat | ✅ Groups + Direct admin + reactions/pin/reply | Broadcast email/SMS, polls integration |
| Directory | ✅ Masked phones | Resident calling, pet directory |
| Dashboard badges | ✅ 3 features (complaint/poll/survey) | Extend to all MyGate 250+ triggers |
| Payments | ✅ Razorpay integration stub | Multi-gateway, foreign cards, settlement |
| Security/Visitors | ❌ Placeholder | Full guard flow (pre-approve, QR, gate routing) |

**Immediate Next (suggested):**
1. Visitor Management (pre-approve, guard check-in, overstay alert) — biggest MyGate moat.
2. Finance depth (GST, ledger, journal, trial balance).
3. File storage + Document Vault (flat-wise/society-wise docs).
4. Notification abstraction (in-app + push + email).
5. Guard App (offline, patrol, ANPR) + Staff Attendance.

---

*Generated: Aug 2026 for ResidentOne. Source files: `backend/src/app.js:1`, `frontend/src/App.js:1`, `feature.md:1`.*

