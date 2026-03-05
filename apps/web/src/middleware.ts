import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Protect all admin routes except the login page itself
  if (pathname.startsWith("/admin") && pathname !== "/admin") {
    // 2. Check for the admin session cookie
    const isAdmin = request.cookies.get("isAdminLoggedIn");

    if (!isAdmin) {
      // Redirect to the Admin Login page if not authenticated
      const loginUrl = new URL("/admin", request.url);
      // Optional: keep the intended destination to redirect back after login
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// 3. Configure the matcher for efficiency
export const config = {
  matcher: ["/admin/:path*"],
};
