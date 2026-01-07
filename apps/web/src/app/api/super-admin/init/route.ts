import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim());

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing UID" }, { status: 400 });
    }

    // Verify user via Admin Auth
    const user = await adminAuth.getUser(uid);
    if (!user || !user.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Security Check: Is this email allowed?
    if (!SUPER_ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create the Super Admin Document
    await adminDb.collection("super_admins").doc(uid).set(
      {
        email: user.email,
        createdAt: new Date(),
        lastLogin: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "Super Admin Verified",
    });
  } catch (error) {
    console.error("Super Admin Init Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
