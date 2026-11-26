// Run: npm test
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as admin from "firebase-admin";
import { extendGrowthExpiry } from "./billing";
import { discountAmount } from "./discounts";
import { secondaryStoreIds } from "./subscriptions";
import { buildResetLink } from "./auth";
import { escapeHtml, orderItemRows } from "./email-layout";
import { moveStock } from "./stock";
import { addMinutesToTime, overlaps } from "./bookings";
import { fairVendorNet, recoveryRateFor } from "./wallet";

const DAY = 24 * 60 * 60;
const now = new admin.firestore.Timestamp(1_800_000_000, 0);
const at = (days: number) => new admin.firestore.Timestamp(now.seconds + days * DAY, 0);

test("extendGrowthExpiry adds to remaining Growth time, never restarts it", () => {
  // 20 trial days left + 30 paid = 50 from now.
  assert.equal(
    extendGrowthExpiry({ plan: "growth", planExpiresAt: at(20) }, 30, now).seconds,
    at(50).seconds
  );
  // Starter, or Growth already expired, starts from now.
  assert.equal(extendGrowthExpiry({ plan: "starter" }, 30, now).seconds, at(30).seconds);
  assert.equal(
    extendGrowthExpiry({ plan: "growth", planExpiresAt: at(-5) }, 30, now).seconds,
    at(30).seconds
  );
  // A stale future expiry on a non-Growth user doesn't count.
  assert.equal(
    extendGrowthExpiry({ plan: "starter", planExpiresAt: at(10) }, 30, now).seconds,
    at(30).seconds
  );
  assert.equal(extendGrowthExpiry(undefined, 90, now).seconds, at(90).seconds);
});

test("discountAmount never drops the charge below GHS 1", () => {
  assert.equal(discountAmount("percent", 20, 150), 30);
  assert.equal(discountAmount("percent", 33, 10), 3.3);
  assert.equal(discountAmount("fixed", 10, 50), 10);
  assert.equal(discountAmount("fixed", 50, 20), 19); // capped: leaves GHS 1
  assert.equal(discountAmount("percent", 100, 20), 19);
  assert.equal(discountAmount("percent", 500, 20), 19); // >100% clamped
  assert.equal(discountAmount("fixed", 5, 0.5), 0); // nothing left to discount
});

test("secondaryStoreIds keeps only the oldest store open", () => {
  const stores = [
    { id: "newest", createdAt: at(5) },
    { id: "oldest", createdAt: at(1) },
    { id: "middle", createdAt: at(3) },
  ];
  assert.deepEqual(secondaryStoreIds(stores), ["middle", "newest"]);
  // No createdAt sorts first, matching the clients' `|| 0`.
  assert.deepEqual(secondaryStoreIds([...stores, { id: "legacy" }]), ["oldest", "middle", "newest"]);
  assert.deepEqual(secondaryStoreIds([{ id: "only", createdAt: at(1) }]), []);
});

test("password reset links only ever point at our own site", () => {
  assert.equal(
    buildResetLink("abc", "https://evil.tld", "customer", "shop"),
    "https://copdrop.io/auth/action?mode=resetPassword&oobCode=abc&type=customer&storeId=shop"
  );
  assert.ok(buildResetLink("abc", "http://localhost:3000", "vendor", undefined).startsWith("http://localhost:3000/auth/action"));
  // Unknown types become vendor; injected params get encoded, not appended.
  const link = buildResetLink("abc", undefined, "x\"><script>", "a&mode=evil\"");
  assert.ok(link.includes("&type=vendor&storeId=a%26mode%3Devil%22"));
});

test("escapeHtml neutralises markup in user text", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.ok(!orderItemRows([{ name: "<b>x</b>", quantity: 1, price: 5 }]).includes("<b>"));
});

test("moveStock adds up several lines for one product", () => {
  // Two variants of the same product in one cart: both decrements land.
  const p = { stock: 5, variants: [{ id: "s", stock: 2 }, { id: "m", stock: 3 }] };
  moveStock(p, { id: "x", quantity: 1, selectedVariant: { id: "s" } }, -1);
  moveStock(p, { id: "x", quantity: 2, selectedVariant: { id: "m" } }, -2);
  assert.deepEqual(p, { stock: 2, variants: [{ id: "s", stock: 1 }, { id: "m", stock: 1 }] });
  // Duplicate plain lines sum too.
  const q = { stock: 3 };
  moveStock(q, { id: "y", quantity: 2 }, -2);
  moveStock(q, { id: "y", quantity: 1 }, -1);
  assert.equal(q.stock, 0);
});

test("refund-debt maths with the vendor paying Paystack's fee", () => {
  // GHS 5 Growth sale, Paystack fee 0.10: normal vendor share is 4.80, so an
  // ordinary order (vendorNet 4.80) counts as zero debt repaid.
  assert.ok(Math.abs(fairVendorNet(5, "growth", 0.1) - 4.8) < 1e-9);
  // During recovery (80% split): vendor gets 5*0.2 - 0.10 = 0.90, so 3.90 repaid.
  assert.ok(Math.abs(fairVendorNet(5, "growth", 0.1) - 0.9 - 3.9) < 1e-9);
  // Orders from before the change carry no fee.
  assert.ok(Math.abs(fairVendorNet(10, "starter") - 9.2) < 1e-9);
  // Split rate follows the debt's regime.
  assert.equal(recoveryRateFor("growth", 0, 3.9), 80); // newly owed -> recover
  assert.equal(recoveryRateFor("growth", 3.9, 1), undefined); // still recovering
  assert.equal(recoveryRateFor("growth", 1, 0), 2); // settled -> plan rate
  assert.equal(recoveryRateFor("growth", 1, -0.5), 0); // overshot -> pay back
});

test("booking overlap matches the modals' slot rule", () => {
  assert.equal(addMinutesToTime("09:30", 45), "10:15");
  const b = { startTime: "10:00", endTime: "11:00" };
  assert.equal(overlaps({ startTime: "10:30", endTime: "11:30" }, b, 0), true);
  assert.equal(overlaps({ startTime: "11:00", endTime: "12:00" }, b, 0), false); // back to back
  assert.equal(overlaps({ startTime: "11:00", endTime: "12:00" }, b, 15), true); // inside buffer
  assert.equal(overlaps({ startTime: "09:00", endTime: "10:00" }, b, 0), false);
});
