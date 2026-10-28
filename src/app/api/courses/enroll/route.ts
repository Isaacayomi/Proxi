import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { courseId, studentId, action = "enroll" } = body || {};

    if (!courseId || !studentId) {
      return NextResponse.json(
        { success: false, message: "Course ID and Student ID are required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (action === "unenroll") {
        const { error } = await supabase
          .from("course_enrollments")
          .delete()
          .eq("course_id", courseId)
          .eq("student_id", studentId);

        if (error) {
          return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 },
          );
        }
      } else {
        // Ensure student profile exists in public.profiles table
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", studentId)
          .maybeSingle();

        if (!prof) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(studentId);
            if (authUser?.user) {
              const meta = authUser.user.user_metadata || {};
              await supabase.from("profiles").upsert([
                {
                  id: studentId,
                  email: authUser.user.email || "student@proxi.app",
                  first_name: meta.first_name || "Student",
                  last_name: meta.last_name || "",
                  matric_number: meta.matric_number || null,
                  role: meta.role || "student",
                  created_at: authUser.user.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ]);
            }
          } catch (e) {
            console.warn("Could not self-heal profile before enrollment:", e);
          }
        }

        const { error } = await supabase
          .from("course_enrollments")
          .upsert(
            [{ course_id: courseId, student_id: studentId }],
            { onConflict: "course_id,student_id", ignoreDuplicates: true },
          );

        if (error) {
          return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 },
          );
        }
      }
    }

    // Update in-memory fallback
    if (action === "unenroll") {
      db.unenrollStudentFromCourse(courseId, studentId);
    } else {
      db.enrollStudentInCourse(courseId, studentId);
    }

    return NextResponse.json({
      success: true,
      message:
        action === "unenroll"
          ? "Successfully dropped course."
          : "Successfully registered for course.",
      action,
      courseId,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Error processing enrollment.",
      },
      { status: 500 },
    );
  }
}

