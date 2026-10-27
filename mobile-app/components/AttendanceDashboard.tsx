import React, { useCallback, useEffect, useState } from "react";
import { ScrollView } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getStudentAttendance,
} from "../utils/storage";
import { colors } from "../ui/design";

export type AttendanceRecord = {
  id: string;
  studentName: string;
  matricNumber: string;
  timestamp: string;
};

export type AttendanceSession = {
  id: string;
  courseCode: string;
  courseName: string;
  lecturerEmail: string;
  createdAt: string;
  endedAt?: string | null;
  records: AttendanceRecord[];
};

export type StudentAttendance = {
  id: string;
  courseCode: string;
  courseName: string;
  lecturerEmail: string;
  status: "present" | "absent";
  timestamp: string;
};

type LecturerProps = {
  role: "lecturer";
  name: string;
  email: string;
  load?: () => Promise<AttendanceSession[]>;
  showToast: (message: string, type?: "success" | "error") => void;
  onLogout: () => Promise<void>;
  onEditProfile?: () => void;
};

type StudentProps = {
  role: "student";
  name: string;
  matricNumber: string;
  load?: () => Promise<StudentAttendance[]>;
  saveAttendance?: (attendance: StudentAttendance) => Promise<void>;
  showToast: (message: string, type?: "success" | "error") => void;
  onLogout: () => Promise<void>;
  onEditProfile?: () => void;
};

type Props = (LecturerProps | StudentProps) & {
  saveAttendanceSession?: (session: {
    sessionId: string;
    lecturerEmail: string;
    courseCode: string;
    courseName: string;
    records: AttendanceRecord[];
  }) => Promise<void>;
  fetchAttendanceSessions?: (email: string) => Promise<AttendanceSession[]>;
  fetchStudentAttendances?: () => Promise<StudentAttendance[]>;
};

export default function AttendanceDashboard(props: Props) {
  const { role, showToast, onLogout, onEditProfile } = props;
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (role === "student") {
        const studentProps = props as StudentProps;
        if (studentProps.load) {
          setStudentAttendances(await studentProps.load());
        } else {
          setStudentAttendances(await getStudentAttendance());
        }
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to load attendance", "error");
    } finally {
      setLoading(false);
    }
  }, [props, role, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Card style={{ marginBottom: 16 }}>
          <Card.Title title={role === "lecturer" ? "QR Attendance (Lecturer)" : "Attendance"} subtitle={role === "lecturer" ? (props as LecturerProps).email : (props as StudentProps).matricNumber} />
          <Card.Content>
            <Text>Use the QR code flow above to manage attendance sessions.</Text>
          </Card.Content>
          <Card.Actions>
            {onEditProfile && <Button onPress={onEditProfile}>Edit Profile</Button>}
            <Button onPress={onLogout}>Logout</Button>
          </Card.Actions>
        </Card>

        {role === "student" && <Card>
          <Card.Title title="Your Attendance" />
          <Card.Content>
            {loading ? (
              <ActivityIndicator />
            ) : (
              studentAttendances.length === 0 ? <Text>No attendance records.</Text> : studentAttendances.map((a) => <Text key={a.id}>{a.courseCode} - {a.status}</Text>)
            )}
          </Card.Content>
        </Card>}
      </ScrollView>
    </SafeAreaView>
  );
}
