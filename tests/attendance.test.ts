import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/store";

describe("Attendance Verification Engine & Business Rules", () => {
  const studentId = "u-student-1"; // Enrolled in CSC 401
  const lecturerId = "u-lecturer-1";
  const classroomId = "c1111111-1111-1111-1111-111111111111"; // LT 1: 7.51882, 4.52735
  const courseId = "d1111111-1111-1111-1111-111111111111"; // CSC 401
  const classroomCoord = { lat: 7.51882, lon: 4.52735 };

  let activeSession: ReturnType<typeof db.createSession>;

  beforeEach(() => {
    // Seed test fixtures
    db.seedTestData();

    // Create a fresh active session before each test
    activeSession = db.createSession({
      course_id: courseId,
      lecturer_id: lecturerId,
      classroom_id: classroomId,
      radius_meters: 60,
      durationMinutes: 60,
    });
  });

  it("successfully records attendance when student is inside geofence with accurate GPS", () => {
    const result = db.verifyAndRecordAttendance(
      activeSession.id,
      studentId,
      classroomCoord.lat + 0.00005, // ~5.5m away
      classroomCoord.lon + 0.00005,
      10, // 10m accuracy
    );

    expect(result.success).toBe(true);
    expect(result.code).toBe("ATTENDANCE_RECORDED");
    expect(result.distance_meters).toBeLessThan(60);

    const records = db.getAttendanceRecords(activeSession.id);
    expect(records.length).toBe(1);
    expect(records[0].student_id).toBe(studentId);
    expect(records[0].status).toBe("present");
    expect(records[0].matric_number).toBe("CSC/2024/001");
  });

  it("prevents duplicate check-in atomically for the same session", () => {
    // First check-in
    const first = db.verifyAndRecordAttendance(
      activeSession.id,
      studentId,
      classroomCoord.lat,
      classroomCoord.lon,
      10,
    );
    expect(first.success).toBe(true);

    // Second check-in attempt
    const second = db.verifyAndRecordAttendance(
      activeSession.id,
      studentId,
      classroomCoord.lat,
      classroomCoord.lon,
      10,
    );
    expect(second.success).toBe(false);
    expect(second.code).toBe("DUPLICATE_CHECKIN");
    expect(second.message).toContain("already checked in");

    // Still only 1 record
    const records = db.getAttendanceRecords(activeSession.id);
    expect(records.length).toBe(1);
  });

  it("rejects check-in if student is outside the configured classroom geofence", () => {
    // Far away coordinates: Oduduwa Hall (~200m away)
    const result = db.verifyAndRecordAttendance(
      activeSession.id,
      studentId,
      7.51731,
      4.52621,
      10,
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe("OUTSIDE_GEOFENCE");
    expect(result.distance_meters).toBeGreaterThan(60);
    expect(result.message).toContain("away from the classroom");
    expect(result.message).toContain("allowed radius is 60m");
  });

  it("rejects check-in if reported GPS accuracy is too coarse (> 50m)", () => {
    const result = db.verifyAndRecordAttendance(
      activeSession.id,
      studentId,
      classroomCoord.lat,
      classroomCoord.lon,
      80, // 80m accuracy
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe("INACCURATE_LOCATION");
    expect(result.message).toContain("Location accuracy (±80.0m) is too low");
  });

  it("rejects check-in if student is not enrolled in the session's course", () => {
    // Create course where student is NOT enrolled
    const unEnrolledCourse = db.createCourse({
      code: "MEE 401",
      name: "Applied Thermodynamics",
      department: "Mechanical Engineering",
    });

    const unEnrolledSession = db.createSession({
      course_id: unEnrolledCourse.id,
      lecturer_id: lecturerId,
      classroom_id: classroomId,
    });

    const result = db.verifyAndRecordAttendance(
      unEnrolledSession.id,
      studentId,
      classroomCoord.lat,
      classroomCoord.lon,
      10,
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe("NOT_ENROLLED");
    expect(result.message).toContain("not enrolled in the course");
  });

  it("rejects check-in for ended or closed sessions", () => {
    db.endSession(activeSession.id, lecturerId);

    const result = db.verifyAndRecordAttendance(
      activeSession.id,
      studentId,
      classroomCoord.lat,
      classroomCoord.lon,
      10,
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe("SESSION_INACTIVE");
    expect(result.message).toContain("ended or expired");
  });

  it("rejects check-in from non-student roles (e.g. lecturers)", () => {
    const result = db.verifyAndRecordAttendance(
      activeSession.id,
      lecturerId, // Lecturer trying to check in as student
      classroomCoord.lat,
      classroomCoord.lon,
      10,
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe("UNAUTHORIZED_ROLE");
    expect(result.message).toContain("Only registered students");
  });
});
