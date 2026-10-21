import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Button, Icon, Text } from "react-native-paper";
import { format } from "date-fns";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors, EmptyState, Field, s } from "../ui/design";
export interface AttendanceRecord {
  studentName: string;
  matricNumber: string;
  timestamp: number;
}
export interface AttendanceSession {
  sessionId: string;
  courseCode: string;
  courseName: string;
  createdAt: number;
  records: AttendanceRecord[];
}
export interface StudentAttendance {
  sessionId: string;
  courseCode: string;
  courseName: string;
  expiryTimestamp: number;
  timestamp: number;
}
type Entry = AttendanceSession | StudentAttendance;
type Tab = "home" | "attendance" | "history" | "profile";
type Props = {
  role: "student" | "lecturer";
  name: string;
  email?: string;
  matricNumber?: string;
  load: () => Promise<Entry[]>;
  onLogout: () => Promise<void>;
  onEditProfile?: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
};
const nav: { key: Tab; icon: string; label: string }[] = [
  { key: "home", icon: "home-outline", label: "Home" },
  { key: "attendance", icon: "radar", label: "Attendance" },
  { key: "history", icon: "clipboard-text-outline", label: "History" },
  { key: "profile", icon: "account-outline", label: "Profile" },
];
const entryDate = (entry: Entry) =>
  new Date("createdAt" in entry ? entry.createdAt : entry.timestamp * 1000);
