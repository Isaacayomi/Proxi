import React, { useCallback, useEffect, useRef, useState } from "react";
import AttendanceDashboard, {
  AttendanceSession,
  AttendanceRecord,
} from "./AttendanceDashboard";
import { createAttendanceSession, getSessionQRCode, endAttendanceSession } from "../utils/api";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { colors } from "../ui/design";
import QRCode from "react-native-qrcode-svg";
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
  const [qrData, setQrData] = useState<string>("");
  const [qrError, setQrError] = useState("");
  const intervalRef = useRef<any>(null);

  const load = useCallback(
    () => fetchAttendanceSessions(lecturerEmail),
    [fetchAttendanceSessions, lecturerEmail],
  );

  const fetchQR = async (sessionId: string) => {
    try {
      setQrError("");
      const res = await getSessionQRCode(token, sessionId);
      setQrData(res.qr || "");
    } catch (e: any) {
      setQrError(e?.message || "Failed to refresh QR code");
      setQrData("");
    }
  };

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
      await fetchQR(res.sessionId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => fetchQR(res.sessionId), 15000);
      showToast("Session created", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to create session", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleEnd = async () => {
    if (!activeSession) return;
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      await endAttendanceSession(token, activeSession.sessionId);
      setActiveSession(null);
      setQrData("");
      showToast("Session ended", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to end session", "error");
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <>
      <View style={{ padding: 16 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          QR Attendance
        </Text>
        {activeSession ? (
          <View style={{ backgroundColor: colors.mint, padding: 12, borderRadius: 8, alignItems: "center" }}>
            <Text style={{ marginBottom: 8 }}>Course: {activeSession.courseCode} - {activeSession.courseName}</Text>
            {qrData ? (
              <QRCode value={qrData} size={200} />
            ) : (
              <Text>{qrError || "Loading QR..."}</Text>
            )}
            <Text style={{ marginTop: 8, fontSize: 12 }}>QR rotates every 15 seconds</Text>
            <Button mode="outlined" onPress={handleEnd} style={{ marginTop: 8 }}>
              End Session
            </Button>
          </View>
        ) : (
          <View>
            <Button mode="contained" onPress={handleCreate} loading={creating} disabled={creating}>
              Start Session & Show QR
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
