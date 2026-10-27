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
