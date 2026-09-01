let activeCurrency = 'USD';
let activeLocale = 'en-US';
let activeTimeZone = 'UTC';

export function setActiveCurrency(currency: string) {
  activeCurrency = currency || 'USD';
}

export function setActiveLocale(locale: string) {
  activeLocale = locale || 'en-US';
}

export function setActiveTimeZone(timeZone: string) {
  activeTimeZone = timeZone || 'UTC';
}

export function formatCurrency(
  value: number,
  currency = activeCurrency,
  options: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat(activeLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly
    ? new Date(`${value}T12:00:00Z`)
    : typeof value === 'string'
      ? new Date(value)
      : value;
  return new Intl.DateTimeFormat(activeLocale, {
    timeZone: dateOnly ? 'UTC' : activeTimeZone,
    ...options,
  }).format(date);
}

/** The current calendar date in the user's reporting timezone, suitable for date inputs. */
export function formatDateInput(value = new Date(), timeZone = activeTimeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatCompactCurrency(value: number, currency = activeCurrency) {
  return formatCurrency(value, currency, {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}
