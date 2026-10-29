"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { db } from "@/lib/db/store";
import { AttendanceSession, Course } from "@/types/database";
import { SessionMonitor } from "@/components/lecturer/session-monitor";
import { EligibilityReportView } from "@/components/lecturer/eligibility-report-view";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FileSpreadsheet, Calendar, GraduationCap, TableProperties } from "lucide-react";

export default function LecturerReportsPage() {
  const { user } = useAuth();
  const lecturerId = user?.id || "";

  const [activeTab, setActiveTab] = useState<"eligibility" | "sessions">("eligibility");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch sessions
    const url = lecturerId
      ? `/api/attendance/sessions?lecturerId=${lecturerId}`
      : "/api/attendance/sessions";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (data.sessions.length > 0) {
            setSelectedSessionId(data.sessions[0].id);
          }
        } else {
          const fallback = db.listSessions({ lecturerId: lecturerId || undefined });
          setSessions(fallback);
          if (fallback.length > 0) setSelectedSessionId(fallback[0].id);
        }
      })
      .catch(() => {
        const fallback = db.listSessions({ lecturerId: lecturerId || undefined });
        setSessions(fallback);
        if (fallback.length > 0) setSelectedSessionId(fallback[0].id);
      });

    // 2. Fetch courses
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.courses)) {
          setCourses(data.courses);
        } else {
          setCourses(db.listCourses());
        }
      })
      .catch(() => {
        setCourses(db.listCourses());
      })
      .finally(() => setLoading(false));
  }, [lecturerId]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200/90 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-proxi-green uppercase tracking-wider font-mono">
                Academic Audit & Official Reporting
              </span>
              <Badge variant="neutral">{courses.length} Courses</Badge>
              <Badge variant="neutral">{sessions.length} Sessions Logged</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-proxi-ink tracking-tight font-sans">
              Attendance Records & 75% Exam Eligibility Dockets
            </h1>
            <p className="text-xs text-slate-500 font-sans max-w-2xl">
              Audit lecture attendance, manage excused manual overrides, and generate official university examination clearance dockets with tamper-evident records.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("eligibility")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "eligibility"
                  ? "bg-white text-emerald-950 font-bold shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              75% Exam Eligibility Docket
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sessions")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "sessions"
                  ? "bg-white text-emerald-950 font-bold shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableProperties className="w-4 h-4 text-slate-600" />
              Per-Session Roll Call & CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: 75% Exam Eligibility Docket */}
      {activeTab === "eligibility" && (
        <EligibilityReportView
          lecturerId={lecturerId}
          courses={courses}
        />
      )}

      {/* Tab 2: Per-Session Roll Call & CSV */}
      {activeTab === "sessions" && (
        sessions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-16 text-slate-500 font-sans">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-proxi-green flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-proxi-ink">No Attendance Sessions Recorded</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Start your first classroom attendance session from the dashboard to view and export reports.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Session Picker Sidebar */}
            <div className="lg:col-span-1 space-y-3 font-sans">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select Session ({sessions.length})
              </h3>
              <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedSessionId === s.id
                        ? "bg-white border-proxi-green shadow-xs ring-2 ring-proxi-green/20"
                        : "bg-white/80 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold font-mono text-proxi-green uppercase">
                        {s.course?.code}
                      </span>
                      <Badge
                        variant={s.status === "active" ? "success" : s.status === "cancelled" ? "error" : "neutral"}
                        size="sm"
                      >
                        {s.status === "cancelled"
                          ? "Cancelled"
                          : `${s.record_count || 0} present`}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-proxi-ink truncate tracking-tight">
                      {s.course?.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDateTime(s.starts_at)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Session Details & Export */}
            <div className="lg:col-span-2">
              {selectedSession ? (
                <SessionMonitor
                  session={selectedSession}
                  records={[]}
                  lecturerId={lecturerId}
                  onSessionEnded={() => {}}
                />
              ) : (
                <Card>
                  <CardContent className="text-center py-16 text-slate-500 font-sans">
                    Select a session from the list to view attendee logs and export CSV.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
