import { NextResponse } from "next/server";
import { Resend } from "resend";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getEmailLayout } from "@/lib/email-layout";

const resendApiKey = process.env.RESEND_API_KEY;

export async function POST(req: Request) {
  try {
    // Verify the caller is an authenticated admin
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

    const superAdminDoc = await adminDb.collection("super_admins").doc(decoded.uid).get();
    if (!superAdminDoc.exists) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { subject, message, target } = await req.json();
    if (!subject || !message) {
      return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
    }

    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Broadcasts target vendors (store owners) by plan — "plan" is a store
    // property, not a user one, so resolve stores -> ownerId -> email
    // rather than querying `users` directly. A vendor who owns multiple
    // stores only gets emailed once.
    const storesQuery =
      target === "growth"
        ? adminDb.collection("stores").where("plan", "==", "growth")
        : target === "starter"
          ? adminDb.collection("stores").where("plan", "!=", "growth")
          : adminDb.collection("stores");
    const storesSnap = await storesQuery.get();
    const ownerIds = [
      ...new Set(
        storesSnap.docs
          .map((d) => d.data().ownerId as string | undefined)
          .filter((id): id is string => !!id)
      ),
    ];

    const ownerDocs = await Promise.all(
      ownerIds.map((uid) => adminDb.collection("users").doc(uid).get())
    );
    const recipients = [
      ...new Set(
        ownerDocs
          .map((d) => d.data()?.email as string | undefined)
          .filter((email): email is string => !!email)
      ),
    ];

    let sentCount = 0;
    if (recipients.length > 0) {
      const resend = new Resend(resendApiKey);
      const results = await Promise.allSettled(
        recipients.map((email) =>
          resend.emails.send({
            from: "The Drop <announcements@copdrop.io>",
            to: [email],
            subject,
            html: getEmailLayout(
              `
                <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 20px;">${subject}</h2>
                <p style="color: #cccccc; font-size: 16px; line-height: 1.6; white-space: pre-wrap; text-align: left;">${message}</p>
                <p style="margin-top: 40px; font-size: 12px; color: #666666;">
                  You're receiving this as a registered vendor on The Drop.
                </p>
              `,
              "Platform Update."
            ),
          })
        )
      );
      sentCount = results.filter((r) => r.status === "fulfilled").length;
    }

    // Direct Admin SDK write — bypasses firestore.rules (which only ever
    // allow reading system_logs, not writing), unlike the client-side
    // logSystemEvent() helper this collection was originally meant to be
    // fed by, which has no working write path.
    await adminDb.collection("system_logs").add({
      type: sentCount === recipients.length ? "info" : "warning",
      message: `Broadcast "${subject}" sent to ${sentCount}/${recipients.length} ${target} vendor(s)`,
      context: { target, subject, recipientCount: recipients.length, sentCount },
      userId: decoded.uid,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, count: sentCount, recipients: recipients.length });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
  }
}
