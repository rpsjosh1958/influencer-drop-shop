import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// Server-only env var — not exposed to client bundle
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  try {
    // Verify the caller via their ID token — don't trust a UID from the request body
    const authHeader = req.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!decoded.email || !SUPER_ADMIN_EMAILS.includes(decoded.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await adminDb.collection("super_admins").doc(decoded.uid).set(
      {
        email: decoded.email,
        createdAt: new Date(),
        lastLogin: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: "Super Admin Verified" });
  } catch (error) {
    console.error("Super Admin Init Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
