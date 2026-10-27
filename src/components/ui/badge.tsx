import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    success: "bg-emerald-50/80 text-emerald-800 border-emerald-200/80",
    warning: "bg-amber-50/80 text-amber-800 border-amber-200/80",
    error: "bg-rose-50/80 text-rose-800 border-rose-200/80",
    info: "bg-sky-50/80 text-sky-800 border-sky-200/80",
    neutral: "bg-slate-100/90 text-slate-700 border-slate-200/80",
  };

  const dotStyles = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    info: "bg-sky-500",
    neutral: "bg-slate-400",
  };

  const sizeStyles = {
    sm: "text-[10px] font-semibold px-2 py-0.5",
    md: "text-[11px] font-semibold px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border tracking-wide font-sans select-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          dotStyles[variant],
        )}
      />
      {children}
    </span>
  );
}

