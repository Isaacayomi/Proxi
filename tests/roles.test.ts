import { describe, it, expect } from "vitest";
import {
  inferRoleFromEmail,
  isValidMatricNumber,
  isValidFacultyVerificationCode,
  isValidStaffId,
  formatFullName,
} from "@/lib/auth/roles";
import { generateAttendanceCsv, generateAttendanceFilename } from "@/lib/utils";
import { AttendanceRecord } from "@/types/database";
import { db } from "@/lib/db/store";

describe("Role Authorization & Matric Number Validation", () => {
  it("infers 'student' role for @student.oauife.edu.ng institutional emails", () => {
    expect(inferRoleFromEmail("ade.b@student.oauife.edu.ng")).toBe("student");
    expect(inferRoleFromEmail("JOHN.DOE@STUDENT.OAUIFE.EDU.NG")).toBe(
      "student",
    );
  });

  it("infers 'lecturer' role for standard faculty emails", () => {
    expect(inferRoleFromEmail("prof.adeyemi@oauife.edu.ng")).toBe("lecturer");
    expect(inferRoleFromEmail("dr.smith@university.org")).toBe("lecturer");
    expect(inferRoleFromEmail("faculty@oauife.edu.ng")).toBe("lecturer");
  });

  it("validates matriculation numbers according to institutional format (ABC/YYYY/NNN)", () => {
    expect(isValidMatricNumber("CSC/2024/001")).toBe(true);
    expect(isValidMatricNumber("eee/2023/123")).toBe(true);
    expect(isValidMatricNumber("MEE/2021/045")).toBe(true);

    expect(isValidMatricNumber("CSC/24/001")).toBe(false);
    expect(isValidMatricNumber("CS/2024/001")).toBe(false);
    expect(isValidMatricNumber("12345")).toBe(false);
    expect(isValidMatricNumber("")).toBe(false);
  });

  it("formats user full names with fallback", () => {
    expect(formatFullName("Ada", "Okonkwo")).toBe("Ada Okonkwo");
    expect(formatFullName("Ada", null)).toBe("Ada");
    expect(formatFullName(null, null, "Guest Student")).toBe("Guest Student");
  });

  it("validates faculty staff verification code", () => {
    expect(isValidFacultyVerificationCode("OAU-FACULTY-2026")).toBe(true);
    expect(isValidFacultyVerificationCode("oau-faculty-2026")).toBe(true);
    expect(isValidFacultyVerificationCode("OAU-CSE-2026")).toBe(true);
    expect(isValidFacultyVerificationCode("OAU-EEE-2026")).toBe(true);
    expect(isValidFacultyVerificationCode("OAU-MEE-2026")).toBe(true);
    expect(isValidFacultyVerificationCode("INVALID-KEY")).toBe(false);
    expect(isValidFacultyVerificationCode("")).toBe(false);
    expect(isValidFacultyVerificationCode(null)).toBe(false);

    // Test custom env with multiple keys
    const origEnv = process.env.LECTURER_VERIFICATION_CODE;
    process.env.LECTURER_VERIFICATION_CODE = "CSC-DEPT-99, FACULTY-SECRET-77";
    expect(isValidFacultyVerificationCode("CSC-DEPT-99")).toBe(true);
    expect(isValidFacultyVerificationCode("faculty-secret-77")).toBe(true);
    expect(isValidFacultyVerificationCode("OAU-FACULTY-2026")).toBe(true);
    expect(isValidFacultyVerificationCode("WRONG-KEY")).toBe(false);
    process.env.LECTURER_VERIFICATION_CODE = origEnv;
  });

  it("validates academic staff IDs", () => {
    expect(isValidStaffId("OAU/CSE/001")).toBe(true);
    expect(isValidStaffId("STAFF-123")).toBe(true);
    expect(isValidStaffId("AB")).toBe(false);
    expect(isValidStaffId("")).toBe(false);
  });
});

