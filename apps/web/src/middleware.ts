import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret-change-in-production"
);

async function isValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("__drop_session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SESSION_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin";
  const isSuperAdminRoute =
    pathname.startsWith("/super-admin") && pathname !== "/super-admin/login";

  if (isAdminRoute || isSuperAdminRoute) {
    const valid = await isValidSession(request);
    if (!valid) {
      const loginUrl = new URL("/admin", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/super-admin/:path*"],
};
