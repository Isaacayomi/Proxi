"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { UserRole } from "@/types/database";
import {
  BookOpen,
  Building2,
  CalendarCheck,
  History,
  LogOut,
  Menu,
  X,
  Compass,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const { user, role, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = pathname === "/login";

  const studentLinks = [
    { href: "/student", label: "Check In", icon: CalendarCheck },
    { href: "/student/history", label: "My Attendance", icon: History },
  ];

  const lecturerLinks = [
    { href: "/lecturer", label: "Active Sessions", icon: Compass },
    { href: "/lecturer?create=true", label: "Start Session", icon: CalendarCheck },
    { href: "/lecturer/classrooms", label: "Classrooms & GPS", icon: Building2 },
    { href: "/lecturer/courses", label: "Courses", icon: BookOpen },
    { href: "/lecturer/reports", label: "Reports & CSV", icon: FileSpreadsheet },
  ];

  const currentLinks =
    role === "student"
      ? studentLinks
      : role === "lecturer"
        ? lecturerLinks
        : [];

  const roleLabels: Record<UserRole, { label: string; variant: "success" | "info" }> = {
    student: { label: "Student", variant: "success" },
    lecturer: { label: "Lecturer", variant: "info" },
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const f = first?.[0] || "";
    const l = last?.[0] || "";
    return (f + l).toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <Link
              href={user ? (role === "student" ? "/student" : "/lecturer") : "/login"}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-proxi-green/30 rounded-xl"
            >
              <Brand size="md" />
            </Link>

            {/* Desktop Navigation Links */}
            {user && (
              <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
                {currentLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 font-sans",
                        isActive
                          ? "bg-proxi-mint text-proxi-darkGreen shadow-xs"
                          : "text-slate-600 hover:text-proxi-ink hover:bg-slate-100/70",
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", isActive ? "text-proxi-green" : "text-slate-400")} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="hidden md:flex items-center gap-3">
            {user && role ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200/80">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-700 to-proxi-green text-white flex items-center justify-center text-xs font-bold font-sans shadow-xs">
                  {getInitials(user.first_name, user.last_name)}
                </div>

                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-bold text-proxi-ink truncate max-w-[140px]">
                    {user.first_name} {user.last_name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                    {user.matric_number || user.email}
                  </span>
                </div>

                <Badge variant={roleLabels[role].variant} size="sm">
                  {roleLabels[role].label}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 p-2 ml-1"
                  title="Sign Out"
                  aria-label="Sign out of account"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              !isAuthPage && (
                <Link href="/login">
                  <Button variant="primary" size="sm">
                    Sign In
                  </Button>
                </Link>
              )
            )}
          </div>

          {/* Mobile menu button */}
          {user && (
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {user && mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3 shadow-lg">
          <div className="space-y-1">
            {currentLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold font-sans",
                    isActive
                      ? "bg-proxi-mint text-proxi-darkGreen"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile User Profile & Sign Out */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-proxi-green text-white flex items-center justify-center text-xs font-bold font-sans">
                  {getInitials(user.first_name, user.last_name)}
                </div>
                <div>
                  <p className="text-xs font-bold text-proxi-ink">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {user.matric_number || user.email}
                  </p>
                </div>
              </div>
              {role && (
                <Badge variant={roleLabels[role].variant} size="sm">
                  {roleLabels[role].label}
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                signOut();
                setMobileMenuOpen(false);
              }}
              className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
