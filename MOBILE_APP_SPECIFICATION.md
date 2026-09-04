# 📱 ResidentOne — Mobile App Replication Specification & Blueprint

This document is the **Single Source of Truth (SSOT)** for building the **ResidentOne React Native (Expo) Mobile Application** with **0% functional or design discrepancy** from the web platform.

---

## 📑 Table of Contents
1. [Architecture & Technology Stack](#1-architecture--technology-stack)
2. [Design System, UI Tokens & Form Component Anatomy](#2-design-system-ui-tokens--form-component-anatomy)
3. [Global State & Authentication Engine](#3-global-state--authentication-engine)
4. [Real-Time WebSocket & Sound Intercom Protocol](#4-real-time-websocket--sound-intercom-protocol)
5. [Detailed Screen & Modal Layout Specifications (Exact UI Match)](#5-detailed-screen--modal-layout-specifications-exact-ui-match)
   - [5.1 Auth & Onboarding Screens](#51-auth--onboarding-screens)
   - [5.2 Dashboard (Home Screen)](#52-dashboard-home-screen)
   - [5.3 Add / Edit Family Member Modal (Exact Form Layout)](#53-add--edit-family-member-modal-exact-form-layout)
   - [5.4 Visitor Pre-Approval Modal & Passes](#54-visitor-pre-approval-modal--passes)
   - [5.5 Real-Time Incoming Visitor Ringing Intercom Modal](#55-real-time-incoming-visitor-ringing-intercom-modal)
   - [5.6 Gate Parcel & Delivery Hub Screens & Keypads](#56-gate-parcel--delivery-hub-screens--keypads)
   - [5.7 Maintenance Payment & Digital Receipts](#57-maintenance-payment--digital-receipts)
   - [5.8 Special Collections & Festival Fund Drives](#58-special-collections--festival-fund-drives)
   - [5.9 Raise Helpdesk Ticket / Complaint Form](#59-raise-helpdesk-ticket--complaint-form)
   - [5.10 Amenity Booking Slot Selector](#510-amenity-booking-slot-selector)
   - [5.11 Create Poll & Create Survey Forms](#511-create-poll--create-survey-forms)
   - [5.12 Staff & Guard Onboarding Form](#512-staff--guard-onboarding-form)
   - [5.13 House Assignment & 7-Day Invite Generator](#513-house-assignment--7-day-invite-generator)
   - [5.14 Guard Gate Terminal (Dedicated Guard Station)](#514-guard-gate-terminal-dedicated-guard-station)
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

## 2. Design System, UI Tokens & Form Component Anatomy

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

### 📐 Form Field Anatomy & Visual Specifications

#### 1. Standard Single-Line Input Field
* **Container**: `height: 48px`, `borderRadius: 12` (`rounded-xl`), `backgroundColor: "#FBFDFA"` (`bg-surface`), `borderWidth: 1`, `borderColor: "#BFC9C2"` (`border-outline-variant`).
* **Focused State**: `borderColor: "#1B4D3E"`, subtle shadow ring.
* **Label**: Rendered above input, `fontSize: 13`, `fontWeight: "600"`, `color: "#191C1B"`.

#### 2. `<PhoneInput />` Single-Box Container (Crucial Component)
Rendered as a **seamless single-box input** matching standard inputs:
```
┌────────────────────────────────────────────────────────────┐
│ 🇮🇳 +91 ▾  │  98765 43210                            (10/10) ✓ │
└────────────────────────────────────────────────────────────┘
```
* **Left Section**: Touchable country trigger showing Country Flag Emoji + Dial Code (`+91`) + Small Chevron (`▾`).
* **Vertical Divider**: `width: 1px`, `height: 24px`, `backgroundColor: "#BFC9C2"`.
* **Right Section**: Number `TextInput` (numeric keypad, dynamic max-length enforcement: 10 digits for India `+91`, 9 for UAE `+971`, etc.).
* **Right Checkmark Badge**: Subtle green checkmark `✓` shown when exact country digit length is reached.
* **Country Picker Popover Modal**: Search input at top + list of countries with flags, names, and dial codes. Top NRI countries pinned at top (India, UAE, US, UK, Singapore, Canada, Australia, Saudi Arabia, Qatar, Oman).

#### 3. Pill & Chip Selection Buttons (Relationship, Priority, Visitor Type)
* **Inactive Pill**: `borderRadius: 9999` (`rounded-full`), `backgroundColor: "#F4F6F3"`, `borderWidth: 1`, `borderColor: "#BFC9C2"`, `color: "#3F4944"`, `paddingHorizontal: 16`, `paddingVertical: 8`.
* **Active Pill**: `backgroundColor: "#1B4D3E"`, `color: "#FFFFFF"`, `borderColor: "#1B4D3E"`, `fontWeight: "700"`.

#### 4. Standard Modal Architecture
* **Backdrop**: Semi-transparent dark overlay (`backgroundColor: "rgba(0,0,0,0.6)"`).
* **Modal Card**: Centered or Bottom-sheet, `borderRadius: 24` (`rounded-3xl`), `backgroundColor: "#FBFDFA"`, `padding: 24`.
* **Header**: Icon badge in circle + Title (`fontSize: 18, fontWeight: "bold"`) + Subtitle + Close `✕` button at top right.
* **Footer**: Full-width Cancel button (`outlined`) + Submit button (`bg-primary text-white font-bold`).

---

## 3. Global State & Authentication Engine

### 1. `auth.store.js` (JWT & User Session)
* **Storage Engine**: `AsyncStorage`
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

## 5. Detailed Screen & Modal Layout Specifications (Exact UI Match)

---

### 5.1 Auth & Onboarding Screens

#### 1. Login Screen (`/login`)
```
┌────────────────────────────────────────────────────────────┐
│                    [ 🏢 ResidentOne Logo ]                 │
│                      Welcome Back 👋                       │
│             Sign in to access your society portal          │
│                                                            │
│  Phone Number                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🇮🇳 +91 ▾ │  Enter 10-digit mobile number             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Password                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ••••••••••••                                      👁 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                     Sign In →                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│              Don't have an account? Register               │
└────────────────────────────────────────────────────────────┘
```

---

### 5.2 Dashboard (Home Screen)

```
┌────────────────────────────────────────────────────────────┐
│ Good morning, Rahul 👋                 Thursday, 3 Sep     │
│ [ 🛡️ Owner ]                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🏢 Greenfield Heights · Flat A-402 ▾                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── 📦 Waiting Gate Delivery (Conditional Banner) ──────┐ │
│ │ 📦 1 Package Waiting at Main Gate                      │ │
│ │ Amazon Delivery · Arrived 10 mins ago                  │ │
│ │ ┌───────────────────┐                                  │ │
│ │ │  PIN: 4821        │ (Tap to view details)            │ │
│ │ └───────────────────┘                                  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── 💳 Maintenance Alert (Conditional Banner) ──────────┐ │
│ │ ⚠️ September 2026 Maintenance Due (₹2,500)             │ │
│ │ Due by 10 Sep 2026                    [ Pay Now → ]    │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Resident Services                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────┐ │
│ │ 💳           │ │ 🤝           │ │ 🏠           │ │ 👨‍👩‍👧 │ │
│ │ Pay Dues     │ │ Collections  │ │ My Unit      │ │ Add │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────┘ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────┐ │
│ │ 📢           │ │ 🛡️           │ │ 📦           │ │ 🛠️  │ │
│ │ Notices      │ │ Visitors     │ │ Gate Parcels │ │ Tkt │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────┘ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────┐ │
│ │ 🏊           │ │ 🗳️           │ │ 📋           │ │ 💬  │ │
│ │ Amenities    │ │ Polls        │ │ Surveys      │ │ Chat│ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────┘ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────┐ │
│ │ 📁           │ │ 🚨           │ │ 👥           │ │ 🚗  │ │
│ │ Documents    │ │ Emergency    │ │ Directory    │ │ Cars│ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────┘ │
│                                                            │
│ Recent Notices                             [ View all → ]  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 📢 Annual General Body Meeting (AGM) 2026              │ │
│ │ Notice issued by Secretary · 2h ago                    │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### 5.3 Add / Edit Family Member Modal (Exact Form Layout)

When user taps **"+ Add Member"** on Profile or Household page:

```
┌────────────────────────────────────────────────────────────┐
│ 👨‍👩‍👧‍👦 Add Family Member                                   ✕ │
│ Add a household member living in your flat                 │
│                                                            │
│ Full Name *                                                │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ e.g. Priya Sharma                                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Relationship *                                             │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐   │
│ │ Spouse    │ │ Child     │ │ Parent    │ │ Sibling    │   │
│ └───────────┘ └───────────┘ └───────────┘ └────────────┘   │
│ ┌───────────┐ ┌───────────┐                                │
│ │ Relative  │ │ Other     │ (Active pill gets primary bg)  │
│ └───────────┘ └───────────┘                                │
│                                                            │
│ Phone Number (Optional)                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🇮🇳 +91 ▾ │ 98765 43210                         (10/10) ✓│ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─────────────────────────┐  ┌───────────────────────────┐ │
│ │ Cancel                  │  │ Save Member               │ │
│ └─────────────────────────┘  └───────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```
* **Auto Sync Logic**: On clicking "Save Member", `POST /api/v1/family-members` is called $\to$ the family list updates and the Household Member Count on Profile increments dynamically.

---

### 5.4 Visitor Pre-Approval Modal & Passes

```
┌────────────────────────────────────────────────────────────┐
│ 🎫 Pre-Approve Visitor                                   ✕ │
│ Create a guest entry pass for seamless gate access         │
│                                                            │
│ Visitor Type *                                             │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐   │
│ │ 👤 Guest  │ │ 📦Delivery│ │ 🚕 Cab    │ │ 🔧 Service │   │
│ └───────────┘ └───────────┘ └───────────┘ └────────────┘   │
│                                                            │
│ Visitor Name *                                             │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ e.g. Rajesh Kumar                                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Visitor Phone Number *                                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🇮🇳 +91 ▾ │ 98230 11223                         (10/10) ✓│ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Expected Date & Time *                                     │
│ ┌─────────────────────────┐  ┌───────────────────────────┐ │
│ │ 📅 Today, 3 Sep 2026    │  │ 🕒 04:00 PM - 06:00 PM    │ │
│ └─────────────────────────┘  └───────────────────────────┘ │
│                                                            │
│ Vehicle Number (Optional)                                  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ e.g. MH 12 AB 1234                                     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │               Generate Entry Pass →                    │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

#### Generated Pass Result Card:
```
┌────────────────────────────────────────────────────────────┐
│                 ✅ Entry Pass Generated!                   │
│                                                            │
│             6-Digit Gate Entry Passcode:                   │
│             ┌──────────────────────────────┐               │
│             │          8 3 9 2 0 1         │               │
│             └──────────────────────────────┘               │
│               [ QR Code Placeholder ]                      │
│                                                            │
│ Visitor: Rajesh Kumar · Guest · Valid for Today            │
│ Destination: Greenfield Heights · Flat A-402               │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 💬 Share Entry Pass via WhatsApp                       │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### 5.5 Real-Time Incoming Visitor Ringing Intercom Modal

When guard logs a walk-in visitor at the gate, this modal pops up with ringing sound:

```
┌────────────────────────────────────────────────────────────┐
│ 🔔 INCOMING VISITOR AT MAIN GATE                           │
│ Ringing intercom...                                        │
│                                                            │
│ [ 👤 Visitor Photo ]  Amit Verma                           │
│                       Delivery (Swiggy) · Bike MH12 CD5678 │
│                                                            │
│ Flat: A-402 (Your Unit)                                    │
│ Guard Desk: Gate 1 Terminal                                │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ✅ APPROVE ENTRY                                        │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 📦 LEAVE AT GATE (Creates Parcel with Pickup PIN)      │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ❌ DENY ENTRY                                           │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### 5.6 Gate Parcel & Delivery Hub Screens & Keypads

#### Resident View (`/visitors?tab=parcels`):
* **Uncollected Parcels Grid**:
  - Displays courier company badge (*Amazon, Flipkart, Blinkit, Swiggy, Zomato*).
  - Arrival timestamp + Gate Guard name.
  - **Highlighted 4-Digit Pickup PIN Card** (e.g. `PIN: 7194`).
* **Collected History**: List of past collected packages with handover timestamps.

---

### 5.7 Maintenance Payment & Digital Receipts

#### Pay Maintenance Modal:
```
┌────────────────────────────────────────────────────────────┐
│ 💳 Pay Maintenance Dues                                  ✕ │
│ Billing Cycle: September 2026 · Flat A-402                 │
│ Total Amount Due: ₹2,500                                   │
│                                                            │
│ Select Payment Method *                                    │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐   │
│ │ UPI / QR  │ │ NetBanking│ │ Cheque    │ │ Cash       │   │
│ └───────────┘ └───────────┘ └───────────┘ └────────────┘   │
│                                                            │
│ Transaction Reference ID / Cheque No. *                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ e.g. UPI-REF-902819284019                              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │               Submit Payment & Get Receipt             │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### 5.8 Special Collections & Festival Fund Drives

* **Campaign Hero Card**:
  - Event title (e.g. *Diwali Celebration 2026*, *Elevator Modernization*).
  - **Target Progress Bar**: `[██████████░░░░] ₹45,000 / ₹1,00,000 (45%)`.
  - Contribution per flat amount: `₹1,000`.
  - 1-tap **`[ Pay Contribution ]`** button.

---

### 5.9 Raise Helpdesk Ticket / Complaint Form

```
┌────────────────────────────────────────────────────────────┐
│ 🛠️ Raise Helpdesk Ticket                                 ✕ │
│ Report a flat or society maintenance issue                 │
│                                                            │
│ Category *                                                 │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐   │
│ │ Plumbing  │ │ Electrical│ │ Lift      │ │ Security   │   │
│ └───────────┘ └───────────┘ └───────────┘ └────────────┘   │
│ ┌───────────┐ ┌───────────┐                                │
│ │ Cleaning  │ │ Other     │                                │
│ └───────────┘ └───────────┘                                │
│                                                            │
│ Priority Level *                                           │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐   │
│ │ 🟢 Low    │ │ 🟡 Medium │ │ 🟠 High   │ │ 🔴 Urgent  │   │
│ └───────────┘ └───────────┘ └───────────┘ └────────────┘   │
│                                                            │
│ Title *                                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ e.g. Water leakage in master bathroom ceiling          │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Description *                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Provide details about the issue...                     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Photo Attachment (Optional)                                │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 📷 Tap to take photo or choose from gallery            │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │               Submit Ticket →                          │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### 5.10 Amenity Booking Slot Selector

1. **Amenity Header**: Image of Clubhouse/Pool + Pricing + Max capacity.
2. **Date Picker**: Horizontal swipeable calendar day pills (`[ Today 3 ]` `[ Fri 4 ]` `[ Sat 5 ]` `[ Sun 6 ]`).
3. **Time Slots Grid**:
   - `[ 06:00 AM - 07:00 AM ]` (Available $\to$ White border)
   - `[ 07:00 AM - 08:00 AM ]` (Booked $\to$ Disabled grey)
   - `[ 08:00 AM - 09:00 AM ]` (Selected $\to$ Active primary fill)
4. **Bottom Sticky Bar**: Selected slot + Price + `[ Confirm Booking ]` button.

---

### 5.11 Create Poll & Create Survey Forms

#### Poll Creation Form:
* Question input (`e.g. Should we install EV charging stations?`).
* Dynamic Options list with `[ + Add Option ]` button and `✕` remove button.
* Single / Multiple Choice toggle.
* Expiry Date picker.

---

### 5.12 Staff & Guard Onboarding Form

* Full Name.
* Staff Role dropdown: `Security Guard`, `Technician`, `Housekeeping`, `Gardener`.
* Phone Number with `<PhoneInput />`.
* Shift Allocation: `Day Shift (08 AM - 08 PM)` / `Night Shift (08 PM - 08 AM)`.
* **Auto Temporary Password Generator**: Displays generated password chip (e.g. `Guard@2026`) with 1-tap Copy button.

---

### 5.13 House Assignment & 7-Day Invite Generator

* Flat selection (Wing + Flat number).
* Occupancy type: `Owner` vs `Tenant`.
* Resident Phone (`<PhoneInput />`).
* **Shareable Invite Link**:
  - Generates `https://residentone.app/house-invite/<TOKEN>`.
  - Displays **7-Day Expiry Notice**.
  - 1-tap **`[ 📋 Copy Link ]`** and **`[ 💬 Share via WhatsApp ]`**.

---

### 5.14 Guard Gate Terminal (Dedicated Guard Station)

*(Optimized for guards on gate tablets or smartphones)*

```
┌────────────────────────────────────────────────────────────┐
│ 🛡️ GATE 1 SECURITY DESK — Greenfield Heights               │
│ [ 🚶 Walk-In Entry ]  [ 🎫 PIN Passcode ]  [ 📦 Parcels ]  │
│                                                            │
│ ┌─── Tab 1: Walk-In Entry ───────────────────────────────┐ │
│ │ Search Flat / Owner:                                   │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ 🔍 Type flat e.g. A-402 or Sharma...               │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │
│ │ Suggestions:                                           │ │
│ │ • [ Flat A-402 ] Rahul Sharma (Owner) · Wing A, Fl 4  │ │
│ │ • [ Flat B-104 ] Amit Sharma (Tenant) · Wing B, Fl 1  │ │
│ │                                                        │ │
│ │ Visitor Name: [ Vikram Singh                         ] │ │
│ │ Visitor Phone: [ 🇮🇳 +91 98200 11223                ] │ │
│ │ Purpose: [ 👤 Guest ] [ 📦 Delivery ] [ 🚕 Cab ]       │ │
│ │                                                        │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ 🔔 RING RESIDENT INTERCOM →                        │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─── Tab 2: 6-Digit Passcode Keypad ─────────────────────┐ │
│ │ Enter Visitor Entry Code:                              │ │
│ │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                    │ │
│ │ │ 8 │ │ 3 │ │ 9 │ │ 2 │ │ 0 │ │ 1 │                    │ │
│ │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                    │ │
│ │ [ 1 ] [ 2 ] [ 3 ]                                      │ │
│ │ [ 4 ] [ 5 ] [ 6 ]                                      │ │
│ │ [ 7 ] [ 8 ] [ 9 ]                                      │ │
│ │ [ ⌫ ] [ 0 ] [ ✅ Verify ]                              │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

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
