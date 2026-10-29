import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getAuthenticatedUser(req: NextRequest) {
  const cookie = req.cookies.get("proxi_session")?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(decodeURIComponent(cookie));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser || currentUser.role !== "lecturer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Only faculty members can grant attendance overrides." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId, studentId, status = "excused", note = "Lecturer approved override" } = body;

    if (!sessionId || !studentId) {
      return NextResponse.json(
        { success: false, message: "Both sessionId and studentId are required." },
        { status: 400 },
      );
    }

    const targetStatus = status === "present" ? "present" : "excused";
    const supabase = getSupabaseServerClient();

    if (supabase) {
      try {
        // Fetch student profile for matric number
        const { data: student } = await supabase
          .from("profiles")
          .select("matric_number")
          .eq("id", studentId)
          .maybeSingle();

        // Check if a record already exists
        const { data: existing } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("session_id", sessionId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (existing) {
          const { data: updated, error: updateErr } = await supabase
            .from("attendance_records")
            .update({
              status: targetStatus,
              rejection_reason: targetStatus === "excused" ? "EXCUSED_ABSENCE" : null,
            })
            .eq("id", existing.id)
            .select()
            .single();

          if (!updateErr && updated) {
            try {
              db.overrideAttendance(sessionId, studentId, targetStatus, currentUser.id, "EXCUSED_ABSENCE");
            } catch {}
            return NextResponse.json({
              success: true,
              message: `Attendance marked as ${targetStatus}.`,
              record: updated,
            });
          }
        } else {
          // Insert new override record
          const { data: inserted, error: insertErr } = await supabase
            .from("attendance_records")
            .insert([
              {
                session_id: sessionId,
                student_id: studentId,
                matric_number: student?.matric_number || null,
                status: targetStatus,
                distance_meters: 0,
                reported_accuracy_meters: 0,
                rejection_reason: targetStatus === "excused" ? "EXCUSED_ABSENCE" : null,
              },
            ])
            .select()
            .single();

          if (!insertErr && inserted) {
            try {
              db.overrideAttendance(sessionId, studentId, targetStatus, currentUser.id, "EXCUSED_ABSENCE");
            } catch {}
            return NextResponse.json({
              success: true,
              message: `Attendance override recorded (${targetStatus}).`,
              record: inserted,
            });
          }
        }
      } catch {
        // Fallback to local store below
      }
    }

    const record = db.overrideAttendance(sessionId, studentId, targetStatus, currentUser.id, "EXCUSED_ABSENCE");
    return NextResponse.json({
      success: true,
      message: `Attendance override recorded (${targetStatus}).`,
      record,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error applying override" },
      { status: 500 },
    );
  }
}

