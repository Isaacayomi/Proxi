"use client";

import React, { useState, useEffect } from "react";
import { Course, Classroom } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { MapPin, Navigation, Compass, Clock, Radio, BookOpen, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateSessionFormProps {
  courses: Course[];
  classrooms: Classroom[];
  lecturerId: string;
  onSessionCreated: (sessionId: string) => void;
}

export function CreateSessionForm({
  courses,
  classrooms,
  lecturerId,
  onSessionCreated,
}: CreateSessionFormProps) {
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id || "");
  const [radiusMeters, setRadiusMeters] = useState(
    classrooms[0]?.default_radius_meters || 50,
  );
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courses.length > 0 && (!courseId || !courses.some((c) => c.id === courseId))) {
      setCourseId(courses[0].id);
    }
  }, [courses, courseId]);

  useEffect(() => {
    if (classrooms.length > 0 && (!classroomId || !classrooms.some((c) => c.id === classroomId))) {
      setClassroomId(classrooms[0].id);
      setRadiusMeters(classrooms[0].default_radius_meters || 50);
    }
  }, [classrooms, classroomId]);

  const selectedClassroom = classrooms.find((c) => c.id === classroomId);

  const handleClassroomChange = (id: string) => {
    setClassroomId(id);
    const room = classrooms.find((c) => c.id === id);
    if (room) {
      setRadiusMeters(room.default_radius_meters);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId || !classroomId) {
      setError("Please select both a course and a classroom.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          classroomId,
          lecturerId,
          radiusMeters: Number(radiusMeters),
          durationMinutes: Number(durationMinutes),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create attendance session");
      }

      onSessionCreated(data.session.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto border border-slate-200/90 shadow-card">
      <CardHeader>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-proxi-green flex items-center justify-center shrink-0 shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Launch Attendance Session</CardTitle>
            <CardDescription>
              Activate real-time GPS geofence boundary for classroom roll call.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 pt-4">
          {error && (
            <Alert variant="error" title="Session Configuration Error">
              {error}
            </Alert>
          )}

          {/* Course Selector */}
          <Select
            label="Select Course"
            icon={<BookOpen className="w-3.5 h-3.5 text-emerald-600" />}
            value={courseId}
            onChange={(val) => setCourseId(val)}
            options={courses.map((c) => ({
              value: c.id,
              label: c.name,
              badge: c.code,
              subLabel: c.department,
            }))}
            placeholder="Choose a course..."
            required
          />

          {/* Classroom Selector */}
          <Select
            label="Classroom Venue & Coordinates"
            icon={<Building2 className="w-3.5 h-3.5 text-emerald-600" />}
            value={classroomId}
            onChange={(val) => handleClassroomChange(val)}
            options={classrooms.map((room) => ({
              value: room.id,
              label: room.name,
              badge: `${room.default_radius_meters}m`,
              subLabel: `${room.building}${room.room_number ? ` • ${room.room_number}` : ""}`,
            }))}
            placeholder="Choose a venue..."
            required
          />

          {/* Classroom Coordinates Display */}
          {selectedClassroom && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs font-sans">
              <div className="flex items-center gap-2 text-proxi-ink font-mono font-medium">
                <MapPin className="w-4 h-4 text-proxi-green shrink-0" />
                <span>
                  {selectedClassroom.latitude.toFixed(6)}, {selectedClassroom.longitude.toFixed(6)}
                </span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">Default: {selectedClassroom.default_radius_meters}m</span>
            </div>
          )}

          {/* Geofence Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 font-sans">
                Permitted Geofence Radius
              </label>
              <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                {radiusMeters} meters
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="w-full accent-proxi-green cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-sans">
              <span>Small Lab (20m)</span>
              <span>Standard LT (50-60m)</span>
              <span>Auditorium (120m+)</span>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 font-sans">
              Session Active Window
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setDurationMinutes(mins)}
                  className={cn(
                    "py-2.5 text-xs font-bold rounded-xl border transition-all font-sans cursor-pointer",
                    durationMinutes === mins
                      ? "bg-proxi-mint text-proxi-darkGreen border-emerald-300 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  )}
                >
                  {mins} mins
                </button>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50/60">
          <div className="text-xs text-slate-500 font-sans">
            Students must be physically within {radiusMeters}m to check in.
          </div>
          <Button type="submit" isLoading={isSubmitting}>
            Start Geofence Session
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
