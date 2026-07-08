import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { SignJWT } from "jose";

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET env var is not set. Server cannot start.");
}

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret-change-in-production"
);
const SESSION_TTL = 60 * 60 * 24 * 5; // 5 days in seconds

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);

    const jwt = await new SignJWT({ uid: decoded.uid, email: decoded.email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL}s`)
      .sign(SESSION_SECRET);

    const res = NextResponse.json({ success: true });
    res.cookies.set("__drop_session", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL,
      path: "/",
    });
    res.cookies.delete("isAdminLoggedIn");
    return res;
  } catch (err) {
    console.error("Session error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("__drop_session");
  res.cookies.delete("isAdminLoggedIn");
  return res;
}
