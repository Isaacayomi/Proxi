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
    const { lecturerId, reason = "Class cancelled by lecturer" } = body || {};

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

      const { data: updated, error: updateErr } = await supabase
        .from("attendance_sessions")
        .update({
          status: "cancelled",
          ends_at: nowIso,
        })
        .eq("id", cleanId)
        .select(`*, course:courses(*), classroom:classrooms(*)`)
        .maybeSingle();

      if (updateErr) {
        console.error("Supabase cancel session update error:", updateErr);
      }

      if (updated) {
        try {
          db.cancelSession(cleanId, lecturerId || updated.lecturer_id);
        } catch {}

        return NextResponse.json({
          success: true,
          message: "Session marked as cancelled and excluded from held attendance counts.",
          session: updated,
        });
      }
    }

    // Fallback to in-memory store
    const session = db.cancelSession(cleanId, lecturerId || "");
    return NextResponse.json({
      success: true,
      message: "Session marked as cancelled and excluded from held attendance counts.",
      session,
    });
  } catch (err: unknown) {
    console.error("Error cancelling session:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error cancelling session" },
      { status: 500 },
    );
  }
}

