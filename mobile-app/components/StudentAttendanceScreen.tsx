import React, { useCallback, useState } from "react";
import AttendanceDashboard from "./AttendanceDashboard";
import { submitAttendanceQR } from "../utils/api";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors } from "../ui/design";
type Props = {
  studentName: string;
  matricNumber: string;
  token: string;
  showToast: (message: string, type?: "success" | "error") => void;
  onLogout: () => Promise<void>;
  onEditProfile?: () => void;
  saveStudentAttendance: (attendance: any) => Promise<void>;
  fetchStudentAttendances: () => Promise<any[]>;
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
  const [permission, requestPermission] = useCameraPermissions();
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
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        showToast("Camera permission denied", "error");
        return;
      }
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
      <View style={{ padding: 16, minHeight: 300, justifyContent: "center", alignItems: "center" }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Scan QR to Check In
        </Text>
        {scanning ? (
          <View style={{ height: 300, width: "100%", maxWidth: 420 }}>
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <Button onPress={() => setScanning(false)} style={{ marginTop: 8 }}>
              Cancel
            </Button>
          </View>
        ) : (
          <Button mode="contained" onPress={startScan} disabled={submitting} style={{ minWidth: 200 }}>
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
