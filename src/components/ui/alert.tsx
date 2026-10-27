import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
  ...props
}: AlertProps) {
  const icons = {
    success: (
      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
    ),
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
    warning: (
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
    ),
    info: <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />,
  };

  const variantStyles = {
    success: "bg-emerald-50/70 border-emerald-200/80 text-emerald-950",
    error: "bg-rose-50/70 border-rose-200/80 text-rose-950",
    warning: "bg-amber-50/70 border-amber-200/80 text-amber-950",
    info: "bg-sky-50/70 border-sky-200/80 text-sky-950",
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3.5 p-4 rounded-xl border text-sm leading-relaxed shadow-xs",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 space-y-0.5">
        {title && <h4 className="font-bold text-sm tracking-tight font-sans">{title}</h4>}
        <div className="text-xs sm:text-xs leading-relaxed text-inherit opacity-90">{children}</div>
      </div>
    </div>
  );
}
