import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { createOrderFromVerifiedPayment } from "./orders";
import { applySubscriptionPaymentIfVerified } from "./subscriptionPayments";
import { applyProcessedRefund, findOrderRefFromReference } from "./refunds";
import { sendNotificationToUser } from "./notifications";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

// Refund event payloads confirmed against Paystack's docs (transaction_reference,
// amount, status). Dispute payloads are NOT confirmed the same way — zero
// disputes have ever occurred on this account to check a real example
// against, and Paystack's docs didn't show the raw webhook JSON shape for
// charge.dispute.* the way they did for refund.*. Tries the field names
// used elsewhere in Paystack's API (transaction.reference, matching how
// the Disputes REST endpoints describe it) with a fallback, and logs the
// raw payload if neither resolves so a real event can be diagnosed later.
function getDisputeTransactionReference(data: Record<string, unknown>): string | null {
  const transaction = data.transaction as Record<string, unknown> | undefined;
  if (typeof transaction?.reference === "string") return transaction.reference;
  if (typeof data.transaction_reference === "string") return data.transaction_reference;
  return null;
}

async function notifyStoreOwner(
  storeId: string,
  title: string,
  body: string,
  type: string,
  data: Record<string, unknown>
) {
  const storeDoc = await admin.firestore().collection("stores").doc(storeId).get();
  const ownerId = storeDoc.data()?.ownerId;
  if (!ownerId) return;
  await sendNotificationToUser(ownerId, title, body, type, data);
}

