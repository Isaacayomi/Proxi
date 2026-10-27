import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const studentId = searchParams.get("studentId");

    const supabase = getSupabaseServerClient();

    if (sessionId) {
      if (supabase) {
        const { data, error } = await supabase
          .from("attendance_records")
          .select(`
            *,
            student:profiles(*)
          `)
          .eq("session_id", sessionId)
          .order("submitted_at", { ascending: false });

        if (!error && data) {
          return NextResponse.json({ success: true, records: data });
        }
      }

      const records = db.getAttendanceRecords(sessionId);
      return NextResponse.json({ success: true, records });
    }

    if (studentId) {
      if (supabase) {
        const { data, error } = await supabase
          .from("attendance_records")
          .select(`
            *,
            session:attendance_sessions(
              *,
              course:courses(*),
              classroom:classrooms(*)
            )
          `)
          .eq("student_id", studentId)
          .order("submitted_at", { ascending: false });

        if (!error && data) {
          return NextResponse.json({ success: true, records: data });
        }
      }

      const records = db.getStudentAttendanceHistory(studentId);
      return NextResponse.json({ success: true, records });
    }

    return NextResponse.json(
      { success: false, message: "Either sessionId or studentId is required." },
      { status: 400 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error loading records" },
      { status: 500 },
    );
  }
}

