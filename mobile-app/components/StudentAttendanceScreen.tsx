import React, { useCallback } from "react";
import AttendanceDashboard, { StudentAttendance } from "./AttendanceDashboard";
type Props = {
  studentName: string;
  matricNumber: string;
  showToast: (message: string, type?: "success" | "error") => void;
  onLogout: () => Promise<void>;
  onEditProfile?: () => void;
  saveStudentAttendance: (attendance: StudentAttendance) => Promise<void>;
  fetchStudentAttendances: () => Promise<StudentAttendance[]>;
};
export default function StudentAttendanceScreen({
  studentName,
  matricNumber,
  showToast,
  onLogout,
  onEditProfile,
  fetchStudentAttendances,
}: Props) {
  const load = useCallback(
    () => fetchStudentAttendances(),
    [fetchStudentAttendances],
  );
  return (
    <AttendanceDashboard
      role="student"
      name={studentName}
      matricNumber={matricNumber}
      load={load}
      showToast={showToast}
      onLogout={onLogout}
      onEditProfile={onEditProfile}
    />
  );
}
