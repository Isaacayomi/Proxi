import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("classrooms")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return NextResponse.json({ success: true, classrooms: data });
      }
    }

    const classrooms = db.listClassrooms();
    return NextResponse.json({ success: true, classrooms });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error listing classrooms" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { name, building, room_number, latitude, longitude, default_radius_meters } =
      body || {};

    if (!name || !building || typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { success: false, message: "Name, Building, Latitude, and Longitude are required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("classrooms")
        .insert([
          {
            name,
            building,
            room_number: room_number || null,
            latitude,
            longitude,
            default_radius_meters: default_radius_meters || 50,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, classroom: data }, { status: 201 });
      }
    }

    const classroom = db.createClassroom({
      name,
      building,
      room_number: room_number || null,
      latitude,
      longitude,
      default_radius_meters: default_radius_meters || 50,
    });

    return NextResponse.json({ success: true, classroom }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error creating classroom" },
      { status: 500 },
    );
  }
}
