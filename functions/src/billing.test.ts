// Run: npm test
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as admin from "firebase-admin";
import { extendGrowthExpiry } from "./billing";
import { discountAmount } from "./discounts";
import { secondaryStoreIds } from "./subscriptions";
import { buildResetLink } from "./auth";
import { escapeHtml } from "./email-layout";

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
});
