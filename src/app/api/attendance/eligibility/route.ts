import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  CourseEligibilityReport,
  StudentCourseEligibilitySummary,
  StudentEligibility,
  ExamEligibilityStatus,
  EligibilityWarningTier,
} from "@/types/database";

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
    const studentId = searchParams.get("studentId");
    const thresholdParam = searchParams.get("threshold");
    const threshold = thresholdParam ? Math.max(1, Math.min(100, Number(thresholdParam))) : 75;

    const currentUser = getAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();

    // --------------------------------------------------------------------------
    // 1. Student Personal Eligibility Route
    // --------------------------------------------------------------------------
    if (studentId) {
      if (currentUser && currentUser.role === "student" && currentUser.id !== studentId) {
        return NextResponse.json(
          { success: false, message: "Unauthorized. You cannot view another student's eligibility records." },
          { status: 403 },
        );
      }

      if (supabase) {
        try {
          // Fetch student enrolled courses
          const { data: enrollments } = await supabase
            .from("course_enrollments")
            .select("course:courses(*)")
            .eq("student_id", studentId);

          if (enrollments) {
            const enrolledCourses = enrollments
              .map((e: any) => e.course)
              .filter((c: any) => c && c.id);

            const summaries: StudentCourseEligibilitySummary[] = [];

            for (const course of enrolledCourses) {
              // Fetch only held sessions (exclude cancelled classes so cancelled classes don't hurt students)
              const { data: sessions } = await supabase
                .from("attendance_sessions")
                .select("id, status, starts_at")
                .eq("course_id", course.id)
                .neq("status", "cancelled");

              const heldSessions = sessions || [];
              const heldSessionIds = heldSessions.map((s) => s.id);

              let presentCount = 0;
              let excusedCount = 0;

              if (heldSessionIds.length > 0) {
                const { data: records } = await supabase
                  .from("attendance_records")
                  .select("status, rejection_reason")
                  .eq("student_id", studentId)
                  .in("session_id", heldSessionIds);

                if (records) {
                  for (const r of records) {
                    if (r.status === "present") {
                      presentCount++;
                    } else if (r.status === "excused" || r.rejection_reason === "EXCUSED_ABSENCE") {
                      excusedCount++;
                    }
                  }
                }
              }

              const attendedOrExcusedCount = presentCount + excusedCount;
              const totalHeldSessions = heldSessions.length;
              const attendanceRate =
                totalHeldSessions > 0
                  ? Math.min(100, Math.round(((attendedOrExcusedCount / totalHeldSessions) * 100) * 10) / 10)
                  : 100;

              const isEligible = attendanceRate >= threshold;
              const eligibilityStatus: ExamEligibilityStatus = isEligible ? "ELIGIBLE" : "NOT ELIGIBLE";

              let warningTier: EligibilityWarningTier = "safe";
              let warningMessage = `Cleared for Examinations: Attendance is in good standing (${attendanceRate}%).`;

              if (attendanceRate < threshold) {
                warningTier = "ineligible";
                warningMessage = `Not Exam Eligible: Attendance is currently ${attendanceRate}% (below required ${threshold}%).`;
              } else if (attendanceRate < threshold + 5) {
                warningTier = "warning";
                warningMessage = `Warning: Close to threshold! Current attendance is ${attendanceRate}%. Do not miss upcoming lectures.`;
              }

              summaries.push({
                courseId: course.id,
                courseCode: course.code,
                courseName: course.name,
                department: course.department,
                totalHeldSessions,
                presentCount,
                excusedCount,
                attendedOrExcusedCount,
                attendanceRate,
                thresholdPercent: threshold,
                isEligible,
                eligibilityStatus,
                warningTier,
                warningMessage,
              });
            }

            return NextResponse.json({ success: true, summaries });
          }
        } catch {
          // Fall back to memory store below
        }
      }

      const summaries = db.getStudentCourseEligibilitySummaries(studentId, threshold);
      return NextResponse.json({ success: true, summaries });
    }

    // --------------------------------------------------------------------------
    // 2. Course-Level Eligibility Report (Lecturer Portal & PDF Source)
    // --------------------------------------------------------------------------
    if (!courseId) {
      return NextResponse.json(
        { success: false, message: "Either courseId or studentId is required." },
        { status: 400 },
      );
    }

    // Requirement 5: Only that course's lecturer can access the report
    if (currentUser) {
      if (currentUser.role !== "lecturer") {
        return NextResponse.json(
          { success: false, message: "Unauthorized. Only faculty members can view or export course eligibility dockets." },
          { status: 403 },
        );
      }
    }

    if (supabase) {
      try {
        // Fetch course
        const { data: course, error: courseErr } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (courseErr || !course) {
          return NextResponse.json(
            { success: false, message: "Course not found." },
            { status: 404 },
          );
        }

        // Fetch lecturer details
        const lecturerId = currentUser?.id || "";
        let lecturerName = "Faculty Member";
        let lecturerEmail = currentUser?.email || "";

        if (lecturerId) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("id", lecturerId)
            .maybeSingle();

          if (prof) {
            lecturerName = `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || prof.email;
            lecturerEmail = prof.email;
          }
        }

        // Requirement 1: Only count sessions that were actually held (status != 'cancelled')
        const { data: allSessions } = await supabase
          .from("attendance_sessions")
          .select("id, status, starts_at, lecturer_id")
          .eq("course_id", courseId);

        const all = allSessions || [];
        const heldSessions = all.filter((s) => s.status !== "cancelled");
        const cancelledSessions = all.filter((s) => s.status === "cancelled");

        // Verify lecturer authorization: lecturer must have created sessions for this course,
        // or be assigned to course in course_lecturers, or be current user.
        if (currentUser && currentUser.role === "lecturer" && all.length > 0) {
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

        // Fetch all records for held sessions
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
          // Requirement 2: Include lecturer approved manual overrides (excused absences) in the rate
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
          // Requirement 3: Explicit string for B&W print readability
          const eligibilityStatus: ExamEligibilityStatus = isEligible ? "ELIGIBLE" : "NOT ELIGIBLE";

          let warningTier: EligibilityWarningTier = "safe";
          let warningMessage = `Cleared for Examinations: Attendance is in good standing (${attendanceRate}%).`;

          if (attendanceRate < threshold) {
            warningTier = "ineligible";
            warningMessage = `Not Exam Eligible: Attendance is currently ${attendanceRate}% (below ${threshold}% requirement).`;
          } else if (attendanceRate < threshold + 5) {
            warningTier = "warning";
            warningMessage = `Warning: Close to threshold! Current attendance is ${attendanceRate}%. Do not miss upcoming lectures.`;
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

        studentReports.sort((a, b) => a.matricNumber.localeCompare(b.matricNumber));

        const totalEnrolled = studentReports.length;
        const totalEligible = studentReports.filter((s) => s.isEligible).length;
        const totalNotEligible = totalEnrolled - totalEligible;
        const overallEligibilityRate =
          totalEnrolled > 0
            ? Math.round(((totalEligible / totalEnrolled) * 100) * 10) / 10
            : 100;

        const report: CourseEligibilityReport = {
          courseId,
          courseCode: course.code,
          courseName: course.name,
          department: course.department,
          lecturerId,
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

        return NextResponse.json({ success: true, report });
      } catch {
        // Fall back to memory store below
      }
    }

    // In-memory fallback
    const report = db.getCourseEligibilityReport(courseId, currentUser?.id, threshold);
    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Error computing eligibility" },
      { status: 500 },
    );
  }
}

