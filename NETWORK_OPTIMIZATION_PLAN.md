# Network & Payload Optimization Architecture Plan
**Project:** ResidentOne (Web & Mobile Application)  
**Goal:** Maximize app performance, minimize VPS network bandwidth consumption (95%+ reduction), prevent database exhaustion, and provide instant cached screen transitions using Industry-Standard API Pagination, Lazy Loading, and Client-Side Query Caching.

---

## 1. Executive Summary & Why This Is Crucial

In production, multi-tenant society management platforms experience continuous data accumulation:
- A society with 200 flats generates **50–100 visitor/parcel logs per day** (~3,000/month).
- Maintenance cycles generate **200+ invoice records every month** (~2,400/year).
- Complaints and notifications continuously pile up into thousands of rows over time.

### The Problem without Optimization:
- **Bandwidth Exhaustion:** If 10 residents open the Complaints or Visitors page and the backend returns all 1,000+ records every time, the server transfers 500 KB to 2 MB per hit. With 50 daily visits, this consumes gigabytes of redundant bandwidth.
- **Client Sluggishness:** Mobile phones struggle to render large arrays in memory, causing UI stutter, slow render times, and app crashes on low-to-mid-range devices.
- **Database Strain:** Querying unindexed, unpaginated tables forces MongoDB to perform heavy collection scans.

### The Solution:
By implementing **API Pagination (`limit=20`)**, **Query Scoping (defaulting to Active/Open records)**, **Field Projection**, and **TanStack React Query Caching (`staleTime: 3–5 min`)**, data transfer drops from **~500 KB down to ~4 KB per screen visit (99% bandwidth reduction)** with zero loss of features.

---

## 2. The 4 Pillars of the Optimization Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      RESIDENTONE CLIENT REQUEST                        │
│                 (Web Browser / React Native APK)                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ 1. CLIENT CACHE CHECK (TanStack React Query)            │
       │    Data in cache & < 3 mins old?                        │
       │    YES ──► Return instant cached UI (0 bytes over wire) │
       │    NO  ──► Proceed with network fetch                   │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ 2. QUERY SCOPING & PAGINATION ARGS                      │
       │    Send: ?page=1&limit=20&status=open,in_progress       │
       │    (Skip 95% of historical resolved/closed records)     │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ 3. BACKEND FIELD PROJECTION & INDEXED SLICING           │
       │    MongoDB: .skip().limit(20).select('key fields only') │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │ 4. HTTP PAYLOAD COMPRESSION (Gzip / Brotli)             │
       │    Express middleware compresses text JSON by ~75%      │
       └─────────────────────────────────────────────────────────┘
```

---

## 3. Scope of Modules & Priority Roadmap

We will implement this in parallel across the **Express Backend**, **React Web Frontend**, and **React Native Mobile App**.

| Priority | Module | Current Behavior | Optimized Behavior | Expected Bandwidth Savings |
| :--- | :--- | :--- | :--- | :--- |
| **P0 (Critical)** | **Complaints Hub** | Fetches all past complaints indiscriminately | Default to `open` & `in_progress` only; 20 items per page; 3-min React Query cache | **~98% savings** |
| **P0 (Critical)** | **Visitor Logs & Gate Parcels** | Dumps full visitor history and gate parcel entries | Active inside/expected first; historical entries paginated at 20/page; infinite scroll | **~99% savings** |
| **P1 (High)** | **Notifications Center** | Loads all notifications from MongoDB | 25 per page; infinite scroll; mark as read in background | **~95% savings** |
| **P1 (High)** | **Maintenance Dues & Invoices** | Loads all dues records for the society | Active/unpaid cycle upfront; historical cycles paginated by year/quarter | **~90% savings** |
| **P1 (High)** | **Manage Expenses & Wallet** | Loads all expense items and receipts | Paginated 20 per page; filter by active event tag or date range | **~90% savings** |
| **P2 (Medium)** | **Community Notice Board** | Returns all past circulars | Top 15 active notices per page | **~85% savings** |
| **P2 (Medium)** | **Document Library** | Returns all stored documents | Filtered by type (`pdf`, `image`), 20 files per page | **~85% savings** |

---

## 4. Technical Architecture: Backend Implementation Blueprint

### A. Universal Express Pagination Helper (`shared/utils/pagination.js`)
Create a standardized parser so all controllers follow identical query parameter structures:

```javascript
// backend/src/shared/utils/pagination.js
function parsePagination(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildPaginationMeta(totalCount, page, limit) {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = { parsePagination, buildPaginationMeta };
```

### B. Standardized Service Implementation (Example: Complaints)
```javascript
// backend/src/modules/complaint/complaint.service.js
async function getComplaints(societyId, query = {}) {
  const { page, limit, skip } = parsePagination(query, 20);
  const filter = { societyId, isActive: true };

  // Status Scoping: Default to unresolved tickets if no specific filter is requested
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  } else if (!query.status) {
    filter.status = { $in: ['open', 'in_progress', 'assigned'] };
  }

  if (query.category) filter.category = query.category;
  if (query.unitId) filter.unitId = query.unitId;

  // Execute query with field projection and pagination
  const [complaints, totalCount] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title category status urgency unitId createdAt assignedTo imageUrl') // Only necessary fields
      .populate('unitId', 'label unitNumber')
      .populate('assignedTo', 'name phone')
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  return {
    items: complaints,
    pagination: buildPaginationMeta(totalCount, page, limit),
  };
}
```

### C. Gzip HTTP Compression Middleware (`backend/src/app.js`)
Compress all outgoing text responses transparently:
```bash
npm install compression
```
```javascript
// backend/src/app.js
const compression = require('compression');

// Compress all HTTP response bodies (reduces JSON payload by 70–80%)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1 KB
}));
```

---

## 5. Technical Architecture: Client-Side Implementation Blueprint

### A. React Native Mobile App (`useInfiniteQuery` + `FlatList`)

Using TanStack React Query's `useInfiniteQuery` and React Native's native `onEndReached` trigger:

```javascript
// src/screens/complaints/ComplaintsScreen.js
import { useInfiniteQuery } from '@tanstack/react-query';
import { getComplaints } from '../../lib/complaints';

