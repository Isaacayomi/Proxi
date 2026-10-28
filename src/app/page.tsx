"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user && role) {
        router.replace(`/${role}`);
      } else {
        router.replace("/login");
      }
    }
  }, [user, role, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-proxi-green border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-proxi-muted">Authenticating ProxiCheck session...</span>
      </div>
    </div>
  );
}
