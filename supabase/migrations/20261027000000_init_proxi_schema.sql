-- ====================================================================
-- Proxi: Database Schema & Row Level Security Migration
-- Target: Supabase (PostgreSQL 15+)
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
-- Extends Supabase auth.users with university role and matric number
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    matric_number TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'lecturer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_matric_number ON public.profiles(matric_number);

-- 2. CLASSROOMS TABLE
-- Physical lecture theatres, auditoriums, and labs with GPS coordinates
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    building TEXT NOT NULL,
    room_number TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    default_radius_meters INTEGER NOT NULL DEFAULT 50 CHECK (default_radius_meters >= 10 AND default_radius_meters <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_building ON public.classrooms(building);

-- 3. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(code);

-- 4. COURSE LECTURERS (Junction table)
CREATE TABLE IF NOT EXISTS public.course_lecturers (
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (course_id, lecturer_id)
);

-- 5. COURSE ENROLLMENTS (Junction table)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.course_enrollments(course_id);

-- 6. ATTENDANCE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE RESTRICT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 50 CHECK (radius_meters >= 10 AND radius_meters <= 500),
    max_accuracy_meters INTEGER NOT NULL DEFAULT 50,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
    session_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_course ON public.attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_lecturer ON public.attendance_sessions(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_active_window ON public.attendance_sessions(status, starts_at, ends_at);

-- 7. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    matric_number TEXT,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'rejected')),
    distance_meters DOUBLE PRECISION,
    reported_accuracy_meters DOUBLE PRECISION,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT attendance_records_session_student_unique UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON public.attendance_records(student_id);

-- 8. ATTENDANCE AUDIT LOGS (Privacy-preserving security logs)
CREATE TABLE IF NOT EXISTS public.attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK (outcome IN ('verified_present', 'rejected_geofence', 'rejected_accuracy', 'rejected_expired', 'rejected_not_enrolled', 'rejected_duplicate')),
    distance_meters DOUBLE PRECISION,
    reported_accuracy_meters DOUBLE PRECISION,
    details TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_session ON public.attendance_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_student ON public.attendance_audit_logs(student_id);

-- ====================================================================
-- GEOSPATIAL HELPER FUNCTIONS
-- ====================================================================

-- Haversine formula in pure PostgreSQL (calculates distance in meters)
CREATE OR REPLACE FUNCTION public.calculate_haversine_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    r CONSTANT DOUBLE PRECISION := 6371000; -- Earth's mean radius in meters
    phi1 DOUBLE PRECISION;
    phi2 DOUBLE PRECISION;
    delta_phi DOUBLE PRECISION;
    delta_lambda DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    -- Convert degrees to radians
    phi1 := radians(lat1);
    phi2 := radians(lat2);
    delta_phi := radians(lat2 - lat1);
    delta_lambda := radians(lon2 - lon1);

    a := sin(delta_phi / 2.0)^2 +
         cos(phi1) * cos(phi2) * sin(delta_lambda / 2.0)^2;
    
    -- Protect against precision float overshoot
    IF a > 1.0 THEN a := 1.0; END IF;
    
    c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

    RETURN round((r * c)::numeric, 2)::DOUBLE PRECISION;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- ====================================================================
