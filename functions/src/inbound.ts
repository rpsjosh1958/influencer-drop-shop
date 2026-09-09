import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import { getEmailLayout, emailButton } from "./email-layout";

// Where you're actually alerted — real inboxes you check, independent of
// whether you remember to open the Resend dashboard's Receiving tab.
const ALERT_RECIPIENTS = ["dropsecure714@gmail.com", "tettehjosh5@gmail.com"];

// Addresses whose inbound mail is deliberately excluded from this pipeline
// entirely — no storage, no alert. logan@copdrop.io is monitored elsewhere,
// so routing it through here would just be noise.
const IGNORED_RECIPIENTS = ["logan@copdrop.io"];

// Any prefix @copdrop.io is caught by Resend's Inbound feature (root-domain
// MX, catch-all — confirmed by Josh, not just assumed). This webhook is the
// only thing standing between an inbound email and Resend's 30-day log
// retention silently deleting it if nobody happened to check the dashboard
// in time.
export const resendWebhook = onRequest(async (req, res) => {
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
  const svixId = req.headers["svix-id"] as string | undefined;
  const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
  const svixSignature = req.headers["svix-signature"] as string | undefined;

  if (!rawBody || !svixId || !svixTimestamp || !svixSignature) {
    res.status(400).send("Missing signature headers or body");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = resend.webhooks.verify({
      payload: rawBody.toString(),
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET || "",
    }) as { type: string; data: Record<string, unknown> };
  } catch (err) {
    logger.error("Resend webhook signature verification failed", err);
    res.status(401).send("Invalid signature");
    return;
  }

  if (event.type !== "email.received") {
    // Only subscribed to email.received for now — anything else showing up
    // here means the webhook's event list was widened without updating this
    // handler.
    logger.info(`Ignoring unhandled Resend webhook event: ${event.type}`);
    res.status(200).send("OK");
    return;
  }

  const emailId = event.data.email_id as string | undefined;
  if (!emailId) {
    logger.error("email.received webhook missing data.email_id", event);
    res.status(400).send("Missing email_id");
    return;
  }

  // Checked against the webhook's own metadata (already have `to` here) so
  // an ignored address never even costs a Receiving-API call.
  const eventTo = (event.data.to as string[] | undefined) || [];
  if (eventTo.some((addr) => IGNORED_RECIPIENTS.includes(addr.toLowerCase()))) {
    logger.info(`Ignoring inbound email ${emailId} — addressed to an ignored recipient`);
    res.status(200).send("OK");
    return;
  }

  try {
    // The webhook payload is metadata-only (from/to/subject/attachment
    // names) — the actual body requires a separate authenticated call.
    const { data: email, error: emailError } = await resend.emails.receiving.get(emailId);
    if (emailError || !email) {
      logger.error(`Failed to fetch received email ${emailId}`, emailError);
      res.status(500).send("Failed to fetch email");
      return;
    }

    let attachmentMeta: Array<{ filename: string; contentType: string; size: number }> = [];
    if (email.attachments && email.attachments.length > 0) {
      const { data: attachments } = await resend.emails.receiving.attachments.list({
        emailId,
      });
      attachmentMeta = (attachments?.data || []).map((a) => ({
        filename: a.filename || "unnamed",
        contentType: a.content_type,
        size: a.size,
      }));
    }

    // Stored permanently — this is what actually solves the "vanishes after
    // 30 days" problem, independent of whether the alert email below is
    // ever seen.
    await admin.firestore().collection("inbound_emails").doc(emailId).set({
      emailId,
      from: email.from,
      to: email.to,
      cc: email.cc || [],
      bcc: email.bcc || [],
      replyTo: email.reply_to || [],
      subject: email.subject,
      html: email.html,
      text: email.text,
      messageId: email.message_id,
      attachments: attachmentMeta,
      receivedAt: email.created_at,
      storedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const snippet = (email.text || "").slice(0, 500);
    const alertBody = `
      <p style="font-size:16px;font-weight:800;margin:0 0 4px;color:#ffffff;">${escapeHtml(email.subject || "(no subject)")}</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0 0 20px;">
        From <strong style="color:#e4e4e7;">${escapeHtml(email.from)}</strong> to ${escapeHtml((email.to || []).join(", "))}
      </p>
      <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#e4e4e7;white-space:pre-wrap;text-align:left;">
        ${escapeHtml(snippet)}${(email.text || "").length > 500 ? "…" : ""}
      </div>
      ${attachmentMeta.length > 0
        ? `<p style="font-size:12px;color:#a1a1aa;margin-top:16px;">📎 ${attachmentMeta.map((a) => escapeHtml(a.filename)).join(", ")}</p>`
        : ""
      }
    `;

    const { error: sendError } = await resend.emails.send({
      from: "The Drop Inbox <alerts@copdrop.io>",
      to: ALERT_RECIPIENTS,
      subject: `📬 New email: ${email.subject || "(no subject)"}`,
      html: getEmailLayout(
        alertBody + emailButton(`mailto:${email.from}?subject=Re: ${encodeURIComponent(email.subject || "")}`, "Reply Directly"),
        "New Email Received."
      ),
      replyTo: email.from,
    });

    if (sendError) {
      // The email is already safely stored in Firestore at this point —
      // an alert-send failure shouldn't cause Resend to retry the whole
      // webhook (which would just re-run harmlessly, but no need).
      logger.error(`Failed to send inbound-email alert for ${emailId}`, sendError);
    }

    res.status(200).send("OK");
  } catch (err) {
    logger.error(`Error processing inbound email ${emailId}`, err);
    res.status(500).send("Processing error");
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
