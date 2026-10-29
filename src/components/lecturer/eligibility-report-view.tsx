"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Course, CourseEligibilityReport, StudentEligibility } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  Search,
  ShieldCheck,
  Ban,
  Percent,
  Sliders,
  RefreshCw,
} from "lucide-react";

interface EligibilityReportViewProps {
  lecturerId: string;
  courses: Course[];
}

export function EligibilityReportView({
  lecturerId,
  courses,
}: EligibilityReportViewProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courses[0]?.id || "",
  );
  const [threshold, setThreshold] = useState<number>(75);
  const [report, setReport] = useState<CourseEligibilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "eligible" | "ineligible">("all");
  const [isExcusingStudentId, setIsExcusingStudentId] = useState<string | null>(null);

  // Auto-select first course when courses load
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const fetchReport = useCallback(async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance/eligibility?courseId=${selectedCourseId}&threshold=${threshold}`,
      );
      const data = await res.json();
      if (res.ok && data.success && data.report) {
        setReport(data.report);
      } else {
        setReport(null);
      }
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, threshold]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePardonStudent = async (studentId: string) => {
    if (!report || report.totalHeldSessions === 0) return;
    setIsExcusingStudentId(studentId);
    try {
      // Find a held session to excuse for this student, or call override with the course's most recent session
      // Fetch latest session for this course
      const sessRes = await fetch(`/api/attendance/sessions?courseId=${selectedCourseId}`);
      const sessData = await sessRes.json();
      const held = (sessData.sessions || []).find((s: any) => s.status !== "cancelled");
      if (held) {
        await fetch("/api/attendance/override", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: held.id,
            studentId,
            status: "excused",
            lecturerId,
            rejectionReason: "EXCUSED_ABSENCE",
          }),
        });
        await fetchReport();
      }
    } catch {
      // ignore
    } finally {
      setIsExcusingStudentId(null);
    }
  };

  const filteredStudents = (report?.students || []).filter((s) => {
    if (filterTab === "eligible" && !s.isEligible) return false;
    if (filterTab === "ineligible" && s.isEligible) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matric = (s.matricNumber || "").toLowerCase();
    const name = (s.studentName || "").toLowerCase();
    return matric.includes(q) || name.includes(q);
  });

  const pdfDownloadUrl = `/api/attendance/eligibility/pdf?courseId=${selectedCourseId}&threshold=${threshold}`;

  return (
    <div className="space-y-6 font-sans">
      {/* Configuration Controls Bar */}
      <Card className="border border-slate-200/90 shadow-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Course Selector */}
            <div className="space-y-1.5 flex-1 max-w-md">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Select Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 font-semibold text-proxi-ink text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-proxi-green/20 focus:border-proxi-green transition-all"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Threshold Setting Selector (Requirement: Make 75% threshold a setting) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-proxi-green" />
                Eligibility Threshold Setting
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  {[70, 75, 80].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setThreshold(preset)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        threshold === preset
                          ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {preset}% {preset === 75 ? "(Default)" : ""}
                    </button>
                  ))}
                </div>

                {/* Custom numeric threshold */}
                <div className="relative w-24">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={threshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1 && val <= 100) setThreshold(val);
                    }}
                    className="w-full px-3 py-2 pr-7 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-proxi-green/20 focus:border-proxi-green"
                    placeholder="Custom"
                  />
                  <Percent className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchReport}
                isLoading={loading}
                title="Refresh report records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Official PDF Docket
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Stats Row */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Enrolled Students
            </span>
            <p className="text-2xl font-extrabold text-proxi-ink mt-1 font-mono">
              {report.totalEnrolled}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block" title="Cancelled classes excluded">
              Held Lectures
            </span>
            <p className="text-2xl font-extrabold text-emerald-950 mt-1 font-mono">
              {report.totalHeldSessions}
            </p>
            <span className="text-[10px] text-emerald-700 font-sans">Counted in rate</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Cancelled Classes
            </span>
            <p className="text-2xl font-extrabold text-slate-700 mt-1 font-mono">
              {report.totalCancelledSessions}
            </p>
            <span className="text-[10px] text-slate-500 font-sans">Excluded (No penalty)</span>
          </div>

          {/* Explicit Eligible Count */}
          <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-300 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
              Eligible for Exam
            </span>
            <p className="text-2xl font-black text-emerald-950 mt-1 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {report.totalEligible}
            </p>
            <span className="text-[10px] font-bold text-emerald-800 font-mono">
              ≥ {report.thresholdPercent}% Attendance
            </span>
          </div>

          {/* Explicit Not Eligible Count */}
          <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-300 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 block">
              Not Eligible
            </span>
            <p className="text-2xl font-black text-rose-950 mt-1 font-mono flex items-center gap-1.5">
              <XCircle className="w-5 h-5 text-rose-600" />
              {report.totalNotEligible}
            </p>
            <span className="text-[10px] font-bold text-rose-800 font-mono">
              &lt; {report.thresholdPercent}% Attendance
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Course Clearance Rate
            </span>
            <p className="text-2xl font-extrabold text-proxi-ink mt-1 font-mono">
              {report.overallEligibilityRate}%
            </p>
            <span className="text-[10px] text-slate-500 font-sans">Class average</span>
          </div>
        </div>
      )}

      {/* Student Roster Table Card */}
      <Card className="border border-slate-200/90 shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  Official Examination Eligibility Roster
                </CardTitle>
                <Badge variant="neutral" size="sm">
                  Threshold: {threshold}%
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Generated from server database records for {report?.courseCode || "Course"}. Manual overrides and excused absences are included.
              </CardDescription>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterTab === "all"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({report?.students.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("eligible")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterTab === "eligible"
                      ? "bg-white text-emerald-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Eligible ({report?.totalEligible || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("ineligible")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterTab === "ineligible"
                      ? "bg-white text-rose-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Not Eligible ({report?.totalNotEligible || 0})
                </button>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or matric..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-proxi-green/20 focus:border-proxi-green font-sans"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        {loading ? (
          <CardContent className="text-center py-16 text-xs text-slate-500 font-sans">
            Compiling course eligibility records from database...
          </CardContent>
        ) : !report || filteredStudents.length === 0 ? (
          <CardContent className="text-center py-16 text-slate-500 font-sans">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-proxi-ink">No Students Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No student matching "${searchQuery}" in this view.`
                : "No students are enrolled in this course yet."}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Matric Number</th>
                  <th className="px-6 py-3.5 text-center">Attended</th>
                  <th className="px-6 py-3.5 text-center">Excused Absences</th>
                  <th className="px-6 py-3.5 text-center">Held Lectures</th>
                  <th className="px-6 py-3.5 text-center">Attendance %</th>
                  <th className="px-6 py-3.5">
                    {/* Explicit Column Header for Black & White Readability */}
                    Examination Eligibility
                  </th>
                  <th className="px-6 py-3.5 text-right">Faculty Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => (
                  <tr
                    key={st.studentId}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      !st.isEligible ? "bg-rose-50/20" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-proxi-ink">
                        {st.studentName}
                      </div>
                      <div className="text-xs text-slate-500">{st.studentEmail}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">
                      {st.matricNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-emerald-950">
                      {st.presentCount}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-amber-800">
                      {st.excusedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-900 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          {st.excusedCount}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-slate-600">
                      {st.totalHeldSessions}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`font-mono text-xs font-extrabold ${
                          st.isEligible ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {st.attendanceRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {/* Requirement: Explicit "Eligible or Not eligible" column so the PDF and UI still reads when printed in black and white */}
                      <span
                        className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded border ${
                          st.isEligible
                            ? "bg-emerald-100 text-emerald-950 border-emerald-500"
                            : "bg-rose-100 text-rose-950 border-rose-500 font-black"
                        }`}
                        style={{
                          /* High contrast styling for monochrome print fallback */
                          fontWeight: 900,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {st.eligibilityStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!st.isEligible && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePardonStudent(st.studentId)}
                          isLoading={isExcusingStudentId === st.studentId}
                          className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          title="Grant lecturer-approved excused absence"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          Excuse Absence
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
