import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-proxi-green/30 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-proxi-green hover:bg-proxi-greenHover active:bg-proxi-darkGreen text-white shadow-xs hover:shadow-sm focus:ring-proxi-green",
      secondary:
        "bg-proxi-mint hover:bg-emerald-100 text-proxi-darkGreen border border-emerald-200/50",
      outline:
        "border border-proxi-line bg-white hover:bg-slate-50 hover:border-slate-300 text-proxi-ink shadow-xs",
      danger:
        "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xs focus:ring-red-500",
      ghost:
        "bg-transparent hover:bg-slate-100/80 active:bg-slate-200/80 text-proxi-ink",
    };

    const sizeStyles = {
      sm: "text-xs font-semibold px-3 py-1.5 min-h-[34px] gap-1.5",
      md: "text-sm font-semibold px-4 py-2.5 min-h-[42px] gap-2",
      lg: "text-base font-semibold px-6 py-3.5 min-h-[50px] gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
