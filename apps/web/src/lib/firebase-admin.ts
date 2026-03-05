import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (jsonError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY");
      }
    } else {
      let rawKey = process.env.FIREBASE_PRIVATE_KEY || "";

      // Reconstruct the key from scratch
      const pureKey = rawKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\\n/g, "") 
        .replace(/\s+/g, ""); 

      const finalKey = `-----BEGIN PRIVATE KEY-----\n${pureKey}\n-----END PRIVATE KEY-----\n`;

      const minimalCreds = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: finalKey,
      };

      if (
        minimalCreds.projectId &&
        minimalCreds.clientEmail &&
        minimalCreds.privateKey
      ) {
        admin.initializeApp({
          credential: admin.credential.cert(minimalCreds),
        });
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
