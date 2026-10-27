"use client";

import React, { useState, useEffect } from "react";
import { Course, Classroom } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  MapPin,
  Clock,
  Radio,
  Building2,
  BookOpen,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses?: Course[];
  classrooms?: Classroom[];
  lecturerId: string;
  onSessionCreated: (sessionId: string) => void;
}

const RADIUS_PRESETS = [
  { label: "Lab", value: 30 },
  { label: "Standard Hall", value: 80 },
  { label: "Auditorium", value: 150 },
  { label: "Testing / Wide", value: 500 },
];

const DURATION_PRESETS = [30, 45, 60, 90, 120];

export function CreateSessionModal({
  isOpen,
  onClose,
  courses: initialCourses,
  classrooms: initialClassrooms,
  lecturerId,
  onSessionCreated,
}: CreateSessionModalProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses || []);
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms || []);
  const [loading, setLoading] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(80);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const handleCaptureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setIsCapturingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setUseCurrentLocation(true);
        setIsCapturingLocation(false);
      },
      () => {
        setError("Could not capture device location. Please allow browser location access.");
        setIsCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Fetch courses and classrooms if not passed or empty
  useEffect(() => {
    if (!isOpen) return;

    if (initialCourses && initialCourses.length > 0) {
      setCourses(initialCourses);
    }
    if (initialClassrooms && initialClassrooms.length > 0) {
      setClassrooms(initialClassrooms);
    }

    if (!initialCourses?.length || !initialClassrooms?.length) {
      setLoading(true);
      Promise.all([
        fetch("/api/courses").then((r) => r.json()),
        fetch("/api/classrooms").then((r) => r.json()),
      ])
        .then(([coursesData, classroomsData]) => {
          if (coursesData.success && Array.isArray(coursesData.courses)) {
            setCourses(coursesData.courses);
          }
          if (classroomsData.success && Array.isArray(classroomsData.classrooms)) {
            setClassrooms(classroomsData.classrooms);
          }
        })
        .catch((err) => {
          console.error("Failed to load courses or classrooms:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, initialCourses, initialClassrooms]);

  // Synchronize selection
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
  const selectedCourse = courses.find((c) => c.id === courseId);

  const handleClassroomChange = (id: string) => {
    setClassroomId(id);
    const room = classrooms.find((c) => c.id === id);
    if (room) {
      setRadiusMeters(room.default_radius_meters);
    }
  };

  const getEstimatedEndTime = () => {
    const d = new Date(Date.now() + durationMinutes * 60000);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
          customLatitude: useCurrentLocation && currentCoords ? currentCoords.lat : undefined,
          customLongitude: useCurrentLocation && currentCoords ? currentCoords.lon : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create attendance session");
      }

      onSessionCreated(data.session.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200/80 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Proxi Geofence Engine
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-proxi-ink tracking-tight font-sans">
              Launch Attendance Session
            </h2>
          </div>
        </div>
      }
      description="Configure GPS-verified classroom roll call. Only physically present students will be able to mark attendance."
    >
      {loading ? (
        <div className="py-14 text-center space-y-3 font-sans">
          <div className="w-9 h-9 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your courses and registered halls...</p>
        </div>
      ) : courses.length === 0 || classrooms.length === 0 ? (
        <div className="p-7 text-center space-y-4 rounded-2xl border border-amber-200/90 bg-amber-50/50">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900 font-sans">Setup Required</h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed font-sans">
              You must register at least one course and one classroom with coordinates before launching a geofence.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 pt-2">
            {courses.length === 0 && (
              <Link href="/lecturer/courses" onClick={onClose}>
                <Button size="sm">
                  <BookOpen className="w-3.5 h-3.5" />
                  Add Course
                </Button>
              </Link>
            )}
            {classrooms.length === 0 && (
              <Link href="/lecturer/classrooms" onClick={onClose}>
                <Button variant="outline" size="sm">
                  <Building2 className="w-3.5 h-3.5" />
                  Add Classroom
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 font-sans">
          {error && <Alert variant="error">{error}</Alert>}

          {/* Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                Select Course
              </label>
              <div className="relative">
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs appearance-none cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Classroom Venue Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Lecture Venue
              </label>
              <div className="relative">
                <select
                  value={classroomId}
                  onChange={(e) => handleClassroomChange(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs appearance-none cursor-pointer"
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.building ? `(${c.building})` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Venue GPS Preview Chip & Live Location Pin */}
          <div className="space-y-2">
            {selectedClassroom && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 via-slate-50 to-teal-50/40 rounded-2xl border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{selectedClassroom.name}</span>
                    <span className="text-slate-500 font-mono text-[11px] ml-2">
                      {selectedClassroom.latitude.toFixed(5)}°, {selectedClassroom.longitude.toFixed(5)}°
                    </span>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  Default: {selectedClassroom.default_radius_meters}m
                </Badge>
              </div>
            )}

            {/* Quick Live Location Pin for Testing / In-Venue Launch */}
            {useCurrentLocation && currentCoords ? (
              <div className="p-3 bg-emerald-100/80 rounded-xl border border-emerald-300 flex items-center justify-between text-xs font-sans shadow-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  Anchored to your device GPS ({currentCoords.lat.toFixed(5)}°, {currentCoords.lon.toFixed(5)}°)
                </span>
                <button
                  type="button"
                  onClick={() => setUseCurrentLocation(false)}
                  className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 ml-2 shrink-0"
                >
                  Use Venue Coords
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCaptureCurrentLocation}
                disabled={isCapturingLocation}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Compass className={`w-3.5 h-3.5 text-emerald-600 ${isCapturingLocation ? "animate-spin" : ""}`} />
                {isCapturingLocation ? "Acquiring your current GPS..." : "📍 Anchor geofence to my device's current location (Recommended for testing)"}
              </button>
            )}
          </div>

          {/* Allowed Radius Configuration */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                Allowed Geofence Radius
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-emerald-600 font-mono">
                  {radiusMeters}m
                </span>
                <span className="text-[11px] text-slate-500">around center</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            {/* Presets Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {RADIUS_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setRadiusMeters(p.value)}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all text-center ${
                    radiusMeters === p.value
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {p.label} ({p.value}m)
                </button>
              ))}
            </div>
          </div>

          {/* Active Duration Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Active Duration
              </label>
              <span className="text-xs text-slate-500">
                Ends at approx. <strong className="text-slate-800">{getEstimatedEndTime()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                    durationMinutes === mins
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <Radio className="w-3.5 h-3.5" />
              Launch Live Geofence
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
