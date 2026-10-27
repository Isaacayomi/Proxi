import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { AttendanceRecord } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(
  isoStringOrTimestamp: string | number | Date,
): string {
  try {
    const date =
      typeof isoStringOrTimestamp === "string"
        ? parseISO(isoStringOrTimestamp)
        : new Date(isoStringOrTimestamp);
    return format(date, "EEE, MMM d, yyyy 'at' h:mm a");
  } catch {
    return String(isoStringOrTimestamp);
  }
}

export function formatDate(
  isoStringOrTimestamp: string | number | Date,
): string {
  try {
    const date =
      typeof isoStringOrTimestamp === "string"
        ? parseISO(isoStringOrTimestamp)
        : new Date(isoStringOrTimestamp);
    return format(date, "yyyy-MM-dd");
  } catch {
    return String(isoStringOrTimestamp);
  }
}

export function formatTime(
  isoStringOrTimestamp: string | number | Date,
): string {
  try {
    const date =
      typeof isoStringOrTimestamp === "string"
        ? parseISO(isoStringOrTimestamp)
        : new Date(isoStringOrTimestamp);
    return format(date, "h:mm a");
  } catch {
    return String(isoStringOrTimestamp);
  }
}

/**
 * Generates formatted CSV string for classroom attendance export
 */
export function generateAttendanceCsv(
  records: AttendanceRecord[],
  courseCode: string,
  sessionDate: string,
): string {
  const headers = [
    "S/N",
    "Matric Number",
    "Student Name",
    "Email",
    "Status",
    "Check-in Time",
    "Distance (m)",
    "Accuracy (m)",
  ];

  const rows = records.map((record, index) => {
    const name = record.student
      ? `${record.student.last_name || ""} ${record.student.first_name || ""}`.trim()
      : "Unknown";
    const email = record.student?.email || "N/A";
    const matric =
      record.matric_number || record.student?.matric_number || "N/A";
    const status = record.status.toUpperCase();
    const time = formatDateTime(record.submitted_at);
    const distance =
      record.distance_meters != null
        ? record.distance_meters.toFixed(1)
        : "N/A";
    const accuracy =
      record.reported_accuracy_meters != null
        ? record.reported_accuracy_meters.toFixed(1)
        : "N/A";

    return [
      index + 1,
      `"${matric}"`,
      `"${name}"`,
      `"${email}"`,
      status,
      `"${time}"`,
      distance,
      accuracy,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Generates standard filename for downloaded CSV reports
 */
export function generateAttendanceFilename(
  courseCode: string,
  timestamp: string | number | Date = new Date(),
): string {
  const dateStr = formatDate(timestamp);
  const cleanCode = courseCode.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${dateStr}_${cleanCode}_Attendance.csv`;
}
