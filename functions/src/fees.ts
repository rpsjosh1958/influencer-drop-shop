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
