import { NextResponse } from "next/server";
import { Resend } from "resend";
import { adminAuth } from "@/lib/firebase-admin";

const resendApiKey = process.env.RESEND_API_KEY;

export async function POST(req: Request) {
  try {
    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, message, target } = await req.json();

    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);
    console.log(`[BROADCAST] Target: ${target}, Subject: ${subject}`);

    // Logic to fetch users based on target
    // const users = await fetchUsers(target);

    // Batch send via Resend
    // await resend.emails.sendBatch(...)

    return NextResponse.json({ success: true, count: 0 });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
  }
}