export default function ComplaintsScreen() {
  const [activeStatus, setActiveStatus] = useState('open'); // 'open' | 'resolved' | 'all'

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['complaints', activeStatus],
    queryFn: ({ pageParam = 1 }) =>
      getComplaints({ page: pageParam, limit: 20, status: activeStatus }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    staleTime: 1000 * 60 * 3, // 3 Minutes: Navigating between tabs uses zero network bandwidth
    cacheTime: 1000 * 60 * 10,
  });

  // Flatten paginated pages into a single continuous list
  const complaintsList = data?.pages.flatMap((page) => page.items) || [];

  return (
    <FlatList
      data={complaintsList}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => <ComplaintCard complaint={item} />}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage(); // Lazy load next 20 items seamlessly
        }
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator size="small" color="#006948" /> : null
      }
    />
  );
}
```

### B. React Web Frontend (Table Pagination & Infinite Scrolling)

On the website, users typically prefer both classic page controls (Previous/Next/Jump) and instant cached filtering:

```javascript
// frontend/src/features/complaints/ComplaintsPage.js
import { useQuery } from '@tanstack/react-query';

export default function ComplaintsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('open');

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', page, statusFilter],
    queryFn: () => fetchComplaints({ page, limit: 20, status: statusFilter }),
    staleTime: 1000 * 60 * 3, // 3-minute caching
    keepPreviousData: true,   // Seamless UI transition between pages
  });

  const complaints = data?.items || [];
  const meta = data?.pagination || {};

  return (
    <div>
      {/* Table displaying complaints */}
      <ComplaintsTable items={complaints} />

      {/* Standard Pagination Controls */}
      <PaginationControl
        currentPage={meta.page}
        totalPages={meta.totalPages}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
}
```

---

## 6. Implementation Checklist & Tomorrow's Execution Plan

### Step 1: Backend Scaffolding
- [ ] Install `compression` in `backend/package.json` and enable in `app.js`.
- [ ] Create `backend/src/shared/utils/pagination.js`.
- [ ] Update `complaint.service.js` and `complaint.controller.js` to support `{ page, limit, status }`.
- [ ] Update `visitor.service.js` to paginate visitors and gate parcels.

### Step 2: Mobile App Integration (`ResidentOne - APP`)
- [ ] Update `src/lib/complaints.js` and `src/lib/visitors.js` API functions to accept query params.
- [ ] Implement `useInfiniteQuery` in `ComplaintsScreen.js`.
- [ ] Implement `useInfiniteQuery` in `VisitorsScreen.js` (Visitors tab & Parcels tab).
- [ ] Verify seamless scroll loading (`onEndReached`) and 3-minute cache persistence.

### Step 3: Web Frontend Integration (`ResidentOne`)
- [ ] Update `features/complaints/ComplaintsPage.js` with paginated API calls and UI page controls.
- [ ] Update `features/visitors/VisitorsPage.js` with paginated API calls.
- [ ] Verify React Query `keepPreviousData: true` for flicker-free transitions.

### Step 4: Verification & Benchmarking
- [ ] Inspect Chrome Network Tab and Flipper / Expo CLI network inspector:
  - Verify payload size drops from ~500 KB to ~4–8 KB.
  - Verify switching tabs triggers 0 network calls when cached within `staleTime`.
  - Verify scrolling to the bottom fetches Page 2 smoothly.

---

## 7. Expected Results & Metrics

| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :--- | :--- | :--- |
| **Initial Screen Payload** | ~500 KB – 2.0 MB | **~4 KB – 8 KB** | **~98% reduction** |
| **Repeated Tab Visits** | Re-downloads full list every time | **0 KB (Instant cache load)** | **100% reduction** |
| **Server Bandwidth per 1,000 active visits** | ~1.5 GB | **~25 MB** | **98.3% bandwidth saved** |
| **Screen Render Speed (TTI)** | ~800ms – 1,500ms | **< 150ms** | **5x–10x faster** |
| **Database Document Scan per hit** | 1,000+ documents | **20 documents** | **98% less CPU usage** |

---
*Created on: 2026-10-13 | ResidentOne Architecture Documentation*
