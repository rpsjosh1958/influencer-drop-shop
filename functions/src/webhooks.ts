import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as crypto from "crypto";
import { createOrderFromVerifiedPayment } from "./orders";
import { resolveTransferStatus } from "./wallet";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

// Single Paystack webhook endpoint for both payment confirmation
// (charge.success — the primary, authoritative path for order creation)
// and transfer status resolution (transfer.success/failed/reversed, since
// Paystack transfers resolve asynchronously after the initial API call).
export const paystackWebhook = onRequest(async (req, res) => {
  const signature = req.headers["x-paystack-signature"] as string | undefined;
  // Firebase Functions preserves the raw request body on `rawBody`
  // specifically for signature verification — must hash this, not
  // JSON.stringify(req.body), since re-serializing can change the bytes.
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

  if (!signature || !rawBody) {
    res.status(400).send("Missing signature or body");
    return;
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (hash !== signature) {
    logger.warn("Paystack webhook signature mismatch");
    res.status(401).send("Invalid signature");
    return;
  }

  const event = req.body;

  try {
    switch (event?.event) {
      case "charge.success": {
        const data = event.data;
        await createOrderFromVerifiedPayment({
          reference: data.reference,
          status: data.status,
          amount: data.amount,
          split: data.split,
        });
        break;
      }
      case "transfer.success":
        await resolveTransferStatus(event.data.reference, "success");
        break;
      case "transfer.failed":
        await resolveTransferStatus(event.data.reference, "failed");
        break;
      case "transfer.reversed":
        await resolveTransferStatus(event.data.reference, "reversed");
        break;
      default:
        // Unhandled event type — ack without action.
        break;
    }
  } catch (err) {
    logger.error("Error processing Paystack webhook", err);
    // Non-200 so Paystack retries (every 3 min for 4 tries, then hourly for
    // 72h) — safe because order/transfer resolution above is idempotent.
    res.status(500).send("Processing error");
    return;
  }

  res.status(200).send("OK");
});
