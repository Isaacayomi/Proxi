import { describe, it, expect } from "vitest";
import {
  inferRoleFromEmail,
  isValidMatricNumber,
  formatFullName,
} from "@/lib/auth/roles";
import { generateAttendanceCsv, generateAttendanceFilename } from "@/lib/utils";
import { AttendanceRecord } from "@/types/database";

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
