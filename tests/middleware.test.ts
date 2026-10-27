import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function createMockRequest(pathname: string, sessionCookie?: any): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const headers = new Headers();
  if (sessionCookie) {
    const encoded = encodeURIComponent(JSON.stringify(sessionCookie));
    headers.set("cookie", `proxi_session=${encoded}`);
  }
  return new NextRequest(url, { headers });
}

describe("Next.js Route Protection Middleware", () => {
  it("allows unauthenticated access to /login", () => {
    const req = createMockRequest("/login");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated users trying to access / to /login", () => {
    const req = createMockRequest("/");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects unauthenticated users trying to access /student to /login", () => {
    const req = createMockRequest("/student");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects unauthenticated users trying to access /lecturer to /login", () => {
    const req = createMockRequest("/lecturer");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects unauthenticated users trying to access /admin to /login", () => {
    const req = createMockRequest("/admin");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects authenticated student from /login or / to /student", () => {
    const req = createMockRequest("/login", { id: "s1", email: "ada@oau.edu", role: "student" });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/student");
  });

  it("redirects authenticated student trying to access /admin back to /student", () => {
    const req = createMockRequest("/admin", { id: "s1", email: "ada@oau.edu", role: "student" });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/student");
  });

  it("allows authenticated student to access /student", () => {
    const req = createMockRequest("/student", { id: "s1", email: "ada@oau.edu", role: "student" });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("allows authenticated lecturer to access /lecturer", () => {
    const req = createMockRequest("/lecturer", { id: "l1", email: "prof@oau.edu", role: "lecturer" });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("redirects authenticated lecturer trying to access /student back to /lecturer", () => {
    const req = createMockRequest("/student", { id: "l1", email: "prof@oau.edu", role: "lecturer" });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/lecturer");
  });
});

