export function getCurrencySymbol(currencyStr) {
  if (!currencyStr) return "$";
  const match = currencyStr.match(/\(([^)]+)\)/);
  return match ? match[1] : "$";
}
