import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/store";
import { isValidMatricNumber } from "@/lib/auth/roles";
import { UserRole } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { email, password, firstName, lastName, matricNumber, role } =
      body || {};

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, password, first name, and last name are required.",
        },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole: UserRole = role === "lecturer" ? "lecturer" : "student";
    const cleanMatric =
      cleanRole === "student" && matricNumber
        ? matricNumber.trim().toUpperCase()
        : null;

    // Validate matric number for students
    if (cleanRole === "student") {
      if (!cleanMatric || !isValidMatricNumber(cleanMatric)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Valid matriculation number required (format: ABC/2024/001).",
          },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabaseServerClient();
    let profile: any = null;

    if (supabase) {
      // 1. Create or get user in Supabase Auth
      let authData: any = null;
      let authError: any = null;

      try {
        const adminRes = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            matric_number: cleanMatric,
            role: cleanRole,
          },
        });
        authData = adminRes.data;
        authError = adminRes.error;
      } catch (err: any) {
        authError = err;
      }

      // If admin method was rejected with "User not allowed" (e.g. if client lacks service_role), fall back to standard auth.signUp
      if (
        authError &&
        (authError.message?.toLowerCase().includes("not allowed") ||
          authError.status === 403 ||
          authError.status === 401)
      ) {
        const signUpRes = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              matric_number: cleanMatric,
              role: cleanRole,
            },
          },
        });
        authData = signUpRes.data;
        authError = signUpRes.error;
      }

      if (authError && !authError.message.includes("already")) {
        return NextResponse.json(
          { success: false, message: authError.message },
          { status: 400 },
        );
      }

      let userId = authData?.user?.id;

      if (!userId) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", cleanEmail)
          .single();
        userId = existingUser?.id;
      }

      if (userId) {
        // 2. Upsert public.profiles record
        const { data: dbProfile, error: profileError } = await supabase
          .from("profiles")
          .upsert([
            {
              id: userId,
              email: cleanEmail,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              matric_number: cleanMatric,
              role: cleanRole,
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (profileError) {
          console.warn("Profiles upsert notice:", profileError.message);
          profile = {
            id: userId,
            email: cleanEmail,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            matric_number: cleanMatric,
            role: cleanRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        } else {
          profile = dbProfile;
        }
      }
    } else {
      // Local / In-memory fallback
      const id = "u-" + crypto.randomUUID();
      profile = db.saveProfile({
        id,
        email: cleanEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        matric_number: cleanMatric,
        role: cleanRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const sessionPayload = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      matric_number: profile.matric_number,
    };

    const res = NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        user: profile,
      },
      { status: 201 },
    );

    res.cookies.set("proxi_session", JSON.stringify(sessionPayload), {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return res;
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Error creating account",
      },
      { status: 500 },
    );
  }
}
