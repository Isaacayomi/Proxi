"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lecturer");
  }, [router]);

  return (
    <div className="py-12 text-center text-xs text-proxi-muted">
      Redirecting to faculty dashboard...
    </div>
  );
}
