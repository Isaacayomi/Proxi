export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  matricNumber: string;
  userType: "student" | "lecturer";
};
export type AuthSession = {
  token: string;
  expiresAt: number;
  user: UserProfile;
};
export function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.firstName === "string" &&
    typeof user.lastName === "string" &&
    typeof user.matricNumber === "string" &&
    (user.userType === "student" || user.userType === "lecturer")
  );
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(
    /\/+$/,
    "",
  );
  const base = configured || (__DEV__ ? "http://localhost:8787" : "");
  if (
    !base ||
    !/^https?:\/\//.test(base) ||
    (!__DEV__ && !base.startsWith("https://"))
  )
    throw new ApiError(
      "The server address is not configured correctly. Contact the project team.",
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success)
      throw new ApiError(
        data?.message ||
          `The server returned an unexpected response (${response.status}).`,
        response.status,
      );
    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Unable to reach the server. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
export const initiateAuth = (email: string) =>
  request<{ id: string; resendAfter: number }>("/api/auth/initiate", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
export async function completeAuth(
  id: string,
  otp: string,
): Promise<AuthSession> {
  const session = await request<AuthSession>("/api/auth/complete", {
    method: "POST",
    body: JSON.stringify({ id, otp }),
  });
  if (
    !session ||
    typeof session.token !== "string" ||
    typeof session.expiresAt !== "number" ||
    !isUserProfile(session.user)
  )
    throw new ApiError(
      "The server returned an invalid sign-in response. Please contact the project team.",
    );
  return session;
}
export async function fetchProfile(token: string): Promise<UserProfile> {
  const user = await request<UserProfile>("/api/me/profile", {}, token);
  if (!isUserProfile(user))
    throw new ApiError("The saved profile could not be read from the server.");
  return user;
}
export async function updateProfile(
  token: string,
  details: { firstName: string; lastName: string; matricNumber?: string },
): Promise<UserProfile> {
  const user = await request<UserProfile>(
    "/api/me/profile",
    { method: "PUT", body: JSON.stringify(details) },
    token,
  );
  if (!isUserProfile(user))
    throw new ApiError(
      "The server returned an invalid profile. Please try again.",
    );
  return user;
}
export const logout = (token: string) =>
  request<void>("/api/me/logout", { method: "POST" }, token);

export const createAttendanceSession = async (
  token: string,
  courseCode: string,
  courseName: string,
  durationMinutes = 60,
): Promise<{ sessionId: string; sessionToken: string; endsAt: number }> =>
  request(
    "/api/attendance/sessions",
    {
      method: "POST",
      body: JSON.stringify({ courseCode, courseName, durationMinutes }),
    },
    token,
  );

export const validateAttendanceSession = async (
  token: string,
  sessionId: string,
  sessionToken: string,
): Promise<{ sessionId: string; courseCode: string; courseName: string; endsAt: number }> =>
  request(
    "/api/attendance/sessions/validate",
    {
      method: "POST",
      body: JSON.stringify({ sessionId, sessionToken }),
    },
    token,
  );

export const submitAttendance = async (
  token: string,
  sessionId: string,
  sessionToken: string,
  nonce?: string,
): Promise<{ sessionId: string; courseCode: string; courseName: string }> =>
  request(
    "/api/attendance/submit",
    {
      method: "POST",
      body: JSON.stringify({ sessionId, sessionToken, nonce }),
    },
    token,
  );

export const fetchLecturerAttendanceSessions = async (token: string): Promise<any[]> =>
  request("/api/attendance/sessions/lecturer", {}, token);

export const fetchAttendanceRecords = async (token: string, sessionId?: string): Promise<any[]> => {
  const path = sessionId
    ? `/api/attendance/records?sessionId=${encodeURIComponent(sessionId)}`
    : "/api/attendance/records";
  return request(path, {}, token);
};

export const registerAuth = (email: string): Promise<AuthSession> =>
  request<AuthSession>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const loginAuth = (email: string): Promise<AuthSession> =>
  request<AuthSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const getSessionQRCode = async (token: string, sessionId: string): Promise<any> =>
  request(`/api/attendance/sessions/${sessionId}/qr`, {}, token);

export const endAttendanceSession = async (token: string, sessionId: string): Promise<any> =>
  request(`/api/attendance/sessions/${sessionId}/end`, { method: "POST" }, token);

export const submitAttendanceQR = async (token: string, qr: string): Promise<any> =>
  request(
    "/api/attendance/submit-qr",
    { method: "POST", body: JSON.stringify({ qr }) },
    token,
  );
