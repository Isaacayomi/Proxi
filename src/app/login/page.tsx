"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth/auth-context";
import { UserRole } from "@/types/database";
import { GraduationCap, Compass, ShieldCheck, Lock, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid email or password.");
      }

      setUser(data.user);
      localStorage.setItem("proxi_active_role", data.user.role);
      router.push(`/${data.user.role}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error signing in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          matricNumber: matricNumber ? matricNumber.trim().toUpperCase() : null,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to register.");
      }

      setUser(data.user);
      localStorage.setItem("proxi_active_role", data.user.role);
      router.push(`/${data.user.role}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <Brand size="lg" className="justify-center" />
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-proxi-ink">
            University Attendance Portal
          </h1>
          <p className="text-xs text-proxi-muted max-w-xs mx-auto">
            Verified classroom proximity check-ins with server-side geofencing
          </p>
        </div>
      </div>

      <Card className="border border-slate-200/90 shadow-card hover:border-slate-300">
        {/* Modern Segmented Control */}
        <div className="p-1.5 bg-slate-100/80 m-3 rounded-xl flex gap-1 border border-slate-200/50">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
            }}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 font-sans cursor-pointer",
              tab === "signin"
                ? "bg-white text-proxi-ink shadow-xs"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError(null);
            }}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 font-sans cursor-pointer",
              tab === "signup"
                ? "bg-white text-proxi-ink shadow-xs"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            Create Account
          </button>
        </div>

        <CardContent className="p-6 pt-3 space-y-4">
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {successMsg && (
            <Alert variant="success">
              {successMsg}
            </Alert>
          )}

          {/* SIGN IN FORM */}
          {tab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                label="Institutional Email"
                placeholder="you@student.oauife.edu.ng"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                Sign In to Portal
              </Button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-proxi-green" />
                  Secured by institutional authentication
                </span>
              </div>
            </form>
          )}

          {/* CREATE ACCOUNT FORM */}
          {tab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Role Selection Tabs */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 font-sans">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("student")}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all duration-150 cursor-pointer",
                      selectedRole === "student"
                        ? "border-proxi-green bg-emerald-50/60 text-proxi-darkGreen font-bold ring-1 ring-proxi-green"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <GraduationCap className="w-4 h-4 mx-auto mb-1 text-proxi-green" />
                    <span className="text-xs block font-bold">Student</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Check into lectures</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole("lecturer")}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all duration-150 cursor-pointer",
                      selectedRole === "lecturer"
                        ? "border-sky-500 bg-sky-50/60 text-sky-950 font-bold ring-1 ring-sky-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Compass className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                    <span className="text-xs block font-bold">Lecturer</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Manage sessions</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="e.g. Ada"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="e.g. Okonkwo"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>

              <Input
                label="Email Address"
                placeholder={
                  selectedRole === "lecturer"
                    ? "faculty@oauife.edu.ng"
                    : "student@student.oauife.edu.ng"
                }
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              {/* Matriculation number for students */}
              {selectedRole === "student" && (
                <Input
                  label="Matriculation Number"
                  placeholder="CSC/2024/001"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                  hint="Format: ABC/YYYY/NNN (e.g. CSC/2024/001)"
                  required
                />
              )}

              <Input
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                Create {selectedRole === "student" ? "Student" : "Lecturer"} Account
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
