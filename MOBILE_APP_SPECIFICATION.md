# 📱 ResidentOne — Mobile App Replication Specification & Blueprint

This document is the **single source of truth (SSOT)** for building the **ResidentOne React Native (Expo) Mobile Application** with **0% functional or design discrepancy** from the web platform.

---

## 📑 Table of Contents
1. [Architecture & Technology Stack](#1-architecture--technology-stack)
2. [Design System & UI Tokens](#2-design-system--ui-tokens)
3. [Global State & Authentication Engine](#3-global-state--authentication-engine)
4. [Real-Time WebSocket & Sound Intercom Protocol](#4-real-time-websocket--sound-intercom-protocol)
5. [Complete Screen-by-Screen User Flows & Logic](#5-complete-screen-by-screen-user-flows--logic)
   - [Auth & Onboarding Flow](#51-auth--onboarding-flow)
   - [Dashboard (Home) Flow](#52-dashboard-home-flow)
   - [Gate Security & Visitor Management Flow](#53-gate-security--visitor-management-flow)
   - [Gate Parcel & Delivery Hub Flow](#54-gate-parcel--delivery-hub-flow)
   - [Finances, Maintenance & Collections Flow](#55-finances-maintenance--collections-flow)
   - [Household, Flats, Family & Vehicles Flow](#56-household-flats-family--vehicles-flow)
   - [Helpdesk & Complaints Flow](#57-helpdesk--complaints-flow)
   - [Amenities Booking Flow](#58-amenities-booking-flow)
   - [Community (Notices, Polls, Surveys, Chat, Directory)](#59-community-notices-polls-surveys-chat-directory)
   - [Society Administration & Staff Management](#510-society-administration--staff-management)
   - [Guard Gate Terminal (Tablet / Guard Mode)](#511-guard-gate-terminal-tablet--guard-mode)
6. [Component Mapping Table (Web to React Native)](#6-component-mapping-table-web-to-react-native)
7. [API Endpoints Reference](#7-api-endpoints-reference)

---

## 1. Architecture & Technology Stack

### Recommended Mobile Stack:
* **Framework**: React Native with **Expo (Managed Workflow)** (`npx create-expo-app`)
* **Styling**: **NativeWind (Tailwind CSS for React Native)** or `StyleSheet`
* **Navigation**: **React Navigation v6 / v7** (`@react-navigation/native-stack` + `@react-navigation/bottom-tabs`)
* **State Management**: **Zustand** with `AsyncStorage` persistence (1:1 port of web stores)
* **Server State / Cache**: **TanStack Query (React Query v5)**
* **Networking**: **Axios** with JWT Interceptor
* **Real-time Engine**: **Socket.io-client**
* **Audio Intercom**: **Expo AV** (`expo-av`)
* **Icons**: **`@expo/vector-icons/MaterialIcons`** or **`MaterialCommunityIcons`**
* **Push Notifications**: **Expo Notifications** (`expo-notifications`)

---

## 2. Design System & UI Tokens

To ensure a **100% visual match**, use the exact color tokens, typography scales, and component geometries:

### 🎨 Color Palette (Material-3 Theme)
```javascript
export const COLORS = {
  primary: "#1B4D3E",              // Deep Forest Emerald (Brand Primary)
  onPrimary: "#FFFFFF",
  primaryContainer: "#C2EBD9",     // Soft Emerald Container
  onPrimaryContainer: "#002116",

  secondary: "#4C6358",
  surface: "#FBFDFA",              // Clean off-white background
  surfaceContainerLow: "#F4F6F3",  // Card backings
  surfaceContainerHigh: "#E8ECE7", // Neutral borders/fills
  
  onSurface: "#191C1B",            // Main text color
  onSurfaceVariant: "#3F4944",     // Subtitles / Helper text
  outline: "#6F7974",              // Border outlines
  outlineVariant: "#BFC9C2",       // Light dividers

  error: "#BA1A1A",                // Urgent alert / Overdue red
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  
  success: "#15803D",              // Paid / Active green
  warning: "#D97706",              // Pending amber
};
```

### 🎴 Card Tints for Service Grid (1:1 with Web)
```javascript
export const CARD_TINTS = [
  { bg: "#E0F2FE", text: "#0369A1" }, // Sky (Maintenance)
  { bg: "#D1FAE5", text: "#047857" }, // Emerald (Collections)
  { bg: "#EDE9FE", text: "#6D28D9" }, // Violet (My Unit)
  { bg: "#FEF3C7", text: "#B45309" }, // Amber (Add Members)
  { bg: "#FFE4E6", text: "#BE123C" }, // Rose (Notices)
  { bg: "#CFFAFE", text: "#0E7490" }, // Cyan (Visitors)
  { bg: "#E0E7FF", text: "#4338CA" }, // Indigo (Gate Parcels)
  { bg: "#CCFBF1", text: "#0F766E" }, // Teal (Complaints)
];
```

### 📱 Common UI Geometries
* **Card Corner Radius**: `borderRadius: 16` (`rounded-2xl`)
* **Input Height**: `48px` or `52px` with `borderRadius: 12` (`rounded-xl`)
* **Button Height**: `48px` with `borderRadius: 12` (`rounded-xl`)
* **Floating Badge**: Circle with `height: 22, width: 22, borderRadius: 11, backgroundColor: COLORS.error`

---

## 3. Global State & Authentication Engine

### 1. `auth.store.js` (JWT & User Session)
* **Storage Engine**: `AsyncStorage` (instead of `localStorage`)
* **State**:
  - `user`: `{ id, name, phone, email, isSuperAdmin, avatarUrl }`
  - `token`: JWT Bearer string
  - `isAuthenticated`: `Boolean`
* **Actions**:
  - `setAuth({ token, user })` $\to$ saves to `AsyncStorage` and sets default Axios `Authorization: Bearer <token>`
  - `logout()` $\to$ clears `AsyncStorage` and disconnects socket.

### 2. `society.store.js` (Multi-Society & Active Role)
* **State**:
  - `societies`: Array of societies where user has memberships
  - `activeSociety`: The currently selected society object `{ id, name, code, status, societyType, ... }`
  - `activeMembership`: The membership object for the active society `{ id, role, units: [...], assignedWings: [...], customPermissions: [...] }`
* **Actions**:
  - `setActiveSociety(society)`
  - `setSocieties(list)`

---

## 4. Real-Time WebSocket & Sound Intercom Protocol

### Connection:
```javascript
import io from "socket.io-client";

const socket = io(API_BASE_URL, {
  auth: { token: authToken },
  transports: ["websocket"],
});
```

### Event Handlers Table:
| Socket Event | Payload | Mobile Reaction |
|---|---|---|
| `visitor:new_approval` | `{ visitorId, visitorName, visitorPhone, purpose, vehicleNumber, houseLabel, photoUrl }` | **Play Ringing Intercom Sound** (`expo-av`) + **Display Full-Screen / Modal Approval Overlay** with 3 buttons (`Approve`, `Deny`, `Leave at Gate`). |
| `visitor:approval_response` | `{ visitorId, status: "approved" \| "denied" \| "left_at_gate" }` | Updates Guard screen in real time without refreshing. |
| `parcel:new` | `{ parcelId, courierName, pickupPin, houseId }` | Invalidate `["gate-parcels"]` query + Show top banner on Dashboard. |
| `parcel:collected` | `{ parcelId }` | Invalidate `["gate-parcels"]` query. |
| `chat:message` | `{ channelId, message, sender }` | Append message to active chat list in real time. |
| `emergency:alert` | `{ societyId, flat, contact, reason }` | Trigger full-screen red emergency modal + siren sound. |

---

## 5. Complete Screen-by-Screen User Flows & Logic

---

### 5.1 Auth & Onboarding Flow

#### 1. Login Screen (`/login`)
* **Fields**:
  - Phone Number Input (with `<PhoneInput />` country picker)
  - Password Input (with show/hide eye toggle)
* **Logic**:
  - Submits `POST /api/v1/auth/login` with `{ phone, password }`.
  - On success: sets `token` and `user`, fetches user memberships via `GET /api/v1/societies/my-memberships`.
  - If 1 society $\to$ sets `activeSociety` $\to$ navigates to `Dashboard`.
  - If multiple societies $\to$ opens Society Selector Modal.

#### 2. Register Screen (`/register`)
* **Fields**:
  - Full Name
  - Phone Number (`<PhoneInput />` with 10-digit validation for India `+91`)
  - Email (Optional)
  - Password
* **Logic**: Submits `POST /api/v1/auth/register`.

#### 3. House Claim / Invite Screen (`/house-invite/:token`)
* **Logic**:
  - Submits `GET /api/v1/houses/invite-info/:token` to display Flat Number, Society Name, and Inviter Name.
  - Form asks to set Password and confirm details.
  - Submits `POST /api/v1/houses/claim-invite` $\to$ auto-provisions user, assigns unit, and redirects to Dashboard.

---

### 5.2 Dashboard (Home) Flow

The Dashboard is the central command center of the app:

#### Component Hierarchy:
1. **Header**:
   - Time Greeting (`Good morning / afternoon / evening, {FirstName} 👋`)
   - Date badge (`Thursday, 3 Sep`)
   - Role badge chip (`Owner`, `Tenant`, `Society Admin`, `Guard`)
   - Society & Flat selector pill (`Greenfield Heights · Flat A-402 ▾`)
2. **High-Priority Alert Banners** (Conditional):
   - **📦 Waiting Parcel Banner**: Rendered if resident has uncollected packages at gate desk:
     - Displays courier name (e.g. *Amazon*, *Blinkit*) + **Bold 4-Digit Pickup PIN** (e.g. `PIN: 4821`).
     - Tapping opens `/visitors?tab=parcels`.
   - **💳 Maintenance Overdue Alert Banner**: Rendered if maintenance is unpaid:
     - Displays month, due date, overdue badge, and 1-tap `[ Pay Now ]` button.
3. **Society Administration Grid** (Rendered for Admins/Committee):
   - 11 square cards with admin permissions (`Manage Houses`, `Manage Society`, `Manage Wing`, `Manage Maintenance`, `Manage Collections`, `Create Notice`, `Manage Amenities`, `Create Poll`, `Create Survey`, `Manage Committee`, `Manage Staff`).
4. **Resident Services Grid (16 Square Cards)**:
   - `Pay Maintenance` (`/maintenance`)
   - `Collections` (`/collections/pay`)
   - `My Unit` (`/my-unit`)
   - `Add Members` (`/family-members`)
   - `Notices` (`/notices`)
   - `Visitors` (`/visitors`)
   - `Gate Parcels` (`/visitors?tab=parcels`)
   - `Complaints` (`/complaints`)
   - `Amenities` (`/amenities`)
   - `Polls` (`/polls`)
   - `Surveys` (`/surveys`)
   - `Chat` (`/chat`)
   - `Documents` (`/documents`)
   - `Emergency` (`/emergency-contacts`)
   - `Directory` (`/directory`)
   - `Vehicles` (`/vehicles`)
5. **Recent Notices Feed**:
   - Displays latest 2 announcements with author avatar and timeago stamp + `[ View all ]` button.

---

### 5.3 Gate Security & Visitor Management Flow

#### 1. Resident Visitors Portal (`/visitors`)
* **Tabs**: `🚶 Inside Now` | `🕒 Expected Today` | `🔔 Pending Approvals` | `📦 Gate Parcels` | `📜 History`
* **Pre-Approve Visitor Modal**:
  - Visitor Type selection: `Guest`, `Delivery`, `Cab`, `Service (Plumber/AC)`, `Other`
  - Visitor Name & Phone (`<PhoneInput />`)
  - Expected Date & Time slot
  - Vehicle Number (Optional)
  - Submits `POST /api/v1/visitors/pre-approve`
  - Returns **6-digit Entry Passcode** (e.g. `839201`) + QR code with 1-tap **WhatsApp Share Button**.

#### 2. Real-Time Intercom Approval Flow (When Guard logs walk-in at gate)
* Socket receives `visitor:new_approval`.
* App plays audible chime sound.
* Modal pops up on resident's screen:
  - Visitor Name, Purpose, Vehicle Number, Guard Photo.
  - 3 Instant Actions:
    1. **`[ ✅ Approve Entry ]`** $\to$ emits `POST /api/v1/visitors/:id/respond` `{ status: "approved" }`.
    2. **`[ 📦 Leave at Gate ]`** $\to$ converts to a Gate Parcel with generated 4-digit pickup PIN.
    3. **`[ ❌ Deny Entry ]`** $\to$ marks as denied and notifies gate guard immediately.

---

### 5.4 Gate Parcel & Delivery Hub Flow

1. **Intake at Gate**:
   - Guard logs package: Courier name (*Amazon, Flipkart, Swiggy, Zomato, Blinkit, Courier, Other*) + Flat autocomplete.
   - Backend auto-generates a secure **4-digit Pickup PIN** (e.g. `7194`).
2. **Resident Notification**:
   - Resident receives socket ping + dashboard banner showing `PIN: 7194`.
3. **Handover at Gate**:
   - Guard types the 4-digit PIN on the terminal keypad.
   - Terminal displays confirmed package card.
   - Guard taps `[ Confirm Handover ]` $\to$ parcel is archived as collected.

---

### 5.5 Finances, Maintenance & Collections Flow

#### 1. Resident Maintenance Screen (`/maintenance`)
* **Hero Card**: Total outstanding balance across all owned units.
* **Active Cycle Card**: Current month amount, due date, status pill (`Paid`, `Due Soon`, `Overdue`).
* **Pay Maintenance Modal**:
  - Payment Method selector: `UPI`, `Bank Transfer / NEFT`, `Cheque`, `Cash`.
  - Transaction Reference / Cheque number input.
  - Submits `POST /api/v1/maintenance/pay`.
  - Displays instant **Digital Receipt** with receipt number, payment date, and PDF download.

#### 2. Special Collections Screen (`/collections/pay`)
* Displays festival / special project fund drives (e.g. *Ganesh Festival 2026*, *CCTV Upgrade*).
* Shows **Target vs. Collected Progress Bar** (e.g. `₹45,000 / ₹1,00,000 (45%)`).
* 1-tap contribution button per flat.

---

### 5.6 Household, Flats, Family & Vehicles Flow

#### 1. My Unit Screen (`/my-unit`)
* Displays flat number, floor, wing, occupancy status.
* Quick lists of linked family members, registered vehicles, and tenant details.

#### 2. Family Members Screen (`/family-members`)
* Displays active family list with relation chips (*Spouse, Child, Parent, Sibling, Relative, Other*).
* **"+ Add Member" Modal**:
  - Name, Relationship dropdown, Phone number with `<PhoneInput />`.
  - Automatically updates the household member count upon saving.
* **Delete Member**: 1-click confirmation with instant removal.

#### 3. Vehicles Screen (`/vehicles`)
* Displays 2-Wheelers and 4-Wheelers.
* Add Vehicle: Vehicle Type, Vehicle Number (License Plate), Parking Slot Number.

---

### 5.7 Helpdesk & Complaints Flow

#### 1. Complaints List (`/complaints`)
* Status Filter Pills: `All`, `Open`, `In Progress`, `Resolved`, `Closed`.
* Card displays: Ticket ID (`#TKT-104`), Category, Priority badge (`Urgent`, `High`, `Medium`, `Low`), Title, Created time.

#### 2. Raise Complaint Modal / Screen (`/complaints/new`)
* Category: *Plumbing, Electrical, Lift, Security, Housekeeping, Noise, Parking, Other*.
* Priority Selector.
* Title & Description.
* Photo Attachment (Camera / Image Picker).
* Submits `POST /api/v1/complaints`.

#### 3. Complaint Detail (`/complaints/:id`)
* Status progress timeline.
* Admin responses & internal comments.
* Resident closure / reopen button.

---

### 5.8 Amenities Booking Flow

1. **Browse Amenities (`/amenities`)**:
   - Clubhouse, Swimming Pool, Tennis Court, Badminton Turf, Party Hall.
   - Shows timings, hourly price (or free), max capacity, and rules.
2. **Booking Flow**:
   - Date picker $\to$ Time slot grid (e.g. `06:00 PM - 07:00 PM`).
   - Slot availability checker (blocks conflicting slots in real time).
   - Submits `POST /api/v1/amenities/:id/book`.
3. **My Bookings Tab**:
   - Shows active booking pass with booking ID and cancel button.

---

### 5.9 Community (Notices, Polls, Surveys, Chat, Directory)

1. **Notices (`/notices`)**:
   - Official circulars, pinned announcements, search filter by category.
2. **Polls (`/polls`)**:
   - Voting cards with radio options $\to$ Submits vote $\to$ Instantly displays live percentage progress bars and voter count.
3. **Surveys (`/surveys`)**:
   - Questionnaire forms with 1-5 star ratings and feedback text.
4. **Chat (`/chat`)**:
   - General society group channel + Committee channel.
   - Real-time message exchange via `socket.io`.
5. **Directory (`/directory`)**:
   - Resident directory searchable by Wing, Flat, or Name.
   - Emergency SOS tab with 1-tap phone dialer (`Linking.openURL('tel:911')`).

---

### 5.10 Society Administration & Staff Management

*(Accessible only to users with `society_admin`, `wing_admin`, or committee permissions)*
1. **Manage Houses (`/houses`)**:
   - Add flats, assign owners/tenants, generate 7-day shareable invite links.
2. **Manage Maintenance (`/dues`)**:
   - Generate new monthly cycle, track defaulters, record offline cash payments.
3. **Manage Staff (`/staff`)**:
   - Add guards, technicians, and cleaners.
   - Auto-generates staff login credentials.
4. **Manage Society (`/society/manage`)**:
   - Update society rules, bank details, contact numbers.

---

### 5.11 Guard Gate Terminal (Tablet / Guard Mode)

*(Optimized for guards on gate tablets or smartphones)*
1. **PIN Keypad**:
   - Guard enters visitor 6-digit passcode $\to$ instant verified card $\to$ 1-tap `[ Check In ]`.
2. **Walk-in Visitor Entry**:
   - Guard types flat number (e.g. `A-402`) or owner name $\to$ smart autocomplete suggestion dropdown $\to$ visitor purpose $\to$ sends ringing notification to resident.
3. **Gate Parcel Hub**:
   - 4-digit pickup PIN keypad $\to$ verifies resident pickup code $\to$ 1-tap `[ Confirm Handover ]`.

---

## 6. Component Mapping Table (Web to React Native)

| Web Component (React JS) | React Native (Expo) Equivalent |
|---|---|
| `<div className="...">` | `<View style={...}>` (or `<View className="...">` with NativeWind) |
| `<span className="...">`, `<p>`, `<h1>` | `<Text style={...}>` |
| `<Link to="...">`, `<button onClick=...>` | `<TouchableOpacity onPress=...>` or `<Pressable onPress=...>` |
| `<input type="text" ... />` | `<TextInput ... />` |
| `<select ...>` | `@react-native-picker/picker` or Custom Modal Popover |
| `<PhoneInput />` | `<PhoneInput />` (built with `TextInput` + Country Picker modal) |
| `material-symbols-outlined` | `@expo/vector-icons/MaterialIcons` |
| `toast.success(...)` | `react-native-toast-message` or `Alert.alert(...)` |
| `localStorage.getItem('token')` | `await AsyncStorage.getItem('token')` |
| `window.location.href = ...` | `navigation.navigate('ScreenName')` |
| Web Audio API Sound (`AudioContext`) | `expo-av` (`Audio.Sound.createAsync(...)`) |

---

## 7. API Endpoints Reference

### Base URL:
```
http://<YOUR_BACKEND_IP>:5000/api/v1
```

### Auth & Societies
* `POST /auth/login` — `{ phone, password }`
* `POST /auth/register` — `{ name, phone, password, email }`
* `GET /auth/me` — Current user profile
* `GET /societies/my-memberships` — User's society list
* `GET /dashboard/badges` — Floating unread counters

### Gate & Visitors
* `GET /visitors` — Visitor logs list (`?status=inside|expected|pending`)
* `GET /visitors/stats` — Live counters (`inside`, `expected`, `pending`)
* `POST /visitors/pre-approve` — Create visitor pass
* `POST /visitors/:id/respond` — `{ status: "approved" | "denied" | "left_at_gate" }`
* `GET /visitors/parcels` — Parcels list (`?status=left_at_gate`)
* `POST /visitors/parcels/verify-pickup` — Verify 4-digit PIN

### Maintenance & Finance
* `GET /maintenance/latest` — Active billing cycle
* `GET /maintenance/history` — Payment history
* `POST /maintenance/pay` — Record dues payment
* `GET /collections` — Active special fund drives
* `POST /collections/:id/pay` — Pay collection share

### Household & Helpdesk
* `GET /family-members` — Family members list
* `POST /family-members` — Add family member
* `DELETE /family-members/:id` — Delete family member
* `GET /complaints` — Tickets list
* `POST /complaints` — Raise new ticket
* `GET /amenities` — Available amenities & slots
* `POST /amenities/:id/book` — Book amenity slot
* `GET /notices` — Society circulars
* `POST /polls/:id/vote` — Submit poll vote
