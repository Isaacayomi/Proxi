import { UserRole } from "@/types/database";

/**
 * Standard matriculation number format for university students (e.g. "CSC/2024/001")
 */
export const MATRIC_NUMBER_REGEX = /^[A-Z]{3}\/\d{4}\/\d{3}$/;

/**
 * Validates whether a given string is a valid matriculation number
 */
export function isValidMatricNumber(matric: string): boolean {
  if (!matric || typeof matric !== "string") return false;
  return MATRIC_NUMBER_REGEX.test(matric.trim().toUpperCase());
}

/**
 * Strict OAU student institutional email format:
 * Pattern: <initial>.<surname>.<dept_code><year><number>@student.oauife.edu.ng
 * Example: "a.alabi.swe2024001@student.oauife.edu.ng"
 */
export const STUDENT_EMAIL_REGEX =
  /^[a-z]{1,2}\.[a-z]+(-[a-z]+)?\.[a-z]{2,5}\d{5,8}@student\.oauife\.edu\.ng$/i;

/**
 * Strict OAU lecturer / faculty institutional email format:
 * Must strictly end with "@oauife.edu.ng" and NOT be a student domain.
 * Example: "prof.adeyemi@oauife.edu.ng", "adeyemi@oauife.edu.ng"
 */
export const LECTURER_EMAIL_REGEX = /^[a-z0-9._%+-]+@oauife\.edu\.ng$/i;

/**
 * Validates whether an email strictly complies with OAU student customized format
 */
export function isValidStudentEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim();
  return STUDENT_EMAIL_REGEX.test(clean);
}

/**
 * Validates whether an email strictly complies with OAU faculty format (@oauife.edu.ng)
 */
export function isValidLecturerEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  if (clean.endsWith("@student.oauife.edu.ng") || clean.includes("student")) {
    return false;
  }
  return LECTURER_EMAIL_REGEX.test(clean);
}

/**
 * Checks whether an email is a valid institutional email for either role.
 * Any other email aside from valid student or faculty formats is regarded as false.
 */
export function isValidInstitutionalEmail(email: string | null | undefined): boolean {
  return isValidStudentEmail(email) || isValidLecturerEmail(email);
}

/**
 * Infers the default institutional role from the user's email address
 * - Student email addresses end with "@student.oauife.edu.ng" or contain ".student"
 * - All other faculty emails return "lecturer"
 */
export function inferRoleFromEmail(email: string): UserRole {
  if (!email || typeof email !== "string") return "student";
  const cleanEmail = email.trim().toLowerCase();

  if (
    cleanEmail.endsWith("@student.oauife.edu.ng") ||
    cleanEmail.includes("student")
  ) {
    return "student";
  }

  return "lecturer";
}

/**
 * Standard faculty verification codes required to register as academic staff.
 * Pre-seeded for individual departments across Faculty of Technology, customizable via env variable.
 */
export const DEFAULT_DEPARTMENT_CODES = [
  "OAU-CSE-2026", // Computer Science & Engineering
  "OAU-EEE-2026", // Electronic & Electrical Engineering
  "OAU-MEE-2026", // Mechanical Engineering
  "OAU-CVE-2026", // Civil Engineering
  "OAU-CHE-2026", // Chemical Engineering
  "OAU-FACULTY-2026", // Faculty of Technology (General Master Key)
];
export const DEFAULT_FACULTY_CODE = "OAU-FACULTY-2026";

export function isValidFacultyVerificationCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== "string") return false;
  const inputCode = code.trim().toUpperCase();
  const envVal = process.env.LECTURER_VERIFICATION_CODE;

  const allowedKeys = envVal
    ? envVal
        .split(",")
        .map((k) => k.trim().toUpperCase())
        .filter(Boolean)
    : [];

  return allowedKeys.includes(inputCode) || DEFAULT_DEPARTMENT_CODES.includes(inputCode);
}

/**
 * Validates staff ID (e.g. "OAU/STAFF/001" or any non-empty university staff format)
 */
export function isValidStaffId(staffId: string | null | undefined): boolean {
  if (!staffId || typeof staffId !== "string") return false;
  return staffId.trim().length >= 3;
}

/**
 * Returns user display name or fallback
 */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback = "User",
): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : fallback;
}
