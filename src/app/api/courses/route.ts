import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return NextResponse.json({ success: true, courses: data });
      }
    }

    const courses = db.listCourses();
    return NextResponse.json({ success: true, courses });
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
