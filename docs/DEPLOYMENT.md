# Proxi Deployment & Operational Guide

## Overview

Proxi is a responsive web-based university attendance system that verifies classroom presence using browser Geolocation API and server-side geospatial calculation. It replaces mobile apps and dedicated BLE/ESP32 hardware with a web application deployed to **Vercel** and powered by **Supabase (PostgreSQL 15+ with Row Level Security & Geospatial Functions)**.

---

## Architecture

```text
┌────────────────────────────────────────────────────────┐
│                      Client                            │
│  Next.js (App Router), React 19, Tailwind CSS          │
│  Browser Geolocation API (High-Accuracy GPS)           │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTPS / JSON API Request
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Vercel Edge / Node                  │
│  - Session Status & Time Window Validation             │
│  - Course Enrollment & Student Role Enforcement        │
│  - GPS Accuracy Filtering (Threshold: <= 50m)          │
│  - Server-side Haversine Distance Calculation          │
└───────────────────────────┬────────────────────────────┘
                            │
           Supabase Client / PostgreSQL RPC
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Supabase Backend                    │
│  - PostgreSQL 15+ with Row Level Security (RLS)        │
│  - Atomic Stored Procedure: verify_and_record_attendance│
│  - Unique Constraints: Prevent Duplicate Check-ins     │
│  - Privacy-Preserving Audit Logs                       │
└────────────────────────────────────────────────────────┘
```

---

## 1. Environment Configuration

Create `.env.local` for local development or configure Environment Variables in your Vercel project settings:

```bash
# Public Supabase Client Keys (Safe for Browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Supabase Service Role Key (Server-Only, NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Application Base URL
NEXT_PUBLIC_APP_URL=https://proxi.your-domain.edu
```

*(Note: In local development or preview environments where Supabase keys are not set, Proxi includes an integrated in-memory fallback store seeded with sample courses, classrooms, and roles, ensuring that tests and UI workflows remain fully operational out of the box).*

---

## 2. Supabase Setup & Database Migrations

### Apply Migrations
1. In your Supabase Dashboard, navigate to the **SQL Editor**.
2. Open and run the migration script located at:
   `supabase/migrations/20261027000000_init_proxi_schema.sql`
3. This creates:
   - `profiles`: Extends user records with roles (`student`, `lecturer`, `admin`) and matriculation numbers.
   - `classrooms`: Physical campus venues with latitude, longitude, and default radius.
   - `courses`: University courses and departments.
   - `course_lecturers` & `course_enrollments`: Junction tables enforcing course assignments and student eligibility.
   - `attendance_sessions`: Course sessions with classroom coordinates and permitted geofence radius.
   - `attendance_records`: Verified check-ins with unique constraint `(session_id, student_id)`.
   - `attendance_audit_logs`: Audit logs of verified and rejected attempts.
   - `calculate_haversine_distance(...)`: Geospatial function calculating Great-Circle distance in meters.
   - `verify_and_record_attendance(...)`: Atomic RPC function executing enrollment validation, accuracy checks, geofence checks, and duplicate locking.
   - Row Level Security (RLS) policies for all tables.

### Seed Campus Data
To populate sample lecture theatres (OAU Ife campus) and courses:
Run `supabase/seed.sql` in the SQL Editor.

---

## 3. Local Development & Testing

```bash
# Install dependencies
pnpm install

# Run TypeScript typecheck
npm run typecheck

# Run automated tests (Vitest)
npm test

# Build production bundle
npm run build

# Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 4. Vercel Deployment

1. Push your repository to GitHub / GitLab.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Select your repository.
4. Set the **Framework Preset** to **Next.js**.
5. Add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Click **Deploy**.

---

## 5. GPS Verification Security & Limitations

### Tamper-Resistance & Security
- **Server-Side Distance:** Distance calculations are performed entirely on the server using the Haversine formula against immutable classroom coordinates stored in PostgreSQL.
- **Accuracy Policy:** Readings with coarse accuracy (`reported_accuracy > 50m`) are rejected to prevent cell-tower triangulations or low-confidence positioning from passing.
- **Atomic Uniqueness:** The database enforces a strict `UNIQUE (session_id, student_id)` constraint, preventing duplicate submissions or race conditions.
- **Enrollment Authorization:** Students cannot check into sessions for courses in which they are not actively enrolled.
- **Privacy Preservation:** The system records verified distance and check-in time without persistently logging ongoing user GPS coordinates or tracking location outside session check-in.

### Physical Presence Limitations
A standard browser GPS reading provides strong proximity evidence, but is not absolute proof of physical presence (for example, client-side browser developer tools or mock location apps can theoretically manipulate client-reported coordinates). 

For high-stakes examinations or zero-trust environments, the architecture is structured to support secondary factors:
1. Short-lived session display codes rotated dynamically on the classroom projector.
2. Campus Wi-Fi IP subnet range validation.
3. Supervised lecturer manual overrides in the live session monitor.
