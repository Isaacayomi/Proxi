"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { AttendanceSession, Course } from "@/types/database";
import { CheckInCard } from "@/components/student/check-in-card";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CalendarCheck,
  Radio,
  History,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const studentId = user?.id || "";

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [coursesTab, setCoursesTab] = useState<"enrolled" | "available">("enrolled");
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Fetch active sessions filtered specifically for this student's enrolled courses
    const sessionsPromise = fetch(`/api/attendance/sessions?studentId=${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sessions)) {
          const now = Date.now();
          setActiveSessions(
            data.sessions.filter((s: AttendanceSession) => {
              if (s.status !== "active") return false;
              const endsAt = new Date(s.ends_at).getTime();
              return endsAt > now;
            }),
          );
        } else {
          setActiveSessions([]);
        }
      })
      .catch(() => {
        setActiveSessions([]);
      });

    // 2. Fetch courses with enrolled vs available categorization for this student
    const coursesPromise = fetch(`/api/courses?studentId=${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEnrolledCourses(data.enrolledCourses || []);
          setAvailableCourses(data.availableCourses || []);
        } else {
          setEnrolledCourses([]);
          setAvailableCourses([]);
        }
      })
      .catch(() => {
        setEnrolledCourses([]);
        setAvailableCourses([]);
      });

    Promise.all([sessionsPromise, coursesPromise]).finally(() => {
      setLoading(false);
    });
  }, [studentId, refreshKey]);

  const handleEnroll = async (courseId: string) => {
    if (!studentId) return;
    setEnrollingCourseId(courseId);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, studentId, action: "enroll" }),
      });
      const data = await res.json();
      if (data.success) {
        setRefreshKey((k) => k + 1);
        setCoursesTab("enrolled");
      }
    } catch (err) {
      console.error("Failed to enroll in course:", err);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!studentId) return;
    setEnrollingCourseId(courseId);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, studentId, action: "unenroll" }),
      });
      const data = await res.json();
      if (data.success) {
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error("Failed to unenroll from course:", err);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Student Profile & Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/90 shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-proxi-green uppercase tracking-wider font-mono">
              Student Attendance Portal
            </span>
            <Badge variant="success" size="sm">
              {enrolledCourses.length > 0 ? "Enrolled" : "Registration Open"}
            </Badge>
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
              Live attendance sessions for courses you are officially enrolled in.
            </p>
          </div>
          {activeSessions.length > 0 && (
            <Badge variant="success">{activeSessions.length} Available</Badge>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-sans">
            Scanning for active geofence beacons for your enrolled courses...
          </div>
        ) : activeSessions.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="text-center py-14">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-proxi-ink">
                No Active Sessions for Your Enrolled Courses
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                {enrolledCourses.length === 0
                  ? "You are not yet enrolled in any courses. Please enroll in your courses below to access live attendance sessions."
                  : "None of your enrolled courses have an active lecture right now. When your lecturer starts an attendance session, it will appear here."}
              </p>
              {enrolledCourses.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCoursesTab("available")}
                  className="mt-4 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  Browse Available Courses
                </Button>
              )}
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

      {/* Course Enrollment & Curriculum Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-proxi-ink flex items-center gap-2 font-sans">
              <BookOpen className="w-4 h-4 text-proxi-green" />
              Course Enrollment & Curriculum
            </h2>
            <p className="text-xs text-slate-500">
              Only courses you individually enroll in will show active attendance geofences.
            </p>
          </div>

          {/* Navigation Pills / Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCoursesTab("enrolled")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                coursesTab === "enrolled"
                  ? "bg-white text-emerald-950 font-bold shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Enrolled Courses ({enrolledCourses.length})
            </button>
            <button
              type="button"
              onClick={() => setCoursesTab("available")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                coursesTab === "available"
                  ? "bg-white text-emerald-950 font-bold shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Available Courses ({availableCourses.length})
            </button>
          </div>
        </div>

        {coursesTab === "enrolled" ? (
          enrolledCourses.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="text-center py-12">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2.5 text-slate-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  No courses enrolled yet
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You are not registered for any courses yet. Switch to Available Courses to register and begin checking into lectures.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCoursesTab("available")}
                  className="mt-4 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  Browse Available Courses ({availableCourses.length})
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {enrolledCourses.map((course) => (
                <Card
                  key={course.id}
                  className="border border-slate-200/90 shadow-card hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-emerald-800 uppercase bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/70">
                        {course.code}
                      </span>
                      <Badge variant="success" size="sm">
                        Enrolled
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-proxi-ink tracking-tight font-sans">
                        {course.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {course.department}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Registered
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnenroll(course.id)}
                        disabled={enrollingCourseId === course.id}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {enrollingCourseId === course.id ? "Dropping..." : "Drop Course"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          availableCourses.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="text-center py-12 text-xs text-slate-500">
                You are currently enrolled in all available courses offered by faculty.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {availableCourses.map((course) => (
                <Card
                  key={course.id}
                  className="border border-slate-200 shadow-card hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-slate-700 uppercase bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {course.code}
                      </span>
                      <span className="text-[11px] text-slate-400 font-sans">
                        Not Enrolled
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-proxi-ink tracking-tight font-sans">
                        {course.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {course.department}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={enrollingCourseId === course.id}
                        onClick={() => handleEnroll(course.id)}
                        className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                      >
                        {enrollingCourseId === course.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Enrolling...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Enroll in Course
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
