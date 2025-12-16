import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 1. Check if user is trying to access admin routes
  if (request.nextUrl.pathname.startsWith("/admin/dashboard")) {
    // 2. Check for a specific cookie or token (simplified logic)
    // In reality, you will check the Firebase Auth token here.
    const isAdmin = request.cookies.get("isAdminLoggedIn");

    if (!isAdmin) {
      // Kick them back to the Admin Login page
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}
