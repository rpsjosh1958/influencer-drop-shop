import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY
);

export async function POST(req: Request) {
  try {
    const { subject, message, target } = await req.json();

    // Mocking Sending Process for now
    console.log(`[BROADCAST] Target: ${target}, Subject: ${subject}`);

    // Logic to fetch users based on target
    // const users = await fetchUsers(target);

    // Batch send via Resend
    // await resend.emails.sendBatch(...)

    return NextResponse.json({ success: true, count: 0 }); // Return count of sent emails
  } catch (error) {
    console.error("Broadcast error:", error);

    return NextResponse.json(
      { error: "Failed to send broadcast" },
      { status: 500 }
    );
  }
}
