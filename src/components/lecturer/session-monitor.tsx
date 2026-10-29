"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AttendanceSession, AttendanceRecord } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  formatTime,
  formatDateTime,
  generateAttendanceCsv,
  generateAttendanceFilename,
} from "@/lib/utils";
import {
  Download,
  Users,
  StopCircle,
  MapPin,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  Radio,
  Navigation,
  Ban,
  ShieldCheck,
} from "lucide-react";

interface SessionMonitorProps {
  session: AttendanceSession;
  records: AttendanceRecord[];
  lecturerId: string;
  onSessionEnded: () => void;
}

export function SessionMonitor({
  session,
  records: initialRecords,
  lecturerId,
  onSessionEnded,
}: SessionMonitorProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isOverridingStudentId, setIsOverridingStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/records?sessionId=${session.id}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.records)) {
        setRecords(data.records);
      }
    } catch {
      // Keep existing records if network blips
    }
  }, [session.id]);

  // Live auto-polling every 4 seconds when the session is active
  useEffect(() => {
    fetchRecords();

    if (session.status !== "active") return;

    const interval = setInterval(() => {
      fetchRecords();
    }, 4000);

    return () => clearInterval(interval);
  }, [session.status, fetchRecords]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchRecords();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleConfirmEndSession = async () => {
    setIsEnding(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/sessions/${session.id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecturerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to close session");
      }

      setIsConfirmOpen(false);
      onSessionEnded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to close session.");
    } finally {
      setIsEnding(false);
    }
  };

  const handleConfirmCancelSession = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/sessions/${session.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecturerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to cancel session");
      }

      setIsCancelOpen(false);
      onSessionEnded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel session.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleToggleExcuse = async (studentId: string, currentStatus: string) => {
    setIsOverridingStudentId(studentId);
    try {
      const newStatus = currentStatus === "excused" ? "present" : "excused";
      const res = await fetch("/api/attendance/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          studentId,
          status: newStatus,
          lecturerId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchRecords();
      }
    } catch {
      // ignore
    } finally {
      setIsOverridingStudentId(null);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = generateAttendanceCsv(
      records,
      session.course?.code || "COURSE",
      session.starts_at,
    );
    const filename = generateAttendanceFilename(
      session.course?.code || "COURSE",
      session.starts_at,
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLive = session.status === "active";

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matric = (r.matric_number || r.student?.matric_number || "").toLowerCase();
    const name = `${r.student?.first_name || ""} ${r.student?.last_name || ""}`.toLowerCase();
    return matric.includes(q) || name.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Session Overview Card */}
      <Card className="border border-slate-200/90 shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-proxi-green uppercase font-mono">
                  {session.course?.code}
                </span>
                <Badge variant={isLive ? "success" : "neutral"} size="sm">
                  {isLive ? (
                    <span className="flex items-center gap-1.5 font-bold">
                      <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                      Live Geofence Active
                    </span>
                  ) : (
                    `Status: ${session.status}`
                  )}
                </Badge>
              </div>
              <CardTitle>{session.course?.name}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-0.5 font-sans">
                <MapPin className="w-3.5 h-3.5 text-proxi-green shrink-0" />
                <span>{session.classroom?.name} • {session.radius_meters}m boundary</span>
              </CardDescription>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                isLoading={isRefreshing}
                title="Refresh latest check-ins"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                disabled={records.length === 0}
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV ({records.length})
              </Button>
              {session.status !== "cancelled" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-700 hover:text-amber-800 border-amber-300 hover:bg-amber-50"
                  onClick={() => setIsCancelOpen(true)}
                  isLoading={isCancelling}
                  title="Cancel class so it does not penalize students"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Cancel Class
                </Button>
              )}
              {isLive && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsConfirmOpen(true)}
                  isLoading={isEnding}
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Close Session
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="error" title="Session Action Notice" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 font-sans">
                Students Present
              </span>
              <p className="text-3xl font-extrabold text-emerald-950 mt-1 flex items-center gap-2 font-sans">
                <Users className="w-6 h-6 text-proxi-green" />
                {records.length}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Active Window
              </span>
              <p className="text-sm font-bold text-proxi-ink mt-1 flex items-center gap-1.5 font-sans">
                <Clock className="w-4 h-4 text-slate-400" />
                {formatTime(session.starts_at)} – {formatTime(session.ends_at)}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Geofence Radius
              </span>
              <p className="text-sm font-bold text-proxi-ink mt-1 font-mono">
                {session.radius_meters} meters
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Classroom Anchor
              </span>
              <p className="text-xs font-mono text-slate-700 mt-1 truncate">
                {session.latitude?.toFixed(5)}, {session.longitude?.toFixed(5)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Attendees Table with Search */}
      <Card className="border border-slate-200/90 shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Real-Time Attendance Log</CardTitle>
              <CardDescription>
                Live list of students physically verified within the geofence perimeter.
              </CardDescription>
            </div>

            {records.length > 0 && (
              <div className="w-full sm:w-64">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name or matric..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-proxi-green/20 focus:border-proxi-green font-sans"
                  />
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        {records.length === 0 ? (
          <CardContent className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-proxi-green flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-proxi-ink">Awaiting Check-ins</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {isLive
                ? "Students present in the lecture hall will appear here automatically in real time as they grant browser GPS permission and verify."
                : "No student records logged for this session."}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Matric Number</th>
                  <th className="px-6 py-3.5">Check-in Time</th>
                  <th className="px-6 py-3.5">Verified Distance</th>
                  <th className="px-6 py-3.5">GPS Precision</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-proxi-ink">
                        {rec.student?.first_name} {rec.student?.last_name}
                      </div>
                      <div className="text-xs text-slate-500">{rec.student?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">
                      {rec.matric_number || rec.student?.matric_number || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatTime(rec.submitted_at)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-medium text-emerald-800">
                      {rec.distance_meters != null
                        ? `${rec.distance_meters.toFixed(1)}m from center`
                        : "Verified"}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {rec.reported_accuracy_meters != null
                        ? `±${rec.reported_accuracy_meters.toFixed(1)}m`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {rec.status === "excused" ? (
                        <Badge variant="warning" size="sm" className="bg-amber-50 text-amber-800 border-amber-300">
                          Excused Absence
                        </Badge>
                      ) : rec.status === "present" ? (
                        <Badge variant="success" size="sm">
                          Verified Present
                        </Badge>
                      ) : (
                        <Badge variant="error" size="sm">
                          {rec.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleExcuse(rec.student_id, rec.status)}
                        isLoading={isOverridingStudentId === rec.student_id}
                        className="text-xs text-slate-600 hover:text-proxi-ink"
                        title="Pardon or excuse absence for this lecture"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        {rec.status === "excused" ? "Revoke Pardon" : "Excuse Absence"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation Modal to End/Close Session without using browser native modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmEndSession}
        title="Close Attendance Session?"
        description={`Are you sure you want to close the live session for ${session.course?.code || "this course"}? Students will immediately be prevented from checking in, and the final attendance roll will be recorded.`}
        confirmText="Close Session"
        cancelText="Keep Session Active"
        variant="danger"
        isLoading={isEnding}
      />

      {/* Confirmation Modal to Cancel Class */}
      <ConfirmModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleConfirmCancelSession}
        title="Cancel This Class Session?"
        description={`Are you sure you want to mark this class session as Cancelled? Cancelled classes are completely excluded from held session counts and will not hurt students' 75% attendance examination eligibility.`}
        confirmText="Yes, Cancel Class"
        cancelText="Keep Class"
        variant="danger"
        isLoading={isCancelling}
      />
    </div>
  );
}