-- ATOMIC ATTENDANCE VERIFICATION RPC
-- Validates enrollment, active window, GPS accuracy, and calculates distance
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_and_record_attendance(
    p_session_id UUID,
    p_student_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_accuracy DOUBLE PRECISION
)
RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_student RECORD;
    v_enrolled BOOLEAN;
    v_already_marked BOOLEAN;
    v_distance DOUBLE PRECISION;
    v_effective_radius DOUBLE PRECISION;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Load session details
    SELECT id, course_id, lecturer_id, latitude, longitude, radius_meters, max_accuracy_meters, starts_at, ends_at, status
    INTO v_session
    FROM public.attendance_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SESSION_NOT_FOUND',
            'message', 'Attendance session not found.'
        );
    END IF;

    -- 2. Verify session status and window
    IF v_session.status != 'active' OR v_now < v_session.starts_at OR v_now > v_session.ends_at THEN
        INSERT INTO public.attendance_audit_logs (session_id, student_id, outcome, details)
        VALUES (p_session_id, p_student_id, 'rejected_expired', 'Session is closed or outside active time window.');
        
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SESSION_INACTIVE',
            'message', 'This attendance session is no longer active.'
        );
    END IF;

    -- 3. Verify student identity and role
    SELECT id, matric_number, role
    INTO v_student
    FROM public.profiles
    WHERE id = p_student_id;

    IF NOT FOUND OR v_student.role != 'student' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED_ROLE',
            'message', 'Only registered students can check into attendance sessions.'
        );
    END IF;

    -- 4. Verify course enrollment
    SELECT EXISTS (
        SELECT 1 FROM public.course_enrollments
        WHERE course_id = v_session.course_id AND student_id = p_student_id
    ) INTO v_enrolled;

    IF NOT v_enrolled THEN
        INSERT INTO public.attendance_audit_logs (session_id, student_id, outcome, details)
        VALUES (p_session_id, p_student_id, 'rejected_not_enrolled', 'Student is not enrolled in this course.');
        
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_ENROLLED',
            'message', 'You are not enrolled in the course for this session.'
        );
    END IF;

    -- 5. Check for duplicate attendance
    SELECT EXISTS (
        SELECT 1 FROM public.attendance_records
        WHERE session_id = p_session_id AND student_id = p_student_id
    ) INTO v_already_marked;

    IF v_already_marked THEN
        INSERT INTO public.attendance_audit_logs (session_id, student_id, outcome, details)
        VALUES (p_session_id, p_student_id, 'rejected_duplicate', 'Student already checked in.');
        
        RETURN jsonb_build_object(
            'success', false,
            'code', 'DUPLICATE_CHECKIN',
            'message', 'Attendance has already been recorded for this session.'
        );
    END IF;

    -- 6. Verify GPS accuracy threshold
    IF p_accuracy > v_session.max_accuracy_meters THEN
        INSERT INTO public.attendance_audit_logs (session_id, student_id, outcome, reported_accuracy_meters, details)
        VALUES (p_session_id, p_student_id, 'rejected_accuracy', p_accuracy, 'Reported GPS accuracy (' || round(p_accuracy::numeric, 1) || 'm) exceeds allowed threshold (' || v_session.max_accuracy_meters || 'm).');
        
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INACCURATE_LOCATION',
            'message', 'Your GPS location accuracy is insufficient (±' || round(p_accuracy::numeric, 1) || 'm). Move closer to an open area or ensure high-accuracy location is enabled.',
            'accuracy_meters', p_accuracy,
            'required_accuracy_meters', v_session.max_accuracy_meters
        );
    END IF;

    -- 7. Calculate server-side distance
    v_distance := public.calculate_haversine_distance(
        p_latitude,
        p_longitude,
        v_session.latitude,
        v_session.longitude
    );

    v_effective_radius := v_session.radius_meters::DOUBLE PRECISION;

    -- 8. Geofence evaluation
    IF v_distance > v_effective_radius THEN
        INSERT INTO public.attendance_audit_logs (session_id, student_id, outcome, distance_meters, reported_accuracy_meters, details)
        VALUES (p_session_id, p_student_id, 'rejected_geofence', v_distance, p_accuracy, 'Distance (' || round(v_distance::numeric, 1) || 'm) exceeds geofence radius (' || v_session.radius_meters || 'm).');

        RETURN jsonb_build_object(
            'success', false,
            'code', 'OUTSIDE_GEOFENCE',
            'message', 'You are outside the classroom boundary (' || round(v_distance::numeric, 1) || 'm away, allowed radius: ' || v_session.radius_meters || 'm).',
            'distance_meters', v_distance,
            'radius_meters', v_session.radius_meters
        );
    END IF;

    -- 9. Record attendance atomically
    INSERT INTO public.attendance_records (
        session_id,
        student_id,
        matric_number,
        status,
        distance_meters,
        reported_accuracy_meters,
        submitted_at
    ) VALUES (
        p_session_id,
        p_student_id,
        v_student.matric_number,
        'present',
        v_distance,
        p_accuracy,
        v_now
    );

    -- 10. Audit log success
    INSERT INTO public.attendance_audit_logs (
        session_id,
        student_id,
        outcome,
        distance_meters,
        reported_accuracy_meters,
        details
    ) VALUES (
        p_session_id,
        p_student_id,
        'verified_present',
        v_distance,
        p_accuracy,
        'Attendance verified and recorded successfully.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'code', 'ATTENDANCE_RECORDED',
        'message', 'Attendance confirmed successfully!',
        'distance_meters', v_distance,
        'accuracy_meters', p_accuracy,
        'submitted_at', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Idempotent: Drops policy first if already exists before recreating
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Users can update own profile (names, matric number if student)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Admins can view and update all profiles
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
CREATE POLICY "Admins full access to profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lecturers can view student profiles in their courses
DROP POLICY IF EXISTS "Lecturers can view enrolled students profiles" ON public.profiles;
CREATE POLICY "Lecturers can view enrolled students profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.course_lecturers cl
            JOIN public.course_enrollments ce ON ce.course_id = cl.course_id
            WHERE cl.lecturer_id = auth.uid() AND ce.student_id = public.profiles.id
        )
    );

