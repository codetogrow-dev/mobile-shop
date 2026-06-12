import { format, parseISO } from 'date-fns';

/**
 * Asia/Karachi is a fixed UTC+5 zone (no DST). We format every stored
 * timestamp through this helper so display is pinned to Karachi time,
 * regardless of the device's current timezone.
 *
 * All `timestamptz` rows we write from the client now include the local
 * timezone offset, so the underlying UTC moment is correct. The job here
 * is purely display.
 */
const KARACHI_OFFSET_MINUTES = 5 * 60;

function toKarachi(value: string | Date): Date {
  const d = typeof value === 'string' ? parseISO(value) : value;
  // Shift the underlying epoch so that calling Date.UTC-based getters returns
  // Karachi wall-clock components. We then format with date-fns using the
  // 'UTC' style accessors via the standard format() helper, which reads the
  // local zone — but since we already pre-shifted, the local-zone read yields
  // Karachi numbers. To make this independent of the device tz, we add the
  // device's own offset on top so the cancellation works on any device.
  const deviceOffset = d.getTimezoneOffset(); // minutes, sign-flipped (UTC = -300 for PKT)
  // device wall-clock = utc - deviceOffset; we want karachi wall-clock = utc + 300.
  // So shift = karachiOffset - (-deviceOffset) = 300 + deviceOffset
  const shiftMinutes = KARACHI_OFFSET_MINUTES + deviceOffset;
  return new Date(d.getTime() + shiftMinutes * 60_000);
}

/** Format any timestamp (ISO string or Date) in Asia/Karachi wall-clock time. */
export function fmtKarachi(value: string | Date | null | undefined, pattern: string): string {
  if (value == null) return '';
  return format(toKarachi(value), pattern);
}

/** Current moment as an ISO-8601 string with explicit Karachi offset (+05:00). */
export function nowKarachiISO(): string {
  return format(toKarachi(new Date()), "yyyy-MM-dd'T'HH:mm:ss") + '+05:00';
}

/** Today's date in Karachi as 'yyyy-MM-dd' — useful for report query keys. */
export function todayKarachi(): string {
  return fmtKarachi(new Date(), 'yyyy-MM-dd');
}
