"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewSessionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/lecturer?create=true");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-xs text-slate-500 font-sans animate-pulse">
        Opening Session Launcher...
      </div>
    </div>
  );
}
