import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/store";
import {
  isValidMatricNumber,
  isValidFacultyVerificationCode,
  isValidStudentEmail,
  isValidLecturerEmail,
} from "@/lib/auth/roles";
import { UserRole } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const {
      email,
      password,
      firstName,
      lastName,
      matricNumber,
      role,
      staffVerificationCode,
      staffId,
      deviceId,
    } = body || {};

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

    // Validate student institutional email and matric number
    if (cleanRole === "student") {
      if (!isValidStudentEmail(cleanEmail)) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_STUDENT_EMAIL",
            message: "Invalid student email",
          },
          { status: 400 },
        );
      }

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

    // Validate faculty verification code and email for lecturers
    let isVerified = false;
    let cleanStaffId: string | null = null;
    let verifiedAt: string | null = null;

    if (cleanRole === "lecturer") {
      if (!isValidLecturerEmail(cleanEmail)) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_FACULTY_EMAIL",
            message:
              "Invalid faculty email. Academic staff emails must strictly end with @oauife.edu.ng (e.g. adeyemi@oauife.edu.ng). Any other email domain is considered unauthorized.",
          },
          { status: 403 },
        );
      }

      let isKeyValid = false;
      const cleanKeyCode = staffVerificationCode
        ? staffVerificationCode.trim().toUpperCase()
        : "";

      const supabase = getSupabaseServerClient();
      if (supabase && cleanKeyCode) {
        try {
          const { data: dbKey } = await supabase
            .from("faculty_verification_keys")
            .select("*")
            .eq("key_code", cleanKeyCode)
            .eq("is_active", true)
            .maybeSingle();

          if (dbKey) {
            const notExpired =
              !dbKey.expires_at ||
              new Date(dbKey.expires_at).getTime() > Date.now();
            const hasUses =
              dbKey.max_uses === null || dbKey.used_count < dbKey.max_uses;
            if (notExpired && hasUses) {
              isKeyValid = true;
              await supabase
                .from("faculty_verification_keys")
                .update({ used_count: dbKey.used_count + 1 })
                .eq("id", dbKey.id);
            }
          }
        } catch {
          // ignore error
        }
      }

      if (!isKeyValid && cleanKeyCode) {
        const memoryCheck = db.validateAndConsumeFacultyKey(cleanKeyCode);
        if (memoryCheck.valid) {
          isKeyValid = true;
        }
      }

      if (!isKeyValid) {
        isKeyValid = isValidFacultyVerificationCode(staffVerificationCode);
      }

      if (!isKeyValid) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_FACULTY_CODE",
            message:
              "Invalid or expired Faculty Verification Key. A valid departmental staff authorization code is required to register as academic staff.",
          },
          { status: 403 },
        );
      }
      isVerified = true;
      cleanStaffId = staffId ? staffId.trim().toUpperCase() : null;
      verifiedAt = new Date().toISOString();
    }

    // Single device binding for students
    let boundDeviceId: string | null = null;
    let deviceBoundAt: string | null = null;

    if (cleanRole === "student" && deviceId) {
      boundDeviceId = String(deviceId).trim();
      deviceBoundAt = new Date().toISOString();
    }

    const supabase = getSupabaseServerClient();
    let profile: any = null;

    if (supabase) {
      // Check if this device is already bound to another student in Supabase
      if (cleanRole === "student" && boundDeviceId) {
        const { data: existingDeviceProfile } = await supabase
          .from("profiles")
          .select("id, email, matric_number")
          .eq("device_id", boundDeviceId)
          .neq("email", cleanEmail)
          .maybeSingle();

        if (existingDeviceProfile) {
          return NextResponse.json(
            {
              success: false,
              code: "DEVICE_ALREADY_BOUND",
              message: `This device is already linked to another student account (${existingDeviceProfile.matric_number || "registered student"}). To uphold academic integrity, each device can only be bound to one student.`,
            },
            { status: 403 },
          );
        }
      }

      // Check if user profile already exists with this email in Supabase
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id, email, matric_number")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            message: "An account with this email address already exists. Please sign in instead.",
          },
          { status: 400 },
        );
      }

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
            device_id: boundDeviceId,
            is_verified: isVerified,
            staff_id: cleanStaffId,
          },
        });
        authData = adminRes.data;
        authError = adminRes.error;
      } catch (err: any) {
        authError = err;
      }

      // If admin method was rejected with "User not allowed", fall back to standard auth.signUp
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
              device_id: boundDeviceId,
              is_verified: isVerified,
              staff_id: cleanStaffId,
            },
          },
        });
        authData = signUpRes.data;
        authError = signUpRes.error;
      }

      if (authError) {
        const msg = authError.message || "";
        if (msg.toLowerCase().includes("already")) {
          return NextResponse.json(
            {
              success: false,
              message: "An account with this email address already exists. Please sign in instead.",
            },
            { status: 400 },
          );
        }

        const errorMsg = msg.toLowerCase().includes("rate")
          ? "Supabase email rate limit exceeded. Please disable 'Confirm email' in Supabase Dashboard (Authentication -> Providers -> Email) to allow instant registration without email confirmations."
          : msg || "Registration failed.";

        return NextResponse.json(
          { success: false, message: errorMsg },
          { status: 400 },
        );
      }

      // 2. Fetch or upsert profile in public.profiles
      const userId = authData?.user?.id;
      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to create user account. Please check your details and try again.",
          },
          { status: 400 },
        );
      }

      const profilePayload: any = {
        id: userId,
        email: cleanEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        matric_number: cleanMatric,
        role: cleanRole,
        device_id: boundDeviceId,
        device_bound_at: deviceBoundAt,
        is_verified: isVerified,
        staff_id: cleanStaffId,
        verified_at: verifiedAt,
        updated_at: new Date().toISOString(),
      };

      const { data: dbProfile, error: profileError } = await supabase
        .from("profiles")
        .upsert([profilePayload])
        .select()
        .single();

      if (profileError || !dbProfile) {
        profile = {
          ...profilePayload,
          created_at: new Date().toISOString(),
        };
      } else {
        profile = dbProfile;
      }
    } else {
      // Local / In-memory fallback
      const existingProfile = db.getProfileByEmail(cleanEmail);
      if (existingProfile) {
        return NextResponse.json(
          {
            success: false,
            message: "An account with this email address already exists. Please sign in instead.",
          },
          { status: 400 },
        );
      }

      if (cleanRole === "student" && boundDeviceId) {
        const existingDevice = db.getProfileByDeviceId(boundDeviceId);
        if (existingDevice && existingDevice.email.toLowerCase() !== cleanEmail) {
          return NextResponse.json(
            {
              success: false,
              code: "DEVICE_ALREADY_BOUND",
              message: `This device is already linked to another student account (${existingDevice.matric_number || "student"}). To uphold academic integrity, each device can only be bound to one student.`,
            },
            { status: 403 },
          );
        }
      }

      const id = "u-" + crypto.randomUUID();
      profile = db.saveProfile({
        id,
        email: cleanEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        matric_number: cleanMatric,
        role: cleanRole,
        device_id: boundDeviceId,
        device_bound_at: deviceBoundAt,
        is_verified: isVerified,
        staff_id: cleanStaffId,
        verified_at: verifiedAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (!profile || !profile.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to complete registration. Please try again.",
        },
        { status: 500 },
      );
    }

    const sessionPayload = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      matric_number: profile.matric_number,
      device_id: profile.device_id,
      is_verified: profile.is_verified,
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