// Single Paystack webhook endpoint for payment confirmation — the primary,
// authoritative path for order/subscription confirmation (charge.success),
// plus refund and dispute (chargeback) events.
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
        // Two different things share this event: vendor sales (reference
        // prefixed drop_, split to a Subaccount) and platform subscription
        // payments (prefixed sub_, no split — goes to the main balance).
        if (typeof data.reference === "string" && data.reference.startsWith("sub_")) {
          await applySubscriptionPaymentIfVerified({
            reference: data.reference,
            status: data.status,
            amount: data.amount,
          });
        } else {
          await createOrderFromVerifiedPayment({
            reference: data.reference,
            status: data.status,
            amount: data.amount,
            fees_split: data.fees_split,
          });
        }
        break;
      }

      // refund.pending/refund.processing are logged only — the order was
      // already marked refundStatus="pending" synchronously when the
      // refund was created (see refunds.ts's initiateOrderRefund), and
      // nothing more needs to happen until it resolves one way or another.
      case "refund.pending":
      case "refund.processing": {
        logger.info(`Refund ${event.event} for ${event.data?.transaction_reference}`);
        break;
      }

      case "refund.processed": {
        const data = event.data;
        const reference = data.transaction_reference;
        if (typeof reference !== "string") break;
        const orderRef = await findOrderRefFromReference(reference);
        if (!orderRef) {
          logger.error(`refund.processed: no order found for ${reference}`);
          break;
        }
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) break;
        const order = orderSnap.data()!;

        // Idempotency: Paystack retries a webhook delivery that didn't get
        // a 200 (every 3 min for 4 tries, then hourly for 72h), and could
        // in principle redeliver the same refund.processed event twice.
        // applyProcessedRefund clears pendingRefundAmount once it runs, so
        // its absence means this exact in-flight refund was already
        // applied — skip re-debiting the vendor for the same refund twice.
        if (order.pendingRefundAmount === undefined) {
          logger.info(
            `refund.processed: no pending refund on ${orderRef.id}, treating as already applied`
          );
          break;
        }

        const refundedAmountGHS = Number(data.amount) / 100;
        await applyProcessedRefund(orderRef, order, refundedAmountGHS);

        if (order.userId && order.userId !== "guest") {
          await sendNotificationToUser(
            order.userId,
            "Refund Processed 💸",
            `Your refund of GHS ${refundedAmountGHS.toFixed(2)} for order #${orderRef.id.slice(0, 8).toUpperCase()} has been processed. It can take up to 10 business days to reflect.`,
            "order_update",
            { orderId: orderRef.id, storeId: order.storeId, screen: `/(tabs)/orders?orderId=${orderRef.id}` }
          );
        }
        await notifyStoreOwner(
          order.storeId,
          "Refund Completed",
          `A refund of GHS ${refundedAmountGHS.toFixed(2)} for order #${orderRef.id.slice(0, 8).toUpperCase()} has completed — your recorded earnings have been adjusted.`,
          "order_update",
          { orderId: orderRef.id, storeId: order.storeId, screen: `/admin/orders` }
        );
        break;
      }

      case "refund.failed": {
        const data = event.data;
        const reference = data.transaction_reference;
        if (typeof reference !== "string") break;
        const orderRef = await findOrderRefFromReference(reference);
        if (!orderRef) {
          logger.error(`refund.failed: no order found for ${reference}`);
          break;
        }
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) break;
        const order = orderSnap.data()!;

        // Nothing was ever debited from the vendor for a refund that never
        // completed — just clear the pending markers so it can be retried.
        await orderRef.update({
          refundStatus: "failed",
          pendingRefundAmount: admin.firestore.FieldValue.delete(),
          pendingRefundReference: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await notifyStoreOwner(
          order.storeId,
          "Refund Failed",
          `The refund for order #${orderRef.id.slice(0, 8).toUpperCase()} could not be processed. The funds are back on the platform balance — you can try again.`,
          "order_update",
          { orderId: orderRef.id, storeId: order.storeId, screen: `/admin/orders` }
        );
        break;
      }

      case "refund.needs-attention": {
        // Requires the customer's bank/MoMo account details to continue —
        // not built as an in-app retry flow yet (detect + notify only for
        // now, matching the same scope decision as disputes below).
        // Handle via POST /refund/retry_with_customer_details/{id} directly
        // against Paystack for now if this ever actually fires.
        const data = event.data;
        const reference = data.transaction_reference;
        if (typeof reference !== "string") break;
        const orderRef = await findOrderRefFromReference(reference);
        if (!orderRef) break;
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) break;
        const order = orderSnap.data()!;

        await orderRef.update({
          refundStatus: "needs-attention",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await notifyStoreOwner(
          order.storeId,
          "Refund Needs Attention",
          `The refund for order #${orderRef.id.slice(0, 8).toUpperCase()} needs the customer's payout details to continue. Handle this on the Paystack dashboard.`,
          "order_update",
          { orderId: orderRef.id, storeId: order.storeId, screen: `/admin/orders` }
        );
        break;
      }

      // Disputes (chargebacks/fraud claims) — detect + notify only for v1.
      // Paystack auto-accepts an unresponded dispute after 16 hours and
      // refunds the customer from the platform's own balance, so this
      // notification is the only thing standing between "you get a chance
      // to respond on the Paystack dashboard" and "it just happens without
      // you knowing." Actually responding (uploading evidence, accepting/
      // declining) is NOT built here — it happens on Paystack's own
      // dashboard for now.
      case "charge.dispute.create": {
        const data = event.data;
        const reference = getDisputeTransactionReference(data);
        if (!reference) {
          logger.warn("charge.dispute.create: could not find transaction reference", data);
          break;
        }
        const orderRef = await findOrderRefFromReference(reference);
        if (!orderRef) {
          logger.error(`charge.dispute.create: no order found for ${reference}`);
          break;
        }
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) break;
        const order = orderSnap.data()!;

        await orderRef.update({
          disputeStatus: "open",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await notifyStoreOwner(
          order.storeId,
          "Order Disputed ⚠️",
          `A customer has disputed the charge for order #${orderRef.id.slice(0, 8).toUpperCase()}. Respond on your Paystack dashboard within 16 hours, or Paystack will automatically refund them from the platform balance.`,
          "order_update",
          { orderId: orderRef.id, storeId: order.storeId, screen: `/admin/orders` }
        );
        break;
      }

      case "charge.dispute.resolve": {
        const data = event.data;
        const reference = getDisputeTransactionReference(data);
        if (!reference) {
          logger.warn("charge.dispute.resolve: could not find transaction reference", data);
          break;
        }
        const orderRef = await findOrderRefFromReference(reference);
        if (!orderRef) break;
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) break;
        const order = orderSnap.data()!;
        const resolution = typeof data.resolution === "string" ? data.resolution : "resolved";

        await orderRef.update({
          disputeStatus: resolution,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await notifyStoreOwner(
          order.storeId,
          "Dispute Resolved",
          `The dispute on order #${orderRef.id.slice(0, 8).toUpperCase()} has been resolved (${resolution}).`,
          "order_update",
          { orderId: orderRef.id, storeId: order.storeId, screen: `/admin/orders` }
        );
        break;
      }

      // charge.dispute.remind fires every 4h for unresolved chargebacks —
      // deliberately not re-notifying on every reminder (would spam every
      // 4 hours); the initial charge.dispute.create notification above is
      // the signal. Logged so it's traceable if needed.
      case "charge.dispute.remind": {
        logger.info(`Dispute reminder: ${JSON.stringify(event.data)}`);
        break;
      }

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
