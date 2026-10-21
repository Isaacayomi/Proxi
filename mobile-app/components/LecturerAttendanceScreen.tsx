import React, { useCallback } from "react";
import AttendanceDashboard, {
  AttendanceSession,
  AttendanceRecord,
} from "./AttendanceDashboard";
type Props = {
  lecturerName: string;
  lecturerEmail: string;
  showToast: (message: string, type?: "success" | "error") => void;
  onLogout: () => Promise<void>;
  onEditProfile?: () => void;
  saveAttendanceSession: (session: {
    sessionId: string;
    lecturerEmail: string;
    courseCode: string;
    courseName: string;
    records: AttendanceRecord[];
  }) => Promise<void>;
  fetchAttendanceSessions: (email: string) => Promise<AttendanceSession[]>;
};
export default function LecturerAttendanceScreen({
  lecturerName,
  lecturerEmail,
  showToast,
  onLogout,
  onEditProfile,
  fetchAttendanceSessions,
}: Props) {
  const load = useCallback(
    () => fetchAttendanceSessions(lecturerEmail),
    [fetchAttendanceSessions, lecturerEmail],
  );
  return (
    <AttendanceDashboard
      role="lecturer"
      name={lecturerName}
      email={lecturerEmail}
      load={load}
      showToast={showToast}
      onLogout={onLogout}
      onEditProfile={onEditProfile}
    />
  );
}
