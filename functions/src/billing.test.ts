// Run: npm test
import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as admin from "firebase-admin";
import { extendGrowthExpiry } from "./billing";

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
