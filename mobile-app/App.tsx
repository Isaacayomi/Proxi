import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  Button,
  DefaultTheme,
  Provider as PaperProvider,
  Text,
} from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { colors } from "./ui/design";

import {
  ApiError,
  type AuthSession,
  type UserProfile,
  fetchProfile,
  updateProfile,
  logout,
  registerAuth,
} from "./utils/api";
import { readSession, saveSession, clearSession } from "./utils/session";

import LecturerAttendanceScreen from "./components/LecturerAttendanceScreen";
import Login from "./components/Login";
import UserDetails from "./components/UserDetails";
import StudentAttendanceScreen from "./components/StudentAttendanceScreen";

const theme = {
  ...DefaultTheme,
  roundness: 4,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.green,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.ink,
    onSurfaceVariant: colors.muted,
    secondaryContainer: colors.mint,
    secondary: colors.darkGreen,
  },
};

interface AttendanceRecord {
  studentName: string;
  matricNumber: string;
  timestamp: number;
}

interface AttendanceSession {
  sessionId: string;
  courseCode: string;
  courseName: string;
  createdAt: number;
  records: AttendanceRecord[];
}

interface MarkedAttendance {
  sessionId: string;
  courseCode: string;
  courseName: string;
  expiryTimestamp: number;
  timestamp: number;
}

