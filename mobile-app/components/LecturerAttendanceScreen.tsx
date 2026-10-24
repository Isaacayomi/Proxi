import React, { useCallback, useEffect, useState } from "react";
import AttendanceDashboard, {
  AttendanceSession,
  AttendanceRecord,
} from "./AttendanceDashboard";
import { createAttendanceSession } from "../utils/api";
import { startLecturerAdvertising, stopLecturerAdvertising } from "../utils/ble";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { colors } from "../ui/design";
type Props = {
  lecturerName: string;
  lecturerEmail: string;
  token: string;
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
  token,
  showToast,
  onLogout,
  onEditProfile,
  fetchAttendanceSessions,
}: Props) {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    () => fetchAttendanceSessions(lecturerEmail),
    [fetchAttendanceSessions, lecturerEmail],
  );

  const handleCreate = async () => {
    if (!token) {
      showToast("Please sign in again", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await createAttendanceSession(
        token,
        "COURSE",
        "Class Session",
        60,
      );
      setActiveSession(res);
      try {
        await startLecturerAdvertising(res.sessionId, res.sessionToken);
        showToast("Session created and advertising", "success");
      } catch (e) {
        showToast("Advertising failed - check permissions/dev build", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to create session", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleStop = async () => {
    try {
      await stopLecturerAdvertising();
      setActiveSession(null);
      showToast("Advertising stopped", "success");
    } catch (e) {
      showToast("Failed to stop", "error");
    }
  };

  useEffect(() => {
    return () => {
      stopLecturerAdvertising().catch(() => {});
    };
  }, []);

  return (
    <>
      <View style={{ padding: 16 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          BLE Session
        </Text>
        {activeSession ? (
          <View style={{ backgroundColor: colors.mint, padding: 12, borderRadius: 8 }}>
            <Text>Course: {activeSession.courseCode} - {activeSession.courseName}</Text>
            <Text>Session ID: {activeSession.sessionId}</Text>
            <Button mode="outlined" onPress={handleStop} style={{ marginTop: 8 }}>
              Stop Advertising
            </Button>
          </View>
        ) : (
          <View>
            <Button mode="contained" onPress={handleCreate} loading={creating} disabled={creating}>
              Create Session & Advertise
            </Button>
          </View>
        )}
      </View>
      <AttendanceDashboard
        role="lecturer"
        name={lecturerName}
        email={lecturerEmail}
        load={load}
        showToast={showToast}
        onLogout={onLogout}
        onEditProfile={onEditProfile}
      />
    </>
  );
}
