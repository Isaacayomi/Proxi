"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { db } from "@/lib/db/store";
import { AttendanceSession } from "@/types/database";
import { SessionMonitor } from "@/components/lecturer/session-monitor";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FileSpreadsheet, Calendar, ChevronRight } from "lucide-react";

export default function LecturerReportsPage() {
  const { user } = useAuth();
  const lecturerId = user?.id || "";

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  useEffect(() => {
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
  }, [lecturerId]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-proxi-green uppercase tracking-wider font-mono">
            Auditing & Export
          </span>
          <Badge variant="neutral">{sessions.length} Sessions Logged</Badge>
        </div>
        <h1 className="text-2xl font-bold text-proxi-ink tracking-tight font-sans mt-0.5">
          Attendance Reports & Official CSV Export
        </h1>
        <p className="text-xs text-slate-500 font-sans mt-0.5">
          Review student audit trails, geofence distance logs, and download official CSV spreadsheets for grading.
        </p>
      </div>

      {sessions.length === 0 ? (
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
                      variant={s.status === "active" ? "success" : "neutral"}
                      size="sm"
                    >
                      {s.record_count || 0} present
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
      )}
    </div>
  );
}
