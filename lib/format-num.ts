/**
 * Compact currency formatter for PKR amounts.
 *
 * Rules:
 *   >= 1,000,000,000  → 1.2B
 *   >= 1,000,000      → 1.2M
 *   >= 1,000          → 1.2K
 *   < 1,000           → raw number (no suffix)
 *
 * Always prepends ₨.
 * Sign prefix (+/-) kept when `showSign` is true.
 */
export function fmtCurrency(value: number, showSign = false): string {
  const sign = showSign ? (value >= 0 ? '+' : '') : '';
  const abs = Math.abs(value);
  const neg = value < 0 ? '-' : '';

  let formatted: string;
  if (abs >= 1_000_000_000) {
    formatted = `${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 1 : 2)}B`;
  } else if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toFixed(abs >= 10_000 ? 1 : 2)}K`;
  } else {
    formatted = abs.toLocaleString();
  }

  return `${sign}${neg}₨${formatted}`;
}

/** Percentage with 1 decimal: fmtPct(23.456) → "23.5%" */
export function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Plain compact number without currency symbol */
export function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  const neg = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${neg}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${neg}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${neg}${(abs / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}
