import {
  Profile,
  Classroom,
  Course,
  AttendanceSession,
  AttendanceRecord,
  VerificationResult,
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

  constructor() {
    // Clean initial state: no mock data or demo sessions
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
      email: "student@student.oauife.edu.ng",
      first_name: "Ada",
      last_name: "Okonkwo",
      matric_number: "CSC/2024/001",
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.enrollStudentInCourse("d1111111-1111-1111-1111-111111111111", "u-student-1");
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
    return this.classrooms.delete(id);
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
      .map((s) => ({
        ...s,
        course: this.courses.get(s.course_id),
        classroom: this.classrooms.get(s.classroom_id),
      }));
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
