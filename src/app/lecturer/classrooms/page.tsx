"use client";

import React, { useEffect, useState } from "react";
import { Classroom } from "@/types/database";
import { db } from "@/lib/db/store";
import { ClassroomManager } from "@/components/lecturer/classroom-manager";

export default function LecturerClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/classrooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.classrooms)) {
          setClassrooms(data.classrooms);
        } else {
          setClassrooms(db.listClassrooms());
        }
      })
      .catch(() => {
        setClassrooms(db.listClassrooms());
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="py-12 text-center text-xs text-proxi-muted">Loading classrooms...</div>
      ) : (
        <ClassroomManager initialClassrooms={classrooms} />
      )}
    </div>
  );
}