-- Classrooms:
-- All authenticated users can view classrooms
DROP POLICY IF EXISTS "Authenticated users view classrooms" ON public.classrooms;
CREATE POLICY "Authenticated users view classrooms" ON public.classrooms
    FOR SELECT TO authenticated
    USING (true);

-- Admins manage classrooms
DROP POLICY IF EXISTS "Admins manage classrooms" ON public.classrooms;
CREATE POLICY "Admins manage classrooms" ON public.classrooms
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Courses:
-- Authenticated users view courses
DROP POLICY IF EXISTS "Authenticated users view courses" ON public.courses;
CREATE POLICY "Authenticated users view courses" ON public.courses
    FOR SELECT TO authenticated
    USING (true);

-- Admins manage courses
DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Course Lecturers:
DROP POLICY IF EXISTS "View course lecturer assignments" ON public.course_lecturers;
CREATE POLICY "View course lecturer assignments" ON public.course_lecturers
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins manage course lecturers" ON public.course_lecturers;
CREATE POLICY "Admins manage course lecturers" ON public.course_lecturers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Course Enrollments:
DROP POLICY IF EXISTS "Students view own enrollments" ON public.course_enrollments;
CREATE POLICY "Students view own enrollments" ON public.course_enrollments
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Lecturers view enrollments for assigned courses" ON public.course_enrollments;
CREATE POLICY "Lecturers view enrollments for assigned courses" ON public.course_enrollments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.course_lecturers
            WHERE course_id = public.course_enrollments.course_id AND lecturer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins manage course enrollments" ON public.course_enrollments;
CREATE POLICY "Admins manage course enrollments" ON public.course_enrollments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Attendance Sessions:
-- Lecturers can view and manage their own sessions
DROP POLICY IF EXISTS "Lecturers manage their own sessions" ON public.attendance_sessions;
CREATE POLICY "Lecturers manage their own sessions" ON public.attendance_sessions
    FOR ALL TO authenticated
    USING (lecturer_id = auth.uid());

-- Students can view active sessions for courses they are enrolled in
DROP POLICY IF EXISTS "Students view sessions for enrolled courses" ON public.attendance_sessions;
CREATE POLICY "Students view sessions for enrolled courses" ON public.attendance_sessions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.course_enrollments
            WHERE course_id = public.attendance_sessions.course_id AND student_id = auth.uid()
        )
    );

-- Admins view all sessions
DROP POLICY IF EXISTS "Admins view all sessions" ON public.attendance_sessions;
CREATE POLICY "Admins view all sessions" ON public.attendance_sessions
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Attendance Records:
-- Students can view their own attendance records
DROP POLICY IF EXISTS "Students view own attendance records" ON public.attendance_records;
CREATE POLICY "Students view own attendance records" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- Lecturers can view attendance records for their sessions
DROP POLICY IF EXISTS "Lecturers view records for their sessions" ON public.attendance_records;
CREATE POLICY "Lecturers view records for their sessions" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions
            WHERE id = public.attendance_records.session_id AND lecturer_id = auth.uid()
        )
    );

-- Admins can view all attendance records
DROP POLICY IF EXISTS "Admins view all attendance records" ON public.attendance_records;
CREATE POLICY "Admins view all attendance records" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Note: DIRECT INSERT by clients is disabled; attendance must be recorded through verify_and_record_attendance()
-- or trusted server-side API handler with SERVICE_ROLE.

