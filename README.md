# Proxi: Intelligent GPS-Based Attendance System

<div align="center">
  <h3>Next-Generation Classroom Geofence & Roll Call Platform for Universities</h3>
  <p>Replacing fragile Bluetooth hardware and exploitable QR codes with server-verified browser GPS geofencing.</p>
</div>

---

## Overview

**Proxi** is a responsive web application engineered for universities and academic institutions to verify physical student presence during lectures without requiring specialized hardware, beacons, or mobile app store installations.

Operating directly within standard desktop, tablet, and mobile web browsers via the HTML5 Geolocation API, Proxi calculates the student's exact Great-Circle distance against pre-configured classroom venues using the **Haversine formula**. Check-ins are processed atomically through PostgreSQL functions and enforced with Row-Level Security (RLS) in Supabase.

---

## Key Features

- **Browser-Native Geofencing:** Students grant browser GPS permission (`navigator.geolocation`) — no external apps or hardware dongles required.
- **Server-Side Distance Verification:** Client-side coordinates are evaluated on the server using high-precision Haversine calculations against classroom anchor points.
- **Location Accuracy Policy:** Rejects coarse, cell-tower-triangulated, or suspicious location readings (e.g., accuracy $> 50\text{m}$).
- **Role-Based Portals:**
  - **Lecturer Command Center:** Launch sessions, customize geofence radius (10m–200m), inspect real-time student check-in radars, close roll call with custom confirmation modals, and export official CSV rosters.
  - **Student Check-In Portal:** Discover active lecture sessions, receive real-time distance and GPS accuracy feedback, verify presence with one click, and view historical records.
- **Atomic Concurrency & Duplicate Prevention:** Database-level unique constraints and RPC transaction boundaries guarantee that no student can check in more than once per lecture session.
- **Automatic Course Enrollment:** Seamless enrollment checks ensure students can immediately attend and record attendance for their registered courses.
---

## Technology Stack

