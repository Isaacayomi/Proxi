import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/store";
import { isValidStudentEmail, isValidLecturerEmail } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { email, password, deviceId } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanDeviceId = deviceId ? String(deviceId).trim() : null;

    // Reject false or invalid institutional emails
    const isStudent = isValidStudentEmail(cleanEmail);
    const isLecturer = isValidLecturerEmail(cleanEmail);

    if (!isStudent && !isLecturer) {
      if (
        cleanEmail.endsWith("@student.oauife.edu.ng") ||
        cleanEmail.includes("student")
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_STUDENT_EMAIL",
            message:
              "Invalid student email format. Student institutional emails must follow the customized format: initial.surname.deptYearSerial@student.oauife.edu.ng (e.g. i.okunlola.swe2024003@student.oauife.edu.ng).",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: "INVALID_INSTITUTIONAL_EMAIL",
          message:
            "Unrecognized institutional email address. Students must use their customized @student.oauife.edu.ng address (e.g. i.okunlola.swe2024003@student.oauife.edu.ng) and lecturers must use their @oauife.edu.ng address. Any other email is considered false.",
        },
        { status: 400 },
      );
    }
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
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (dbProfile) {
        profile = dbProfile;
      } else {
        // Fallback to user_metadata stored in Supabase Auth
        const meta = authData.user.user_metadata || {};
        profile = {
          id: authData.user.id,
          email: authData.user.email || cleanEmail,
          first_name: meta.first_name || "User",
          last_name: meta.last_name || "",
          matric_number: meta.matric_number || null,
          role: meta.role || "student",
          device_id: meta.device_id || null,
          is_verified: meta.is_verified || false,
          staff_id: meta.staff_id || null,
          created_at: authData.user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          await supabase.from("profiles").upsert([profile]);
        } catch {
          // ignore
        }
      }

      // 3. Single Device Verification for Students
      if (profile.role === "student" && cleanDeviceId) {
        // A. If student already has a bound device
        if (profile.device_id && profile.device_id !== cleanDeviceId) {
          return NextResponse.json(
            {
              success: false,
              code: "DEVICE_MISMATCH",
              message:
                "Access restricted: this account is bound to another registered device. To uphold academic integrity and prevent proxy attendance, each student must log in from their primary bound device.",
            },
            { status: 403 },
          );
        }

        // B. If student has no bound device, verify that this device is not bound to another student
        if (!profile.device_id) {
          const { data: otherStudent } = await supabase
            .from("profiles")
            .select("id, matric_number, email")
            .eq("device_id", cleanDeviceId)
            .neq("id", profile.id)
            .maybeSingle();

          if (otherStudent) {
            return NextResponse.json(
              {
                success: false,
                code: "DEVICE_ALREADY_BOUND",
                message: `This device is already linked to another student account (${otherStudent.matric_number || "registered student"}). Each device can only be bound to one student account.`,
              },
              { status: 403 },
            );
          }

          // Bind device to this student
          profile.device_id = cleanDeviceId;
          profile.device_bound_at = new Date().toISOString();
          try {
            await supabase
              .from("profiles")
              .update({
                device_id: cleanDeviceId,
                device_bound_at: profile.device_bound_at,
              })
              .eq("id", profile.id);
          } catch {
            // ignore
          }
        }
      }
    } else {
      // Local / In-memory fallback
      profile = db.getProfileByEmail(cleanEmail);
      if (!profile) {
        return NextResponse.json(
          { success: false, message: "Invalid email or password." },
          { status: 401 },
        );
      }

      if (profile.role === "student" && cleanDeviceId) {
        if (profile.device_id && profile.device_id !== cleanDeviceId) {
          return NextResponse.json(
            {
              success: false,
              code: "DEVICE_MISMATCH",
              message:
                "Access restricted: this account is bound to another registered device. To uphold academic integrity and prevent proxy attendance, each student must log in from their primary bound device.",
            },
            { status: 403 },
          );
        }

        if (!profile.device_id) {
          const otherStudent = db.getProfileByDeviceId(cleanDeviceId);
          if (otherStudent && otherStudent.id !== profile.id) {
            return NextResponse.json(
              {
                success: false,
                code: "DEVICE_ALREADY_BOUND",
                message: `This device is already linked to another student account (${otherStudent.matric_number || "student"}). Each device can only be bound to one student account.`,
              },
              { status: 403 },
            );
          }

          profile.device_id = cleanDeviceId;
          profile.device_bound_at = new Date().toISOString();
          db.saveProfile(profile);
        }
      }
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

    const res = NextResponse.json({
      success: true,
      message: "Signed in successfully.",
      user: profile,
    });

    res.cookies.set("proxi_session", JSON.stringify(sessionPayload), {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "lax",
    });

    return res;
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Error signing in",
      },
      { status: 500 },
    );
  }
}
