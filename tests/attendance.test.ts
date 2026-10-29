import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/store";
import { generateEligibilityDocketPdf } from "@/lib/pdf/eligibility-docket";

describe("Attendance Verification Engine & Business Rules", () => {
  const studentId = "u-student-1"; // Enrolled in CSC 401
  const lecturerId = "u-lecturer-1";
  const classroomId = "c1111111-1111-1111-1111-111111111111"; // LT 1: 7.51882, 4.52735
  const courseId = "d1111111-1111-1111-1111-111111111111"; // CSC 401
  const classroomCoord = { lat: 7.51882, lon: 4.52735 };

  let activeSession: ReturnType<typeof db.createSession>;

  beforeEach(() => {
    // Seed test fixtures and reset previous test sessions/records
    db.reset();

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

describe("75% Examination Eligibility & Manual Overrides Policy", () => {
  const studentId = "u-student-1"; // Enrolled in CSC 401
  const lecturerId = "u-lecturer-1";
  const classroomId = "c1111111-1111-1111-1111-111111111111";
  const courseId = "d1111111-1111-1111-1111-111111111111"; // CSC 401

  beforeEach(() => {
    db.reset();
  });

  it("excludes cancelled sessions so cancelled classes do not penalize students", () => {
    // Create 4 sessions: 3 completed/ended, 1 cancelled
    const s1 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s2 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s3 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s4Cancelled = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });

    // Student attends s1 and s2
    db.verifyAndRecordAttendance(s1.id, studentId, 7.51882, 4.52735, 10);
    db.verifyAndRecordAttendance(s2.id, studentId, 7.51882, 4.52735, 10);
    // Student misses s3

    // Lecturer cancels s4
    db.cancelSession(s4Cancelled.id, lecturerId);

    // Generate eligibility report with default 75% threshold
    const report = db.getCourseEligibilityReport(courseId, lecturerId, 75);

    // Verify held sessions vs cancelled sessions
    // s4 is cancelled, so held sessions is 3 (s1, s2, s3)
    expect(report.totalHeldSessions).toBe(3);
    expect(report.totalCancelledSessions).toBe(1);

    const studentRecord = report.students.find((s) => s.studentId === studentId);
    expect(studentRecord).toBeDefined();
    expect(studentRecord?.presentCount).toBe(2);
    expect(studentRecord?.totalHeldSessions).toBe(3);
    // 2/3 = 66.7%
    expect(studentRecord?.attendanceRate).toBe(66.7);
    expect(studentRecord?.isEligible).toBe(false);
    expect(studentRecord?.eligibilityStatus).toBe("NOT ELIGIBLE");
  });

  it("includes lecturer approved manual overrides (excused absences) in attendance percentage", () => {
    // 4 sessions held
    const s1 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s2 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s3 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s4 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });

    // Student attends 2 sessions in person
    db.verifyAndRecordAttendance(s1.id, studentId, 7.51882, 4.52735, 10);
    db.verifyAndRecordAttendance(s2.id, studentId, 7.51882, 4.52735, 10);

    // Student was sick for s3 and presented medical clearance: lecturer grants manual override (excused)
    db.overrideAttendance(s3.id, studentId, "excused", lecturerId, "EXCUSED_ABSENCE");

    // Student missed s4 without excuse

    // Total held = 4. Attended = 2, Excused = 1 -> Total Cleared = 3 / 4 = 75.0%
    const report = db.getCourseEligibilityReport(courseId, lecturerId, 75);
    const studentRecord = report.students.find((s) => s.studentId === studentId);

    expect(studentRecord).toBeDefined();
    expect(studentRecord?.presentCount).toBe(2);
    expect(studentRecord?.excusedCount).toBe(1);
    expect(studentRecord?.totalHeldSessions).toBe(4);
    expect(studentRecord?.attendanceRate).toBe(75);
    expect(studentRecord?.isEligible).toBe(true);
    expect(studentRecord?.eligibilityStatus).toBe("ELIGIBLE");
  });

  it("supports configurable department threshold settings (e.g. 70%, 80%)", () => {
    // 10 sessions held, student attends 7
    const sessions = [];
    for (let i = 0; i < 10; i++) {
      const s = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
      sessions.push(s);
      if (i < 7) {
        db.verifyAndRecordAttendance(s.id, studentId, 7.51882, 4.52735, 10);
      }
    }

    // At 70% threshold: 7/10 (70%) is ELIGIBLE
    const report70 = db.getCourseEligibilityReport(courseId, lecturerId, 70);
    const st70 = report70.students.find((s) => s.studentId === studentId);
    expect(st70?.attendanceRate).toBe(70);
    expect(st70?.isEligible).toBe(true);
    expect(st70?.eligibilityStatus).toBe("ELIGIBLE");

    // At standard 75% threshold: 7/10 (70%) is NOT ELIGIBLE
    const report75 = db.getCourseEligibilityReport(courseId, lecturerId, 75);
    const st75 = report75.students.find((s) => s.studentId === studentId);
    expect(st75?.isEligible).toBe(false);
    expect(st75?.eligibilityStatus).toBe("NOT ELIGIBLE");

    // At 80% threshold: 7/10 (70%) is NOT ELIGIBLE
    const report80 = db.getCourseEligibilityReport(courseId, lecturerId, 80);
    const st80 = report80.students.find((s) => s.studentId === studentId);
    expect(st80?.isEligible).toBe(false);
    expect(st80?.eligibilityStatus).toBe("NOT ELIGIBLE");
  });

  it("calculates student personal warning tier when approaching the 75% threshold", () => {
    // Total 10 sessions
    // Student attends 7 sessions -> 70% (< 75%) -> ineligible
    // Student attends 7.6 sessions (or 8 sessions out of 10)
    // Let's test 100 sessions or 4 sessions:
    // Out of 4 sessions:
    // 3/4 = 75% -> close to 75% (warning tier if between 75 and 80)
    const s1 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s2 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s3 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s4 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });

    db.verifyAndRecordAttendance(s1.id, studentId, 7.51882, 4.52735, 10);
    db.verifyAndRecordAttendance(s2.id, studentId, 7.51882, 4.52735, 10);
    db.verifyAndRecordAttendance(s3.id, studentId, 7.51882, 4.52735, 10);

    const summaries = db.getStudentCourseEligibilitySummaries(studentId, 75);
    const summary = summaries.find((s) => s.courseId === courseId);

    expect(summary).toBeDefined();
    expect(summary?.attendanceRate).toBe(75);
    expect(summary?.isEligible).toBe(true);
    // At exactly 75% (>= 75 and < 80), warningTier should be "warning"
    expect(summary?.warningTier).toBe("warning");
    expect(summary?.warningMessage).toContain("close to the 75% attendance limit");
  });

  it("generates an official examination eligibility PDF docket with course metadata and ELIGIBLE status", async () => {
    // 2 sessions held
    const s1 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    const s2 = db.createSession({ course_id: courseId, lecturer_id: lecturerId, classroom_id: classroomId });
    db.verifyAndRecordAttendance(s1.id, studentId, 7.51882, 4.52735, 10);
    db.verifyAndRecordAttendance(s2.id, studentId, 7.51882, 4.52735, 10);

    const report = db.getCourseEligibilityReport(courseId, lecturerId, 75);
    const pdfBuffer = await generateEligibilityDocketPdf(report);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(100);
    // Check PDF header signature "%PDF"
    expect(pdfBuffer.subarray(0, 4).toString("ascii")).toBe("%PDF");

    const pdfString = pdfBuffer.toString("latin1");
    expect(pdfString).toContain("/Type /Catalog");
    expect(pdfString).toContain("OBAFEMI AWOLOWO UNIVERSITY");
    expect(pdfString).toContain("CSC 401");
    expect(pdfString).toContain("ELIGIBLE");
    expect(pdfString).toContain("%%EOF");
  });
});
