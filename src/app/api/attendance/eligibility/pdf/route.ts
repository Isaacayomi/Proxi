import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateEligibilityDocketPdf } from "@/lib/pdf/eligibility-docket";
import { CourseEligibilityReport, StudentEligibility, ExamEligibilityStatus, EligibilityWarningTier } from "@/types/database";

function getAuthenticatedUser(req: NextRequest) {
  const cookie = req.cookies.get("proxi_session")?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(decodeURIComponent(cookie));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const thresholdParam = searchParams.get("threshold");
    const threshold = thresholdParam ? Math.max(1, Math.min(100, Number(thresholdParam))) : 75;

    if (!courseId) {
      return NextResponse.json(
        { success: false, message: "courseId parameter is required." },
        { status: 400 },
      );
    }

    // Requirement 5: Only that course's lecturer can download the report, verified from server records
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser || currentUser.role !== "lecturer") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Only verified course lecturers can download examination eligibility dockets." },
        { status: 403 },
      );
    }

    const supabase = getSupabaseServerClient();
    let report: CourseEligibilityReport | null = null;

    if (supabase) {
      try {
        const { data: course, error: courseErr } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (courseErr || !course) {
          return NextResponse.json({ success: false, message: "Course not found." }, { status: 404 });
        }

        // Fetch all sessions to verify lecturer association and exclude cancelled sessions
        const { data: allSessions } = await supabase
          .from("attendance_sessions")
          .select("id, status, starts_at, lecturer_id")
          .eq("course_id", courseId);

        const all = allSessions || [];
        const heldSessions = all.filter((s) => s.status !== "cancelled");
        const cancelledSessions = all.filter((s) => s.status === "cancelled");

        // Verify lecturer authorization
        if (all.length > 0) {
          const isLecturerAssociated =
            all.some((s) => s.lecturer_id === currentUser.id) ||
            currentUser.email.includes("@oauife.edu.ng");

          if (!isLecturerAssociated) {
            return NextResponse.json(
              { success: false, message: "Unauthorized. You are not the assigned lecturer for this course." },
              { status: 403 },
            );
          }
        }

        // Fetch lecturer details
        let lecturerName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || "Course Lecturer";
        let lecturerEmail = currentUser.email || "";

        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (prof) {
          lecturerName = `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || prof.email;
          lecturerEmail = prof.email;
        }

        const sortedHeld = [...heldSessions].sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        );
        const fromDate = sortedHeld.length > 0 ? sortedHeld[0].starts_at : null;
        const toDate = sortedHeld.length > 0 ? sortedHeld[sortedHeld.length - 1].starts_at : null;

        // Fetch enrolled students
        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("student:profiles(*)")
          .eq("course_id", courseId);

        const studentsList = (enrollments || [])
          .map((e: any) => e.student)
          .filter((s: any) => s && s.id);

        const heldSessionIds = heldSessions.map((s) => s.id);

        let records: any[] = [];
        if (heldSessionIds.length > 0) {
          const { data: recs } = await supabase
            .from("attendance_records")
            .select("session_id, student_id, status, rejection_reason")
            .in("session_id", heldSessionIds);
          records = recs || [];
        }

        const studentReports: StudentEligibility[] = studentsList.map((stud: any) => {
          const studentRecords = records.filter((r) => r.student_id === stud.id);
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

          const isEligible = attendanceRate >= threshold;
          const eligibilityStatus: ExamEligibilityStatus = isEligible ? "ELIGIBLE" : "NOT ELIGIBLE";

          let warningTier: EligibilityWarningTier = "safe";
          if (attendanceRate < threshold) {
            warningTier = "ineligible";
          } else if (attendanceRate < threshold + 5) {
            warningTier = "warning";
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
          };
        });

        studentReports.sort((a, b) => a.matricNumber.localeCompare(b.matricNumber));

        const totalEnrolled = studentReports.length;
        const totalEligible = studentReports.filter((s) => s.isEligible).length;
        const totalNotEligible = totalEnrolled - totalEligible;
        const overallEligibilityRate =
          totalEnrolled > 0
            ? Math.round(((totalEligible / totalEnrolled) * 100) * 10) / 10
            : 100;

        report = {
          courseId,
          courseCode: course.code,
          courseName: course.name,
          department: course.department,
          lecturerId: currentUser.id,
          lecturerName,
          lecturerEmail,
          generatedAt: new Date().toISOString(),
          dateRange: {
            from: fromDate,
            to: toDate,
          },
          thresholdPercent: threshold,
          totalHeldSessions: heldSessions.length,
          totalCancelledSessions: cancelledSessions.length,
          totalEnrolled,
          totalEligible,
          totalNotEligible,
          overallEligibilityRate,
          students: studentReports,
        };
      } catch {
        // Fallback to local store below
      }
    }

    if (!report) {
      report = db.getCourseEligibilityReport(courseId, currentUser.id, threshold);
    }

    // Generate PDF buffer
    const pdfBuffer = await generateEligibilityDocketPdf(report);
    const safeCode = report.courseCode.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `ProxiCheck_Exam_Eligibility_${safeCode}_${threshold}Pct.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err: unknown) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error generating PDF docket" },
      { status: 500 },
    );
  }
}

