-- ====================================================================
-- Proxi: Migration 20261027000002
-- 1. Ensure verify_and_record_attendance runs as SECURITY DEFINER
-- 2. Backfill missing profiles from auth.users
-- 3. Transition expired sessions to 'ended'
-- ====================================================================

-- 1. Safely backfill any missing profiles from auth.users (handling potential duplicate matric numbers)
INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    matric_number,
    role,
    created_at,
    updated_at
)
SELECT 
    u.id,
    COALESCE(u.email, 'student@proxi.app'),
    COALESCE(u.raw_user_meta_data->>'first_name', 'Student'),
    COALESCE(u.raw_user_meta_data->>'last_name', ''),
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.matric_number = u.raw_user_meta_data->>'matric_number' 
            AND p.id != u.id
        ) THEN (u.raw_user_meta_data->>'matric_number') || '-' || SUBSTRING(u.id::text, 1, 4)
        ELSE u.raw_user_meta_data->>'matric_number'
    END,
    COALESCE(u.raw_user_meta_data->>'role', 'student'),
    u.created_at,
    NOW()
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Update verify_and_record_attendance to SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.verify_and_record_attendance(
    p_session_id UUID,
    p_student_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_accuracy DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Self-heal profile from auth.users if missing in public.profiles
    IF NOT FOUND THEN
        INSERT INTO public.profiles (id, email, first_name, last_name, matric_number, role, created_at, updated_at)
        SELECT id, email, COALESCE(raw_user_meta_data->>'first_name', 'Student'), COALESCE(raw_user_meta_data->>'last_name', ''), raw_user_meta_data->>'matric_number', COALESCE(raw_user_meta_data->>'role', 'student'), created_at, NOW()
        FROM auth.users
        WHERE id = p_student_id
        ON CONFLICT (id) DO NOTHING;

        SELECT id, matric_number, role
        INTO v_student
        FROM public.profiles
        WHERE id = p_student_id;
    END IF;

    IF NOT FOUND OR v_student.role != 'student' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED_ROLE',
            'message', 'Only registered students can check into attendance sessions.'
        );
    END IF;

    -- 4. Auto-enroll student if not yet recorded
    SELECT EXISTS (
        SELECT 1 FROM public.course_enrollments
        WHERE course_id = v_session.course_id AND student_id = p_student_id
    ) INTO v_enrolled;

    IF NOT v_enrolled THEN
        INSERT INTO public.course_enrollments (course_id, student_id)
        VALUES (v_session.course_id, p_student_id)
        ON CONFLICT DO NOTHING;
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
            'message', 'You have already checked in for this session.'
        );
    END IF;

    -- 6. Verify reported GPS accuracy threshold
    IF p_accuracy > v_session.max_accuracy_meters THEN
        INSERT INTO public.attendance_audit_logs (session_id, student_id, outcome, details)
        VALUES (p_session_id, p_student_id, 'rejected_accuracy', format('Accuracy %s m exceeds threshold %s m', p_accuracy, v_session.max_accuracy_meters));
        
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INACCURATE_LOCATION',
            'message', format('Location accuracy (±%s m) is insufficient. Required threshold is ±%s m.', ROUND(p_accuracy::numeric, 1), v_session.max_accuracy_meters),
            'accuracy_meters', p_accuracy,
            'required_accuracy_meters', v_session.max_accuracy_meters
        );
    END IF;

    -- 7. Calculate Haversine distance
    v_distance := public.calculate_haversine_distance(
        p_latitude, p_longitude,
        v_session.latitude, v_session.longitude
    );

    -- 8. Geofence evaluation
    v_effective_radius := v_session.radius_meters;

    IF v_distance > v_effective_radius THEN
        INSERT INTO public.attendance_audit_logs (session_id, student_id, outcome, details)
        VALUES (p_session_id, p_student_id, 'rejected_geofence', format('Distance %s m exceeds radius %s m', ROUND(v_distance::numeric, 1), v_effective_radius));
        
        RETURN jsonb_build_object(
            'success', false,
            'code', 'OUTSIDE_GEOFENCE',
            'message', format('You are %s m away from the classroom. The allowed radius is %s m.', ROUND(v_distance::numeric, 1), v_effective_radius),
            'distance_meters', ROUND(v_distance::numeric, 2),
            'radius_meters', v_effective_radius
        );
    END IF;

    -- 9. Verification Passed: Atomically insert attendance record
    INSERT INTO public.attendance_records (
        session_id,
        student_id,
        matric_number,
        status,
        distance_meters,
        reported_accuracy_meters,
        submitted_at
    )
    VALUES (
        p_session_id,
        p_student_id,
        v_student.matric_number,
        'present',
        ROUND(v_distance::numeric, 2),
        ROUND(p_accuracy::numeric, 2),
        v_now
    );

    -- Audit log success
    INSERT INTO public.attendance_audit_logs (session_id, student_id, outcome, details)
    VALUES (p_session_id, p_student_id, 'success', format('Verified at %s m from venue', ROUND(v_distance::numeric, 1)));

    RETURN jsonb_build_object(
        'success', true,
        'code', 'ATTENDANCE_RECORDED',
        'message', 'Attendance confirmed successfully!',
        'distance_meters', ROUND(v_distance::numeric, 2),
        'accuracy_meters', ROUND(p_accuracy::numeric, 2),
        'submitted_at', v_now
    );
END;
$$;

-- Grant execution to public / authenticated users
GRANT EXECUTE ON FUNCTION public.verify_and_record_attendance(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated, service_role;

-- 3. Automatically close expired sessions
UPDATE public.attendance_sessions
SET status = 'ended'
WHERE status = 'active' AND ends_at < NOW();

