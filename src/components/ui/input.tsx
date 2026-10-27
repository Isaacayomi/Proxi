import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 font-sans"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-proxi-ink placeholder-slate-400 font-sans transition-all duration-150 focus:bg-white focus:border-proxi-green focus:ring-2 focus:ring-proxi-green/20 focus:outline-none",
            error && "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-[11px] text-slate-500 leading-tight">{hint}</p>
        )}
        {error && (
          <p className="text-[11px] text-rose-600 font-semibold leading-tight">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
