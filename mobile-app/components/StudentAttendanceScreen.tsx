import React, { useCallback, useEffect, useRef, useState } from "react";
import AttendanceDashboard, { StudentAttendance } from "./AttendanceDashboard";
import { scanForProxiSessions } from "../utils/ble";
import { validateAttendanceSession, submitAttendance } from "../utils/api";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { colors } from "../ui/design";
type Props = {
  studentName: string;
  matricNumber: string;
  token: string;
  showToast: (message: string, type?: "success" | "error") => void;
  onLogout: () => Promise<void>;
  onEditProfile?: () => void;
  saveStudentAttendance: (attendance: StudentAttendance) => Promise<void>;
  fetchStudentAttendances: () => Promise<StudentAttendance[]>;
};
export default function StudentAttendanceScreen({
  studentName,
  matricNumber,
  token,
  showToast,
  onLogout,
  onEditProfile,
  fetchStudentAttendances,
}: Props) {
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const load = useCallback(
    () => fetchStudentAttendances(),
    [fetchStudentAttendances],
  );

  const startScan = async () => {
    if (!token) {
      showToast("Please sign in again", "error");
      return;
    }
    setScanning(true);
    setFound(null);
    try {
      const stop = await scanForProxiSessions(async (ad) => {
        if (ad.sessionId && ad.sessionToken) {
          setFound(ad);
          try {
            setValidating(true);
            await validateAttendanceSession(token, ad.sessionId, ad.sessionToken);
            showToast("Session validated", "success");
          } catch (e: any) {
            showToast(e?.message || "Session validation failed", "error");
            setFound(null);
          } finally {
            setValidating(false);
          }
        }
      }, 15000);
      stopRef.current = stop;
    } catch (e: any) {
      showToast(e?.message || "Scan failed - check permissions/dev build", "error");
      setScanning(false);
    }
  };

  const stopScan = () => {
    try {
      stopRef.current?.();
    } catch {}
    stopRef.current = null;
    setScanning(false);
  };

  const handleCheckIn = async () => {
    if (!found?.sessionId || !found?.sessionToken) return;
    setSubmitting(true);
    try {
      await submitAttendance(token, found.sessionId, found.sessionToken);
      showToast("Attendance submitted", "success");
      stopScan();
      setFound(null);
    } catch (e: any) {
      if (e?.status === 409) {
        showToast(e?.message || "Already checked in", "error");
      } else {
        showToast(e?.message || "Check-in failed", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      try {
        stopRef.current?.();
      } catch {}
    };
  }, []);

  return (
    <>
      <View style={{ padding: 16 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Find & Check In
        </Text>
        {scanning ? (
          <View>
            <Text>Scanning for nearby sessions...</Text>
            <Button onPress={stopScan} style={{ marginTop: 8 }}>
              Stop Scan
            </Button>
          </View>
        ) : (
          <Button mode="contained" onPress={startScan}>
            Scan for Sessions
          </Button>
        )}
        {found && (
          <View style={{ backgroundColor: colors.mint, padding: 12, borderRadius: 8, marginTop: 8 }}>
            <Text>Session: {found.sessionId}</Text>
            <Text>Validated: {validating ? "Checking..." : "Yes"}</Text>
            <Button
              mode="contained"
              onPress={handleCheckIn}
              loading={submitting}
              disabled={submitting || validating}
              style={{ marginTop: 8 }}
            >
              Check In
            </Button>
          </View>
        )}
      </View>
      <AttendanceDashboard
        role="student"
        name={studentName}
        matricNumber={matricNumber}
        load={load}
        showToast={showToast}
        onLogout={onLogout}
        onEditProfile={onEditProfile}
      />
    </>
  );
}
