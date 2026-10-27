"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminEnrollmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lecturer/courses");
  }, [router]);

  return (
    <div className="py-12 text-center text-xs text-proxi-muted">
      Redirecting to Courses...
    </div>
  );
}
