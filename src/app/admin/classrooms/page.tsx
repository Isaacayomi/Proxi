"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminClassroomsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lecturer/classrooms");
  }, [router]);

  return (
    <div className="py-12 text-center text-xs text-proxi-muted">
      Redirecting to Classrooms & GPS management...
    </div>
  );
}
