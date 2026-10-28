"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, type, ...props }, ref) => {
    const inputId = id || React.useId();
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;

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
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={effectiveType}
            className={cn(
              "w-full px-4 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-proxi-ink placeholder-slate-400 font-sans transition-all duration-150 focus:bg-white focus:border-proxi-green focus:ring-2 focus:ring-proxi-green/20 focus:outline-none",
              isPassword && "pr-11",
              error && "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20",
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-proxi-green/30 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-slate-500" />
              ) : (
                <Eye className="w-4 h-4 text-slate-500" />
              )}
            </button>
          )}
        </div>
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
