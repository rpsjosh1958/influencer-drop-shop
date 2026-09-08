import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

interface CartItemInput {
  id: string;
  quantity: number;
  selectedVariant?: { id: string; name?: string } | null;
}

interface VerifiedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  selectedVariant: { id: string; name?: string } | null;
}

// Validates availability, computes real prices, and atomically decrements
// stock (top-level and/or the matching variant) — all within one Firestore
// transaction, so either every item reserves or none do. Replaces the old
// client-side reserveStock(), which the products Firestore rule could never
// fully support for variant products (customers aren't allowed to write the
// `variants` field, only `stock`).
export const reserveStockAndPrice = async (
  storeId: string,
  items: CartItemInput[]
): Promise<{ verifiedItems: VerifiedItem[]; totalGHS: number }> => {
  const db = admin.firestore();

  return db.runTransaction(async (t) => {
    const productRefs = items.map((item) =>
      db
        .collection("stores")
        .doc(storeId)
        .collection("products")
        .doc(item.id)
    );
    const productSnaps = await Promise.all(
      productRefs.map((ref) => t.get(ref))
    );

    let totalGHS = 0;
    const verifiedItems: VerifiedItem[] = [];
    const updates: { ref: FirebaseFirestore.DocumentReference; data: any }[] =
      [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const snap = productSnaps[i];
      if (!snap.exists) {
        throw new HttpsError(
          "failed-precondition",
          `Product ${item.id} no longer exists`
        );
      }
      const product = snap.data()!;
      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) {
        throw new HttpsError(
          "invalid-argument",
          `Invalid quantity for ${item.id}`
        );
      }

      let price = product.price;
      let updateData: any;

      if (item.selectedVariant?.id && Array.isArray(product.variants)) {
        const variant = product.variants.find(
          (v: any) => v.id === item.selectedVariant!.id
        );
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

        const updatedVariants = product.variants.map((v: any) =>
          v.id === item.selectedVariant!.id
            ? { ...v, stock: v.stock - quantity }
            : v
        );
        updateData = {
          variants: updatedVariants,
          stock: (product.stock ?? 0) - quantity,
        };
      } else {
        const currentStock = product.stock ?? 0;
        if (currentStock < quantity) {
          throw new HttpsError(
            "failed-precondition",
            `Not enough stock for ${product.name}`
          );
        }
        updateData = { stock: currentStock - quantity };
      }

      updates.push({ ref: productRefs[i], data: updateData });
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

    // Every item validated — now actually write the decrements. Nothing
    // above wrote anything, so a thrown error above leaves stock untouched.
    for (const u of updates) {
      t.update(u.ref, u.data);
    }

    return { verifiedItems, totalGHS };
  });
};

// Reverses a reservation (cancelled/abandoned checkout). Best-effort per
// item — a product deleted since reservation shouldn't block restoring the
// others.
export const releaseStock = async (
  storeId: string,
  items: VerifiedItem[]
) => {
  const db = admin.firestore();
  await db.runTransaction(async (t) => {
    const refs = items.map((item) =>
      db
        .collection("stores")
        .doc(storeId)
        .collection("products")
        .doc(item.id)
    );
    const snaps = await Promise.all(refs.map((ref) => t.get(ref)));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const snap = snaps[i];
      if (!snap.exists) continue;
      const product = snap.data()!;

      if (item.selectedVariant?.id && Array.isArray(product.variants)) {
        const updatedVariants = product.variants.map((v: any) =>
          v.id === item.selectedVariant!.id
            ? { ...v, stock: (v.stock ?? 0) + item.quantity }
            : v
        );
        t.update(refs[i], {
          variants: updatedVariants,
          stock: (product.stock ?? 0) + item.quantity,
        });
      } else {
        t.update(refs[i], {
          stock: admin.firestore.FieldValue.increment(item.quantity),
        });
      }
    }
  });
};
