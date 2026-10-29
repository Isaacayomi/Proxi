"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { db } from "@/lib/db/store";
import { AttendanceRecord } from "@/types/database";
import { HistoryTable } from "@/components/student/history-table";
import { StudentEligibilityTracker } from "@/components/student/student-eligibility-card";

export default function StudentHistoryPage() {
  const { user } = useAuth();
  const studentId = user?.id || "";
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    fetch(`/api/attendance/records?studentId=${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.records)) {
          setHistory(data.records);
        } else {
          setHistory(db.getStudentAttendanceHistory(studentId));
        }
      })
      .catch(() => {
        setHistory(db.getStudentAttendanceHistory(studentId));
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-proxi-ink">
          My Attendance Records
        </h1>
        <p className="text-xs text-proxi-muted mt-1">
          Historical record of verified classroom presence across all your
          university courses.
        </p>
      </div>

      {studentId && (
        <section className="mb-6">
          <StudentEligibilityTracker studentId={studentId} />
        </section>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-proxi-muted">Loading attendance records...</div>
      ) : (
        <HistoryTable records={history} />
      )}
    </div>
  );
}
