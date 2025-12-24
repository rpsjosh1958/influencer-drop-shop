import * as admin from "firebase-admin";

// Initialize Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const migrateToMultiVendor = async () => {
  console.log("🚀 Starting Multi-Vendor Migration...");

  const DEFAULT_STORE_ID = "default-store";

  // 1. Create the Default Store
  const storeRef = db.collection("stores").doc(DEFAULT_STORE_ID);
  const storeSnap = await storeRef.get();

  if (!storeSnap.exists) {
    console.log("📦 Creating Default Store...");
    await storeRef.set({
      name: "Drop",
      slug: "drop", // copdrop.io/shop/drop
      ownerId: "ADMIN_ID_PLACEHOLDER", // You might want to hardcode your admin UID here or update it later
      theme: {
        primaryColor: "#000000",
        logoUrl: "", // Add if you have one
        heroText: "SECURE THE BAG.",
        cardSize: "large",
        footerText: "© 2025 Drop",
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "live",
    });
    console.log("✅ Default Store Created.");
  } else {
    console.log("ℹ️ Default Store already exists. Skipping creation.");
  }

  // 2. Migrate Products
  console.log("🚚 Migrating Products...");
  const productsSnap = await db.collection("products").get();

  if (productsSnap.empty) {
    console.log("ℹ️ No root products found to migrate.");
  } else {
    let batch = db.batch();
    let count = 0;

    for (const doc of productsSnap.docs) {
      const data = doc.data();
      const newRef = storeRef.collection("products").doc(doc.id);

      // Copy to new location
      batch.set(newRef, {
        ...data,
        storeId: DEFAULT_STORE_ID, // Tag for good measure
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // OPTIONAL: Delete old doc?
      // For safety, let's keep them for now, but in a real migration we'd delete.
      // batch.delete(doc.ref);

      count++;
      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
        console.log("...committed batch...");
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log(`✅ Migrated ${productsSnap.size} products.`);
  }

  // 3. Update Notifications (Tagging with storeId)
  console.log("🔔 Updating Notifications...");
  const notifSnap = await db
    .collection("notifications")
    .where("storeId", "==", null)
    .get();
  if (!notifSnap.empty) {
    let batch = db.batch();
    let count = 0;

    for (const doc of notifSnap.docs) {
      batch.update(doc.ref, { storeId: DEFAULT_STORE_ID });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
    console.log(`✅ Updated ${notifSnap.size} notifications.`);
  }

  // 4. Update Orders (Tagging with storeId)
  console.log("📦 Updating Orders...");
  const ordersSnap = await db
    .collection("orders")
    .where("storeId", "==", null)
    .get();
  if (!ordersSnap.empty) {
    let batch = db.batch();
    let count = 0;

    for (const doc of ordersSnap.docs) {
      batch.update(doc.ref, { storeId: DEFAULT_STORE_ID });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
    console.log(`✅ Updated ${ordersSnap.size} orders.`);
  }

  console.log("🏁 Migration Complete! The Default Store is ready.");
};

// To run this:
// 1. Uncomment the line below
// 2. Run `npm run shell` in functions folder
// 3. Call `migrateToMultiVendor()`
// migrateToMultiVendor();