const csvCell = (value: string | number) => {
  const text=String(value);const safe=/^[=+\-@\t\r]/.test(text)?`'${text}`:text;
  return `"${safe.replace(/"/g, '""')}"`;
};
export default function AttendanceDashboard({
  role,
  name,
  email,
  matricNumber,
  load,
  onLogout,
  onEditProfile,
  showToast,
}: Props) {
  const [tab, setTab] = useState<Tab>("home");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(true);
  const [weekOnly, setWeekOnly] = useState(false);
  const [courseCode, setCode] = useState("");
  const [courseName, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [exporting, setExporting] = useState<string | null>(null);
  const [today] = useState(() => new Date());
  useEffect(() => {
    let active = true;
    load()
      .then((data) => {
        if (active) {
          setEntries(data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
          showToast("Could not load attendance history", "error");
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [load, showToast]);
  const refresh = async () => {
    setBusy(true);
    try {
      setEntries(await load());
      setLoadError(false);
    } catch {
      setLoadError(true);
      showToast("Could not load attendance history", "error");
    } finally {
      setBusy(false);
    }
  };
  const exportCSV = async (entry: AttendanceSession) => {
    setExporting(entry.sessionId);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        showToast("Sharing is unavailable on this device", "error");
        return;
      }
      const csv = [
        ["Student name", "Matric number", "Course code", "Recorded at"]
          .map(csvCell)
          .join(","),
        ...entry.records.map((record) =>
          [
            record.studentName,
            record.matricNumber,
            entry.courseCode,
            new Date(record.timestamp * 1000).toISOString(),
          ]
            .map(csvCell)
            .join(","),
        ),
      ].join("\n");
      const filename = `${entry.courseCode.replace(/[^a-z0-9_-]/gi, "_")}_${entry.createdAt}_attendance.csv`;
      const file = new File(Paths.cache, filename);
      file.write(csv);
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        dialogTitle: "Export attendance",
        UTI: "public.comma-separated-values-text",
      });
    } catch {
      showToast("Could not export attendance", "error");
    } finally {
      setExporting(null);
    }
  };
  const todayCount = entries.filter(
    (entry) => entryDate(entry).toDateString() === today.toDateString(),
  ).length;
  const recordCount = entries.reduce(
    (total, entry) => total + ("records" in entry ? entry.records.length : 1),
    0,
  );
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const filtered = weekOnly
    ? entries.filter(
        (entry) => entryDate(entry).getTime() >= today.getTime() - 7 * 86400000,
      )
    : entries;
  const renderEntry = (entry: Entry) => (
    <View key={entry.sessionId} style={s.card}>
      <View style={d.row}>
        <View style={d.courseIcon}>
          <Icon
            source="book-open-page-variant-outline"
            color={colors.green}
            size={23}
          />
        </View>
        <View style={d.grow}>
          <Text style={d.courseCode}>{entry.courseCode}</Text>
          <Text style={d.courseName}>{entry.courseName}</Text>
        </View>
        <View style={d.badge}>
          <Text style={d.badgeText}>
            {"records" in entry
              ? `${entry.records.length} present`
              : "Recorded"}
          </Text>
        </View>
      </View>
      <View style={d.recordFooter}>
        <Text style={d.small}>
          {format(entryDate(entry), "dd MMM yyyy · h:mm a")}
        </Text>
        {"records" in entry && (
          <Button
            compact
            icon="tray-arrow-up"
            textColor={colors.green}
            loading={exporting === entry.sessionId}
            disabled={exporting !== null}
            onPress={() => exportCSV(entry)}
          >
            Export CSV
          </Button>
        )}
      </View>
    </View>
  );
  const history = (recent = false) => (
    <>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>
          {recent ? "Recent attendance" : "Attendance history"}
        </Text>
        {recent ? (
          <Button
            compact
            textColor={colors.muted}
            onPress={() => setTab("history")}
          >
            See all
          </Button>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle history date filter"
            onPress={() => setWeekOnly(!weekOnly)}
            style={d.filter}
          >
            <Text style={d.small}>{weekOnly ? "This week" : "All time"}</Text>
            <Icon source="chevron-down" size={14} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {busy ? (
        <View style={s.card}>
          <Text style={d.small}>Loading your records…</Text>
        </View>
      ) : loadError ? (
        <View style={s.card}>
          <EmptyState
            title="Couldn’t load attendance"
            description="Your records could not be read. Try again."
          />
          <Button onPress={refresh}>Try again</Button>
        </View>
      ) : (recent ? entries.slice(0, 3) : filtered).length ? (
        (recent ? entries.slice(0, 3) : filtered).map(renderEntry)
      ) : (
        <View style={s.card}>
          <EmptyState
            title="A fresh start"
            description={
              weekOnly
                ? "No attendance records in the last seven days."
                : "Your attendance records will appear here after a session is recorded."
            }
          />
        </View>
      )}
    </>
  );
  return (
    <KeyboardAvoidingView
      style={s.fill}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={d.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={d.header}>
          <View style={d.grow}>
            <Text style={d.small}>{format(today, "EEEE, d MMMM")}</Text>
            <Text style={d.welcome}>Welcome, {name.split(" ")[0]}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => setTab("profile")}
            style={d.avatar}
          >
            <Text style={d.initials}>{initials}</Text>
          </Pressable>
        </View>
        {tab === "home" && (
          <>
            <Text style={d.heroTitle}>{"Today’s\nsummary"}</Text>
            <View style={[s.card, d.checkin]}>
              <View style={d.grow}>
                <Text style={d.small}>Your attendance</Text>
                <Text style={d.metric}>
                  {todayCount ? `${todayCount} today` : "Not recorded yet"}
                </Text>
              </View>
              <Button
                mode="contained"
                style={s.primaryButton}
                onPress={() => setTab("attendance")}
              >
                {role === "student" ? "Check in" : "Open session"}
              </Button>
            </View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>At a glance</Text>
              <Text style={d.small}>
                {role === "student" ? "Student" : "Lecturer"}
              </Text>
            </View>
            <View style={d.stats}>
              {[
                {
                  value: entries.length,
                  label: role === "student" ? "Attendances" : "Sessions",
                },
                { value: todayCount, label: "Today" },
                {
                  value:
                    role === "student"
                      ? new Set(entries.map((e) => e.courseCode)).size
                      : recordCount,
                  label: role === "student" ? "Courses" : "Records",
                },
              ].map((item) => (
                <View key={item.label} style={d.stat}>
                  <Text style={d.statValue}>{item.value}</Text>
                  <Text style={d.small}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Your classroom, connected</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open attendance"
              onPress={() => setTab("attendance")}
              style={[s.card, d.feature]}
            >
              <View style={d.featureIcon}>
                <Icon source="access-point" size={30} color={colors.green} />
              </View>
              <View style={d.grow}>
                <Text style={d.featureTitle}>Be here. Be counted.</Text>
                <Text style={d.featureText}>
                  Proximity attendance is coming soon.
                </Text>
              </View>
              <Icon source="arrow-top-right" size={22} color={colors.green} />
            </Pressable>
            {history(true)}
          </>
        )}
        {tab === "attendance" && (
          <>
            <Text style={d.pageTitle}>Attendance</Text>
            <Text style={d.subtitle}>
              {role === "student"
                ? "Your next class starts with showing up."
                : "Make every class count."}
            </Text>
            <View style={d.attendanceHero}>
              <View style={d.outerRing}>
                <View style={d.innerRing}>
                  <View style={d.circle}>
                    <Icon
                      source={
                        role === "student" ? "gesture-tap" : "access-point"
                      }
                      size={46}
                      color="white"
                    />
                    <Text style={d.circleLabel}>
                      {role === "student" ? "Check in" : "Start session"}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={d.nearby}>A little closer to class.</Text>
              <Text style={d.attendanceHint}>
                Bluetooth: coming later (Expo Go preview)
              </Text>
              <Button disabled>Bluetooth coming later</Button>
            </View>
            {role === "lecturer" ? (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Create Attendance Session</Text>
                <Text style={d.formHint}>
                  Set up the details for your next class.
                </Text>
                <Field
                  label="Course code"
                  placeholder="EEE 301"
                  value={courseCode}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                />
                <Field
                  label="Course name"
                  placeholder="Enter course name"
                  value={courseName}
                  onChangeText={setName}
                />
                <Field
                  label="Duration (minutes)"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                />
                <Button
                  mode="contained"
                  disabled
                  contentStyle={s.buttonContent}
                  style={{ borderRadius: 30 }}
                >
                  Create session
                </Button>
                <Text style={d.formHint}>
                  Session creation will be available when device connectivity is
                  added.
                </Text>
              </View>
            ) : (
              <>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Available sessions</Text>
                  <Icon source="radar" size={20} color={colors.muted} />
                </View>
                <View style={s.card}>
                  <EmptyState
                    icon="access-point"
                    title="No nearby sessions yet"
                    description="When device connectivity is ready, open sessions from your classroom will appear here."
                  />
                </View>
              </>
            )}
          </>
        )}
        {tab === "history" && (
          <>
            <Text style={d.pageTitle}>Your attendance,</Text>
            <Text style={[d.pageTitle, { fontWeight: "400", marginTop: 0 }]}>
              all in one place.
            </Text>
            <View style={d.historyTools}>
              <Text style={d.small}>
                {entries.length} saved{" "}
                {entries.length === 1 ? "session" : "sessions"}
              </Text>
              <Button
                compact
                icon="refresh"
                loading={busy}
                disabled={busy}
                textColor={colors.green}
                onPress={refresh}
              >
                Refresh
              </Button>
            </View>
            {history()}
          </>
        )}
        {tab === "profile" && (
          <>
            <Text style={d.pageTitle}>Your profile</Text>
            <Text style={d.subtitle}>The person behind the presence.</Text>
            <View style={[s.card, d.profileCard]}>
              <View style={d.bigAvatar}>
                <Text style={d.bigInitials}>{initials}</Text>
              </View>
              <Text style={d.profileName}>{name}</Text>
              <View style={d.badge}>
                <Text style={d.badgeText}>
                  {role === "student" ? "Student" : "Lecturer"}
                </Text>
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.sectionTitle}>
                {role === "student"
                  ? "Student Information"
                  : "Lecturer information"}
              </Text>
              {[
                { label: "Full name", value: name },
                {
                  label: role === "student" ? "Matric number" : "Email address",
                  value: role === "student" ? matricNumber : email,
                },
              ].map((item) => (
                <View key={item.label} style={d.profileRow}>
                  <Text style={d.small}>{item.label}</Text>
                  <Text selectable style={d.profileValue}>
                    {item.value || "Not provided"}
                  </Text>
                </View>
              ))}
            </View>
            <View style={s.card}>
              <Text style={s.sectionTitle}>About Proxi</Text>
              <Text style={d.formHint}>Proximity Based Attendance System</Text>
              <Text style={d.small}>
                A SWEP project connecting classrooms through proximity.
              </Text>
            </View>
            {onEditProfile && (
              <Button
                onPress={onEditProfile}
                icon="account-edit-outline"
                textColor={colors.green}
              >
                Edit profile
              </Button>
            )}
            <Button
              icon="logout"
              textColor={colors.error}
              onPress={onLogout}
              contentStyle={s.buttonContent}
            >
              Sign out
            </Button>
          </>
        )}
        <View style={d.brandFooter}>
          <Text style={d.footerBrand}>proxi.</Text>
          <Text style={d.small}>Presence made simple.</Text>
        </View>
      </ScrollView>
      <View style={d.navWrap} pointerEvents="box-none">
        <View style={d.nav}>
          {nav.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: tab === item.key }}
              onPress={() => setTab(item.key)}
              style={[d.navItem, tab === item.key && d.navActive]}
            >
              <Icon
                source={item.icon}
                size={22}
                color={tab === item.key ? "white" : colors.muted}
              />
              <Text
                style={[d.navLabel, tab === item.key && { color: "white" }]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const d = StyleSheet.create({
  content: {
    padding: 22,
    paddingBottom: 120,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  grow: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginTop: 12,
    marginBottom: 24,
  },
  small: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  welcome: { fontSize: 14, fontWeight: "500", color: colors.ink, marginTop: 3 },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 14, color: colors.darkGreen, fontWeight: "700" },
  heroTitle: {
    fontSize: 44,
    lineHeight: 49,
    letterSpacing: -2,
    fontWeight: "500",
    color: colors.ink,
    marginBottom: 25,
  },
  checkin: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  metric: { fontSize: 14, fontWeight: "500", marginTop: 6, color: colors.ink },
  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 19,
    gap: 5,
  },
  statValue: { fontSize: 24, fontWeight: "500", color: colors.green },
  feature: { flexDirection: "row", alignItems: "center", gap: 13 },
  featureIcon: {
    width: 52,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.mint,
  },
  featureTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  featureText: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 18,
    marginTop: 5,
  },
  courseIcon: {
    width: 42,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  courseCode: { fontSize: 14, fontWeight: "600", color: colors.ink },
  courseName: { fontSize: 12, color: colors.muted, marginTop: 4 },
  badge: {
    backgroundColor: colors.mint,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeText: { color: colors.green, fontSize: 10, fontWeight: "600" },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  filter: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -1.2,
    color: colors.ink,
    marginTop: 5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 21,
    marginTop: 9,
    marginBottom: 22,
  },
  attendanceHero: { alignItems: "center", paddingTop: 8, paddingBottom: 16 },
  outerRing: {
    padding: 7,
    borderRadius: 104,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#DBEFE4",
  },
  innerRing: { padding: 6, borderRadius: 98, backgroundColor: "#C6E9DA" },
  circle: {
    width: 166,
    height: 166,
    borderRadius: 83,
    backgroundColor: colors.green,
    borderBottomWidth: 12,
    borderBottomColor: colors.darkGreen,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  circleLabel: { color: "white", fontSize: 16, fontWeight: "500" },
  nearby: {
    fontSize: 22,
    fontWeight: "500",
    color: colors.ink,
    marginTop: 23,
    letterSpacing: -0.6,
  },
  attendanceHint: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 10,
    textAlign: "center",
  },
  formHint: {
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
    marginTop: 10,
    marginBottom: 18,
  },
  historyTools: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  profileCard: { alignItems: "center", paddingVertical: 28, gap: 14 },
  bigAvatar: {
    height: 76,
    width: 76,
    borderRadius: 38,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  bigInitials: { color: colors.green, fontSize: 25, fontWeight: "600" },
  profileName: { fontSize: 22, color: colors.ink, fontWeight: "600" },
  profileRow: {
    paddingTop: 17,
    marginTop: 17,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 7,
  },
  profileValue: { fontSize: 14, color: colors.ink },
  brandFooter: { alignItems: "center", gap: 5, marginTop: 26 },
  footerBrand: {
    fontSize: 20,
    color: colors.green,
    fontWeight: "800",
    letterSpacing: -1,
  },
  navWrap: {
    position: "absolute",
    bottom: 17,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  nav: {
    flexDirection: "row",
    padding: 7,
    borderRadius: 40,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#12392C",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 6,
    gap: 5,
    maxWidth: 380,
    width: "100%",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderRadius: 30,
    gap: 3,
  },
  navActive: { backgroundColor: colors.green },
  navLabel: { fontSize: 9, color: colors.muted },
});
