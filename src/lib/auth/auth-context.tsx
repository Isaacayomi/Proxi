"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Profile, UserRole } from "@/types/database";
import { db } from "@/lib/db/store";

interface AuthContextType {
  user: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  signInAs: (role: UserRole) => void;
  signOut: () => void;
  updateProfile: (details: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSessionCookie(): Profile | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )proxi_session=([^;]+)"));
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[2]));
    } catch {
      return null;
    }
  }
  return null;
}

function setSessionCookie(profile: Profile) {
  if (typeof document === "undefined") return;
  const data = encodeURIComponent(
    JSON.stringify({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      matric_number: profile.matric_number,
    }),
  );
  document.cookie = `proxi_session=${data}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}

function deleteSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "proxi_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Read session from cookie first
    const session = getSessionCookie();
    if (session) {
      setUserState(session);
    } else {
      setUserState(null);
    }
    setIsLoading(false);
  }, []);

  const setUser = (newUser: Profile | null) => {
    setUserState(newUser);
    if (newUser) {
      setSessionCookie(newUser);
      localStorage.setItem("proxi_active_role", newUser.role);
    } else {
      deleteSessionCookie();
      localStorage.removeItem("proxi_active_role");
    }
  };

  const signInAs = (newRole: UserRole) => {
    let targetProfile =
      newRole === "student"
        ? db.getProfile("u-student-1")
        : db.getProfile("u-lecturer-1");

    if (!targetProfile) {
      targetProfile = {
        id: `u-${newRole}-demo`,
        email:
          newRole === "student"
            ? "a.alabi.swe2024001@student.oauife.edu.ng"
            : "lecturer@oauife.edu.ng",
        first_name: newRole.charAt(0).toUpperCase() + newRole.slice(1),
        last_name: "User",
        matric_number: newRole === "student" ? "CSC/2024/001" : null,
        role: newRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.saveProfile(targetProfile);
    }

    setUser(targetProfile);
  };

  const signOut = () => {
    setUser(null);
    router.push("/login");
  };

  const updateProfile = (details: Partial<Profile>) => {
    if (!user) return;
    const updated = {
      ...user,
      ...details,
      updated_at: new Date().toISOString(),
    };
    db.saveProfile(updated);
    setUser(updated);
  };

  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        setUser,
        signInAs,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
