import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || undefined;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: allCourses, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && allCourses) {
        if (studentId) {
          const { data: enrollments } = await supabase
            .from("course_enrollments")
            .select("course_id")
            .eq("student_id", studentId);

          const enrolledIds = new Set(
            (enrollments || []).filter(Boolean).map((e: any) => e?.course_id).filter(Boolean),
          );
          const enrolledCourses = (allCourses || []).filter(
            (c: any) => c && c.id && enrolledIds.has(c.id),
          );
          const availableCourses = (allCourses || []).filter(
            (c: any) => c && c.id && !enrolledIds.has(c.id),
          );

          return NextResponse.json({
            success: true,
            courses: (allCourses || []).filter((c: any) => c && c.id),
            enrolledCourses,
            availableCourses,
            enrolledCourseIds: Array.from(enrolledIds),
          });
        }

        return NextResponse.json({
          success: true,
          courses: (allCourses || []).filter((c: any) => c && c.id),
          enrolledCourses: [],
          availableCourses: (allCourses || []).filter((c: any) => c && c.id),
          enrolledCourseIds: [],
        });
      }
    }

    const allCourses = db.listCourses().filter((c) => c && c.id);
    if (studentId) {
      const enrolledCourses = db.getStudentCourses(studentId).filter((c) => c && c.id);
      const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
      const availableCourses = allCourses.filter((c) => c && c.id && !enrolledIds.has(c.id));
      return NextResponse.json({
        success: true,
        courses: allCourses,
        enrolledCourses,
        availableCourses,
        enrolledCourseIds: Array.from(enrolledIds),
      });
    }

    return NextResponse.json({
      success: true,
      courses: allCourses,
      enrolledCourses: [],
      availableCourses: allCourses,
      enrolledCourseIds: [],
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error listing courses" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { code, name, department } = body || {};

    if (!code || !name) {
      return NextResponse.json(
        { success: false, message: "Course code and name are required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("courses")
        .insert([
          {
            code,
            name,
            department: department || "General",
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, course: data }, { status: 201 });
      }
    }

    const course = db.createCourse({
      code,
      name,
      department: department || "General",
    });

    return NextResponse.json({ success: true, course }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error creating course" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => null);
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Course ID is required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from("course_enrollments").delete().eq("course_id", id);
      await supabase.from("course_lecturers").delete().eq("course_id", id);

      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id")
        .eq("course_id", id);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: any) => s.id);
        await supabase
          .from("attendance_records")
          .delete()
          .in("session_id", sessionIds);
        await supabase
          .from("attendance_sessions")
          .delete()
          .eq("course_id", id);
      }

      await supabase.from("courses").delete().eq("id", id);
    }

    db.deleteCourse(id);

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Error deleting course",
      },
      { status: 500 },
    );
  }
}
