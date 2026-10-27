import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { lecturerId } = body || {};

    const cleanId = (id || "").trim();
    if (!cleanId) {
      return NextResponse.json(
        { success: false, message: "Session ID is required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const nowIso = new Date().toISOString();

      // 1. Update session status to 'ended' in Supabase without embedded aggregate
      const { data: updated, error: updateErr } = await supabase
        .from("attendance_sessions")
        .update({
          status: "ended",
          ends_at: nowIso,
        })
        .eq("id", cleanId)
        .select(`*, course:courses(*), classroom:classrooms(*)`)
        .maybeSingle();

      if (updateErr) {
        console.error("Supabase endSession update error:", updateErr);
        return NextResponse.json(
          { success: false, message: updateErr.message || "Failed to end session in database." },
          { status: 500 },
        );
      }

      if (updated) {
        // 2. Fetch attendance count separately to avoid PostgREST RETURNING aggregate bug
        let recordCount = 0;
        try {
          const { count } = await supabase
            .from("attendance_records")
            .select("*", { count: "exact", head: true })
            .eq("session_id", cleanId);
          recordCount = count || 0;
        } catch {
          // ignore count error
        }

        // 3. Keep in-memory store in sync if active
        try {
          db.endSession(cleanId, lecturerId || updated.lecturer_id);
        } catch {
          // ignore memory db missing
        }

        return NextResponse.json({
          success: true,
          session: {
            ...updated,
            record_count: recordCount,
          },
        });
      }
    }

    // Fallback to in-memory store
    const session = db.endSession(cleanId, lecturerId || "");
    return NextResponse.json({ success: true, session });
  } catch (err: unknown) {
    console.error("Error ending session:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error ending session" },
      { status: 500 },
    );
  }
}

