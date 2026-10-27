import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabaseServerClient();
    let profile: any = null;

    if (supabase) {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

      if (authError || !authData.user) {
        return NextResponse.json(
          {
            success: false,
            message: authError?.message || "Invalid email or password.",
          },
          { status: 401 },
        );
      }

      // 2. Fetch user profile from public.profiles
      const { data: dbProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !dbProfile) {
        return NextResponse.json(
          {
            success: false,
            message: "User profile not found. Please contact administration.",
          },
          { status: 404 },
        );
      }

      profile = dbProfile;
    } else {
      // Local / In-memory fallback
      profile = db.getProfileByEmail(cleanEmail);
      if (!profile) {
        return NextResponse.json(
          { success: false, message: "Invalid email or password." },
          { status: 401 },
        );
      }
    }

    const sessionPayload = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      matric_number: profile.matric_number,
    };

    const res = NextResponse.json({
      success: true,
      message: "Signed in successfully.",
      user: profile,
    });

    // Set session cookie for middleware protection
    res.cookies.set("proxi_session", JSON.stringify(sessionPayload), {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "lax",
    });

    return res;
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error signing in" },
      { status: 500 },
    );
  }
}