| Domain | Technologies |
|---|---|
| **Frontend Framework** | [Next.js 15](https://nextjs.org/) (App Router, Server & Client Components), [React 19](https://react.dev/) |
| **Language & Typing** | [TypeScript 5.8](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling & Design** | [Tailwind CSS 3](https://tailwindcss.com/), Google Fonts **Sora**, [Lucide React](https://lucide.dev/) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Geospatial RPC) |
| **Authentication** | Supabase Auth + JWT cookie sessions with institutional role routing |
| **Testing** | [Vitest 3](https://vitest.dev/), React Testing Library, JSDOM |
| **Deployment** | Vercel (Edge & Serverless Node.js Runtime) + Supabase Cloud |

---

## User Roles

### 1. Student Portal (`/student`)
- Authenticate with institutional credentials or matriculation number.
- Discover active roll calls within enrolled courses.
- Submit high-precision GPS coordinates for real-time validation.
- Review instantaneous feedback: distance from lecturer/hall center and GPS error margin.
- Audit full personal attendance log and percentage at `/student/history`.

### 2. Lecturer Portal (`/lecturer`)
- View departmental courses and campus classrooms.
- **Start Session Modal:** Custom modal dialog allowing one-click selection of:
  - Course code and name
  - Classroom venue and GPS anchor coordinates
  - Allowed geofence radius (quick presets: 30m, 50m, 80m, 120m, or slider up to 200m)
  - Active duration (30m, 45m, 60m, 90m, 120m) with live estimated closing time.
- **Live Geofence Radar:** Real-time polling showing attendee count, student matric numbers, exact check-in timestamps, and distance from classroom center.
- **Session Lifecycle:** Close sessions on demand via custom confirmation modal; locked sessions immediately prevent subsequent check-ins.
- **Official Export:** Download formatted `.csv` sheets ready for departmental records and university grading portals.

---

## Repository Structure

```text
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── attendance/
│   │   │   │   ├── check-in/         # Atomic GPS verification & enrollment check
│   │   │   │   ├── records/          # Attendance records query
│   │   │   │   └── sessions/         # Session management (GET, POST, [id]/end)
│   │   │   ├── auth/                 # Sign in & registration routes
│   │   │   ├── classrooms/           # Classroom coordinate management
│   │   │   └── courses/              # Course creation & listing
│   │   ├── lecturer/                 # Faculty portal & live monitor
│   │   ├── student/                  # Student GPS check-in & history
│   │   ├── login/                    # Unified authentication portal
│   │   ├── layout.tsx                # Root layout (Sora font & AuthProvider)
│   │   ├── globals.css               # Design tokens & theme directives
│   │   └── not-found.tsx             # Branded 404 handler
│   ├── components/
│   │   ├── lecturer/                 # CreateSessionModal, SessionMonitor
│   │   ├── student/                  # CheckInCard, HistoryTable
│   │   ├── ui/                       # Modal, ConfirmModal, Button, Card, Badge, Input, Alert
│   │   └── navigation.tsx            # Role-aware responsive navigation bar
│   ├── lib/
│   │   ├── auth/                     # AuthContext, role resolution, cookie management
│   │   ├── db/                       # In-memory store fallback & test seed data
│   │   ├── geo/                      # Haversine distance algorithm & accuracy validation
│   │   ├── supabase/                 # Server & browser Supabase clients
│   │   └── utils.ts                  # CSV generator & styling helpers
│   ├── types/
│   │   └── database.ts               # Complete TypeScript database schema definitions
│   └── middleware.ts                 # Role-based route protection & session guards
├── supabase/
│   ├── migrations/
│   │   └── 20261027000000_init_proxi_schema.sql  # Schema, RLS policies, & RPC
│   └── seed.sql                      # Initial campus seed fixtures
└── tests/
    ├── attendance.test.ts            # Verification rules & concurrency tests
    ├── geo.test.ts                   # Haversine distance calculation tests
    ├── middleware.test.ts            # Route protection & cookie verification tests
    ├── roles.test.ts                 # Role authorization & matric number tests
    └── components.test.tsx           # React UI component tests
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v24.x` LTS
- **Package Manager**: `pnpm` (recommended) or `npm`
- **Supabase Account**: A free Supabase project for PostgreSQL & Authentication

---

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Isaacayomi/Proxi.git
cd Proxi
```

#### 2. Install Dependencies
```bash
pnpm install
# or
npm install
```

#### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase project credentials in `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> [!NOTE]
> The `SUPABASE_SERVICE_ROLE_KEY` is utilized securely on server API routes to manage foreign-key constraints and execute transactional RPC roll calls.

#### 4. Apply Database Migrations & Seeds
Run the initial migration against your Supabase SQL Editor:
1. Open your Supabase Dashboard $\rightarrow$ **SQL Editor**.
2. Run the SQL script located in:
   ```text
   supabase/migrations/20261027000000_init_proxi_schema.sql
   ```
3. (Optional) Run `supabase/seed.sql` to populate sample campus lecture halls and departments.

#### 5. Run Verification & Tests
Ensure all 36 unit and integration test suites pass:
```bash
npm test
```

Verify TypeScript types:
```bash
npm run typecheck
```

#### 6. Start the Local Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or [http://localhost:3001](http://localhost:3001) if port 3000 is occupied).

#### 7. Build for Production
```bash
npm run build
npm start
```

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | `POST` | Authenticates user against Supabase Auth & sets secure session cookie. |
| `/api/auth/register` | `POST` | Registers a new student or faculty profile in Supabase. |
| `/api/courses` | `GET`, `POST` | Lists all courses or creates a new course record. |
| `/api/classrooms` | `GET`, `POST` | Fetches lecture halls or saves new classroom GPS anchor coordinates. |
| `/api/attendance/sessions` | `GET`, `POST` | Retrieves active/historical sessions or creates a new geofenced session. |
| `/api/attendance/sessions/[id]/end` | `POST` | Closes an active attendance session and records the timestamp. |
| `/api/attendance/check-in` | `POST` | Validates GPS coordinates against venue geofence and records student check-in. |
| `/api/attendance/records` | `GET` | Fetches verified attendance records for a specific session. |

---

## Verification & Distance Mathematical Model

The distance between a student's reported GPS coordinates $(\varphi_1, \lambda_1)$ and the classroom center $(\varphi_2, \lambda_2)$ is computed using the **Haversine formula**:

$$\Delta\varphi = \varphi_2 - \varphi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$

$$a = \sin^2\left(\frac{\Delta\varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

$$d = R \cdot c$$

where $R = 6{,}371{,}000\text{ meters}$ (mean radius of Earth).

A check-in is valid if and only if:
1. $d \le r_{\text{allowed}}$ (within geofence radius)
2. $\text{accuracy} \le 50\text{ meters}$ (sufficiently accurate GPS reading)
3. $t_{\text{start}} \le t_{\text{current}} \le t_{\text{end}}$ (within active session window)
4. $\text{Student is enrolled in course}$
5. $\text{No prior check-in exists for this student and session}$

---

## License & Attribution

Developed as a Software Engineering Academic Project (SWEP) at **Obafemi Awolowo University (OAU), Ile-Ife**.
