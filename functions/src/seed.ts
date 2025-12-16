import * as admin from "firebase-admin";
import * as path from "path";

// INSTRUCTION: Download your service account key from Project Settings > Service Accounts
// Save it as 'service-account.json' in the 'functions' folder (one level up from this script).
const keyPath = path.join(__dirname, "..", "service-account.json");

let serviceAccount;
try {
  serviceAccount = require(keyPath);
} catch (e) {
  console.error(
    "ERROR: Could not find 'service-account.json' in the functions folder."
  );
  console.error(
    "Please download it from Firebase Console > Project Settings > Service Accounts and save it as 'service-account.json'."
  );
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // 1. System Config
    console.log("...creating 'system/config'...");
    await db
      .collection("system")
      .doc("config")
      .set({
        isLive: false,
        dropTitle: "Christmas Collection",
        liveDate: admin.firestore.Timestamp.fromDate(
          new Date("2025-12-25T18:00:00Z")
        ), // 6PM Xmas
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // 2. Sample Product (for Admin testing)
    const productRef = db.collection("products").doc("sample-product");
    const doc = await productRef.get();
    if (!doc.exists) {
      console.log("...creating sample product...");
      await productRef.set({
        name: "Sample T-Shirt",
        price: 250, // GHS
        description: "A cool t-shirt for the drop.",
        images: ["https://placehold.co/400"],
        stock: 100,
      });
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

seed();
