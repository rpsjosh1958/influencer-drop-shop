// Single source of truth for the platform's cut by plan tier.
// Growth = 2%, Starter = 8%. Used both for the legacy internal wallet
// calculation (manual/cash orders) and for keeping a store's Paystack
// Subaccount percentage_charge in sync with its plan.
export const getPlatformFeeRate = (plan: string | undefined): number => {
  return plan === "growth" ? 0.02 : 0.08;
};

// Paystack's percentage_charge is "the percentage the MAIN account
// receives", expressed 0-100 (not a 0-1 fraction).
export const getPlatformFeePercentage = (plan: string | undefined): number => {
  return getPlatformFeeRate(plan) * 100;
};

// Refund-debt recovery: when a refund is issued, Paystack pulls the full
// amount back from the platform's MAIN balance, not from the vendor's
// subaccount — a subaccount's share of a split transaction has typically
// already settled to the vendor's real bank/MoMo account by then, and
// Paystack has no mechanism to claw that back automatically. To recover
// it, we temporarily raise the vendor's subaccount percentage_charge to
// this elevated rate (the platform keeps 80% of future order splits
// instead of their normal plan rate) until the debt is cleared, then
// resync it back to their normal plan rate. 80 is a deliberate choice —
// high enough to recover meaningfully fast, but leaves the vendor still
// earning something during recovery rather than 100%.
export const REFUND_DEBT_RECOVERY_PERCENTAGE = 80;
