import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lecturerId = searchParams.get("lecturerId") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const studentId = searchParams.get("studentId") || undefined;

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
      if (studentId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
        if (isUuid) {
          const { data: enrollments } = await supabase
            .from("course_enrollments")
            .select("course_id")
            .eq("student_id", studentId);

          const enrolledCourseIds = (enrollments || []).map((e: any) => e.course_id);
          if (enrolledCourseIds.length === 0) {
            return NextResponse.json({ success: true, sessions: [] });
          }
          query = query.in("course_id", enrolledCourseIds);
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        const checkedInMap = new Map<string, string>();
        if (studentId && data.length > 0) {
          const sessionIds = (data || []).filter(Boolean).map((s: any) => s?.id).filter(Boolean);
          const { data: records } = await supabase
            .from("attendance_records")
            .select("session_id, submitted_at, status")
            .eq("student_id", studentId)
            .in("session_id", sessionIds);

          if (records) {
            for (const r of records) {
              if (r.status === "present") {
                checkedInMap.set(r.session_id, r.submitted_at);
              }
            }
          }
        }

        const now = new Date();
        const mapped = (data || []).filter(Boolean).map((s: any) => {
          let currentStatus = s?.status;
          if (currentStatus === "active" && s?.ends_at && new Date(s.ends_at) < now) {
            currentStatus = "ended";
          }
          return {
            ...s,
            status: currentStatus,
            record_count: s?.records?.[0]?.count || 0,
            has_checked_in: checkedInMap.has(s?.id),
            checked_in_at: checkedInMap.get(s?.id) || null,
          };
        });
        return NextResponse.json({ success: true, sessions: mapped });
      }
    }

    if (studentId) {
      const studentSessions = db.getActiveStudentSessions(studentId);
      return NextResponse.json({ success: true, sessions: studentSessions });
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
    const {
      courseId,
      lecturerId,
      classroomId,
      radiusMeters,
      durationMinutes,
      customLatitude,
      customLongitude,
    } = body || {};

    let resolvedLecturerId = lecturerId;
    if (!resolvedLecturerId) {
      const cookie = req.cookies.get("proxi_session")?.value;
      if (cookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie));
          if (parsed?.id) resolvedLecturerId = parsed.id;
        } catch {
          // ignore
        }
      }
    }

    if (!courseId || !resolvedLecturerId || !classroomId) {
      return NextResponse.json(
        { success: false, message: "Course, Lecturer, and Classroom are required." },
        { status: 400 },
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let validLecturerId: string | null = isUuid.test(resolvedLecturerId) ? resolvedLecturerId : null;

      if (validLecturerId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", validLecturerId)
          .maybeSingle();

        if (!prof) {
          // If profile is missing from public.profiles, try fetching from Supabase auth admin
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(validLecturerId);
            if (authUser?.user) {
              const meta = authUser.user.user_metadata || {};
              await supabase.from("profiles").upsert([
                {
                  id: validLecturerId,
                  email: authUser.user.email || "",
                  first_name: meta.first_name || "Faculty",
                  last_name: meta.last_name || "Member",
                  role: meta.role || "lecturer",
                  updated_at: new Date().toISOString(),
                },
              ]);
            } else {
              validLecturerId = null;
            }
          } catch {
            validLecturerId = null;
          }
        }
      }

      // If lecturerId was not a UUID (e.g. dev demo mock user), resolve any existing lecturer profile
      if (!validLecturerId && !isUuid.test(resolvedLecturerId)) {
        const { data: anyLecturer } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "lecturer")
          .limit(1)
          .maybeSingle();
        validLecturerId = anyLecturer?.id || null;
      }

      if (!validLecturerId) {
        return NextResponse.json(
          { success: false, message: "Valid lecturer profile not found. Please log in again." },
          { status: 401 },
        );
      }

      // Fetch classroom coordinates
      const { data: room, error: roomErr } = await supabase
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .maybeSingle();

      if (roomErr || !room) {
        return NextResponse.json(
          { success: false, message: "Selected classroom venue was not found." },
          { status: 404 },
        );
      }

      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();

      if (courseErr || !course) {
        return NextResponse.json(
          { success: false, message: "Selected course was not found." },
          { status: 404 },
        );
      }

      const now = new Date();
      const duration = durationMinutes || 60;
      const endsAt = new Date(now.getTime() + duration * 60000);
      const radius = radiusMeters || room.default_radius_meters;
      const finalLat =
        typeof customLatitude === "number" && !isNaN(customLatitude)
          ? customLatitude
          : room.latitude;
      const finalLon =
        typeof customLongitude === "number" && !isNaN(customLongitude)
          ? customLongitude
          : room.longitude;

      const { data: session, error } = await supabase
        .from("attendance_sessions")
        .insert([
          {
            course_id: courseId,
            lecturer_id: validLecturerId,
            classroom_id: classroomId,
            latitude: finalLat,
            longitude: finalLon,
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

    const session = db.createSession({
      course_id: courseId,
      lecturer_id: resolvedLecturerId,
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

