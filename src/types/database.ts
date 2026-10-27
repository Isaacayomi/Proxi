export type UserRole = "student" | "lecturer";

export type SessionStatus = "active" | "ended" | "expired";

export type AttendanceStatus = "present" | "rejected";

export type AuditOutcome =
  | "verified_present"
  | "rejected_geofence"
  | "rejected_accuracy"
  | "rejected_expired"
  | "rejected_not_enrolled"
  | "rejected_duplicate";

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  matric_number: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  building: string;
  room_number: string | null;
  latitude: number;
  longitude: number;
  default_radius_meters: number;
  created_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  created_at: string;
}

export interface CourseLecturer {
  course_id: string;
  lecturer_id: string;
  assigned_at: string;
}

export interface CourseEnrollment {
  course_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface AttendanceSession {
  id: string;
  course_id: string;
  lecturer_id: string;
  classroom_id: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  max_accuracy_meters: number;
  starts_at: string;
  ends_at: string;
  status: SessionStatus;
  session_code: string;
  created_at: string;
  // Joined fields for display
  course?: Course;
  classroom?: Classroom;
  record_count?: number;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  matric_number: string | null;
  status: AttendanceStatus;
  distance_meters: number | null;
  reported_accuracy_meters: number | null;
  rejection_reason: string | null;
  submitted_at: string;
  student?: Profile;
  session?: AttendanceSession;
}

export interface VerificationResult {
  success: boolean;
  code:
    | "ATTENDANCE_RECORDED"
    | "SESSION_NOT_FOUND"
    | "SESSION_INACTIVE"
    | "UNAUTHORIZED_ROLE"
    | "NOT_ENROLLED"
    | "DUPLICATE_CHECKIN"
    | "INACCURATE_LOCATION"
    | "OUTSIDE_GEOFENCE"
    | "SERVER_ERROR";
  message: string;
  distance_meters?: number;
  radius_meters?: number;
  accuracy_meters?: number;
  required_accuracy_meters?: number;
  submitted_at?: string;
}
