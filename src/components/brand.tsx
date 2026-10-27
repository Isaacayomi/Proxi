import React from "react";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const containerSizes = {
    sm: "w-7 h-7 rounded-lg",
    md: "w-8 h-8 rounded-xl",
    lg: "w-11 h-11 rounded-2xl",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  const textSizes = {
    sm: "text-base tracking-tight",
    md: "text-xl tracking-tight",
    lg: "text-3xl tracking-tighter",
  };

  return (
    <div
      className={cn("inline-flex items-center gap-2.5 select-none group", className)}
    >
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-proxi-green to-emerald-800 text-white shadow-xs shadow-emerald-800/20 transition-transform group-hover:scale-105 duration-200",
          containerSizes[size],
        )}
      >
        <Radio className={cn(iconSizes[size], "animate-pulse")} />
      </div>
      <span
        className={cn(
          "font-extrabold text-proxi-ink leading-none font-sans",
          textSizes[size],
        )}
      >
        proxi<span className="text-proxi-green">.</span>
      </span>
    </div>
  );
}