describe("CSV Export Utilities", () => {
  it("generates correct CSV filename with date and course code", () => {
    const filename = generateAttendanceFilename(
      "CSC 401",
      "2026-10-27T10:00:00Z",
    );
    expect(filename).toBe("2026-10-27_CSC_401_Attendance.csv");
  });

  it("generates well-structured CSV content for records", () => {
    const mockRecords: AttendanceRecord[] = [
      {
        id: "rec-1",
        session_id: "ses-1",
        student_id: "stu-1",
        matric_number: "CSC/2024/001",
        status: "present",
        distance_meters: 14.5,
        reported_accuracy_meters: 12.0,
        rejection_reason: null,
        submitted_at: "2026-10-27T10:15:00Z",
        student: {
          id: "stu-1",
          email: "ada@student.oauife.edu.ng",
          first_name: "Ada",
          last_name: "Okonkwo",
          matric_number: "CSC/2024/001",
          role: "student",
          created_at: "",
          updated_at: "",
        },
      },
    ];

    const csv = generateAttendanceCsv(mockRecords, "CSC 401", "2026-10-27");
    expect(csv).toContain(
      "S/N,Matric Number,Student Name,Email,Status,Check-in Time,Distance (m),Accuracy (m)",
    );
    expect(csv).toContain('"CSC/2024/001"');
    expect(csv).toContain('"Okonkwo Ada"');
    expect(csv).toContain("PRESENT");
    expect(csv).toContain("14.5");
    expect(csv).toContain("12.0");
  });
});

describe("Dynamic Faculty Verification Keys Management", () => {
  it("initializes with default departmental and faculty master keys", () => {
    const keys = db.listFacultyKeys();
    expect(keys.length).toBeGreaterThanOrEqual(6);
    expect(keys.some((k) => k.key_code === "OAU-FACULTY-2026")).toBe(true);
    expect(keys.some((k) => k.key_code === "OAU-CSE-2026")).toBe(true);
    expect(keys.some((k) => k.key_code === "OAU-EEE-2026")).toBe(true);
    expect(keys.some((k) => k.key_code === "OAU-MEE-2026")).toBe(true);
  });

  it("creates custom faculty verification key with usage limits and department", () => {
    const key = db.createFacultyKey({
      key_code: "OAU-TEST-DEPT-2026",
      department: "Civil Engineering",
      note: "For testing new faculty",
      max_uses: 2,
      created_by: "u-lecturer-1",
    });

    expect(key.key_code).toBe("OAU-TEST-DEPT-2026");
    expect(key.department).toBe("Civil Engineering");
    expect(key.max_uses).toBe(2);
    expect(key.used_count).toBe(0);
    expect(key.is_active).toBe(true);
  });

  it("validates and tracks usage count accurately up to max uses", () => {
    const key = db.createFacultyKey({
      key_code: "SINGLE-USE-KEY",
      max_uses: 1,
    });

    const firstUse = db.validateAndConsumeFacultyKey("SINGLE-USE-KEY");
    expect(firstUse.valid).toBe(true);

    const secondUse = db.validateAndConsumeFacultyKey("SINGLE-USE-KEY");
    expect(secondUse.valid).toBe(false);
    expect(secondUse.reason).toContain("maximum usage limit");
  });

  it("revokes faculty keys immediately and blocks subsequent usage", () => {
    const key = db.createFacultyKey({
      key_code: "REVOKE-TEST-KEY",
      max_uses: 5,
    });

    const revoked = db.revokeFacultyKey(key.id);
    expect(revoked).toBe(true);

    const useAttempt = db.validateAndConsumeFacultyKey("REVOKE-TEST-KEY");
    expect(useAttempt.valid).toBe(false);
    expect(useAttempt.reason).toContain("revoked");
  });

  it("rejects non-existent keys", () => {
    const res = db.validateAndConsumeFacultyKey("DOES-NOT-EXIST-CODE");
    expect(res.valid).toBe(false);
    expect(res.reason).toContain("not recognized");
  });
});
