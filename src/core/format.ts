/** Pure date/number formatting helpers shared by engine, UI and scripts. */

const MS_PER_DAY = 86_400_000;

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.max(0, Math.round((Date.parse(toISO) - Date.parse(fromISO)) / MS_PER_DAY));
}

export function formatLifespan(days: number): string {
  if (days < 1) return 'less than a day';
  if (days === 1) return '1 day';
  if (days < 60) return `${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30.4);
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  const years = days / 365.25;
  const rounded = Math.round(years * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} year${rounded === 1 ? '' : 's'}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "March 31, 2024" — or "May 2026" when the date is approximate. */
export function formatDate(iso: string, approx = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m) return iso;
  return approx ? `${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatMoney(usd: number): string {
  if (usd >= 1000) {
    const k = usd / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${Math.round(usd)}`;
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

/** Days from now (ISO) until a target ISO date; negative if past. */
export function daysUntil(targetISO: string, nowISO: string): number {
  return Math.ceil((Date.parse(targetISO) - Date.parse(nowISO)) / MS_PER_DAY);
}
