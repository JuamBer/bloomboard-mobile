/** "49 €" / "€49" — whole euros without decimals, cents when there are any
 *  (the web's features/billing/lib/pricing.ts). */
export function formatEuros(cents: number, language: string): string {
  try {
    return new Intl.NumberFormat(language === 'en' ? 'en-IE' : 'es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    // An engine without currency formatting: the same shape, by hand.
    const amount =
      cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
    return language === 'en' ? `€${amount}` : `${amount.replace('.', ',')} €`;
  }
}

/** "2026-10-03" for a local date — what a date-only API field takes. */
export function toDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A date-only API value ("1990-05-17", or an ISO at midnight UTC) as a local
 *  date, so a birthday never shifts a day across time zones. */
export function fromDateOnly(
  value: string | null | undefined,
): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
