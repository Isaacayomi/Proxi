"use client";

import React, { useState, useEffect } from "react";
import { Course, Profile } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { BookOpen, Plus, Trash2, UserCheck, GraduationCap, Users, X } from "lucide-react";

interface CourseManagerProps {
  initialCourses: Course[];
  lecturers: Profile[];
  students: Profile[];
}

export function CourseManager({
  initialCourses,
  lecturers,
  students,
}: CourseManagerProps) {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(
    "Computer Science and Engineering",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          department: department.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add course");
      }

      setCourses([data.course, ...courses]);
      setCode("");
      setName("");
      setShowAddForm(false);
      toast.success("Course Created! 📚", `${data.course.code} is now available.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving course";
      setError(msg);
      toast.error("Failed to Create Course", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/courses?id=${courseToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete course");
      }

      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      toast.success(
        "Course Deleted",
        `Course ${courseToDelete.code} has been removed from curriculum.`,
      );
      setCourseToDelete(null);
    } catch (err: unknown) {
      toast.error(
        "Delete Failed",
        err instanceof Error ? err.message : "Error deleting course",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200/90 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-proxi-green uppercase tracking-wider font-mono">
              Academic Curriculum
            </span>
            <Badge variant="neutral">{courses.length} Courses</Badge>
          </div>
          <h1 className="text-2xl font-bold text-proxi-ink tracking-tight font-sans mt-0.5">
            Course Management
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Manage course listings, curriculum codes, and authorized attendance tracks.
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          variant={showAddForm ? "outline" : "primary"}
          className="gap-1.5"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? "Cancel" : "Add Course"}
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-emerald-200/90 bg-emerald-50/20 shadow-card">
          <CardHeader>
            <CardTitle>Register New Course</CardTitle>
            <CardDescription>
              Add a curriculum course for attendance session tracking.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateCourse}>
            <CardContent className="space-y-4 pt-4">
              {error && <Alert variant="error">{error}</Alert>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Course Code"
                  placeholder="e.g. CSC 401"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Course Name"
                    placeholder="e.g. Software Engineering Practice"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Input
                label="Department"
                placeholder="e.g. Computer Science and Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </CardContent>
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Save Course
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Courses List */}
      {courses.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="text-center py-12 text-xs text-slate-500 font-sans">
            No courses registered yet. Click &quot;Add Course&quot; to create your first curriculum track.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="border border-slate-200/90 shadow-card hover:border-emerald-300 transition-all flex flex-col justify-between">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold font-mono text-proxi-green uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    {c.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="success" size="sm">Active</Badge>
                    <button
                      type="button"
                      onClick={() => setCourseToDelete(c)}
                      title={`Delete ${c.code}`}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-proxi-ink tracking-tight font-sans">
                    {c.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-sans">
                    {c.department}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    Curriculum Track
                  </span>
                  <span className="text-proxi-green font-semibold">Ready for Roll Call</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={courseToDelete !== null}
        onClose={() => setCourseToDelete(null)}
        onConfirm={handleDeleteCourse}
        title={`Delete Course "${courseToDelete?.code}"?`}
        description={`This will permanently remove ${courseToDelete?.name} (${courseToDelete?.code}) and all related attendance session data. This action cannot be undone.`}
        confirmText="Delete Course"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
