"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  label,
  disabled = false,
  className = "",
  icon,
  required = false,
  error,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`space-y-1.5 font-sans relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 font-sans flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border bg-white text-left flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer shadow-xs ${
          isOpen
            ? "border-emerald-500 ring-2 ring-emerald-500/20"
            : "border-slate-200 hover:border-emerald-300"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""} ${
          error ? "border-rose-300 ring-2 ring-rose-500/10" : ""
        }`}
      >
        <div className="flex-1 flex items-center gap-2.5 overflow-hidden">
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.badge && (
                <span className="shrink-0 text-xs font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
                  {selectedOption.badge}
                </span>
              )}
              <div className="truncate">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.subLabel && (
                  <span className="text-[10px] text-slate-500 block truncate">
                    {selectedOption.subLabel}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-normal">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {/* Custom Floating Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {options.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">
              No options available
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100/60">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-emerald-50/70 text-emerald-950 font-bold"
                        : "hover:bg-slate-50/90 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {opt.badge && (
                        <span
                          className={`shrink-0 text-xs font-bold font-mono px-2 py-0.5 rounded-md uppercase border ${
                            isSelected
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate leading-tight">
                          {opt.label}
                        </div>
                        {opt.subLabel && (
                          <div className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

