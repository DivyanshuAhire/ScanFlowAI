# SCANFLOW — MASTER BUILD PROMPT
### Smart Intelligent Appointment Booking System
> Version 1.0 | Tech Stack: Next.js 15 · MongoDB · Leaflet · OSRM · JWT

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema (Mongoose)](#5-database-schema-mongoose)
6. [Authentication & Roles](#6-authentication--roles)
7. [Geographic & Cluster System](#7-geographic--cluster-system)
8. [Slot Suggestion Engine](#8-slot-suggestion-engine)
9. [End-of-Day Auto-Assignment Engine](#9-end-of-day-auto-assignment-engine)
10. [API Routes](#10-api-routes)
11. [Frontend Pages & Layouts](#11-frontend-pages--layouts)
12. [Map System Spec](#12-map-system-spec)
13. [UI Component Spec](#13-ui-component-spec)
14. [Suggested Engine Improvements](#14-suggested-engine-improvements)
15. [Build Order](#15-build-order-step-by-step)
16. [Agent Rules & Constraints](#16-agent-rules--constraints)

---

## 1. PROJECT OVERVIEW

**ScanFlow** is a full-stack intelligent appointment booking system for a company that dispatches field technicians to dental clinics for scan services (e.g., DentalScan, OrthoScan).

### Problem Being Solved
Currently the company manually:
- Books slots via Google Calendar
- At end of day, groups clinics area-wise
- Manually assigns technicians per route

### What ScanFlow Delivers
- **Smart Slot Suggestions** — The system predicts and highlights the best available time slot for each booking in real time, based on geography, existing bookings, technician locations, and travel time
- **Book-First, Assign-Later Model** — Bookings are made throughout the day; real employee assignment happens at end of day with one button press
- **Auto Route & Cluster Generation** — Clinics are auto-grouped into geographic clusters and routes using OpenStreetMap + OSRM road distances
- **Directional Route Enforcement** — Employees travel in one direction only (no backtracking)
- **Four Role System** — Admin, CompanyOperator, ClinicOperator, Employee

---

## 2. TECH STACK

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| UI Components | Base UI (Radix-based headless) |
| Maps | Leaflet.js + React-Leaflet |
| Routing Engine | OSRM (demo API or self-hosted) OR GraphHopper self-hosted |
| Notifications | Sonner (toast notifications) |
| State | React Context + useReducer (or Zustand if complexity warrants) |
| Data Fetching | Native fetch with SWR or React Query |
| Forms | React Hook Form + Zod |
| Date Utilities | date-fns |

### Backend
| Layer | Technology |
|---|---|
| API | Next.js 15 Route Handlers (`app/api/...`) |
| Language | TypeScript |
| Database | MongoDB (Atlas or self-hosted) |
| ODM | Mongoose 8+ |
| Auth | JWT (access token 15min + refresh token 7 days, httpOnly cookies) |
| Password Hashing | bcryptjs (cost factor 12) |
| Validation | Zod (shared with frontend) |
| Caching | In-memory Map cache for OSRM calls (upgrade to Redis if needed) |

### Maps & Routing
| Layer | Technology |
|---|---|
| Tile Provider | OpenStreetMap (tile.openstreetmap.org) |
| Map Renderer | Leaflet.js |
| Road Distance/Geometry | OSRM demo: `http://router.project-osrm.org` OR GraphHopper self-hosted |
| Travel Time Formula | 3 min/km (internal fixed formula — do NOT use OSRM duration) |

### Deployment
| Layer | Technology |
|---|---|
| Hosting | Vercel |
| DB | MongoDB Atlas |
| Maps | OSRM public demo API or GraphHopper Cloud |

---

## 3. PROJECT STRUCTURE

```
scanflow/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── map/page.tsx
│   │   ├── clinics/page.tsx
│   │   ├── operators/page.tsx
│   │   └── settings/page.tsx
│   ├── operator/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── book/page.tsx
│   │   ├── appointments/page.tsx
│   │   ├── assign/page.tsx
│   │   ├── clinics/page.tsx
│   │   ├── employees/page.tsx
│   │   ├── scantypes/page.tsx
│   │   └── settings/page.tsx
│   ├── clinic/
│   │   ├── layout.tsx
│   │   └── book/page.tsx
│   ├── employee/
│   │   ├── layout.tsx
│   │   └── route/page.tsx
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── refresh/route.ts
│       │   └── logout/route.ts
│       ├── admin/
│       │   ├── operators/route.ts
│       │   ├── hq/route.ts
│       │   ├── regenerate-routes/route.ts
│       │   └── clinic-login/[clinicId]/route.ts
│       ├── clinics/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── clusters/route.ts
│       ├── routes/route.ts
│       ├── appointments/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── slots/
│       │   └── suggest/route.ts
│       ├── assignments/
│       │   ├── preview/route.ts
│       │   ├── confirm/route.ts
│       │   └── employee/[employeeId]/route.ts
│       ├── employees/route.ts
│       └── scantypes/route.ts
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopNav.tsx
│   │   └── BottomNav.tsx
│   ├── map/
│   │   ├── ScanFlowMap.tsx
│   │   ├── RoutePolyline.tsx
│   │   ├── ClusterMarker.tsx
│   │   ├── ClinicPin.tsx
│   │   ├── HQMarker.tsx
│   │   └── DropPinControl.tsx
│   ├── booking/
│   │   ├── SlotGrid.tsx
│   │   ├── SlotCard.tsx
│   │   ├── ClinicSelector.tsx
│   │   └── BookingWizard.tsx
│   ├── assignment/
│   │   ├── GanttTimeline.tsx
│   │   ├── AssignmentCard.tsx
│   │   └── RouteSheet.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── LoadingSkeleton.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── db/
│   │   ├── mongoose.ts         # connection singleton
│   │   └── models/
│   │       ├── User.ts
│   │       ├── Clinic.ts
│   │       ├── Cluster.ts
│   │       ├── Route.ts
│   │       ├── CompanyHQ.ts
│   │       ├── Employee.ts
│   │       ├── Appointment.ts
│   │       ├── ScanType.ts
│   │       └── Assignment.ts
│   ├── auth/
│   │   ├── jwt.ts
│   │   ├── middleware.ts
│   │   └── roleGuard.ts
│   ├── engines/
│   │   ├── slotSuggestor.ts    # core suggestion logic
│   │   ├── assignmentEngine.ts # end-of-day assignment logic
│   │   └── clusterEngine.ts   # auto cluster/route generation
│   ├── osrm/
│   │   ├── client.ts           # OSRM API wrapper
│   │   └── cache.ts            # in-memory distance cache
│   ├── constants.ts
│   └── utils.ts
├── hooks/
│   ├── useSlotSuggestions.ts
│   ├── useMapData.ts
│   └── useAssignment.ts
├── types/
│   └── index.ts                # all shared TypeScript types
├── middleware.ts                # Next.js route protection
├── tailwind.config.ts
└── .env.local
```

---

## 4. ENVIRONMENT VARIABLES

```env
# .env.local

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/scanflow

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Admin Seed Credentials (seeded on first run)
ADMIN_EMAIL=admin@scanflow.com
ADMIN_PASSWORD=admin123scanflow

# Routing Engine (choose one)
OSRM_BASE_URL=http://router.project-osrm.org
# GRAPHHOPPER_BASE_URL=http://localhost:8989
# GRAPHHOPPER_API_KEY=your_key_if_cloud

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=development
```

---

## 5. DATABASE SCHEMA (MONGOOSE)

### 5.1 User Model
```typescript
// lib/db/models/User.ts
const UserSchema = new Schema({
  email:        { type: String, unique: true, sparse: true },
  phone:        { type: String, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['ADMIN', 'COMPANY_OPERATOR', 'CLINIC_OPERATOR', 'EMPLOYEE'],
    required: true
  },
  isActive:    { type: Boolean, default: true },
  name:        { type: String },
  clinicId:    { type: Schema.Types.ObjectId, ref: 'Clinic' },   // if CLINIC_OPERATOR
  employeeId:  { type: Schema.Types.ObjectId, ref: 'Employee' }, // if EMPLOYEE
}, { timestamps: true });
```

### 5.2 CompanyHQ Model
```typescript
// Singleton — only one document ever
const CompanyHQSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { timestamps: true });
```

### 5.3 Cluster Model
```typescript
const ClusterSchema = new Schema({
  name:           { type: String, required: true },
  centroidLat:    { type: Number, required: true },
  centroidLng:    { type: Number, required: true },
  radiusKm:       { type: Number, default: 5 },
  parentCluster:  { type: Schema.Types.ObjectId, ref: 'Cluster', default: null },
  routeIds:       [{ type: Schema.Types.ObjectId, ref: 'Route' }], // can belong to multiple if shared hub
  isSharedHub:    { type: Boolean, default: false },
  distanceFromHqKm: { type: Number }, // road distance, pre-computed
  routeOrderIndex:  { type: Number }, // position in route (1 = closest to HQ)
}, { timestamps: true });
```

### 5.4 Route Model
```typescript
const RouteSchema = new Schema({
  name:           { type: String, required: true },
  color:          { type: String, required: true }, // hex e.g. "#E63946"
  pathGeoJSON:    { type: Schema.Types.Mixed },     // GeoJSON LineString from HQ to furthest cluster
  totalDistanceKm:{ type: Number },
  clusterIds:     [{ type: Schema.Types.ObjectId, ref: 'Cluster' }], // ordered by routeOrderIndex
}, { timestamps: true });
```

### 5.5 Clinic Model
```typescript
const ClinicSchema = new Schema({
  name:         { type: String, required: true },
  phone:        { type: String, required: true },
  lat:          { type: Number, required: true },
  lng:          { type: Number, required: true },
  clusterId:    { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
  loginEnabled: { type: Boolean, default: false },
  address:      { type: String },
}, { timestamps: true });
```

### 5.6 Employee Model
```typescript
const EmployeeSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  phone:   { type: String, required: true },
  isActive:{ type: Boolean, default: true },
}, { timestamps: true });
```

### 5.7 ScanType Model
```typescript
const ScanTypeSchema = new Schema({
  name:         { type: String, required: true, unique: true },
  durationMins: { type: Number, required: true, default: 35 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });
```

### 5.8 Appointment Model
```typescript
const AppointmentSchema = new Schema({
  clinicId:               { type: Schema.Types.ObjectId, ref: 'Clinic', required: true },
  date:                   { type: String, required: true }, // "YYYY-MM-DD"
  slotTime:               { type: String, required: true }, // "HH:MM" 24hr
  durationMins:           { type: Number, required: true },
  scanTypeId:             { type: Schema.Types.ObjectId, ref: 'ScanType', required: true },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'ASSIGNED', 'COMPLETED', 'CANCELLED'],
    default: 'CONFIRMED'
  },
  suggestedByEmployeeId:  { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  assignedEmployeeId:     { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  notes:                  { type: String },
}, { timestamps: true });

// Compound index to prevent double-booking same clinic at same slot
AppointmentSchema.index({ clinicId: 1, date: 1, slotTime: 1 }, { unique: true });
```

### 5.9 Assignment Model
```typescript
const AssignmentSchema = new Schema({
  employeeId:   { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date:         { type: String, required: true }, // "YYYY-MM-DD"
  routeId:      { type: Schema.Types.ObjectId, ref: 'Route' },
  appointmentIds: [{ type: Schema.Types.ObjectId, ref: 'Appointment' }], // ordered
  isConfirmed:  { type: Boolean, default: false },
  idleGapWarning: { type: Boolean, default: false }, // flagged if gap > 3hrs
}, { timestamps: true });
```

---

## 6. AUTHENTICATION & ROLES

### Role Hierarchy & Permissions

| Permission | ADMIN | COMPANY_OP | CLINIC_OP | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|
| Create CompanyOperator accounts | ✅ | ❌ | ❌ | ❌ |
| Create ClinicOperator accounts | ✅ | ❌ | ❌ | ❌ |
| Add/edit Clinics | ✅ | ✅ | ❌ | ❌ |
| Add Employees | ❌ | ✅ | ❌ | ❌ |
| Book appointment (any clinic) | ❌ | ✅ | ❌ | ❌ |
| Book appointment (own clinic) | ❌ | ❌ | ✅ | ❌ |
| View slot suggestions | ❌ | ✅ | ✅ | ❌ |
| Trigger end-of-day assignment | ❌ | ✅ | ❌ | ❌ |
| View/manage routes & map | ✅ | ✅ | ❌ | ❌ |
| Set Company HQ | ✅ | ❌ | ❌ | ❌ |
| View today's route | ❌ | ❌ | ❌ | ✅ |
| Manage scan types | ❌ | ✅ | ❌ | ❌ |

### Hardcoded Admin Credentials
```
Email:    admin@scanflow.com
Password: admin123scanflow
```
Seed this into MongoDB on first run if no ADMIN user exists.

### JWT Flow
```
1. POST /api/auth/login → returns accessToken (15min) + sets refreshToken cookie (httpOnly, 7d)
2. All protected routes → validate Authorization: Bearer <accessToken>
3. POST /api/auth/refresh → uses refreshToken cookie → returns new accessToken
4. POST /api/auth/logout → clears refreshToken cookie
```

### Next.js Middleware (`middleware.ts`)
```typescript
// Protect all non-auth routes
// Redirect to /login if no valid JWT
// Redirect to correct dashboard based on role after login:
// ADMIN            → /admin/dashboard
// COMPANY_OPERATOR → /operator/dashboard
// CLINIC_OPERATOR  → /clinic/book
// EMPLOYEE         → /employee/route
```

---

## 7. GEOGRAPHIC & CLUSTER SYSTEM

### 7.1 Company HQ Setup
- Admin opens `/admin/map` and clicks "Set HQ" button
- Clicks anywhere on the Leaflet map to drop a pin
- Coordinates saved to `CompanyHQ` collection (upsert — always one doc)
- All distance calculations originate from this point

### 7.2 Adding a Clinic — Auto-Cluster & Route Generation

When a clinic is added (name, phone, lat, lng via map pin drop):

#### Step A — Road Distance from HQ
```
GET {OSRM_BASE_URL}/route/v1/driving/{hq_lng},{hq_lat};{clinic_lng},{clinic_lat}
    ?overview=full&geometries=geojson

Extract:
  distanceMeters = routes[0].distance
  distanceKm     = distanceMeters / 1000
  pathGeoJSON    = routes[0].geometry  (LineString)
```

#### Step B — Cluster Assignment
```
1. Load all existing Clusters from DB
2. For each cluster, calculate road distance: clusterCentroid → newClinic
   (use OSRM, cache result)
3. Filter clusters where roadDistance ≤ 5km
4. If matching clusters found:
     → Assign clinic to nearest cluster (lowest road distance)
     → If clinic is within 2km of centroid → it is a member (not a subcluster)
     → If clinic is 2–5km from centroid → create a SubCluster entry
       (parentCluster = matched cluster._id)
5. If no cluster within 5km:
     → Create new Cluster:
         centroidLat/Lng = clinic lat/lng
         radiusKm = 5
         distanceFromHqKm = calculated above
     → Assign clinic to this new cluster
```

#### Step C — Route Assignment (Tree-Based)
```
1. Load all existing Routes from DB
2. For each route, get its pathGeoJSON (LineString from HQ)
3. Calculate path overlap between existing route path and new clinic's path:

   overlap% = (length of shared path segment / length of new clinic path) * 100
   
   "Shared" = portion of new path that runs within 50m of existing route path
   
4. If any route has overlap ≥ 90%:
     → Do NOT create new route
     → Assign new cluster to that existing route
     → If the shared hub point is a cluster node:
         → Mark that cluster as isSharedHub = true
     → Append new cluster to route.clusterIds (ordered by distanceFromHqKm)

5. If no route has overlap ≥ 90%:
     → Create new Route:
         name = "Route " + nextNumber
         color = next color from palette (see below)
         pathGeoJSON = OSRM path from HQ to new cluster centroid
         clusterIds = [newCluster._id]
     
6. Update cluster.routeIds and cluster.routeOrderIndex
```

#### Color Palette for Routes
```typescript
const ROUTE_COLORS = [
  '#E63946', // Red
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#00BCD4', // Teal
  '#FF5722', // Deep Orange
  '#607D8B', // Blue Grey
  '#8BC34A', // Light Green
  '#F06292', // Pink
];
// Assign by index: route 0 = Red, route 1 = Blue, etc.
```

#### Shared Hub Logic
```
A cluster C1 is a SHARED HUB if:
  - It belongs to 2+ routes (routeIds.length > 1)
  - Its road path from HQ is shared by multiple route paths

Rendering: Shared hub cluster markers show a dual-ring border 
using the colors of both routes.

Subcluster inheritance: Any cluster where parentCluster = C1._id
inherits C1's routeIds (it is reachable from either route).
```

### 7.3 Route Visualisation Rules
- Each route = colored polyline traced along road from HQ to furthest cluster centroid
- Every cluster centroid = filled circle marker in route color
- Clinic pins = smaller markers inside cluster circle
- Shared hub = concentric dual-color ring marker
- HQ = distinct star/flag marker

---

## 8. SLOT SUGGESTION ENGINE

### File: `lib/engines/slotSuggestor.ts`

### Available Slots
```typescript
const ALL_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00'
];
```

### Suggestion Request
```typescript
// POST /api/slots/suggest
interface SuggestRequest {
  clinicId: string;
  date: string;  // "YYYY-MM-DD"
}
```

### Suggestion Response
```typescript
interface SlotSuggestion {
  slot: string;              // "HH:MM"
  status: 'BEST' | 'AVAILABLE' | 'TAKEN';
  reason: string;            // human-readable explanation
  suggestedEmployeeId: string | null;
  suggestedEmployeeName: string | null;
  score: number;             // internal ranking score 0–100
}
```

---

### Rule 0 — Hard Block (TAKEN)
```
For the requested clinic's cluster C and all subclusters of C:
  Load all appointments on the requested date for any clinic in C or subclusters of C
  For each booked slotTime T:
    → Mark slot T as TAKEN (cannot select, visually blocked in red)
    
Reason: "Cluster [C.name] already has a booking at [T]"
```

### Rule 1 — Same Cluster Adjacency (BEST)
```
If cluster C has a booking at slot T:
  → Mark slot T+1hr as BEST (if not TAKEN)
  → Mark slot T-1hr as BEST (if not TAKEN and T-1hr ≥ 09:00)
  
Score: 90

Reason: "Adjacent to existing booking in [C.name] — keeps one technician in the area"
```

### Rule 2 — Distance ≥ 30km from HQ
```
If cluster.distanceFromHqKm >= 30:
  → Mark 10:00 as BEST
  → Mark 17:00 as BEST
  
Score: 85

Reason: "Cluster is [X]km from HQ — morning/evening slots ensure 
         directional travel"
```

### Rule 3 — Same Route Travel Time (BEST)
```
For each existing appointment A on the same Route R on the same date:

  1. Get road distance: distKm = osrm.distance(A.cluster.centroid, newClinic.cluster.centroid)
  2. travelMins = distKm * 3
  3. freeAt = A.slotTime + A.durationMins  (in minutes since 00:00)
  4. earliestArrival = freeAt + travelMins
  5. suggestFrom = earliestArrival + 10  (grace period)
  6. Round suggestFrom UP to next available slot boundary (nearest hour)
  7. Check directionality:
       - newCluster.routeOrderIndex > A.cluster.routeOrderIndex  → FORWARD ✅
       - newCluster.routeOrderIndex < A.cluster.routeOrderIndex  → BACKWARD ❌ (skip)
  8. If FORWARD and slot is not TAKEN:
       → Mark that slot as BEST
       → suggestedEmployeeId = A.suggestedByEmployeeId ?? A.assignedEmployeeId
       
Score: 95 (highest priority — most precise)

Reason: "Tech [name] at [A.cluster.name] at [A.slotTime] can reach here by [arrivalTime]"
```

### Rule 4 — Cross-Route Proximity (BEST)
```
Condition: No employees currently assigned/suggested for Route R on this date

  1. Find all appointments on OTHER routes on the same date
  2. For each, calculate road distance to newClinic's cluster
  3. If distance ≤ 5km:
       techFreeAt = appointment.slotTime + appointment.durationMins
       adjacentSlot = techFreeAt rounded to next slot boundary
       If adjacentSlot not TAKEN AND tech has no conflict at adjacentSlot:
         → Mark adjacentSlot as BEST
         → suggestedEmployeeId = that tech

Score: 75

Reason: "Tech [name] on nearby Route [R] can reach within 5km — 
         no other tech on Route [R] today"
```

### Rule 5 — Directional Flow Enforcement
```
Applied during Rules 3 & 4:

Route order index = cluster.routeOrderIndex (ascending = closer to HQ)

A suggestion is ONLY valid if:
  newCluster.routeOrderIndex > existingBookingCluster.routeOrderIndex
  (i.e., technician moves AWAY from HQ, not back toward it)

Exception: The very first booking of the day on a route has no direction constraint.
```

### Final Scoring & Output
```
For each slot in ALL_SLOTS:
  1. Apply Rule 0 → if TAKEN, stop processing this slot
  2. Apply Rules 1–5, collect all matching rules and their scores
  3. Final status:
       - Any rule gives BEST → status = BEST, use highest score rule
       - No rule matches    → status = AVAILABLE
       - Rule 0 matched     → status = TAKEN
  4. Sort BEST slots by score descending
  5. Return full array of 10 slots with status, reason, employee info
```

---

## 9. END-OF-DAY AUTO-ASSIGNMENT ENGINE

### File: `lib/engines/assignmentEngine.ts`

### Trigger
`POST /api/assignments/preview?date=YYYY-MM-DD` — compute and return preview (no DB write)  
`POST /api/assignments/confirm?date=YYYY-MM-DD` — save to DB, update appointment statuses

---

### Step 1 — Load & Group Data
```
1. Load all CONFIRMED appointments for the date
2. Populate: clinic → cluster → route
3. Group by routeId
4. Within each route group, sort appointments by slotTime ASC
5. Load all active employees
```

### Step 2 — Assign Primary Route Employee
```
For each route group:
  a. Count suggestedByEmployeeId occurrences across all appointments in group
  b. Pick the employee with the highest count as "primary" for this route
  c. If tie or all null → pick any available (least total appointments for day)
  d. Assign primaryEmployee to ALL appointments in this route group (tentative)
```

### Step 3 — Handle Cluster Density
```
For each cluster C with 3+ consecutive bookings (e.g., 09:00, 10:00, 11:00):
  a. Assign one dedicated tech (Tech1) to ALL those bookings — they stay in place
  b. Check for isolated bookings in same cluster (gap > 3hrs from last consecutive):
       Example: C has 09–11 block AND a 16:00 booking
       → Do NOT assign Tech1 to the 16:00 (5hr idle gap)
       → Find alternative tech:
           - Any tech whose last assignment of the day is at a cluster 
             BEFORE C on the route at a time ≤ 15:00
           - OR any tech on a nearby cross-route cluster (≤ 5km) who is 
             free at 16:00
       → Assign alternative tech to the isolated 16:00 booking
       
Idle gap threshold: 3 hours (configurable via constants.ts)
```

### Step 4 — Forward Direction Validation
```
For each employee's assigned appointments for the day:
  Sort by slotTime ASC
  Validate: routeOrderIndex should be non-decreasing
  If any backward jump detected:
    → Flag as WARNING
    → Attempt to swap with another available tech who maintains forward flow
    → If no swap possible → keep assignment but mark idleGapWarning = true
```

### Step 5 — Fill Unassigned Appointments
```
For any appointment still unassigned:
  1. Find employees with no conflict at that slotTime
  2. Prefer employees whose last assignment is:
       a. On the same route AND routeOrderIndex is less than this appointment
       b. OR on a nearby cross-route (≤ 5km) and free at that slot
  3. Assign best match
  4. If no match → mark as UNASSIGNED (operator sees warning)
```

### Step 6 — Build Route Sheets
```
For each employee with assignments:
  Create Assignment document:
    employeeId, date, routeId
    appointmentIds: [sorted by slotTime]
    idleGapWarning: true if any gap > 3hrs between consecutive assignments
    
  Each appointment in route sheet contains:
    { time, clinicName, address, clusterName, lat, lng }
```

### Step 7 — Preview Response
```typescript
interface AssignmentPreview {
  date: string;
  employeeSheets: {
    employee: { id: string; name: string };
    route: { id: string; name: string; color: string };
    appointments: {
      time: string;
      clinicName: string;
      clusterName: string;
      address: string;
      travelFromPrevious: string; // "~15 min (5km)"
      idleGap: string | null;     // "3h 20min idle" if applicable
    }[];
    warnings: string[];
  }[];
  unassigned: { appointmentId: string; clinicName: string; slot: string }[];
  totalWarnings: number;
}
```

### Step 8 — Confirm & Lock
```
On confirm:
  1. Save all Assignment documents to DB
  2. Update all Appointment.status → 'ASSIGNED'
  3. Update Appointment.assignedEmployeeId
  4. Lock: once confirmed, appointments cannot be cancelled without ADMIN role
  5. Push route sheet data to employee dashboards (they see it on /employee/route)
```

---

## 10. API ROUTES

### Auth
```
POST   /api/auth/login              Body: { email?, phone?, password }
POST   /api/auth/refresh            Cookie: refreshToken
POST   /api/auth/logout             Cookie: refreshToken
```

### Admin
```
POST   /api/admin/operators         Body: { name, email, password }   → Create CompanyOperator
POST   /api/admin/hq                Body: { lat, lng }                → Set/Update HQ
POST   /api/admin/regenerate-routes                                   → Re-run cluster algo
POST   /api/admin/clinic-login/:id  Body: { enable: boolean }         → Toggle + generate creds
```

### Clinics
```
GET    /api/clinics                 Query: ?routeId=&clusterId=
POST   /api/clinics                 Body: { name, phone, lat, lng }   → triggers auto-cluster
GET    /api/clinics/:id
PATCH  /api/clinics/:id             Body: partial clinic fields
DELETE /api/clinics/:id
```

### Clusters & Routes
```
GET    /api/clusters                → All clusters with route + subcluster info
GET    /api/routes                  → All routes with GeoJSON paths + cluster list
```

### Employees
```
GET    /api/employees
POST   /api/employees               Body: { name, phone, password }
PATCH  /api/employees/:id
DELETE /api/employees/:id
```

### Scan Types
```
GET    /api/scantypes
POST   /api/scantypes               Body: { name, durationMins }
PATCH  /api/scantypes/:id
DELETE /api/scantypes/:id
```

### Appointments
```
GET    /api/appointments            Query: ?date=&routeId=&clinicId=&status=
POST   /api/appointments            Body: { clinicId, date, slotTime, scanTypeId }
PATCH  /api/appointments/:id        Body: { status } or { notes }
DELETE /api/appointments/:id        (ADMIN only if ASSIGNED)
```

### Slot Suggestion
```
POST   /api/slots/suggest           Body: { clinicId, date }
                                    → Returns SlotSuggestion[]
```

### Assignments
```
POST   /api/assignments/preview     Query: ?date=  → Returns AssignmentPreview (no save)
POST   /api/assignments/confirm     Query: ?date=  → Saves + locks
GET    /api/assignments/employee/:employeeId   Query: ?date=
```

---

## 11. FRONTEND PAGES & LAYOUTS

### Global Design Tokens
```css
/* Tailwind v4 CSS variables */
--color-primary:    #1E3A5F;   /* Deep Navy */
--color-accent:     #0EA5E9;   /* Sky Blue */
--color-success:    #22C55E;   /* Green — BEST slot */
--color-danger:     #EF4444;   /* Red — TAKEN slot */
--color-warning:    #F59E0B;   /* Amber — warnings */
--color-surface:    #F8FAFC;   /* Light background */
--color-text:       #0F172A;   /* Dark text */
```

### AppShell Layout (`components/layout/AppShell.tsx`)
```
Desktop (≥768px):
  ┌─────────────────────────────────┐
  │  TopNav (logo + user badge)     │
  ├──────────┬──────────────────────┤
  │ Sidebar  │  Page Content        │
  │ (240px)  │  (scrollable)        │
  └──────────┴──────────────────────┘

Mobile (<768px):
  ┌─────────────────────┐
  │  TopNav             │
  ├─────────────────────┤
  │  Page Content       │
  │  (full width)       │
  ├─────────────────────┤
  │  BottomNav (4 icons)│
  └─────────────────────┘
```

---

### ADMIN PAGES

#### `/admin/dashboard`
- Stat cards: Total Clinics, Total Routes, Today's Bookings, Active Employees
- Quick links to Map and Clinics

#### `/admin/map`
- Full-screen Leaflet map (height: calc(100vh - navbar))
- All routes as colored polylines
- All cluster markers (circle + label)
- All clinic pins
- HQ marker (if set)
- Top-right controls:
  - "Set HQ" button → click mode to drop HQ pin
  - "Regenerate Routes" button → calls `/api/admin/regenerate-routes`
- Click on cluster → popup: cluster name, route, clinic count
- Click on clinic → popup: clinic name, phone, cluster

#### `/admin/clinics`
- Table: Name | Phone | Cluster | Route | Login Status | Actions
- Actions: Enable Login (toggle), Generate Credentials (modal shows email+password once), View on Map
- Add Clinic button → opens full add-clinic flow with map pin drop

#### `/admin/operators`
- Table of CompanyOperators
- "Add Operator" → modal: name, email → auto-generates password shown once

---

### COMPANY OPERATOR PAGES

#### `/operator/book` — Main Booking Flow
```
Step 1: Select Clinic
  - Searchable dropdown
  - Shows: Clinic Name (Cluster: C1 | Route: R1 | Distance: 12km)

Step 2: Select Date
  - Date picker (default: tomorrow)
  - Cannot select past dates

Step 3: Slot Grid (see UI spec below)
  - 10 slots rendered with BEST/AVAILABLE/TAKEN status
  - BEST slots show employee name badge

Step 4: Select Scan Type
  - Radio buttons with duration shown

Step 5: Review & Confirm
  - Summary card: Clinic, Date, Slot, Scan Type
  - "Book Appointment" button
  - Sonner toast on success/error
```

#### `/operator/appointments`
- Table with filters: Date range, Route, Clinic, Status
- Columns: Date | Time | Clinic | Cluster | Route | Scan Type | Status | Assigned To
- Cancel button (CONFIRMED status only)

#### `/operator/assign`
- Date selector
- "Run Assignment Engine" button → calls preview API → shows:
  - Per-employee Gantt timeline (see UI spec)
  - Warnings section (idle gaps, unassigned)
  - Manual override: drag-and-drop reassign (optional enhancement)
- "Confirm & Assign" button → finalises

#### `/operator/employees`
- Table: Name | Phone | Status | Today's Assignments
- "Add Employee" → modal: name, phone, password

---

### CLINIC OPERATOR PAGE

#### `/clinic/book`
- Clinic name shown at top (read-only, derived from their account)
- Same booking flow as operator but:
  - Clinic pre-filled (cannot change)
  - Only shows slots for their clinic's date
  - Sonner notification on success

---

### EMPLOYEE PAGE

#### `/employee/route`
- Header: "Today's Route — [Date]"
- If no assignments: EmptyState component ("No assignments for today")
- Mini Leaflet map at top (200px height) showing their route polyline + stop markers
- Ordered list of assignment cards:

```
┌──────────────────────────────────┐
│  09:00  •  Clinic Name           │
│  Cluster: C3  |  Route: R1       │
│  📍 Address line here            │
│  🚗 ~15 min from previous stop   │
│  ○ On the Way  ○ Arrived  ○ Done │
└──────────────────────────────────┘
```

---

## 12. MAP SYSTEM SPEC

### Leaflet Map Component (`components/map/ScanFlowMap.tsx`)

```typescript
// Default center: HQ coordinates or India center (20.5937, 78.9629) if HQ not set
// Default zoom: 12 (city level)
// Tile layer: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

Props:
  showRoutes: boolean     → render route polylines
  showClusters: boolean   → render cluster circles + markers
  showClinics: boolean    → render clinic pins
  showHQ: boolean         → render HQ marker
  interactive: boolean    → enable click-to-drop (for add clinic / set HQ)
  onMapClick?: (lat, lng) → callback when user clicks map
  highlightClusterId?     → highlight specific cluster
```

### OSRM Client (`lib/osrm/client.ts`)

```typescript
interface OSRMResult {
  distanceKm: number;
  pathGeoJSON: GeoJSON.LineString;
}

async function getRoadRoute(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number }
): Promise<OSRMResult>

// Endpoint:
// GET {OSRM_BASE_URL}/route/v1/driving/{from.lng},{from.lat};{to.lng},{to.lat}
//     ?overview=full&geometries=geojson

// Cache key: `osrm:${from.lat}:${from.lng}:${to.lat}:${to.lng}`
// Cache TTL: 24 hours (in-memory Map, clear on server restart)
// On Vercel: use MongoDB to persist OSRM cache across function invocations
```

---

## 13. UI COMPONENT SPEC

### SlotGrid (`components/booking/SlotGrid.tsx`)

```
Mobile: 2-column grid
Desktop: 5-column grid

SlotCard states:
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│    ✓  09:00      │   │       10:00      │   │    ✗  11:00      │
│  BEST            │   │   Available      │   │    Taken         │
│  Tech: Ravi K.   │   │                  │   │  Cluster booked  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
  bg-green-100           bg-white              bg-red-100
  border-green-500       border-gray-200       border-red-300
  text-green-800         text-gray-700         text-red-700
  cursor-pointer         cursor-pointer        cursor-not-allowed
  
Hover on BEST: tooltip showing reason string
```

### Gantt Timeline (`components/assignment/GanttTimeline.tsx`)

```
One row per employee, x-axis = time 09:00–18:00

Row example:
Ravi K. |██C1 9am██|──travel──|██C3 11am██|    idle 3hr    |██C7 15am██|

Colors:
  - Appointment block: route color
  - Travel bar: lighter shade, shows "~25min"
  - Idle gap > 3hr: amber warning stripe with ⚠ icon
  - Unassigned slot: gray dashed outline
```

### Sonner Notifications
```typescript
// Use these toast calls:
toast.success("Appointment booked for 10:00 at Smile Dental");
toast.error("Slot 09:00 is already taken for this cluster");
toast.warning("Tech Ravi has a 4hr idle gap — consider reassigning");
toast.info("Routes regenerated successfully — 3 clusters updated");
```

---

## 14. SUGGESTED ENGINE IMPROVEMENTS

| # | Enhancement | Benefit |
|---|---|---|
| 1 | **Actual scan duration in travel calc** | Use `scanType.durationMins` (35min) for precise `freeAt`, not 60min blocks |
| 2 | **Direction Score field** | Store `directionScore: 0-100` per suggestion — penalise backward assignments |
| 3 | **Tech Load Balancing** | When multiple techs equally valid, prefer the one with fewer total daily assignments |
| 4 | **High Density Cluster Flag** | 4+ bookings in one cluster → flag as `highDensity`, dedicate one tech, lock out from other routes |
| 5 | **Idle Gap Config** | Store `idleGapThresholdHrs` in a settings document (default: 3), editable by CompanyOperator |
| 6 | **Morning/Afternoon Zone Split** | Clusters ≥ 30km → force 10:00 (outbound) or 17:00 (return), never mid-day |
| 7 | **Slot Lock After Confirm** | Post-confirmation: appointments locked, cancel requires ADMIN role with reason |
| 8 | **OSRM Cache in MongoDB** | Persist road distance cache across Vercel function restarts — store in `osrm_cache` collection |
| 9 | **Cross-Route Boundary Expansion** | Make 5km cross-route threshold configurable in settings |
| 10 | **Employee "Preferred Route"** | Allow assigning a preferred route to each employee — used as tiebreaker in Step 5 of assignment |

---

## 15. BUILD ORDER (Step-by-Step)

Build in this exact sequence to avoid dependency issues:

```
Phase 1 — Foundation
  □ 1.1  Next.js 15 project init (App Router, TypeScript, Tailwind v4)
  □ 1.2  MongoDB Atlas setup + Mongoose connection singleton
  □ 1.3  All Mongoose models (User, Clinic, Cluster, Route, CompanyHQ,
          Employee, Appointment, ScanType, Assignment)
  □ 1.4  Environment variables setup
  □ 1.5  Seed script: create ADMIN user if not exists

Phase 2 — Auth System
  □ 2.1  POST /api/auth/login — JWT generation
  □ 2.2  POST /api/auth/refresh + POST /api/auth/logout
  □ 2.3  Auth middleware (JWT validation + role extraction)
  □ 2.4  Next.js middleware.ts for route protection
  □ 2.5  Login page UI (mobile-first, Base UI components)
  □ 2.6  Role-based redirect after login

Phase 3 — OSRM Integration
  □ 3.1  OSRM client wrapper (getRoadRoute function)
  □ 3.2  In-memory cache + MongoDB cache fallback
  □ 3.3  Test: HQ → clinic distance calculation

Phase 4 — Geographic Engine
  □ 4.1  POST /api/admin/hq — set HQ
  □ 4.2  Clustering algorithm (clusterEngine.ts)
  □ 4.3  Route assignment algorithm (overlap calculation)
  □ 4.4  POST /api/clinics — add clinic triggers auto-cluster + route
  □ 4.5  POST /api/admin/regenerate-routes
  □ 4.6  GET /api/clusters + GET /api/routes

Phase 5 — Slot Suggestion Engine
  □ 5.1  slotSuggestor.ts — all 5 rules
  □ 5.2  POST /api/slots/suggest
  □ 5.3  Unit test each rule with mock data

Phase 6 — Appointment Booking
  □ 6.1  GET/POST/PATCH/DELETE /api/appointments
  □ 6.2  Compound index validation (no double booking)

Phase 7 — Assignment Engine
  □ 7.1  assignmentEngine.ts — all 8 steps
  □ 7.2  POST /api/assignments/preview
  □ 7.3  POST /api/assignments/confirm
  □ 7.4  GET /api/assignments/employee/:id

Phase 8 — Admin Frontend
  □ 8.1  AppShell layout (sidebar + topnav + bottomnav mobile)
  □ 8.2  Admin dashboard page
  □ 8.3  Admin map page (full Leaflet map, HQ setter, route viewer)
  □ 8.4  Admin clinics page (table + enable login + add clinic with map pin)
  □ 8.5  Admin operators page

Phase 9 — Company Operator Frontend
  □ 9.1  Operator dashboard
  □ 9.2  BookingWizard + SlotGrid component (BEST/AVAILABLE/TAKEN)
  □ 9.3  Appointments table with filters
  □ 9.4  Assign page with Gantt timeline + confirm button
  □ 9.5  Employees management page
  □ 9.6  Scan types page

Phase 10 — Clinic Operator & Employee Frontend
  □ 10.1 Clinic operator booking page (single page)
  □ 10.2 Employee today's route page (mini map + ordered cards)

Phase 11 — Polish
  □ 11.1 Sonner notifications throughout all flows
  □ 11.2 Loading skeletons for all data-fetching states
  □ 11.3 Empty states (EmptyState component)
  □ 11.4 Error boundaries
  □ 11.5 Mobile responsiveness pass (test at 375px)
  □ 11.6 Vercel deployment + MongoDB Atlas production config
```

---

## 16. AGENT RULES & CONSTRAINTS

```
MAPS
  ✅ Use Leaflet.js + OpenStreetMap tiles only
  ✅ Use OSRM or GraphHopper for road routing
  ❌ Never use Google Maps API
  ❌ Never use Mapbox (unless user explicitly requests)

TIME
  ✅ All internal time operations in 24hr format (HH:MM)
  ✅ Use date-fns for all date manipulation
  ✅ Travel time = distanceKm * 3 (fixed formula, do NOT use OSRM duration)
  ✅ All dates stored as "YYYY-MM-DD" strings in MongoDB

SLOT ENGINE
  ✅ Suggestion is stateless — compute fresh per API call
  ✅ Cache only OSRM road distance results
  ✅ suggestedByEmployeeId is a PREDICTION, not an assignment
  ✅ Real assignment only happens on /api/assignments/confirm

SECURITY
  ✅ All passwords hashed with bcryptjs cost factor 12
  ✅ JWT in httpOnly cookies for refresh, Bearer header for access
  ✅ All API routes validate role via middleware before processing
  ✅ Clinic operators can only book for their own clinicId
  ✅ Employees can only view their own assignments

DESIGN
  ✅ Mobile-first (375px base), enhance for desktop
  ✅ Use Base UI headless components + Tailwind v4 for all UI
  ✅ Sonner for all toast notifications
  ✅ Color system: Navy primary, Sky Blue accent, Green BEST, Red TAKEN

DATABASE
  ✅ Admin credentials seeded on startup if ADMIN user not found
  ✅ Use Mongoose transactions where multiple documents are updated together
  ✅ Index: appointments on { clinicId, date, slotTime } — unique
  ✅ Index: appointments on { date, status } — for daily queries

DEPLOYMENT
  ✅ Designed to deploy on Vercel (no long-running processes)
  ✅ OSRM cache stored in MongoDB (not in-memory only) for Vercel compatibility
  ✅ All secrets via Vercel Environment Variables
```

---

*End of ScanFlow Master Prompt — v1.0*
