import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { evaluateGeofence } from "@/lib/geo/distance";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { sessionId, studentId, latitude, longitude, accuracy, deviceId } =
      body || {};

    if (!sessionId || !studentId) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_FIELDS",
          message: "Session ID and Student ID are required.",
        },
        { status: 400 },
      );
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      typeof accuracy !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_COORDINATES",
          message:
            "Valid latitude, longitude, and accuracy readings are required.",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      // 1. Fetch session from Supabase
      const { data: sessionData, error: sessionErr } = await supabase
        .from("attendance_sessions")
        .select("*, course:courses(*)")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionData) {
        const now = Date.now();
        const startsAt = new Date(sessionData.starts_at).getTime();
        const endsAt = new Date(sessionData.ends_at).getTime();

        // Check if session has ended or is not active
        if (sessionData.status !== "active" || now < startsAt || now > endsAt) {
          return NextResponse.json(
            {
              success: false,
              code: "SESSION_INACTIVE",
              message: "This attendance session is closed or outside its active time window.",
            },
            { status: 400 },
          );
        }

        // 2. Fetch and self-heal student profile if needed
        let { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", studentId)
          .maybeSingle();

        if (!profile) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(studentId);
            if (authUser?.user) {
              const meta = authUser.user.user_metadata || {};
              const restoredProfile = {
                id: studentId,
                email: authUser.user.email || "",
                first_name: meta.first_name || "Student",
                last_name: meta.last_name || "",
                matric_number: meta.matric_number || null,
                role: meta.role || "student",
                created_at: authUser.user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              await supabase.from("profiles").upsert([restoredProfile]);
              profile = restoredProfile;
            }
          } catch (e) {
            console.warn("Could not self-heal profile from auth:", e);
          }
        }

        // Validate role: check if user is a lecturer trying to check in
        if (profile && profile.role !== "student") {
          return NextResponse.json(
            {
              success: false,
              code: "UNAUTHORIZED_ROLE",
              message: `You are signed in as a ${profile.role}. Only student accounts can check into attendance sessions.`,
            },
            { status: 403 },
          );
        }

        // Single device binding check
        const cleanDevId = deviceId ? String(deviceId).trim() : null;
        if (profile?.device_id && cleanDevId && profile.device_id !== cleanDevId) {
          return NextResponse.json(
            {
              success: false,
              code: "DEVICE_MISMATCH",
              message:
                "Check-in rejected: this account is bound to another registered device. You may only check into attendance from your verified primary device.",
            },
            { status: 403 },
          );
        }

        // Verify student course enrollment
        if (sessionData.course_id) {
          const { data: enrollment } = await supabase
            .from("course_enrollments")
            .select("course_id")
            .eq("course_id", sessionData.course_id)
            .eq("student_id", studentId)
            .maybeSingle();

          if (!enrollment) {
            return NextResponse.json(
              {
                success: false,
                code: "NOT_ENROLLED",
                message:
                  "You are not enrolled in the course for this session. Please enroll in the course first.",
              },
              { status: 403 },
            );
          }
        }

        // Check for duplicate check-in
        const { data: existingCheckIn } = await supabase
          .from("attendance_records")
          .select("id, submitted_at")
          .eq("session_id", sessionId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (existingCheckIn) {
          return NextResponse.json(
            {
              success: false,
              code: "DUPLICATE_CHECKIN",
              message: "You have already checked in for this session.",
              submitted_at: existingCheckIn.submitted_at,
            },
            { status: 409 },
          );
        }

        // 3. Try atomic PostgreSQL RPC first
        let rpcSuccessful = false;
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc(
            "verify_and_record_attendance",
            {
              p_session_id: sessionId,
              p_student_id: studentId,
              p_latitude: latitude,
              p_longitude: longitude,
              p_accuracy: accuracy,
            },
          );

          if (!rpcErr && rpcData) {
            rpcSuccessful = true;
            const status = rpcData.success
              ? 200
              : rpcData.code === "DUPLICATE_CHECKIN"
                ? 409
                : 400;

            return NextResponse.json(rpcData, { status });
          }
        } catch {
          // Fall through to direct server-side verification
        }

        // 4. Direct server-side verification fallback (if RPC threw or had permissions issues)
        if (!rpcSuccessful) {
          const evalResult = evaluateGeofence(
            { latitude, longitude },
            { latitude: sessionData.latitude, longitude: sessionData.longitude },
            sessionData.radius_meters,
            accuracy,
            Math.max(sessionData.max_accuracy_meters || 50, 300),
          );

          if (!evalResult.accuracyAcceptable) {
            return NextResponse.json(
              {
                success: false,
                code: "INACCURATE_LOCATION",
                message: evalResult.reason || "GPS accuracy is insufficient.",
                accuracy_meters: evalResult.accuracyMeters,
                required_accuracy_meters: sessionData.max_accuracy_meters,
              },
              { status: 400 },
            );
          }

          if (!evalResult.isWithinRadius) {
            return NextResponse.json(
              {
                success: false,
                code: "OUTSIDE_GEOFENCE",
                message: evalResult.reason || "You are outside the classroom boundary.",
                distance_meters: evalResult.distanceMeters,
                radius_meters: sessionData.radius_meters,
              },
              { status: 400 },
            );
          }

          // Insert into attendance_records table directly in Supabase
          const { data: record, error: insertErr } = await supabase
            .from("attendance_records")
            .insert([
              {
                session_id: sessionId,
                student_id: studentId,
                matric_number: profile?.matric_number || null,
                status: "present",
                distance_meters: evalResult.distanceMeters,
                reported_accuracy_meters: accuracy,
                submitted_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (insertErr) {
            if (insertErr.code === "23505") {
              return NextResponse.json(
                {
                  success: false,
                  code: "DUPLICATE_CHECKIN",
                  message: "You have already checked in for this session.",
                },
                { status: 409 },
              );
            }
            return NextResponse.json(
              { success: false, message: insertErr.message },
              { status: 500 },
            );
          }

          return NextResponse.json(
            {
              success: true,
              code: "ATTENDANCE_RECORDED",
              message: "Attendance confirmed successfully!",
              distance_meters: evalResult.distanceMeters,
              accuracy_meters: accuracy,
              submitted_at: record.submitted_at,
            },
            { status: 200 },
          );
        }
      }
    }

    // Fallback to in-memory store if offline / local testing
    const localProfile = db.getProfile(studentId);
    const cleanDevId = deviceId ? String(deviceId).trim() : null;
    if (localProfile?.device_id && cleanDevId && localProfile.device_id !== cleanDevId) {
      return NextResponse.json(
        {
          success: false,
          code: "DEVICE_MISMATCH",
          message:
            "Check-in rejected: this account is bound to another registered device. You may only check into attendance from your verified primary device.",
        },
        { status: 403 },
      );
    }

    const result = db.verifyAndRecordAttendance(
      sessionId,
      studentId,
      latitude,
      longitude,
      accuracy,
    );

    const status = result.success
      ? 200
      : result.code === "DUPLICATE_CHECKIN"
        ? 409
        : 400;

    return NextResponse.json(result, { status });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Internal server error during verification.",
      },
      { status: 500 },
    );
  }
}
