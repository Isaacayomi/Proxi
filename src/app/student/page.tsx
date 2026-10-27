"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { db } from "@/lib/db/store";
import { AttendanceSession, Course } from "@/types/database";
import { CheckInCard } from "@/components/student/check-in-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarCheck, Radio, History, ArrowRight } from "lucide-react";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const studentId = user?.id || "";

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch active sessions
    fetch("/api/attendance/sessions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sessions)) {
          setActiveSessions(
            data.sessions.filter((s: AttendanceSession) => s.status === "active"),
          );
        } else {
          setActiveSessions([]);
        }
      })
      .catch(() => {
        setActiveSessions([]);
      });

    // 2. Fetch courses
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.courses)) {
          setEnrolledCourses(data.courses);
        } else {
          setEnrolledCourses([]);
        }
      })
      .catch(() => {
        setEnrolledCourses([]);
      })
      .finally(() => setLoading(false));
  }, [studentId, refreshKey]);

  return (
    <div className="space-y-8 font-sans">
      {/* Student Profile & Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/90 shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-proxi-green uppercase tracking-wider font-mono">
              Student Attendance Portal
            </span>
            <Badge variant="success" size="sm">Enrolled</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-proxi-ink tracking-tight">
            Welcome, {user?.first_name || "Student"}
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Matriculation:{" "}
            <span className="font-mono font-bold text-proxi-ink">
              {user?.matric_number || "Pending"}
            </span>{" "}
            • {user?.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs shadow-xs">
            <span className="text-emerald-950 font-bold text-base block font-mono">
              {activeSessions.length}
            </span>
            <span className="text-emerald-800 text-[11px]">Active Session{activeSessions.length === 1 ? "" : "s"}</span>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-900 font-bold text-base block font-mono">
              {enrolledCourses.length}
            </span>
            <span className="text-slate-600 text-[11px]">Enrolled Course{enrolledCourses.length === 1 ? "" : "s"}</span>
          </div>

          <Link href="/student/history">
            <Button variant="outline" size="sm">
              <History className="w-3.5 h-3.5 text-slate-500" />
              History
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Attendance Sessions (Check-In) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-proxi-ink flex items-center gap-2 font-sans">
              <Radio className="w-4 h-4 text-proxi-green animate-pulse" />
              Active Classroom Geofences
            </h2>
            <p className="text-xs text-slate-500">
              Live attendance sessions matching courses you are officially registered for.
            </p>
          </div>
          {activeSessions.length > 0 && (
            <Badge variant="success">{activeSessions.length} Available</Badge>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-sans">
            Scanning for active geofence beacons on campus...
          </div>
        ) : activeSessions.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="text-center py-14">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-proxi-ink">
                No Active Sessions Right Now
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Your lecturers have not opened an attendance session for your courses yet. When a lecture begins, the GPS geofence will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeSessions.map((session) => (
              <CheckInCard
                key={session.id}
                session={session}
                studentId={studentId}
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Enrolled Courses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-proxi-ink flex items-center gap-2 font-sans">
              <BookOpen className="w-4 h-4 text-proxi-green" />
              Your Enrolled Courses
            </h2>
            <p className="text-xs text-slate-500">
              Verified campus curriculum registrations for this semester.
            </p>
          </div>
          <Link href="/student/history">
            <span className="text-xs font-bold text-proxi-green hover:underline flex items-center gap-1">
              View check-in logs <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {enrolledCourses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-10 text-xs text-slate-500">
              No course enrollments found on your account.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {enrolledCourses.map((course) => (
              <Card key={course.id} className="border border-slate-200/90 shadow-card hover:border-emerald-300 transition-all">
                <CardContent className="p-5 space-y-2">
                  <span className="text-xs font-bold font-mono text-proxi-green uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
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
    </div>
  );
}
