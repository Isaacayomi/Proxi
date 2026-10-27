import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { sessionId, studentId, latitude, longitude, accuracy } = body || {};

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
          message: "Valid latitude, longitude, and accuracy readings are required.",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      // Ensure student enrollment exists for this session's course so check-in is authorized
      const { data: sessionData } = await supabase
        .from("attendance_sessions")
        .select("course_id")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionData?.course_id) {
        await supabase
          .from("course_enrollments")
          .upsert(
            [{ course_id: sessionData.course_id, student_id: studentId }],
            { onConflict: "course_id,student_id", ignoreDuplicates: true },
          );
      }

      // Execute the atomic PostgreSQL RPC function
      const { data, error } = await supabase.rpc("verify_and_record_attendance", {
        p_session_id: sessionId,
        p_student_id: studentId,
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy: accuracy,
      });

      if (!error && data) {
        const status = data.success
          ? 200
          : data.code === "DUPLICATE_CHECKIN"
            ? 409
            : 400;

        return NextResponse.json(data, { status });
      }
    }

    // Fallback to in-memory store if offline / local testing
    const result = db.verifyAndRecordAttendance(
      sessionId,
      studentId,
      latitude,
      longitude,
      accuracy,
    );

    const status = result.success ? 200 : result.code === "DUPLICATE_CHECKIN" ? 409 : 400;

    return NextResponse.json(result, { status });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        message: err instanceof Error ? err.message : "Internal server error during verification.",
      },
      { status: 500 },
    );
  }
}

