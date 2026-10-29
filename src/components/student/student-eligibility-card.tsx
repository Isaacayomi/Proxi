"use client";

import React, { useEffect, useState } from "react";
import { StudentCourseEligibilitySummary } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentEligibilityCardProps {
  studentId: string;
}

export function StudentEligibilityTracker({
  studentId,
}: StudentEligibilityCardProps) {
  const [summaries, setSummaries] = useState<StudentCourseEligibilitySummary[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [threshold] = useState(75);

  const fetchEligibility = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance/eligibility?studentId=${studentId}&threshold=${threshold}`,
      );
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.summaries)) {
        setSummaries(data.summaries);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibility();
  }, [studentId, threshold]);

  if (loading) {
    return (
      <Card className="border border-slate-200/90 shadow-card">
        <CardContent className="py-8 text-center text-xs text-slate-500 font-sans">
          Loading your course attendance & exam clearance records...
        </CardContent>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-proxi-ink flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-proxi-green" />
            75% Exam Eligibility & Attendance Clearance
          </h2>
          <p className="text-xs text-slate-500">
            Official university standing: Students must achieve at least{" "}
            {threshold}% attendance in held classes to sit semester
            examinations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEligibility}
          className="text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaries.map((summary) => {
          const isWarning = summary.warningTier === "warning";
          const isIneligible = summary.warningTier === "ineligible";

          return (
            <Card
              key={summary.courseId}
              className={`border transition-all shadow-card ${
                isIneligible
                  ? "border-rose-300 bg-rose-50/20"
                  : isWarning
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200/90 bg-white"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {summary.courseCode}
                    </span>
                    <span className="text-xs text-slate-500 truncate max-w-[150px]">
                      {summary.department}
                    </span>
                  </div>

                  {/* Explicit high-contrast text badge for black-and-white / color readability */}
                  <span
                    className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded border ${
                      summary.isEligible
                        ? "bg-emerald-100 text-emerald-950 border-emerald-400"
                        : "bg-rose-100 text-rose-950 border-rose-400 font-extrabold"
                    }`}
                  >
                    {summary.eligibilityStatus}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-proxi-ink mt-2">
                  {summary.courseName}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {summary.totalHeldSessions} lecture
                  {summary.totalHeldSessions === 1 ? "" : "s"} held • Cancelled
                  classes excluded
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Attended
                    </span>
                    <span className="text-sm font-extrabold text-proxi-ink font-mono">
                      {summary.presentCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Excused
                    </span>
                    <span className="text-sm font-extrabold text-amber-800 font-mono">
                      {summary.excusedCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Current Rate
                    </span>
                    <span
                      className={`text-sm font-black font-mono ${
                        summary.isEligible
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {summary.attendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Progress visual bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Attendance Progress</span>
                    <span className="font-mono">
                      {summary.attendedOrExcusedCount} /{" "}
                      {summary.totalHeldSessions} Classes (
                      {summary.attendanceRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full transition-all duration-500 ${
                        summary.isEligible ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                      style={{
                        width: `${Math.min(100, summary.attendanceRate)}%`,
                      }}
                    />
                    {/* 75% indicator line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-black/60 z-10"
                      style={{ left: `${summary.thresholdPercent}%` }}
                      title={`Target Threshold: ${summary.thresholdPercent}%`}
                    />
                  </div>
                </div>

                {/* Warning Alert if close to or below 75% */}
                {isIneligible && (
                  <div className="p-2.5 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-900 text-xs flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        Examination Ineligible
                      </span>
                      <span>
                        Your attendance is currently {summary.attendanceRate}%,
                        which is below the mandatory {summary.thresholdPercent}%
                        requirement.
                      </span>
                    </div>
                  </div>
                )}

                {isWarning && (
                  <div className="p-2.5 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-950 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        Attendance Threshold Alert
                      </span>
                      <span>
                        You are close to the {summary.thresholdPercent}%
                        threshold ({summary.attendanceRate}%). Do not miss
                        upcoming lectures!
                      </span>
                    </div>
                  </div>
                )}

                {summary.warningTier === "safe" && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium">
                      Cleared for Examinations • Attendance in good standing (
                      {summary.attendanceRate}%)
                    </span>
                  </div>
                )}

                {summary.excusedCount > 0 && (
                  <p className="text-[11px] text-amber-800 flex items-center gap-1 font-sans">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    Includes {summary.excusedCount} lecturer-approved excused
                    absence{summary.excusedCount === 1 ? "" : "s"}.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
