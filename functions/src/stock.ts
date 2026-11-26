import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

interface CartItemInput {
  id: string;
  quantity: number;
  selectedVariant?: { id: string; name?: string } | null;
}

export interface VerifiedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  selectedVariant: { id: string; name?: string } | null;
}

interface ProductVariantDoc {
  id: string;
  name?: string;
  stock?: number;
  price?: number;
}

type ProductData = FirebaseFirestore.DocumentData;

const ABANDONED_AFTER_MS = 30 * 60 * 1000;

const variantOf = (product: ProductData, line: CartItemInput) =>
  line.selectedVariant?.id && Array.isArray(product.variants)
    ? (product.variants as ProductVariantDoc[]).find(
        (v) => v.id === line.selectedVariant!.id
      )
    : undefined;

// Moves one line's stock on an in-memory product: its variant (if the line
// is for one) and the top-level total. Every line for a product goes through
// the same copy, so two lines for it — a duplicate, or two of its variants —
// add up. (Writing each line from the original snapshot, as before, let the
// second line's write overwrite the first's decrement.)
export const moveStock = (
  product: ProductData,
  line: CartItemInput,
  delta: number
) => {
  const variant = variantOf(product, line);
  if (variant) {
    product.variants = product.variants.map((v: ProductVariantDoc) =>
      v.id === variant.id ? { ...v, stock: (v.stock ?? 0) + delta } : v
    );
  }
  product.stock = (product.stock ?? 0) + delta;
};

// Runs `fn` over in-memory copies of the given products inside one
// transaction, then writes each product once.
const withProducts = <T>(
  storeId: string,
  ids: string[],
  fn: (products: Map<string, ProductData | undefined>) => T
): Promise<T> => {
  const db = admin.firestore();
  const col = db.collection("stores").doc(storeId).collection("products");
  const unique = [...new Set(ids)];
  return db.runTransaction(async (t) => {
    const snaps = await Promise.all(unique.map((id) => t.get(col.doc(id))));
    const products = new Map(unique.map((id, i) => [id, snaps[i].data()]));
    const result = fn(products);
    for (const [id, p] of products) {
      if (!p) continue;
      t.update(col.doc(id), {
        stock: p.stock ?? 0,
        ...(Array.isArray(p.variants) && { variants: p.variants }),
      });
    }
    return result;
  });
};

// Validates availability, computes real prices, and decrements stock (the
// variant's and the top-level total) — all in one transaction, so either
// every item reserves or none do. Server-side because customers can't write
// products (and couldn't safely be allowed to write `variants`).
export const reserveStockAndPrice = (
  storeId: string,
  items: CartItemInput[]
): Promise<{ verifiedItems: VerifiedItem[]; totalGHS: number }> =>
  withProducts(
    storeId,
    items.map((i) => i.id),
    (products) => {
      let totalGHS = 0;
      const verifiedItems: VerifiedItem[] = [];

      for (const item of items) {
        const product = products.get(item.id);
        if (!product) {
          throw new HttpsError(
            "failed-precondition",
            `Product ${item.id} no longer exists`
          );
        }
        // Whole items only — 0.01 of a product used to be accepted and
        // charged 1% of its price.
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new HttpsError(
            "invalid-argument",
            `Invalid quantity for ${item.id}`
          );
        }

        let price = product.price;
        if (item.selectedVariant?.id && Array.isArray(product.variants)) {
          const variant = variantOf(product, item);
          if (!variant) {
            throw new HttpsError(
              "failed-precondition",
              `Variant ${item.selectedVariant.id} of ${product.name} no longer exists`
            );
          }
          if ((variant.stock ?? 0) < quantity) {
            throw new HttpsError(
              "failed-precondition",
              `Not enough stock for ${product.name}${
                variant.name ? ` (${variant.name})` : ""
              }`
            );
          }
          if (variant.price !== undefined) price = variant.price;
        } else if ((product.stock ?? 0) < quantity) {
          throw new HttpsError(
            "failed-precondition",
            `Not enough stock for ${product.name}`
          );
        }

        moveStock(product, item, -quantity);
        totalGHS += price * quantity;
        verifiedItems.push({
          id: item.id,
          name: product.name,
          price,
          quantity,
          imageUrl: product.images?.[0] || null,
          selectedVariant: item.selectedVariant || null,
        });
      }

      return { verifiedItems, totalGHS };
    }
  );

// Reverses a reservation (cancelled/abandoned checkout). A product deleted
// since reservation is skipped rather than blocking the others.
export const releaseStock = (storeId: string, items: VerifiedItem[]) =>
  withProducts(
    storeId,
    items.map((i) => i.id),
    (products) => {
      for (const item of items) {
        const product = products.get(item.id);
        if (product) moveStock(product, item, item.quantity);
      }
    }
  );

// A checkout whose stock was already released was paid anyway — e.g. a MoMo
// approval landing after the popup was closed. The order stands (the
// customer paid), so its stock is taken again, stopping at zero rather than
// failing: if it sold out meanwhile, the vendor sees the order and refunds.
export const retakeStock = (storeId: string, items: VerifiedItem[]) =>
  withProducts(
    storeId,
    items.map((i) => i.id),
    (products) => {
      for (const item of items) {
        const product = products.get(item.id);
        if (!product) continue;
        const variant = variantOf(product, item);
        const available = Math.max(0, (variant ? variant.stock : product.stock) ?? 0);
        moveStock(product, item, -Math.min(item.quantity, available));
      }
    }
  );

// Moves a still-pending checkout to `status` and returns its reserved stock.
// Transactional against createOrderFromVerifiedPayment's claim (orders.ts),
// so stock is released at most once, and a paid checkout that lost the race
// takes its stock back via retakeStock.
export const releaseIntent = async (
  intentRef: FirebaseFirestore.DocumentReference,
  status: "cancelled" | "expired"
) => {
  const intent = await admin.firestore().runTransaction(async (t) => {
    const snap = await t.get(intentRef);
    if (snap.data()?.status !== "pending") return null;
    t.update(intentRef, { status });
    return snap.data()!;
  });
  if (intent) await releaseStock(intent.storeId, intent.items);
};

// Checkouts left pending (popup abandoned, app closed) used to hold their
// stock forever — anyone could tie up a store's inventory by starting
// checkouts and never paying. Pending ones are few (this keeps it that way),
// so filtering by age in code avoids needing a composite index.
export const releaseAbandonedCheckouts = onSchedule(
  "every 15 minutes",
  async () => {
    const cutoff = Date.now() - ABANDONED_AFTER_MS;
    const pending = await admin
      .firestore()
      .collection("payment_intents")
      .where("status", "==", "pending")
      .get();
    for (const doc of pending.docs) {
      if ((doc.data().createdAt?.toMillis() ?? 0) > cutoff) continue;
      try {
        await releaseIntent(doc.ref, "expired");
        logger.info(`Released abandoned checkout ${doc.id}`);
      } catch (err) {
        logger.error(`Failed to release abandoned checkout ${doc.id}`, err);
      }
    }
  }
);
