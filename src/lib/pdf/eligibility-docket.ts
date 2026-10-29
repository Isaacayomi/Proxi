import { CourseEligibilityReport } from "@/types/database";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

function escapePs(str: string): string {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export async function generateEligibilityDocketPdf(report: CourseEligibilityReport): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const id = "docket_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const psPath = path.join(tmpDir, `${id}.ps`);
  const pdfPath = path.join(tmpDir, `${id}.pdf`);

  const studentsPerPage = 22;
  const totalPages = Math.max(1, Math.ceil(report.students.length / studentsPerPage));

  const psLines: string[] = [
    "%!PS-Adobe-3.0",
    `%%Pages: ${totalPages}`,
    "%%BoundingBox: 0 0 595 842",
    "/rectfill {",
    "  4 2 roll moveto 1 index 0 rlineto 0 exch rlineto neg 0 rlineto closepath fill",
    "} bind def",
  ];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    psLines.push(`%%Page: ${pageNum} ${pageNum}`);
    psLines.push("save");

    // Header & Footer
    psLines.push("0.3 setgray");
    psLines.push("/Helvetica-Bold 8 selectfont");
    psLines.push("50 800 moveto (OBAFEMI AWOLOWO UNIVERSITY | EXAM ATTENDANCE DOCKET) show");
    psLines.push("/Helvetica 8 selectfont");
    psLines.push("460 800 moveto (" + escapePs(report.courseCode) + " Docket) show");
    psLines.push("50 794 moveto 545 794 lineto 0.6 setlinewidth stroke");

    psLines.push("50 45 moveto 545 45 lineto 0.6 setlinewidth stroke");
    psLines.push("50 35 moveto (ProxiCheck Academic Verification System - Official Institutional Audit Docket) show");
    psLines.push(`/Helvetica-Bold 8 selectfont`);
    psLines.push(`490 35 moveto (Page ${pageNum} of ${totalPages}) show`);

    let y = 770;

    if (isFirstPage) {
      // University & Document Title
      psLines.push("0.05 0.15 0.35 setrgbcolor");
      psLines.push("/Helvetica-Bold 15 selectfont");
      psLines.push(`50 ${y} moveto (OBAFEMI AWOLOWO UNIVERSITY, ILE-IFE) show`);
      y -= 16;
      psLines.push("/Helvetica-Bold 11 selectfont");
      psLines.push(`50 ${y} moveto (OFFICIAL EXAMINATION ATTENDANCE ELIGIBILITY DOCKET) show`);
      y -= 14;
      psLines.push("0.35 0.35 0.35 setrgbcolor");
      psLines.push("/Helvetica 9 selectfont");
      psLines.push(`50 ${y} moveto (Academic Session 2026/2027 • Department of Computer Science & Engineering) show`);
      y -= 12;
      psLines.push("0.1 0.55 0.45 setrgbcolor");
      psLines.push(`50 ${y} moveto 545 ${y} lineto 1.5 setlinewidth stroke`);
      y -= 16;

      // Metadata Block (2 columns)
      psLines.push("0.96 0.97 0.98 setrgbcolor");
      psLines.push(`50 ${y - 48} 495 56 rectfill`);
      psLines.push("0.8 0.85 0.9 setrgbcolor");
      psLines.push(`50 ${y - 48} moveto 545 ${y - 48} lineto 545 ${y + 8} lineto 50 ${y + 8} lineto closepath 0.5 setlinewidth stroke`);

      psLines.push("0.1 0.1 0.1 setrgbcolor");
      psLines.push("/Helvetica-Bold 8.5 selectfont");
      psLines.push(`60 ${y} moveto (Course Code & Title:) show`);
      psLines.push("/Helvetica 8.5 selectfont");
      psLines.push(`165 ${y} moveto (${escapePs(report.courseCode + " - " + report.courseName)}) show`);

      psLines.push("/Helvetica-Bold 8.5 selectfont");
      psLines.push(`330 ${y} moveto (Attendance Threshold:) show`);
      psLines.push("/Helvetica-Bold 8.5 selectfont");
      psLines.push("0.8 0.1 0.1 setrgbcolor");
      psLines.push(`445 ${y} moveto (${report.thresholdPercent}% Minimum Required) show`);
      psLines.push("0.1 0.1 0.1 setrgbcolor");

      y -= 14;
      psLines.push("/Helvetica-Bold 8.5 selectfont");
      psLines.push(`60 ${y} moveto (Lecturer in Charge:) show`);
      psLines.push("/Helvetica 8.5 selectfont");
      psLines.push(`165 ${y} moveto (${escapePs(report.lecturerName + " (" + report.lecturerEmail + ")")}) show`);

      psLines.push("/Helvetica-Bold 8.5 selectfont");
      psLines.push(`330 ${y} moveto (Date Range Held:) show`);
      psLines.push("/Helvetica 8.5 selectfont");
      const dateRangeText = report.dateRange.from
        ? `${new Date(report.dateRange.from).toLocaleDateString()} to ${report.dateRange.to ? new Date(report.dateRange.to).toLocaleDateString() : "Present"}`
        : "Semester Session";
      psLines.push(`445 ${y} moveto (${escapePs(dateRangeText)}) show`);

      y -= 14;
      psLines.push("/Helvetica-Bold 8.5 selectfont");
      psLines.push(`60 ${y} moveto (Generated Timestamp:) show`);
      psLines.push("/Helvetica 8.5 selectfont");
      psLines.push(`165 ${y} moveto (${escapePs(new Date(report.generatedAt).toLocaleString())}) show`);

      psLines.push("/Helvetica-Bold 8.5 selectfont");
      psLines.push(`330 ${y} moveto (Department:) show`);
      psLines.push("/Helvetica 8.5 selectfont");
      psLines.push(`445 ${y} moveto (${escapePs(report.department || "Technology")}) show`);

      y -= 26;

      // Summary Statistics (Horizontal stats banner)
      psLines.push("0.92 0.95 0.98 setrgbcolor");
      psLines.push(`50 ${y - 18} 495 24 rectfill`);
      psLines.push("0.7 0.8 0.9 setrgbcolor");
      psLines.push(`50 ${y - 18} moveto 545 ${y - 18} lineto 545 ${y + 6} lineto 50 ${y + 6} lineto closepath 0.5 setlinewidth stroke`);

      psLines.push("/Helvetica-Bold 8 selectfont");
      psLines.push("0.1 0.2 0.35 setrgbcolor");
      psLines.push(`60 ${y - 5} moveto (Total Enrolled: ${report.totalEnrolled}) show`);
      psLines.push(`160 ${y - 5} moveto (Sessions Held: ${report.totalHeldSessions} (Cancelled: ${report.totalCancelledSessions})) show`);
      psLines.push("0.05 0.45 0.25 setrgbcolor");
      psLines.push(`315 ${y - 5} moveto (Eligible: ${report.totalEligible}) show`);
      psLines.push("0.7 0.1 0.1 setrgbcolor");
      psLines.push(`400 ${y - 5} moveto (Not Eligible: ${report.totalNotEligible}) show`);
      psLines.push("0.1 0.1 0.1 setrgbcolor");
      psLines.push(`480 ${y - 5} moveto (Rate: ${report.overallEligibilityRate}%) show`);

      y -= 30;
    } else {
      y = 750;
      psLines.push("0.2 0.3 0.4 setrgbcolor");
      psLines.push("/Helvetica-Bold 10 selectfont");
      psLines.push(`50 ${y} moveto (${escapePs(report.courseCode + " - " + report.courseName)} • Examination Roster Continued) show`);
      y -= 18;
    }

    // Table Header
    psLines.push("0.15 0.2 0.3 setrgbcolor");
    psLines.push(`50 ${y - 4} 495 16 rectfill`);
    psLines.push("1 1 1 setrgbcolor");
    psLines.push("/Helvetica-Bold 8 selectfont");
    psLines.push(`55 ${y} moveto (#) show`);
    psLines.push(`75 ${y} moveto (MATRIC NUMBER) show`);
    psLines.push(`170 ${y} moveto (STUDENT FULL NAME) show`);
    psLines.push(`330 ${y} moveto (HELD) show`);
    psLines.push(`365 ${y} moveto (ATTENDED) show`);
    psLines.push(`415 ${y} moveto (EXCUSED) show`);
    psLines.push(`460 ${y} moveto (RATE) show`);
    psLines.push(`495 ${y} moveto (EXAM STATUS) show`);

    y -= 14;

    // Student Rows for this page
    const startIdx = pageIdx * studentsPerPage;
    const endIdx = Math.min(report.students.length, startIdx + studentsPerPage);
    const pageStudents = report.students.slice(startIdx, endIdx);

    for (let i = 0; i < pageStudents.length; i++) {
      const stud = pageStudents[i];
      const rowNum = startIdx + i + 1;

      // Alternating row background
      if (i % 2 === 1) {
        psLines.push("0.97 0.98 0.99 setrgbcolor");
        psLines.push(`50 ${y - 3} 495 13 rectfill`);
      }

      psLines.push("0.15 0.15 0.15 setrgbcolor");
      psLines.push("/Helvetica 7.5 selectfont");
      psLines.push(`55 ${y} moveto (${rowNum}) show`);
      psLines.push("/Helvetica-Bold 7.5 selectfont");
      psLines.push(`75 ${y} moveto (${escapePs(stud.matricNumber)}) show`);
      psLines.push("/Helvetica 7.5 selectfont");
      psLines.push(`170 ${y} moveto (${escapePs(stud.studentName.substring(0, 26))}) show`);
      psLines.push(`335 ${y} moveto (${stud.totalHeldSessions}) show`);
      psLines.push(`375 ${y} moveto (${stud.presentCount}) show`);
      psLines.push(`425 ${y} moveto (${stud.excusedCount}) show`);
      psLines.push(`465 ${y} moveto (${stud.attendanceRate}%) show`);

      // Requirement 3: EXAM STATUS column explicitly prints "ELIGIBLE" or "NOT ELIGIBLE" in bold for B&W print clarity
      if (stud.isEligible) {
        psLines.push("0.05 0.45 0.2 setrgbcolor");
        psLines.push("/Helvetica-Bold 7.5 selectfont");
        psLines.push(`495 ${y} moveto (ELIGIBLE) show`);
      } else {
        psLines.push("0.75 0.05 0.05 setrgbcolor");
        psLines.push("/Helvetica-Bold 7.5 selectfont");
        psLines.push(`495 ${y} moveto (NOT ELIGIBLE) show`);
      }

      // Thin separator
      psLines.push("0.88 0.88 0.88 setrgbcolor");
      psLines.push(`50 ${y - 3} moveto 545 ${y - 3} lineto 0.4 setlinewidth stroke`);
      y -= 13;
    }

    // If on the last page, draw the Signatures block
    if (pageNum === totalPages) {
      y = Math.min(y - 20, 110);
      psLines.push("0.2 setgray");
      psLines.push("/Helvetica-Bold 8 selectfont");
      psLines.push(`60 ${y} moveto (Course Lecturer Signature:) show`);
      psLines.push(`60 ${y - 18} moveto (____________________________________) show`);
      psLines.push("/Helvetica 7.5 selectfont");
      psLines.push(`60 ${y - 28} moveto (Date: ____ / ____ / 2026) show`);

      psLines.push("/Helvetica-Bold 8 selectfont");
      psLines.push(`340 ${y} moveto (Head of Department (HOD) Signature:) show`);
      psLines.push(`340 ${y - 18} moveto (____________________________________) show`);
      psLines.push("/Helvetica 7.5 selectfont");
      psLines.push(`340 ${y - 28} moveto (Date: ____ / ____ / 2026) show`);
    }

    psLines.push("showpage");
    psLines.push("restore");
  }

  const psContent = psLines.join("\n");
  await fs.writeFile(psPath, psContent, "latin1");

  try {
    await execFileAsync("ps2pdf", [psPath, pdfPath]);
    const pdfBuffer = await fs.readFile(pdfPath);
    return pdfBuffer;
  } finally {
    // Cleanup temporary files
    await fs.unlink(psPath).catch(() => {});
    await fs.unlink(pdfPath).catch(() => {});
  }
}

