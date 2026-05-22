/**
 * Display a coin total with K/M/B/T units per ADR-0005.
 *  - 0 exactly: "0"
 *  - 0 < n < 1: one decimal ("0.6") - needed so a fresh tank's earn rate is visible
 *  - 1 <= n < 1000: integer ("5", "999")
 *  - 1K+, 1M+, 1B+, 1T+: one decimal, trailing .0 stripped ("1 K", "1.5 K")
 *
 * Negative numbers prepend "-" before the formatted absolute value.
 */
export function formatCoins(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 0) return '-' + formatCoins(-n);
  if (n === 0) return '0';

  if (n < 1) {
    const s = n.toFixed(1);
    return s === '1.0' ? '1' : s;
  }
  if (n < 1_000) return Math.floor(n).toString();
  if (n < 1_000_000) return strip(n / 1_000) + ' K';
  if (n < 1_000_000_000) return strip(n / 1_000_000) + ' M';
  if (n < 1_000_000_000_000) return strip(n / 1_000_000_000) + ' B';
  return strip(n / 1_000_000_000_000) + ' T';
}

function strip(value: number): string {
  const s = value.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
