import React, { useCallback, useState } from "react";
import AttendanceDashboard, { StudentAttendance } from "./AttendanceDashboard";
import { submitAttendanceQR } from "../utils/api";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { BarCodeScanner } from "expo-barcode-scanner";
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanned, setScanned] = useState(false);

  const load = useCallback(
    () => fetchStudentAttendances(),
    [fetchStudentAttendances],
  );

  const startScan = async () => {
    if (!token) {
      showToast("Please sign in again", "error");
      return;
    }
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === "granted");
    if (status !== "granted") {
      showToast("Camera permission denied", "error");
      return;
    }
    setScanned(false);
    setScanning(true);
  };

  const handleBarCodeScanned = async ({ data }: any) => {
    if (scanned || submitting) return;
    setScanned(true);
    setSubmitting(true);
    try {
      await submitAttendanceQR(token, data);
      showToast("Attendance submitted", "success");
      setScanning(false);
    } catch (e: any) {
      if (e?.status === 409) {
        showToast(e?.message || "Already checked in", "error");
      } else {
        showToast(e?.message || "Check-in failed", "error");
      }
      setScanned(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <View style={{ padding: 16 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Scan QR to Check In
        </Text>
        {scanning ? (
          <View style={{ height: 300 }}>
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={{ flex: 1 }}
            />
            <Button onPress={() => setScanning(false)} style={{ marginTop: 8 }}>
              Cancel
            </Button>
          </View>
        ) : (
          <Button mode="contained" onPress={startScan} disabled={submitting}>
            Scan QR Code
          </Button>
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
