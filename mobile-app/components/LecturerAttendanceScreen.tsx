import React, { useCallback, useEffect, useRef, useState } from "react";
import AttendanceDashboard, {
  AttendanceSession,
  AttendanceRecord,
} from "./AttendanceDashboard";
import {
  createAttendanceSession,
  fetchAttendanceRecords,
  fetchLecturerAttendanceSessions,
  getSessionQRCode,
  endAttendanceSession,
} from "../utils/api";
import { ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";
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
type LecturerSession = {
  id: string;
  course_code: string;
  course_name: string;
  starts_at: number;
  ends_at: number;
  status: string;
  record_count: number;
};
type MarkedRecord = {
  id: string;
  matric_number: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  submitted_at: number;
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
  const [sessions, setSessions] = useState<LecturerSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [records, setRecords] = useState<MarkedRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  const intervalRef = useRef<any>(null);

  const loadSessions = async () => {
    try {
      const data = await fetchLecturerAttendanceSessions(token);
      setSessions(data);
    } catch (e: any) {
      showToast(e?.message || "Failed to load sessions", "error");
    } finally {
      setSessionsLoading(false);
    }
  };

  const openSession = async (sessionId: string) => {
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
      return;
    }
    setSelectedSessionId(sessionId);
    setRecords([]);
    setRecordsError("");
    setRecordsLoading(true);
    try {
      setRecords(await fetchAttendanceRecords(token, sessionId));
    } catch (e: any) {
      setRecordsError(e?.message || "Failed to load attendance records");
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [token]);

  const load = useCallback(
    () => fetchAttendanceSessions(lecturerEmail),
    [fetchAttendanceSessions, lecturerEmail],
  );

  const fetchQR = async (sessionId: string) => {
    try {
      setQrError("");
      const res = await getSessionQRCode(token, sessionId);
      if (typeof res?.qr !== "string" || !res.qr) {
        throw new Error("The server did not return a QR code. Please try again.");
      }
      setQrData(res.qr);
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
      setQrData("");
      setQrError("Loading QR...");
      await fetchQR(res.sessionId);
      await loadSessions();
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
      await loadSessions();
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
      <View style={{ padding: 16, minHeight: activeSession ? undefined : 300, justifyContent: "center", alignItems: "center" }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          QR Attendance
        </Text>
        {activeSession ? (
          <View style={{ backgroundColor: colors.mint, padding: 12, borderRadius: 8, alignItems: "center", width: "100%", maxWidth: 420 }}>
            <Text style={{ marginBottom: 8 }}>Course: {activeSession.courseCode} - {activeSession.courseName}</Text>
            {qrData ? (
              <View style={{ backgroundColor: "#FFFFFF", padding: 12, borderRadius: 8 }}>
                <QRCode
                  value={qrData}
                  size={220}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  quietZone={8}
                />
              </View>
            ) : (
              <Text>{qrError || "Loading QR..."}</Text>
            )}
            <Text style={{ marginTop: 8, fontSize: 12 }}>QR rotates every 15 seconds</Text>
            <Button mode="outlined" onPress={handleEnd} style={{ marginTop: 8 }}>
              End Session
            </Button>
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <Button mode="contained" onPress={handleCreate} loading={creating} disabled={creating} style={{ minWidth: 230 }}>
              Start Session & Show QR
            </Button>
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Attendance by session</Text>
        <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
        {sessionsLoading ? <ActivityIndicator /> : sessions.length === 0 ? (
          <Text>No sessions yet.</Text>
        ) : sessions.map((session) => (
          <Card key={session.id} style={{ marginBottom: 8 }}>
            <Card.Title
              title={`${session.course_code} - ${session.course_name}`}
              subtitle={`${session.record_count} marked · ${session.status}`}
            />
            <Card.Actions>
              <Button onPress={() => void openSession(session.id)}>
                {selectedSessionId === session.id ? "Hide attendance" : "View attendance"}
              </Button>
            </Card.Actions>
            {selectedSessionId === session.id && (
              <Card.Content>
                {recordsLoading ? <ActivityIndicator /> : recordsError ? (
                  <Text>{recordsError}</Text>
                ) : records.length === 0 ? (
                  <Text>No students have marked attendance for this session.</Text>
                ) : records.map((record) => (
                  <Text key={record.id} style={{ marginBottom: 8 }}>
                    {`${record.first_name || ""} ${record.last_name || ""}`.trim() || record.email}
                    {record.matric_number ? ` · ${record.matric_number}` : ""}
                    {` · ${new Date(record.submitted_at).toLocaleString()}`}
                  </Text>
                ))}
              </Card.Content>
            )}
          </Card>
        ))}
        </ScrollView>
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
