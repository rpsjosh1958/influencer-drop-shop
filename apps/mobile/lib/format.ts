/**
 * Formats a number as Ghanaian Cedi (GHS) currency.
 * Uses toLocaleString for Hermes engine compatibility.
 */
export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'GHS 0.00';
  }

  // Hermes engine in React Native doesn't always support full Intl.NumberFormat
  // without polyfills, so we use a safe approach using toLocaleString
  const formattedString = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `GHS ${formattedString}`;
}
