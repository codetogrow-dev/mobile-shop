/**
 * Pakistani-shopkeeper-friendly money formatters.
 *
 * Two flavors:
 *
 *   fmtRupee(n)        — full number, always. Indian grouping (1,23,456),
 *                        no decimals. Use this for headline figures on stat
 *                        cards / detail pages where the shopkeeper needs to
 *                        read the exact rupee amount.
 *
 *   fmtRupeeCompact(n) — full number up to 99,999, then switches to lakh /
 *                        crore. Use this only in tight inline contexts
 *                        (small badge rows, metric cells) where the full
 *                        number won't fit.
 *
 *   fmtCurrency        — kept as an alias of fmtRupeeCompact so existing
 *                        callers continue to work without an import sweep.
 *
 * Currency: prepend ₨. Negative values get a leading "-", and `showSign`
 * adds a "+" for positives.
 */

function intWithIndianGrouping(absInt: number): string {
  // Indian numbering puts the first comma after 3 digits, then every 2.
  // 1234567 -> 12,34,567.   123456 -> 1,23,456.   12345 -> 12,345.
  const s = String(absInt);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

function applySign(value: number, body: string, showSign: boolean): string {
  const neg = value < 0 ? '-' : '';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${neg}₨${body}`;
}

/**
 * Full rupee number, always. Indian grouping, no decimals.
 *
 *   1000     -> ₨1,000
 *   123456   -> ₨1,23,456
 *   12000000 -> ₨1,20,00,000
 */
export function fmtRupee(value: number, showSign = false): string {
  if (!Number.isFinite(value)) return '₨0';
  const abs = Math.abs(Math.round(value));
  return applySign(value, intWithIndianGrouping(abs), showSign);
}

/**
 * Compact rupee number. Full integer up to 99,999; lakh/crore beyond.
 *
 *   1000      -> ₨1,000
 *   99999     -> ₨99,999
 *   100000    -> ₨1 lakh
 *   123456    -> ₨1.23 lakh
 *   1200000   -> ₨12 lakh
 *   10000000  -> ₨1 crore
 *   12345678  -> ₨1.23 crore
 */
export function fmtRupeeCompact(value: number, showSign = false): string {
  if (!Number.isFinite(value)) return '₨0';
  const abs = Math.abs(value);

  let body: string;
  if (abs >= 1_00_00_000) {
    // Crore — 2 decimals when < 10 cr, otherwise 1 decimal, stripping ".0".
    const cr = abs / 1_00_00_000;
    const digits = cr < 10 ? 2 : 1;
    body = `${stripTrailingZeros(cr.toFixed(digits))} crore`;
  } else if (abs >= 1_00_000) {
    // Lakh — 2 decimals when < 10 L, else 1 decimal.
    const lk = abs / 1_00_000;
    const digits = lk < 10 ? 2 : 1;
    body = `${stripTrailingZeros(lk.toFixed(digits))} lakh`;
  } else {
    body = intWithIndianGrouping(Math.round(abs));
  }

  return applySign(value, body, showSign);
}

function stripTrailingZeros(s: string): string {
  // "1.20" -> "1.2", "1.00" -> "1", "12.34" -> "12.34"
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
}

/** Back-compat alias. Defaults to the FULL formatter (Indian grouping, no
 *  decimals) because the vast majority of call sites are headline-style
 *  KPI tiles / stat cards / detail rows that have room for the exact rupee
 *  amount and benefit from precision. Genuinely tight inline contexts
 *  (button labels, error strings, narrow table columns, etc.) should import
 *  `fmtRupeeCompact` explicitly. See addendum 2 of the plan file for the
 *  full list of "tight" call sites. */
export const fmtCurrency = fmtRupee;

/** Percentage with no decimals: fmtPct(23.456) -> "23%" */
export function fmtPct(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

/** Plain compact number without currency symbol — same compaction rules as
 *  fmtRupeeCompact but no ₨ prefix. Used in chart axes and small stat chips. */
export function fmtCompact(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const neg = value < 0 ? '-' : '';
  if (abs >= 1_00_00_000) {
    const cr = abs / 1_00_00_000;
    return `${neg}${stripTrailingZeros(cr.toFixed(cr < 10 ? 2 : 1))} cr`;
  }
  if (abs >= 1_00_000) {
    const lk = abs / 1_00_000;
    return `${neg}${stripTrailingZeros(lk.toFixed(lk < 10 ? 2 : 1))} L`;
  }
  return `${neg}${intWithIndianGrouping(Math.round(abs))}`;
}
