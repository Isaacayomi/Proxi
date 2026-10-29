import {
  Profile,
  Classroom,
  Course,
  FacultyVerificationKey,
  AttendanceSession,
  AttendanceRecord,
  VerificationResult,
  StudentEligibility,
  CourseEligibilityReport,
  StudentCourseEligibilitySummary,
  ExamEligibilityStatus,
  EligibilityWarningTier,
} from "@/types/database";
import {
  evaluateGeofence,
  calculateHaversineDistance,
} from "@/lib/geo/distance";

// Initial seed data: clean slate by default so only user-created data appears
const defaultClassrooms: Classroom[] = [];
const defaultCourses: Course[] = [];
const defaultProfiles: Profile[] = [];
const defaultCourseLecturers: { course_id: string; lecturer_id: string }[] = [];
const defaultEnrollments: { course_id: string; student_id: string }[] = [];

// In-Memory Database Store
class AttendanceStore {
  private profiles = new Map<string, Profile>(
    defaultProfiles.map((p) => [p.id, p]),
  );
  private classrooms = new Map<string, Classroom>(
    defaultClassrooms.map((c) => [c.id, c]),
  );
  private courses = new Map<string, Course>(
    defaultCourses.map((c) => [c.id, c]),
  );
  private courseLecturers = [...defaultCourseLecturers];
  private enrollments = [...defaultEnrollments];
  private sessions = new Map<string, AttendanceSession>();
  private records = new Map<string, AttendanceRecord>();
  private facultyKeys = new Map<string, FacultyVerificationKey>();

