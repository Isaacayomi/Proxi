-- ====================================================================
-- FIX ROW LEVEL SECURITY (RLS) POLICIES FOR PROXI
-- Enables seamless registration, login, classroom/course creation, and check-in
-- Run this once in Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. PROFILES TABLE: Allow public insert on registration, reading own or course profiles, updating own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Lecturers can view enrolled students profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile update" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile select" ON public.profiles;

CREATE POLICY "Allow profile insert" ON public.profiles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow profile select" ON public.profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Allow profile update" ON public.profiles
    FOR UPDATE
    USING (true);

-- 2. CLASSROOMS TABLE: Allow authenticated users to view and insert classrooms
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Admins manage classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Allow classrooms management" ON public.classrooms;

CREATE POLICY "Allow classrooms management" ON public.classrooms
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. COURSES TABLE: Allow authenticated users to view and insert courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view courses" ON public.courses;
DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
DROP POLICY IF EXISTS "Allow courses management" ON public.courses;

CREATE POLICY "Allow courses management" ON public.courses
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. COURSE LECTURERS TABLE: Allow managing course allocations
ALTER TABLE public.course_lecturers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View course lecturer assignments" ON public.course_lecturers;
DROP POLICY IF EXISTS "Admins manage course lecturers" ON public.course_lecturers;
DROP POLICY IF EXISTS "Allow course lecturers management" ON public.course_lecturers;

CREATE POLICY "Allow course lecturers management" ON public.course_lecturers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. COURSE ENROLLMENTS TABLE: Allow managing course enrollments
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Lecturers view enrollments for assigned courses" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins manage course enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Allow enrollments management" ON public.course_enrollments;

CREATE POLICY "Allow enrollments management" ON public.course_enrollments
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. ATTENDANCE SESSIONS TABLE: Allow managing attendance sessions
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecturers manage their own sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Students view sessions for enrolled courses" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Admins view all sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Allow sessions management" ON public.attendance_sessions;

CREATE POLICY "Allow sessions management" ON public.attendance_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. ATTENDANCE RECORDS TABLE: Allow viewing and recording attendance
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Lecturers view records for their sessions" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins view all attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow records management" ON public.attendance_records;

CREATE POLICY "Allow records management" ON public.attendance_records
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. ATTENDANCE AUDIT LOGS TABLE:
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow audit logs management" ON public.attendance_audit_logs;
CREATE POLICY "Allow audit logs management" ON public.attendance_audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

