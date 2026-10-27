import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lecturerId = searchParams.get("lecturerId") || undefined;
    const courseId = searchParams.get("courseId") || undefined;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      let query = supabase
        .from("attendance_sessions")
        .select(`
          *,
          course:courses(*),
          classroom:classrooms(*),
          records:attendance_records(count)
        `)
        .order("created_at", { ascending: false });

      if (lecturerId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lecturerId);
        if (isUuid) {
          query = query.eq("lecturer_id", lecturerId);
        }
      }
      if (courseId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
        if (isUuid) {
          query = query.eq("course_id", courseId);
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        const mapped = data.map((s: any) => ({
          ...s,
          record_count: s.records?.[0]?.count || 0,
        }));
        return NextResponse.json({ success: true, sessions: mapped });
      }
    }

    const sessions = db.listSessions({ lecturerId, courseId });
    return NextResponse.json({ success: true, sessions });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error listing sessions" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { courseId, lecturerId, classroomId, radiusMeters, durationMinutes } = body || {};

    if (!courseId || !lecturerId || !classroomId) {
      return NextResponse.json(
        { success: false, message: "Course, Lecturer, and Classroom are required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      // 1. Ensure a valid lecturer UUID for foreign key constraint
      let validLecturerId = lecturerId;
      if (validLecturerId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", validLecturerId)
          .maybeSingle();
        if (!prof) validLecturerId = null;
      }

      if (!validLecturerId) {
        const { data: anyLecturer } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "lecturer")
          .limit(1)
          .maybeSingle();
        validLecturerId = anyLecturer?.id || lecturerId;
      }

      // Fetch classroom coordinates
      const { data: room, error: roomErr } = await supabase
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .single();

      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (room && course && validLecturerId) {
        const now = new Date();
        const duration = durationMinutes || 60;
        const endsAt = new Date(now.getTime() + duration * 60000);
        const radius = radiusMeters || room.default_radius_meters;

        const { data: session, error } = await supabase
          .from("attendance_sessions")
          .insert([
            {
              course_id: courseId,
              lecturer_id: validLecturerId,
              classroom_id: classroomId,
              latitude: room.latitude,
              longitude: room.longitude,
              radius_meters: Math.min(500, Math.max(10, radius)),
              max_accuracy_meters: 300,
              starts_at: now.toISOString(),
              ends_at: endsAt.toISOString(),
              status: "active",
              session_code: course.code.replace(/\s+/g, ""),
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Supabase session insert error:", error);
          return NextResponse.json(
            { success: false, message: error.message || "Failed to create session in database." },
            { status: 500 },
          );
        }

        if (session) {
          return NextResponse.json(
            {
              success: true,
              session: {
                ...session,
                course,
                classroom: room,
                record_count: 0,
              },
            },
            { status: 201 },
          );
        }
      }
    }

    const session = db.createSession({
      course_id: courseId,
      lecturer_id: lecturerId,
      classroom_id: classroomId,
      radius_meters: radiusMeters,
      durationMinutes,
    });

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error creating session" },
      { status: 500 },
    );
  }
}

