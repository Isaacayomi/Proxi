import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public assets, internal Next.js routes, and API auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_not-found") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Read session cookie
  const sessionCookie = req.cookies.get("proxi_session")?.value;
  let session: { id: string; email: string; role: string } | null = null;

  if (sessionCookie) {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      session = null;
    }
  }

  const isAuthPage = pathname === "/login";

  // 3. If unauthenticated and trying to access any protected route, redirect to /login
  if (!session || !session.role) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. If already authenticated and trying to access /login or root /, redirect to role dashboard
  if (isAuthPage || pathname === "/") {
    const roleDashboard = `/${session.role}`;
    return NextResponse.redirect(new URL(roleDashboard, req.url));
  }

  // 5. Role-based access control
  if (session.role === "student") {
    if (pathname.startsWith("/lecturer") || pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/student", req.url));
    }
  } else if (session.role === "lecturer") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/student")) {
      return NextResponse.redirect(new URL("/lecturer", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _not-found (internal 404 page)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|_not-found|favicon.ico).*)",
  ],
};

