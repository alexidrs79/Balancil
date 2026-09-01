import { formatDate } from '../../utils/finance';

export const chartColors = {
  income: 'var(--chart-income)',
  expense: 'var(--chart-expense)',
};

export function formatAnalyticsMonth(value: string, includeYear: boolean) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const [year, month] = value.split('-').map(Number);
  return formatDate(new Date(year, month - 1, 1), {
    month: 'short',
    year: includeYear ? '2-digit' : undefined,
  });
}

export function shortDate(value: string) {
  return formatDate(value, {
    month: 'short',
    day: 'numeric',
  });
}
