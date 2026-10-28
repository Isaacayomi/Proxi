import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/store";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("faculty_verification_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return NextResponse.json({ success: true, keys: data });
      }
    }

    const keys = db.listFacultyKeys();
    return NextResponse.json({ success: true, keys });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : "Error listing verification keys",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { keyCode, department, note, maxUses, createdBy } = body || {};

    const cleanCode = (
      keyCode?.trim() ||
      "FAC-" +
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        "-" +
        Math.random().toString(36).substring(2, 6).toUpperCase()
    ).toUpperCase();

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("faculty_verification_keys")
        .insert([
          {
            key_code: cleanCode,
            department: department?.trim() || "Computer Science & Engineering",
            note: note?.trim() || null,
            max_uses: maxUses !== undefined && maxUses !== null ? parseInt(maxUses, 10) : 1,
            is_active: true,
            created_by: createdBy || null,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        // Also sync in-memory
        db.createFacultyKey({
          key_code: cleanCode,
          department: data.department,
          note: data.note,
          max_uses: data.max_uses,
          created_by: data.created_by,
        });

        return NextResponse.json({ success: true, key: data }, { status: 201 });
      }
    }

    const key = db.createFacultyKey({
      key_code: cleanCode,
      department,
      note,
      max_uses: maxUses !== undefined && maxUses !== null ? parseInt(maxUses, 10) : 1,
      created_by: createdBy,
    });

    return NextResponse.json({ success: true, key }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Error generating verification key",
      },
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
        { success: false, message: "Key ID is required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase
        .from("faculty_verification_keys")
        .update({ is_active: false })
        .eq("id", id);
    }

    db.revokeFacultyKey(id);

    return NextResponse.json({
      success: true,
      message: "Faculty verification key revoked successfully.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Error revoking verification key",
      },
      { status: 500 },
    );
  }
}

