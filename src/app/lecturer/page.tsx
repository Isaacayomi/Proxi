"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { db } from "@/lib/db/store";
import { AttendanceSession, Course } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionMonitor } from "@/components/lecturer/session-monitor";
import { CreateSessionModal } from "@/components/lecturer/create-session-modal";
import { FacultyKeysModal } from "@/components/lecturer/faculty-keys-modal";
import { formatTime, formatDateTime } from "@/lib/utils";
import { Compass, Plus, Users, MapPin, Clock, BookOpen, Building2, ArrowRight, ShieldCheck, Key } from "lucide-react";

export default function LecturerDashboardPage() {
  const { user } = useAuth();
  const lecturerId = user?.id || "";

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        setIsCreateModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    // 1. Fetch sessions for this lecturer
    const url = lecturerId
      ? `/api/attendance/sessions?lecturerId=${lecturerId}`
      : "/api/attendance/sessions";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
        } else {
          setSessions([]);
        }
      })
      .catch(() => {
        setSessions([]);
      });

    // 2. Fetch courses
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.courses)) {
          setAssignedCourses(data.courses);
        } else {
          setAssignedCourses([]);
        }
      })
      .catch(() => {
        setAssignedCourses([]);
      });
  }, [lecturerId, refreshKey]);

  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/90 shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-proxi-green uppercase tracking-wider font-mono">
              Faculty Command Center
            </span>
            <Badge variant="success" size="sm">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified Academic Staff
              </span>
            </Badge>
            {user?.staff_id && (
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                {user.staff_id}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-proxi-ink tracking-tight font-sans">
            {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "Faculty Member"}
          </h1>
          <p className="text-xs text-slate-500 font-sans">{user?.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsKeysModalOpen(true)}
            className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
          >
            <Key className="w-3.5 h-3.5 text-emerald-600" />
            Faculty Keys
          </Button>
          <Link href="/lecturer/classrooms">
            <Button variant="outline" size="sm">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Classrooms & GPS
            </Button>
          </Link>
          <Link href="/lecturer/courses">
            <Button variant="outline" size="sm">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              Courses
            </Button>
          </Link>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Start New Session
          </Button>
        </div>
      </div>

      {/* Active Session Spotlight (Live Attendee List) */}
      {activeSessions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-proxi-ink flex items-center gap-2 font-sans">
              <Compass className="w-5 h-5 text-proxi-green animate-spin" />
              Active Classroom Geofences in Progress
            </h2>
            <Badge variant="success">{activeSessions.length} Live</Badge>
          </div>

          <div className="space-y-6">
            {activeSessions.map((s) => (
              <SessionMonitor
                key={s.id}
                session={s}
                records={[]}
                lecturerId={lecturerId}
                onSessionEnded={() => {
                  setSessions((prev) =>
                    prev.map((item) =>
                      item.id === s.id ? { ...item, status: "ended" } : item,
                    ),
                  );
                  setRefreshKey((k) => k + 1);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Assigned Courses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-proxi-ink flex items-center gap-2 font-sans">
              <BookOpen className="w-4 h-4 text-proxi-green" />
              Assigned Courses
            </h2>
            <p className="text-xs text-slate-500">
              Departmental courses authorized for GPS geofence roll call.
            </p>
          </div>
          <Link href="/lecturer/courses" className="text-xs font-bold text-proxi-green hover:underline">
            Manage courses →
          </Link>
        </div>

        {assignedCourses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-10">
              <p className="text-xs text-slate-500">No courses configured yet. Add your first course to begin launching attendance sessions.</p>
              <Link href="/lecturer/courses" className="mt-3 inline-block">
                <Button size="sm">Create Course</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {assignedCourses.map((course) => (
              <Card key={course.id} className="border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
                <CardContent className="p-5 space-y-1.5">
                  <span className="text-[11px] font-bold font-mono text-proxi-green uppercase">
                    {course.code}
                  </span>
                  <h4 className="text-sm font-bold text-proxi-ink tracking-tight font-sans">
                    {course.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {course.department}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent Sessions History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-proxi-ink font-sans">Session History & Exports</h2>
            <p className="text-xs text-slate-500">Audit logs and permanent attendance sheets.</p>
          </div>
          <Link href="/lecturer/reports">
            <span className="text-xs font-bold text-proxi-green hover:underline flex items-center gap-1">
              View full reports <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-12 text-xs text-slate-500">
              No previous attendance sessions recorded. Start your first session above.
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200/80 shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-3.5">Course</th>
                    <th className="px-6 py-3.5">Classroom</th>
                    <th className="px-6 py-3.5">Date & Time</th>
                    <th className="px-6 py-3.5">Attendees</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.slice(0, 10).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-proxi-ink">{s.course?.code}</div>
                        <div className="text-xs text-slate-500">{s.course?.name}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-700">
                        {s.classroom?.name} ({s.radius_meters}m radius)
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(s.starts_at)}
                      </td>
                      <td className="px-6 py-4 font-bold text-proxi-green">
                        {s.record_count || 0} students
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={s.status === "active" ? "success" : "neutral"} size="sm">
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {/* Modal for Creating / Starting a Session */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        courses={assignedCourses}
        lecturerId={lecturerId}
        onSessionCreated={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Modal for Generating & Managing Faculty Verification Keys */}
      <FacultyKeysModal
        isOpen={isKeysModalOpen}
        onClose={() => setIsKeysModalOpen(false)}
        currentUserId={user?.id}
      />
    </div>
  );
}