  constructor() {
    const initialKeys: FacultyVerificationKey[] = [
      {
        id: "fk-cse",
        key_code: "OAU-CSE-2026",
        department: "Computer Science & Engineering",
        note: "Departmental Authorization Key",
        max_uses: null,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "fk-eee",
        key_code: "OAU-EEE-2026",
        department: "Electronic & Electrical Engineering",
        note: "Departmental Authorization Key",
        max_uses: null,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "fk-mee",
        key_code: "OAU-MEE-2026",
        department: "Mechanical Engineering",
        note: "Departmental Authorization Key",
        max_uses: null,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "fk-cve",
        key_code: "OAU-CVE-2026",
        department: "Civil Engineering",
        note: "Departmental Authorization Key",
        max_uses: null,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "fk-che",
        key_code: "OAU-CHE-2026",
        department: "Chemical Engineering",
        note: "Departmental Authorization Key",
        max_uses: null,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "fk-default",
        key_code: "OAU-FACULTY-2026",
        department: "Faculty of Technology (General)",
        note: "Institutional Master Key",
        max_uses: null,
        used_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    for (const key of initialKeys) {
      this.facultyKeys.set(key.id, key);
    }
  }

  seedTestData() {
    const testClassroom: Classroom = {
      id: "c1111111-1111-1111-1111-111111111111",
      name: "Computer Building LT 1",
      building: "Computer Science & Engineering",
      room_number: "Room 101",
      latitude: 7.51882,
      longitude: 4.52735,
      default_radius_meters: 60,
      created_at: new Date().toISOString(),
    };
    this.classrooms.set(testClassroom.id, testClassroom);

    const testCourse: Course = {
      id: "d1111111-1111-1111-1111-111111111111",
      code: "CSC 401",
      name: "Software Engineering Practice (SWEP)",
      department: "Computer Science and Engineering",
      created_at: new Date().toISOString(),
    };
    this.courses.set(testCourse.id, testCourse);

    this.profiles.set("u-student-1", {
      id: "u-student-1",
      email: "a.okonkwo.csc2024001@student.oauife.edu.ng",
      first_name: "Ada",
      last_name: "Okonkwo",
      matric_number: "CSC/2024/001",
      role: "student",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.profiles.set("u-student-2", {
      id: "u-student-2",
      email: "a.alabi.swe2024001@student.oauife.edu.ng",
      first_name: "Ayomide",
      last_name: "Alabi",
      matric_number: "SWE/2024/001",
      role: "student",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.profiles.set("u-lecturer-1", {
      id: "u-lecturer-1",
      email: "lecturer@oauife.edu.ng",
      first_name: "Prof. Emmanuel",
      last_name: "Adeyemi",
      matric_number: null,
      role: "lecturer",
      is_verified: true,
      staff_id: "OAU/CSE/001",
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.enrollStudentInCourse("d1111111-1111-1111-1111-111111111111", "u-student-1");
    this.enrollStudentInCourse("d1111111-1111-1111-1111-111111111111", "u-student-2");
  }

  reset() {
    this.sessions.clear();
    this.records.clear();
    this.seedTestData();
  }

  // --- Profiles ---
  getProfile(id: string): Profile | null {
    return this.profiles.get(id) || null;
  }

  getProfileByEmail(email: string): Profile | null {
    for (const p of this.profiles.values()) {
      if (p.email.toLowerCase() === email.toLowerCase()) return p;
    }
    return null;
  }

  getProfileByDeviceId(deviceId: string): Profile | null {
    if (!deviceId) return null;
    for (const p of this.profiles.values()) {
      if (p.device_id === deviceId) return p;
    }
    return null;
  }

  saveProfile(profile: Profile): Profile {
    this.profiles.set(profile.id, {
      ...profile,
      updated_at: new Date().toISOString(),
    });
    return this.profiles.get(profile.id)!;
  }

  listProfiles(): Profile[] {
    return Array.from(this.profiles.values());
  }

  // --- Faculty Verification Keys ---
  listFacultyKeys(): FacultyVerificationKey[] {
    return Array.from(this.facultyKeys.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  createFacultyKey(data: {
    key_code?: string;
    department?: string;
    note?: string;
    max_uses?: number | null;
    created_by?: string;
  }): FacultyVerificationKey {
    const id = "fk-" + crypto.randomUUID();
    const code = (
      data.key_code?.trim() ||
      "FAC-" +
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        "-" +
        Math.random().toString(36).substring(2, 6).toUpperCase()
    ).toUpperCase();

    const newKey: FacultyVerificationKey = {
      id,
      key_code: code,
      department: data.department || "Computer Science & Engineering",
      note: data.note || null,
      max_uses: data.max_uses !== undefined ? data.max_uses : 1,
      used_count: 0,
      is_active: true,
      created_by: data.created_by || null,
      created_at: new Date().toISOString(),
    };
    this.facultyKeys.set(id, newKey);
    return newKey;
  }

  revokeFacultyKey(id: string): boolean {
    const key = this.facultyKeys.get(id);
    if (!key) return false;
    key.is_active = false;
    return true;
  }

  validateAndConsumeFacultyKey(code: string): { valid: boolean; reason?: string } {
    const cleanCode = code.trim().toUpperCase();
    for (const key of this.facultyKeys.values()) {
      if (key.key_code === cleanCode) {
        if (!key.is_active) {
          return { valid: false, reason: "This verification key has been revoked." };
        }
        if (
          key.max_uses !== null &&
          key.max_uses !== undefined &&
          key.used_count >= key.max_uses
        ) {
          return {
            valid: false,
            reason: "This verification key has reached its maximum usage limit.",
          };
        }
        key.used_count += 1;
        return { valid: true };
      }
    }
    return { valid: false, reason: "Verification key not recognized." };
  }

  // --- Classrooms ---
  listClassrooms(): Classroom[] {
    return Array.from(this.classrooms.values());
  }

  getClassroom(id: string): Classroom | null {
    return this.classrooms.get(id) || null;
  }

  createClassroom(data: Omit<Classroom, "id" | "created_at">): Classroom {
    const id = "c-" + crypto.randomUUID();
    const classroom: Classroom = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.classrooms.set(id, classroom);
    return classroom;
  }

  updateClassroom(id: string, data: Partial<Classroom>): Classroom | null {
    const existing = this.classrooms.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.classrooms.set(id, updated);
    return updated;
  }

  deleteClassroom(id: string): boolean {
    const deleted = this.classrooms.delete(id);
    if (deleted) {
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.classroom_id === id) {
          this.sessions.delete(sessionId);
        }
      }
    }
    return deleted;
  }

  // --- Courses ---
  listCourses(): Course[] {
    return Array.from(this.courses.values());
  }

  getCourse(id: string): Course | null {
    return this.courses.get(id) || null;
  }

  createCourse(data: Omit<Course, "id" | "created_at">): Course {
    const id = "d-" + crypto.randomUUID();
    const course: Course = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    this.courses.set(id, course);
    return course;
  }

  deleteCourse(id: string): boolean {
    const deleted = this.courses.delete(id);
    if (deleted) {
      this.courseLecturers = this.courseLecturers.filter(
        (cl) => cl.course_id !== id,
      );
      this.enrollments = this.enrollments.filter((e) => e.course_id !== id);
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.course_id === id) {
          this.sessions.delete(sessionId);
        }
      }
    }
    return deleted;
  }

  // --- Assignments & Enrollments ---
  getLecturerCourses(lecturerId: string): Course[] {
    const courseIds = this.courseLecturers
      .filter((cl) => cl.lecturer_id === lecturerId)
      .map((cl) => cl.course_id);
    return courseIds.map((id) => this.courses.get(id)!).filter(Boolean);
  }

  getStudentCourses(studentId: string): Course[] {
    const courseIds = this.enrollments
      .filter((e) => e.student_id === studentId)
      .map((e) => e.course_id);
    return courseIds.map((id) => this.courses.get(id)!).filter(Boolean);
  }

  getCourseStudents(courseId: string): Profile[] {
    const studentIds = this.enrollments
      .filter((e) => e.course_id === courseId)
      .map((e) => e.student_id);
    return studentIds.map((id) => this.profiles.get(id)!).filter(Boolean);
  }

  assignLecturerToCourse(courseId: string, lecturerId: string): void {
    if (
      !this.courseLecturers.some(
        (cl) => cl.course_id === courseId && cl.lecturer_id === lecturerId,
      )
    ) {
      this.courseLecturers.push({
        course_id: courseId,
        lecturer_id: lecturerId,
      });
    }
  }

  enrollStudentInCourse(courseId: string, studentId: string): void {
    if (
      !this.enrollments.some(
        (e) => e.course_id === courseId && e.student_id === studentId,
      )
    ) {
      this.enrollments.push({ course_id: courseId, student_id: studentId });
    }
  }

  unenrollStudentFromCourse(courseId: string, studentId: string): void {
    this.enrollments = this.enrollments.filter(
      (e) => !(e.course_id === courseId && e.student_id === studentId),
    );
  }

  isStudentEnrolled(courseId: string, studentId: string): boolean {
    return this.enrollments.some(
      (e) => e.course_id === courseId && e.student_id === studentId,
    );
  }

  // --- Attendance Sessions ---
  listSessions(filters?: {
    lecturerId?: string;
    courseId?: string;
  }): AttendanceSession[] {
    let list = Array.from(this.sessions.values());
    if (filters?.lecturerId) {
      list = list.filter((s) => s.lecturer_id === filters.lecturerId);
    }
    if (filters?.courseId) {
      list = list.filter((s) => s.course_id === filters.courseId);
    }

    return list
      .map((s) => ({
        ...s,
        course: this.courses.get(s.course_id),
        classroom: this.classrooms.get(s.classroom_id),
        record_count: Array.from(this.records.values()).filter(
          (r) => r.session_id === s.id && r.status === "present",
        ).length,
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }

  getSession(id: string): AttendanceSession | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    return {
      ...s,
      course: this.courses.get(s.course_id),
      classroom: this.classrooms.get(s.classroom_id),
      record_count: Array.from(this.records.values()).filter(
        (r) => r.session_id === s.id && r.status === "present",
      ).length,
    };
  }

  getActiveStudentSessions(studentId: string): AttendanceSession[] {
    const enrolledCourseIds = new Set(
      this.enrollments
        .filter((e) => e.student_id === studentId)
        .map((e) => e.course_id),
    );

    const now = Date.now();
    return Array.from(this.sessions.values())
      .filter((s) => {
        if (!enrolledCourseIds.has(s.course_id)) return false;
        if (s.status !== "active") return false;
        const start = new Date(s.starts_at).getTime();
        const end = new Date(s.ends_at).getTime();
        return now >= start && now <= end;
      })
      .map((s) => {
        const studentRecord = Array.from(this.records.values()).find(
          (r) =>
            r.session_id === s.id &&
            r.student_id === studentId &&
            r.status === "present",
        );
        return {
          ...s,
          course: this.courses.get(s.course_id),
          classroom: this.classrooms.get(s.classroom_id),
          has_checked_in: Boolean(studentRecord),
          checked_in_at: studentRecord?.submitted_at || null,
        };
      });
  }

  createSession(data: {
    course_id: string;
    lecturer_id: string;
    classroom_id: string;
    radius_meters?: number;
    durationMinutes?: number;
  }): AttendanceSession {
    const classroom = this.classrooms.get(data.classroom_id);
    if (!classroom) throw new Error("Classroom not found");
    const course = this.courses.get(data.course_id);
    if (!course) throw new Error("Course not found");

    const id = "s-" + crypto.randomUUID();
    const duration = data.durationMinutes ?? 60;
    const now = Date.now();
    const radius = data.radius_meters ?? classroom.default_radius_meters;

    const session: AttendanceSession = {
      id,
      course_id: data.course_id,
      lecturer_id: data.lecturer_id,
      classroom_id: data.classroom_id,
      latitude: classroom.latitude,
      longitude: classroom.longitude,
      radius_meters: Math.min(500, Math.max(10, radius)),
      max_accuracy_meters: 50,
      starts_at: new Date(now).toISOString(),
      ends_at: new Date(now + duration * 60000).toISOString(),
      status: "active",
      session_code: course.code.replace(/\s+/g, ""),
      created_at: new Date(now).toISOString(),
    };

    this.sessions.set(id, session);
    return {
      ...session,
      course,
      classroom,
      record_count: 0,
    };
  }

  endSession(sessionId: string, lecturerId?: string): AttendanceSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (lecturerId && session.lecturer_id && session.lecturer_id !== lecturerId) {
      throw new Error("Unauthorized to end this session");
    }

    session.status = "ended";
    session.ends_at = new Date().toISOString();
    this.sessions.set(sessionId, session);
    return this.getSession(sessionId)!;
  }

  cancelSession(sessionId: string, lecturerId?: string): AttendanceSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (lecturerId && session.lecturer_id && session.lecturer_id !== lecturerId) {
      throw new Error("Unauthorized to cancel this session");
    }

    session.status = "cancelled";
    session.ends_at = new Date().toISOString();
    this.sessions.set(sessionId, session);
    return this.getSession(sessionId)!;
  }

  // --- Attendance Verification & Records ---
  getAttendanceRecords(sessionId: string): AttendanceRecord[] {
    return Array.from(this.records.values())
      .filter((r) => r.session_id === sessionId)
      .map((r) => ({
        ...r,
        student: this.profiles.get(r.student_id),
      }))
      .sort(
        (a, b) =>
          new Date(a.submitted_at).getTime() -
          new Date(b.submitted_at).getTime(),
      );
  }

  getStudentAttendanceHistory(studentId: string): AttendanceRecord[] {
    return Array.from(this.records.values())
      .filter((r) => r.student_id === studentId)
      .map((r) => ({
        ...r,
        session: this.getSession(r.session_id) || undefined,
      }))
      .sort(
        (a, b) =>
          new Date(b.submitted_at).getTime() -
          new Date(a.submitted_at).getTime(),
      );
  }

  // --- Lecturer Overrides & Excused Absences ---
  overrideAttendance(
    sessionId: string,
    studentId: string,
    status: "present" | "excused" = "excused",
    lecturerId?: string,
    rejectionReason = "EXCUSED_ABSENCE",
  ): AttendanceRecord {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (lecturerId && session.lecturer_id && session.lecturer_id !== lecturerId) {
      throw new Error("Unauthorized to modify attendance for this session");
    }

    const student = this.profiles.get(studentId);
    if (!student) throw new Error("Student not found");

    let existingRecord = Array.from(this.records.values()).find(
      (r) => r.session_id === sessionId && r.student_id === studentId,
    );

    if (existingRecord) {
      existingRecord.status = status;
      existingRecord.rejection_reason = status === "excused" ? rejectionReason : null;
      this.records.set(existingRecord.id, existingRecord);
      return existingRecord;
    }

    const newRecord: AttendanceRecord = {
      id: "rec-override-" + crypto.randomUUID(),
      session_id: sessionId,
      student_id: studentId,
      matric_number: student.matric_number,
      status,
      distance_meters: 0,
      reported_accuracy_meters: 0,
      rejection_reason: status === "excused" ? rejectionReason : null,
      submitted_at: new Date().toISOString(),
      student,
      session,
    };

    this.records.set(newRecord.id, newRecord);
    return newRecord;
  }

  // --- 75% Exam Eligibility & At-Risk Predictor ---
  getCourseEligibilityReport(
    courseId: string,
    lecturerId?: string,
    thresholdPercent = 75,
  ): CourseEligibilityReport {
    const course = this.courses.get(courseId);
    if (!course) throw new Error("Course not found");

    const lecturer = lecturerId ? this.profiles.get(lecturerId) : null;
    const lecturerName = lecturer?.first_name
      ? `${lecturer.first_name} ${lecturer.last_name || ""}`.trim()
      : "Course Lecturer";

    // 1. Filter sessions for course: EXCLUDE cancelled sessions so cancelled classes don't hurt students
    const allCourseSessions = Array.from(this.sessions.values()).filter(
      (s) => s.course_id === courseId,
    );
    const heldSessions = allCourseSessions.filter((s) => s.status !== "cancelled");
    const cancelledSessions = allCourseSessions.filter((s) => s.status === "cancelled");

    const sortedHeld = [...heldSessions].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );

    const fromDate = sortedHeld.length > 0 ? sortedHeld[0].starts_at : null;
    const toDate = sortedHeld.length > 0 ? sortedHeld[sortedHeld.length - 1].starts_at : null;

    // 2. Enrolled students
    const enrolledStudents = this.getCourseStudents(courseId);
    const heldSessionIds = new Set(heldSessions.map((s) => s.id));

    const students: StudentEligibility[] = enrolledStudents.map((stud: Profile) => {
      // Find all records for this student in held sessions
      const studentRecords = Array.from(this.records.values()).filter(
        (r) => r.student_id === stud.id && heldSessionIds.has(r.session_id),
      );

      const presentCount = studentRecords.filter((r) => r.status === "present").length;
      const excusedCount = studentRecords.filter(
        (r) => r.status === "excused" || r.rejection_reason === "EXCUSED_ABSENCE",
      ).length;

      const attendedOrExcusedCount = presentCount + excusedCount;
      const totalHeldSessions = heldSessions.length;

      // Calculate attendance rate (if no held sessions yet, default to 100%)
      const attendanceRate =
        totalHeldSessions > 0
          ? Math.min(100, Math.round(((attendedOrExcusedCount / totalHeldSessions) * 100) * 10) / 10)
          : 100;

      const isEligible = attendanceRate >= thresholdPercent;
      const eligibilityStatus: ExamEligibilityStatus = isEligible ? "ELIGIBLE" : "NOT ELIGIBLE";

      let warningTier: EligibilityWarningTier = "safe";
      let warningMessage = `Cleared for Examinations: Attendance is in good standing (${attendanceRate}%).`;

      if (attendanceRate < thresholdPercent) {
        warningTier = "ineligible";
        warningMessage = `Not Exam Eligible: Attendance is currently ${attendanceRate}% (below ${thresholdPercent}% requirement).`;
      } else if (attendanceRate < thresholdPercent + 5) {
        warningTier = "warning";
        warningMessage = `Warning: Close to threshold! Current attendance is ${attendanceRate}%. Do not miss upcoming lectures to maintain clearance.`;
      }

      return {
        studentId: stud.id,
        matricNumber: stud.matric_number || "N/A",
        studentName: `${stud.first_name || ""} ${stud.last_name || ""}`.trim() || stud.email,
        studentEmail: stud.email,
        totalHeldSessions,
        presentCount,
        excusedCount,
        attendedOrExcusedCount,
        attendanceRate,
        isEligible,
        eligibilityStatus,
        warningTier,
        warningMessage,
      };
    });

    // Sort students by Matric Number, then Name
    students.sort((a, b) => a.matricNumber.localeCompare(b.matricNumber));

    const totalEnrolled = students.length;
    const totalEligible = students.filter((s) => s.isEligible).length;
    const totalNotEligible = totalEnrolled - totalEligible;
    const overallEligibilityRate =
      totalEnrolled > 0
        ? Math.round(((totalEligible / totalEnrolled) * 100) * 10) / 10
        : 100;

    return {
      courseId,
      courseCode: course.code,
      courseName: course.name,
      department: course.department,
      lecturerId: lecturerId || "",
      lecturerName,
      lecturerEmail: lecturer?.email || "",
      generatedAt: new Date().toISOString(),
      dateRange: {
        from: fromDate,
        to: toDate,
      },
      thresholdPercent,
      totalHeldSessions: heldSessions.length,
      totalCancelledSessions: cancelledSessions.length,
      totalEnrolled,
      totalEligible,
      totalNotEligible,
      overallEligibilityRate,
      students,
    };
  }

  getStudentCourseEligibilitySummaries(
    studentId: string,
    thresholdPercent = 75,
  ): StudentCourseEligibilitySummary[] {
    const student = this.profiles.get(studentId);
    if (!student) return [];

    const enrolledCourses = this.getStudentCourses(studentId);

    return enrolledCourses.map((course) => {
      const allCourseSessions = Array.from(this.sessions.values()).filter(
        (s) => s.course_id === course.id,
      );
      const heldSessions = allCourseSessions.filter((s) => s.status !== "cancelled");
      const heldSessionIds = new Set(heldSessions.map((s) => s.id));

      const studentRecords = Array.from(this.records.values()).filter(
        (r) => r.student_id === studentId && heldSessionIds.has(r.session_id),
      );

      const presentCount = studentRecords.filter((r) => r.status === "present").length;
      const excusedCount = studentRecords.filter(
        (r) => r.status === "excused" || r.rejection_reason === "EXCUSED_ABSENCE",
      ).length;
      const attendedOrExcusedCount = presentCount + excusedCount;
      const totalHeldSessions = heldSessions.length;

      const attendanceRate =
        totalHeldSessions > 0
          ? Math.min(100, Math.round(((attendedOrExcusedCount / totalHeldSessions) * 100) * 10) / 10)
          : 100;

      const isEligible = attendanceRate >= thresholdPercent;
      const eligibilityStatus: ExamEligibilityStatus = isEligible ? "ELIGIBLE" : "NOT ELIGIBLE";

      let warningTier: EligibilityWarningTier = "safe";
      let warningMessage = `Cleared for Examinations: Attendance is in good standing (${attendanceRate}%).`;

      if (attendanceRate < thresholdPercent) {
        warningTier = "ineligible";
        warningMessage = `Not Exam Eligible: Your attendance is currently ${attendanceRate}% (below the required ${thresholdPercent}%). Please contact your course lecturer.`;
      } else if (attendanceRate < thresholdPercent + 5) {
        warningTier = "warning";
        warningMessage = `Warning: You are close to the ${thresholdPercent}% attendance limit (Current: ${attendanceRate}%). Do not miss upcoming lectures to maintain examination clearance.`;
      }

      return {
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        department: course.department,
        totalHeldSessions,
        presentCount,
        excusedCount,
        attendedOrExcusedCount,
        attendanceRate,
        thresholdPercent,
        isEligible,
        eligibilityStatus,
        warningTier,
        warningMessage,
      };
    });
  }

  /**
   * Core Server-Side Verification:
   * Validates enrollment, time window, GPS accuracy, and calculates distance atomically.
   */
  verifyAndRecordAttendance(
    sessionId: string,
    studentId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
  ): VerificationResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        code: "SESSION_NOT_FOUND",
        message: "Attendance session not found.",
      };
    }

    const now = Date.now();
    const startsAt = new Date(session.starts_at).getTime();
    const endsAt = new Date(session.ends_at).getTime();

    // Check session status and expiry
    if (session.status !== "active" || now < startsAt || now > endsAt) {
      if (now > endsAt && session.status === "active") {
        session.status = "expired";
        this.sessions.set(sessionId, session);
      }
      return {
        success: false,
        code: "SESSION_INACTIVE",
        message: "This attendance session has ended or expired.",
      };
    }

    // Check student role
    const student = this.profiles.get(studentId);
    if (!student || student.role !== "student") {
      return {
        success: false,
        code: "UNAUTHORIZED_ROLE",
        message: "Only registered students can check into attendance sessions.",
      };
    }

    // Check course enrollment
    if (!this.isStudentEnrolled(session.course_id, studentId)) {
      return {
        success: false,
        code: "NOT_ENROLLED",
        message: "You are not enrolled in the course for this session.",
      };
    }

    // Check duplicate check-in
    const existing = Array.from(this.records.values()).find(
      (r) => r.session_id === sessionId && r.student_id === studentId,
    );
    if (existing) {
      return {
        success: false,
        code: "DUPLICATE_CHECKIN",
        message: "You have already checked in for this session.",
        submitted_at: existing.submitted_at,
      };
    }

    // Evaluate Geofence and accuracy
    const evaluation = evaluateGeofence(
      { latitude, longitude },
      { latitude: session.latitude, longitude: session.longitude },
      session.radius_meters,
      accuracy,
      session.max_accuracy_meters,
    );

    if (!evaluation.accuracyAcceptable) {
      return {
        success: false,
        code: "INACCURATE_LOCATION",
        message: evaluation.reason || "GPS accuracy is insufficient.",
        accuracy_meters: evaluation.accuracyMeters,
        required_accuracy_meters: session.max_accuracy_meters,
      };
    }

    if (!evaluation.isWithinRadius) {
      return {
        success: false,
        code: "OUTSIDE_GEOFENCE",
        message: evaluation.reason || "You are outside the classroom boundary.",
        distance_meters: evaluation.distanceMeters,
        radius_meters: session.radius_meters,
      };
    }

    // Passed all checks! Record attendance atomically
    const recordId = "rec-" + crypto.randomUUID();
    const record: AttendanceRecord = {
      id: recordId,
      session_id: sessionId,
      student_id: studentId,
      matric_number: student.matric_number,
      status: "present",
      distance_meters: evaluation.distanceMeters,
      reported_accuracy_meters: accuracy,
      rejection_reason: null,
      submitted_at: new Date().toISOString(),
    };

    this.records.set(recordId, record);

    return {
      success: true,
      code: "ATTENDANCE_RECORDED",
      message: "Attendance confirmed successfully!",
      distance_meters: evaluation.distanceMeters,
      accuracy_meters: accuracy,
      submitted_at: record.submitted_at,
    };
  }
}

// Global singleton instance for application use
export const db = new AttendanceStore();
