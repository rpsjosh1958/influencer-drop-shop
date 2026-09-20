import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const ORDERS_PAGE_SIZE = 500;

// Orders are written by both web and mobile, which don't agree on the buyer
// field name (some mobile write paths use `customerId` instead of `userId`),
// so both are checked when collecting a store's past buyers.
async function getStoreCustomerIds(storeId: string): Promise<string[]> {
  const ordersRef = admin
    .firestore()
    .collection("stores")
    .doc(storeId)
    .collection("orders");

  const customerIds = new Set<string>();
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  for (;;) {
    let query = ordersRef.orderBy("__name__").limit(ORDERS_PAGE_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const buyerId = data.userId || data.customerId;
      if (buyerId) customerIds.add(buyerId);
    });

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < ORDERS_PAGE_SIZE) break;
  }

  return Array.from(customerIds);
}

// Replaces the old "userId: all" broadcast write, which fanned out to
// every user on the platform regardless of which store they'd ever bought
// from. This scopes a vendor's broadcast to people who have actually
// purchased from THEIR store, by writing one `notifications` doc per buyer
// (same shape the onNotificationCreated trigger already sends a push for).
export const broadcastToStoreCustomers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { storeId, title, message } = request.data;
  if (!storeId || !title || !message) {
    throw new HttpsError(
      "invalid-argument",
      "storeId, title, and message are required"
    );
  }

  const storeDoc = await admin.firestore().collection("stores").doc(storeId).get();
  const storeData = storeDoc.data();
  if (!storeDoc.exists || storeData?.ownerId !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized to broadcast for this store"
    );
  }

  const customerIds = await getStoreCustomerIds(storeId);
  if (customerIds.length === 0) {
    return { recipientCount: 0 };
  }

  const storeName = storeData?.name || "";

  const db = admin.firestore();
  for (let i = 0; i < customerIds.length; i += ORDERS_PAGE_SIZE) {
    const batch = db.batch();
    for (const userId of customerIds.slice(i, i + ORDERS_PAGE_SIZE)) {
      batch.set(db.collection("notifications").doc(), {
        userId,
        title,
        message,
        type: "broadcast",
        storeId,
        // Nested under `data` (not top-level) to match the shape every
        // other notification writer uses — onNotificationCreated forwards
        // this straight through as the push's `data` payload, and both
        // apps' tap handlers read `data.storeId`/`data.screen` from here.
        data: { storeId, storeName, screen: "store" },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    }
    await batch.commit();
  }

  return { recipientCount: customerIds.length };
});
