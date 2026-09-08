import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret-change-in-production"
);

// Same server-only allowlist /api/super-admin/init enforces — checking it
// here too closes the "brief admin-shell flash before client-side redirect"
// gap for a non-super-admin hitting /super-admin/* directly. Firestore
// rules were always the real data backstop; this is defense-in-depth on
// top of that, not a replacement for it.
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

async function getSessionEmail(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("__drop_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin";
  const isSuperAdminRoute =
    pathname.startsWith("/super-admin") && pathname !== "/super-admin/login";

  if (isAdminRoute || isSuperAdminRoute) {
    const email = await getSessionEmail(request);
    if (email === null) {
      const loginUrl = new URL("/admin", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isSuperAdminRoute && !SUPER_ADMIN_EMAILS.includes(email)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/super-admin/:path*"],
};
