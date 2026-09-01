import { formatDate as formatLocalizedDate } from '../../utils/finance';

export function formatDate(value: string) {
  return formatLocalizedDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
