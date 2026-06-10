const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    const t = tens[Math.floor(n / 10)];
    const o = ones[n % 10];
    return o ? `${t} ${o}` : t;
  }
  const h = ones[Math.floor(n / 100)];
  const rest = belowThousand(n % 100);
  return rest ? `${h} Hundred ${rest}` : `${h} Hundred`;
}

/**
 * Converts a number to Pakistani English words.
 * Uses Crore / Lakh / Thousand / Hundred denomination system.
 * E.g. 232003 → "Two Lakh Thirty Two Thousand Three Rupees Only"
 */
export function numToWords(value: number): string {
  const n = Math.abs(Math.round(value));
  const sign = value < 0 ? 'Minus ' : '';

  if (n === 0) return 'Zero Rupees Only';

  const crore    = Math.floor(n / 10_000_000);
  const lakh     = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest     = n % 1_000;

  const parts: string[] = [];
  if (crore)    parts.push(`${belowThousand(crore)} Crore`);
  if (lakh)     parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (rest)     parts.push(belowThousand(rest));

  return `${sign}${parts.join(' ')} Rupees Only`;
}
