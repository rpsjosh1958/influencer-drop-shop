// One-off (2026-11-26): move full payout details off the public store docs
// into stores/{id}/private/payout, leaving only the masked number — what
// linkPayoutMethod now writes for new/changed payout methods.
// Run AFTER deploying functions, web and rules, from functions/:
//   node scripts/migrate-payout-private.js           (lists what would change)
//   node scripts/migrate-payout-private.js --write   (does it)
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(require("../service-account.json")),
});
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

(async () => {
  const write = process.argv.includes("--write");
  const stores = await db.collection("stores").get();
  let count = 0;
  for (const store of stores.docs) {
    const p = store.data().payoutConfig;
    if (!p || !p.accountNumber || String(p.accountNumber).startsWith("••••")) continue;
    count++;
    console.log(`${write ? "migrating" : "would migrate"} ${store.id}`);
    if (!write) continue;
    await store.ref.collection("private").doc("payout").set({
      ...p,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await store.ref.update({
      payoutConfig: {
        provider: p.provider,
        bankCode: p.bankCode,
        bankName: p.bankName || "",
        accountNumber: `••••${String(p.accountNumber).slice(-3)}`,
        subaccountCode: p.subaccountCode,
      },
    });
  }
  console.log(`${count} store(s) ${write ? "migrated" : "to migrate"}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
