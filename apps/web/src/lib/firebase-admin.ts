import * as admin from "firebase-admin";

console.log("Firebase Admin: Checking Env Vars...", {
  hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
  hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
});

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin Initialized with JSON Key");
      } catch (jsonError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY");
        // Attempt to fix common newline escaping issues
        try {
          const fixedKey = serviceAccountKey.replace(/\\n/g, "\\n"); // Ensure literals are preserved? No, JSON.parse expects \n
          // Actually, usually the issue is missing quotes or bad escapes.
          // Let's just log the error and try fallback.
          console.error("JSON Error:", jsonError);
        } catch (e) {}
      }
    } else {
      const minimalCreds = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Aggressively clean the key: remove surrounding quotes, fix escaped newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(
          /^['"]|['"]$/g,
          ""
        ) // Remove start/end quotes
          .replace(/\\n/g, "\n") // Fix escaped newlines
          .trim(),
      };

      if (
        minimalCreds.projectId &&
        minimalCreds.clientEmail &&
        minimalCreds.privateKey
      ) {
        admin.initializeApp({
          credential: admin.credential.cert(minimalCreds),
        });
        console.log(
          "Firebase Admin Initialized with Individual Vars. Key preview:",
          minimalCreds.privateKey.substring(0, 10) + "..."
        );
      } else {
        console.warn("Firebase Admin credentials missing. Skipping init.");
      }
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error", error);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : ({} as any);
export const adminAuth = admin.apps.length ? admin.auth() : ({} as any);