const App: React.FC = () => {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [preview, setPreview] = useState<"student" | "lecturer" | null>(null);
  const [screen, setScreen] = useState<
    "login" | "details" | "dashboard"
  >("login");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [retry, setRetry] = useState(0);
  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") =>
      Toast.show({
        type,
        text1: message,
        position: "top",
        visibilityTime: 5000,
      }),
    [],
  );
  const profile: UserProfile | null = preview
    ? {
        id: `preview-${preview}`,
        email: `preview@${preview}.example`,
        firstName: "Preview",
        lastName: preview === "student" ? "Student" : "Lecturer",
        matricNumber: "PREVIEW/001",
        userType: preview,
      }
    : (session?.user ?? null);
  const needsDetails = (user: UserProfile) =>
    !user.firstName ||
    !user.lastName ||
    (user.userType === "student" && !user.matricNumber);
  const initDatabase = async () => {
    try {
      const database = await openDatabaseAsync("MainDB.db");
      await createTables(database);
      setDb(database);
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  };

  const createTables = async (database: SQLiteDatabase) => {
    try {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS AttendanceSessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sessionId TEXT UNIQUE,
          lecturerEmail TEXT,
          courseCode TEXT,
          courseName TEXT,
          createdAt INTEGER
        )
      `);
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS AttendanceRecords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sessionId TEXT,
          studentName TEXT,
          matricNumber TEXT,
          timestamp INTEGER,
          FOREIGN KEY (sessionId) REFERENCES AttendanceSessions (sessionId)
        )
      `);
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS StudentAttendances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sessionId TEXT UNIQUE,
          studentEmail TEXT,
          courseCode TEXT,
          courseName TEXT,
          expiryTimestamp INTEGER,
          timestamp INTEGER
        )
      `);
      await database.execAsync(`CREATE TABLE IF NOT EXISTS StudentAttendanceEntries (
        sessionId TEXT NOT NULL, studentEmail TEXT NOT NULL, courseCode TEXT, courseName TEXT,
        expiryTimestamp INTEGER, timestamp INTEGER, PRIMARY KEY(sessionId,studentEmail)
      ); INSERT OR IGNORE INTO StudentAttendanceEntries SELECT sessionId,studentEmail,courseCode,courseName,expiryTimestamp,timestamp FROM StudentAttendances WHERE sessionId IS NOT NULL AND studentEmail IS NOT NULL;`);
      console.log("Tables created successfully");
    } catch (error) {
      console.error("Error creating tables:", error);
      throw error;
    }
  };

  const saveAttendanceSession = async (sessionData: {
    sessionId: string;
    courseName: string;
    courseCode: string;
    lecturerEmail: string;
    records: AttendanceRecord[];
  }) => {
    if (!db) throw new Error("Attendance storage is unavailable.");
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        `INSERT INTO AttendanceSessions(sessionId,lecturerEmail,courseCode,courseName,createdAt) VALUES(?,?,?,?,?) ON CONFLICT(sessionId) DO UPDATE SET courseCode=excluded.courseCode,courseName=excluded.courseName`,
        [
          sessionData.sessionId,
          sessionData.lecturerEmail,
          sessionData.courseCode,
          sessionData.courseName,
          Date.now(),
        ],
      );
      await tx.runAsync("DELETE FROM AttendanceRecords WHERE sessionId=?", [
        sessionData.sessionId,
      ]);
      const records = new Map(
        sessionData.records.map((record) => [record.matricNumber, record]),
      );
      for (const record of records.values())
        await tx.runAsync(
          "INSERT INTO AttendanceRecords(sessionId,studentName,matricNumber,timestamp) VALUES(?,?,?,?)",
          [
            sessionData.sessionId,
            record.studentName,
            record.matricNumber,
            record.timestamp,
          ],
        );
    });
  };

  const fetchAttendanceSessions = async (
    lecturerEmail: string,
  ): Promise<AttendanceSession[]> => {
    if (!db) {
      console.error("Database not initialized");
      throw new Error(
        "Attendance storage is unavailable. Restart the app and try again.",
      );
    }

    try {
      const rows = await db.getAllAsync<AttendanceSession & AttendanceRecord>(
        `SELECT
          s.sessionId, s.courseCode, s.courseName, s.createdAt,
          r.studentName, r.matricNumber, r.timestamp
         FROM AttendanceSessions s
         LEFT JOIN AttendanceRecords r ON s.sessionId = r.sessionId
         WHERE s.lecturerEmail = ?
         ORDER BY s.createdAt DESC, r.timestamp ASC`,
        [lecturerEmail],
      );

      const sessionsMap = new Map<string, AttendanceSession>();

      rows.forEach((row) => {
        if (!sessionsMap.has(row.sessionId)) {
          sessionsMap.set(row.sessionId, {
            sessionId: row.sessionId,
            courseCode: row.courseCode,
            courseName: row.courseName,
            createdAt: row.createdAt,
            records: [],
          });
        }

        const session = sessionsMap.get(row.sessionId)!;

        if (row.studentName) {
          session.records.push({
            studentName: row.studentName,
            matricNumber: row.matricNumber,
            timestamp: row.timestamp,
          });
        }
      });

      return Array.from(sessionsMap.values());
    } catch (error) {
      console.error("Error fetching attendance sessions:", error);
      throw error;
    }
  };

  const saveStudentAttendance = async (attendanceData: MarkedAttendance) => {
    if (!db) {
      console.error("Database not initialized");
      return;
    }

    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO StudentAttendanceEntries (sessionId, studentEmail, courseCode, courseName, expiryTimestamp, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          attendanceData.sessionId,
          email,
          attendanceData.courseCode,
          attendanceData.courseName,
          attendanceData.expiryTimestamp,
          attendanceData.timestamp,
        ],
      );

      console.log("Student attendance saved successfully");
    } catch (error) {
      console.error("Error saving student attendance:", error);
      showToast("Failed to save student attendance", "error");
    }
  };

  const fetchStudentAttendances = async (): Promise<MarkedAttendance[]> => {
    if (!db) {
      throw new Error("Attendance storage is unavailable.");
    }

    try {
      const rows = await db.getAllAsync<MarkedAttendance>(
        "SELECT * FROM StudentAttendanceEntries WHERE studentEmail = ? ORDER BY timestamp DESC",
        [email],
      );

      return rows;
    } catch (error) {
      console.error("Error fetching student attendances:", error);
      throw error;
    }
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        await initDatabase();
        const saved = await readSession();
        if (saved) {
          let restored = saved;
          try {
            restored = { ...saved, user: await fetchProfile(saved.token) };
            await saveSession(restored);
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
              await clearSession();
              return;
            }
            if (error instanceof ApiError && error.status === 0) {
              if (active) setOffline(true);
            } else throw error;
          }
          if (active) {
            setSession(restored);
            setEmail(restored.user.email);
            setScreen(needsDetails(restored.user) ? "details" : "dashboard");
          }
        }
      } catch {
        if (active) setInitError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    initialize();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]);
  const handleLogin = async (value: string) => {
    const normalized = value.trim().toLowerCase();
    const next = await registerAuth(normalized);
    await saveSession(next);
    setSession(next);
    setEmail(normalized);
    setOffline(false);
    setScreen(needsDetails(next.user) ? "details" : "dashboard");
  };
  const handleDetails = async (details: {
    firstName: string;
    lastName: string;
    matricNumber?: string;
  }) => {
    if (!session) throw new Error("Please sign in again.");
    try {
      const user = await updateProfile(session.token, details);
      const next = { ...session, user };
      await saveSession(next);
      setSession(next);
      setOffline(false);
      setScreen("dashboard");
      showToast("Profile saved.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        setSession(null);
        setScreen("login");
      }
      throw error;
    }
  };
  const handleLogout = async () => {
    if (preview) {
      setPreview(null);
      setScreen("login");
      return;
    }
    try {
      if (session) await logout(session.token);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        showToast(
          "Unable to sign out. Check your connection and try again.",
          "error",
        );
        return;
      }
    }
    try {
      await clearSession();
      setSession(null);
      setEmail("");
      setOffline(false);
      setScreen("login");
    } catch {
      showToast("Unable to remove your saved session. Try again.", "error");
    }
  };
  const renderScreen = () => {
    if (screen === "login")
      return (
        <Login
          onLogin={handleLogin}
          onPreview={(role) => {
            setPreview(role);
            setScreen("dashboard");
          }}
        />
      );
    if (screen === "details" && profile)
      return (
        <UserDetails
          userType={profile.userType}
          initialDetails={profile}
          onSubmit={handleDetails}
          onCancel={
            needsDetails(profile) ? undefined : () => setScreen("dashboard")
          }
          onLogout={handleLogout}
        />
      );
    if (!profile)
      return (
        <Login
          onLogin={handleLogin}
          onPreview={(role) => {
            setPreview(role);
            setScreen("dashboard");
          }}
        />
      );
    const name = `${profile.firstName} ${profile.lastName}`;
    const onEditProfile = preview ? undefined : () => setScreen("details");
    return (
      <View style={{ flex: 1 }}>
        {offline && (
          <Text
            style={{
              padding: 12,
              backgroundColor: colors.mint,
              color: colors.darkGreen,
            }}
          >
            Offline: showing your saved profile and local records.
          </Text>
        )}
        {preview && (
          <Text
            style={{
              padding: 10,
              textAlign: "center",
              fontSize: 11,
              color: colors.green,
            }}
          >
            UI preview · attendance actions are unavailable
          </Text>
        )}
        {profile.userType === "lecturer" ? (
          <LecturerAttendanceScreen
            lecturerName={name}
            lecturerEmail={profile.email}
            token={session?.token || ""}
            showToast={showToast}
            onLogout={handleLogout}
            onEditProfile={onEditProfile}
            saveAttendanceSession={saveAttendanceSession}
            fetchAttendanceSessions={fetchAttendanceSessions}
          />
        ) : (
          <StudentAttendanceScreen
            studentName={name}
            matricNumber={profile.matricNumber}
            token={session?.token || ""}
            showToast={showToast}
            onLogout={handleLogout}
            onEditProfile={onEditProfile}
            saveStudentAttendance={saveStudentAttendance}
            fetchStudentAttendances={fetchStudentAttendances}
          />
        )}
      </View>
    );
  };
  if (isLoading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  if (initError)
    return (
      <View style={styles.loading}>
        <Text style={styles.errorTitle}>Couldn’t start Proxi</Text>
        <Text style={styles.errorText}>
          We couldn’t open local storage. Try restarting the app.
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            setInitError(false);
            setIsLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          Try again
        </Button>
      </View>
    );
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <SafeAreaView style={styles.container}>
          {renderScreen()}
        </SafeAreaView>
        <Toast />
      </PaperProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.ink,
  },
  errorText: {
    textAlign: "center",
    color: colors.muted,
  },
});

export default App;
