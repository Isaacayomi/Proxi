"use client";

import React, { useEffect, useState } from "react";
import { Course, Profile } from "@/types/database";
import { db } from "@/lib/db/store";
import { CourseManager } from "@/components/admin/course-manager";

export default function LecturerCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.courses)) {
          setCourses(data.courses);
        } else {
          setCourses(db.listCourses());
        }
      })
      .catch(() => {
        setCourses(db.listCourses());
      })
      .finally(() => setLoading(false));
  }, []);

  const profiles = db.listProfiles();
  const lecturers = profiles.filter((p) => p.role === "lecturer");
  const students = profiles.filter((p) => p.role === "student");

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="py-12 text-center text-xs text-proxi-muted">Loading courses...</div>
      ) : (
        <CourseManager
          initialCourses={courses}
          lecturers={lecturers}
          students={students}
        />
      )}
    </div>
  );
}
