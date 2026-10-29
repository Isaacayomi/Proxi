import { CourseEligibilityReport } from "@/types/database";

function escapePdf(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

class PdfStreamBuilder {
  private content: string[] = [];

  fillColor(r: number, g: number, b: number) {
    this.content.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  }

  strokeColor(r: number, g: number, b: number) {
    this.content.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  }

  lineWidth(w: number) {
    this.content.push(`${w.toFixed(2)} w`);
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.content.push(
      `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }

  rectFill(x: number, y: number, w: number, h: number) {
    this.content.push(
      `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
  }

  rectStroke(x: number, y: number, w: number, h: number) {
    this.content.push(
      `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`,
    );
  }

  text(
    str: string,
    x: number,
    y: number,
    font: "F1" | "F2" = "F1",
    size: number = 8,
  ) {
    const esc = escapePdf(str);
    this.content.push(
      `BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc}) Tj ET`,
    );
  }

  build(): string {
    return this.content.join("\n");
  }
}

/**
 * Pure TypeScript / Node.js in-memory Vector PDF Docket Generator.
 * Requires ZERO external native binaries (such as ps2pdf or Ghostscript),
 * guaranteeing 100% compatibility in Vercel Serverless Functions and containerized environments.
 */
export async function generateEligibilityDocketPdf(
  report: CourseEligibilityReport,
): Promise<Buffer> {
  const studentsPerPage = 22;
  const totalPages = Math.max(
    1,
    Math.ceil(report.students.length / studentsPerPage),
  );

  const pageStreams: string[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const p = new PdfStreamBuilder();

    // 1. Running Header & Footer
    p.strokeColor(0.8, 0.8, 0.8);
    p.lineWidth(0.6);
    p.line(50, 794, 545, 794);

    p.fillColor(0.3, 0.3, 0.3);
    p.text(
      "OBAFEMI AWOLOWO UNIVERSITY | EXAM ATTENDANCE DOCKET",
      50,
      800,
      "F2",
      8,
    );
    p.text(`${report.courseCode} Docket`, 460, 800, "F1", 8);

    // Footer
    p.line(50, 45, 545, 45);
    p.fillColor(0.4, 0.4, 0.4);
    p.text(
      "ProxiCheck Academic Verification System - Official Institutional Audit Docket",
      50,
      35,
      "F1",
      7.5,
    );
    p.text(`Page ${pageNum} of ${totalPages}`, 485, 35, "F2", 8);

    let y = 770;

    if (isFirstPage) {
      // University Title & Document Banner
      p.fillColor(0.05, 0.15, 0.35);
      p.text("OBAFEMI AWOLOWO UNIVERSITY, ILE-IFE", 50, y, "F2", 15);
      y -= 16;

      p.fillColor(0.1, 0.1, 0.1);
      p.text(
        "OFFICIAL EXAMINATION ATTENDANCE ELIGIBILITY DOCKET",
        50,
        y,
        "F2",
        11,
      );
      y -= 14;

      p.fillColor(0.35, 0.35, 0.35);
      p.text(
        `Academic Session 2026/2027 • Department of ${report.department || "Computer Science and Engineering"}`,
        50,
        y,
        "F1",
        8.5,
      );
      y -= 12;

      // Decorative divider bar
      p.strokeColor(0.1, 0.55, 0.45);
      p.lineWidth(1.5);
      p.line(50, y, 545, y);
      y -= 16;

      // Metadata Block (2 columns)
      p.fillColor(0.96, 0.97, 0.98);
      p.rectFill(50, y - 48, 495, 56);
      p.strokeColor(0.8, 0.85, 0.9);
      p.lineWidth(0.6);
      p.rectStroke(50, y - 48, 495, 56);

      p.fillColor(0.1, 0.1, 0.1);
      p.text("Course Code & Title:", 60, y, "F2", 8.5);
      p.fillColor(0.15, 0.15, 0.15);
      p.text(`${report.courseCode} - ${report.courseName}`, 165, y, "F1", 8.5);

      p.fillColor(0.1, 0.1, 0.1);
      p.text("Attendance Threshold:", 330, y, "F2", 8.5);
      p.fillColor(0.8, 0.1, 0.1);
      p.text(`${report.thresholdPercent}% Minimum Required`, 445, y, "F2", 8.5);

      y -= 14;
      p.fillColor(0.1, 0.1, 0.1);
      p.text("Lecturer in Charge:", 60, y, "F2", 8.5);
      p.fillColor(0.15, 0.15, 0.15);
      p.text(`${report.lecturerName} (${report.lecturerEmail})`, 165, y, "F1", 8.5);

      p.fillColor(0.1, 0.1, 0.1);
      p.text("Date Range Held:", 330, y, "F2", 8.5);
      p.fillColor(0.15, 0.15, 0.15);
      const dateRangeText = report.dateRange.from
        ? `${new Date(report.dateRange.from).toLocaleDateString()} to ${
            report.dateRange.to
              ? new Date(report.dateRange.to).toLocaleDateString()
              : "Present"
          }`
        : "Semester Session";
      p.text(dateRangeText, 445, y, "F1", 8.5);

      y -= 14;
      p.fillColor(0.1, 0.1, 0.1);
      p.text("Generated Timestamp:", 60, y, "F2", 8.5);
      p.fillColor(0.15, 0.15, 0.15);
      p.text(new Date(report.generatedAt).toLocaleString(), 165, y, "F1", 8.5);

      p.fillColor(0.1, 0.1, 0.1);
      p.text("Department:", 330, y, "F2", 8.5);
      p.fillColor(0.15, 0.15, 0.15);
      p.text(report.department || "Faculty of Technology", 445, y, "F1", 8.5);

      y -= 26;

      // Summary Statistics (Horizontal stats banner)
      p.fillColor(0.92, 0.95, 0.98);
      p.rectFill(50, y - 18, 495, 24);
      p.strokeColor(0.7, 0.8, 0.9);
      p.lineWidth(0.6);
      p.rectStroke(50, y - 18, 495, 24);

      p.fillColor(0.1, 0.2, 0.35);
      p.text(`Total Enrolled: ${report.totalEnrolled}`, 60, y - 5, "F2", 8);
      p.text(
        `Sessions Held: ${report.totalHeldSessions} (Cancelled: ${report.totalCancelledSessions})`,
        155,
        y - 5,
        "F2",
        8,
      );

      p.fillColor(0.05, 0.45, 0.25);
      p.text(`Eligible: ${report.totalEligible}`, 320, y - 5, "F2", 8);

      p.fillColor(0.7, 0.1, 0.1);
      p.text(`Not Eligible: ${report.totalNotEligible}`, 405, y - 5, "F2", 8);

      p.fillColor(0.1, 0.1, 0.1);
      p.text(`Rate: ${report.overallEligibilityRate}%`, 485, y - 5, "F2", 8);

      y -= 30;
    } else {
      y = 750;
      p.fillColor(0.2, 0.3, 0.4);
      p.text(
        `${report.courseCode} - ${report.courseName} • Examination Roster Continued`,
        50,
        y,
        "F2",
        10,
      );
      y -= 18;
    }

    // Table Header
    p.fillColor(0.15, 0.2, 0.3);
    p.rectFill(50, y - 4, 495, 16);

    p.fillColor(1, 1, 1);
    p.text("#", 55, y, "F2", 7.5);
    p.text("MATRIC NUMBER", 75, y, "F2", 7.5);
    p.text("STUDENT FULL NAME", 170, y, "F2", 7.5);
    p.text("HELD", 330, y, "F2", 7.5);
    p.text("ATTENDED", 365, y, "F2", 7.5);
    p.text("EXCUSED", 415, y, "F2", 7.5);
    p.text("RATE", 460, y, "F2", 7.5);
    p.text("EXAM STATUS", 495, y, "F2", 7.5);

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
        p.fillColor(0.97, 0.98, 0.99);
        p.rectFill(50, y - 3, 495, 13);
      }

      p.fillColor(0.15, 0.15, 0.15);
      p.text(String(rowNum), 55, y, "F1", 7.5);
      p.text(stud.matricNumber || "N/A", 75, y, "F2", 7.5);
      p.text(stud.studentName.substring(0, 26), 170, y, "F1", 7.5);
      p.text(String(stud.totalHeldSessions), 335, y, "F1", 7.5);
      p.text(String(stud.presentCount), 375, y, "F1", 7.5);
      p.text(String(stud.excusedCount), 425, y, "F1", 7.5);
      p.text(`${stud.attendanceRate}%`, 465, y, "F1", 7.5);

      // Requirement 3: Explicit bold text column ELIGIBLE or NOT ELIGIBLE for monochrome print clarity
      if (stud.isEligible) {
        p.fillColor(0.05, 0.45, 0.2);
        p.text("ELIGIBLE", 495, y, "F2", 7.5);
      } else {
        p.fillColor(0.75, 0.05, 0.05);
        p.text("NOT ELIGIBLE", 495, y, "F2", 7.5);
      }

      // Thin separator
      p.strokeColor(0.88, 0.88, 0.88);
      p.lineWidth(0.4);
      p.line(50, y - 3, 545, y - 3);
      y -= 13;
    }

    // If on the last page, draw the Signatures block
    if (pageNum === totalPages) {
      y = Math.min(y - 20, 110);
      p.fillColor(0.2, 0.2, 0.2);
      p.text("Course Lecturer Signature:", 60, y, "F2", 8);
      p.text("____________________________________", 60, y - 18, "F1", 8);
      p.text("Date: ____ / ____ / 2026", 60, y - 28, "F1", 7.5);

      p.text("Head of Department (HOD) Signature:", 340, y, "F2", 8);
      p.text("____________________________________", 340, y - 18, "F1", 8);
      p.text("Date: ____ / ____ / 2026", 340, y - 28, "F1", 7.5);
    }

    pageStreams.push(p.build());
  }

  // ---------------------------------------------------------------------------
  // Assemble Pure PDF 1.4 Binary Document Structure
  // ---------------------------------------------------------------------------
  const pageCount = pageStreams.length;
  const font1Id = 3 + pageCount * 2;
  const font2Id = font1Id + 1;
  const totalObjs = font2Id;

  const pageObjIds: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    pageObjIds.push(3 + i * 2);
  }

  const objStrings: string[] = [];

  // Obj 1: Catalog
  objStrings[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`;

  // Obj 2: Pages
  objStrings[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>\nendobj`;

  // Page and Content objects
  for (let i = 0; i < pageCount; i++) {
    const pageId = 3 + i * 2;
    const contentId = pageId + 1;
    const stream = pageStreams[i];
    const streamBytes = Buffer.from(stream, "latin1");

    objStrings[pageId] = `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj`;
    objStrings[contentId] = `${contentId} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj`;
  }

  // Font 1: Helvetica (Regular)
  objStrings[font1Id] = `${font1Id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj`;

  // Font 2: Helvetica-Bold
  objStrings[font2Id] = `${font2Id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj`;

  // Assemble file with byte offset tracking for xref table
  let out = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
  const offsets: number[] = [0];

  for (let i = 1; i <= totalObjs; i++) {
    offsets[i] = Buffer.byteLength(out, "latin1");
    out += objStrings[i] + "\n";
  }

  const startXref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${totalObjs + 1}\n`;
  out += `0000000000 65535 f \n`;
  for (let i = 1; i <= totalObjs; i++) {
    out += String(offsets[i]).padStart(10, "0") + ` 00000 n \n`;
  }

  out += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(out, "latin1");
}
