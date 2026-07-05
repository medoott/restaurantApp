export function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

export function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

export function add(a, b) {
  return fromCents(toCents(a) + toCents(b));
}

export function subtract(a, b) {
  return fromCents(toCents(a) - toCents(b));
}

export function multiply(a, b) {
  return fromCents(toCents(a) * toCents(b));
}

export function divide(a, b) {
  if (b === 0) return 0;
  return fromCents(toCents(a) / toCents(b));
}

export function roundMoney(amount) {
  return Number(Number(amount).toFixed(2));
}
