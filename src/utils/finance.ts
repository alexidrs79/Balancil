import type {
  Budget,
  BudgetStatus,
  FinanceSummary,
  Goal,
  Transaction,
  TransactionFilters,
} from '../types';
import { formatDateInput } from './currency';

export { formatCompactCurrency, formatCurrency, formatDate, formatDateInput } from './currency';

export const budgetPercentage = (budget: Pick<Budget, 'spent' | 'limit'>) =>
  budget.limit <= 0 ? 0 : Math.round((budget.spent / budget.limit) * 100);

export const budgetStatus = (budget: Pick<Budget, 'spent' | 'limit'>): BudgetStatus => {
  const percentage = budgetPercentage(budget);
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 80) return 'warning';
  return 'healthy';
};

export const calculateSummary = (transactions: Transaction[]): FinanceSummary =>
  transactions.reduce(
    (summary, transaction) => {
      if (transaction.status !== 'completed') return summary;
      if (transaction.type === 'income') summary.income += transaction.amount;
      else summary.expenses += transaction.amount;
      summary.savings = summary.income - summary.expenses;
      return summary;
    },
    { income: 0, expenses: 0, savings: 0 },
  );

export const filterTransactions = (transactions: Transaction[], filters: TransactionFilters) => {
  const search = filters.search?.trim().toLowerCase() ?? '';
  return transactions
    .filter((transaction) => {
      const transactionDate = transaction.date.slice(0, 10);
      const matchesSearch =
        !search ||
        transaction.merchant.toLowerCase().includes(search) ||
        transaction.description.toLowerCase().includes(search);
      return (
        matchesSearch &&
        (!filters.categoryId || transaction.categoryId === filters.categoryId) &&
        (!filters.accountId || transaction.accountId === filters.accountId) &&
        (!filters.type || transaction.type === filters.type) &&
        (!filters.status || transaction.status === filters.status) &&
        (!filters.dateFrom || transactionDate >= filters.dateFrom) &&
        (!filters.dateTo || transactionDate <= filters.dateTo)
      );
    })
    .sort((a, b) => {
      if (filters.sort === 'oldest') return a.date.localeCompare(b.date);
      if (filters.sort === 'highest') return b.amount - a.amount;
      if (filters.sort === 'lowest') return a.amount - b.amount;
      return b.date.localeCompare(a.date);
    });
};

export const goalProgress = (goal: Pick<Goal, 'saved' | 'target'>) =>
  goal.target <= 0 ? 0 : Math.min(100, Math.round((goal.saved / goal.target) * 100));

export const savingsRate = (income: number, savings: number) =>
  income > 0 ? Math.round((savings / income) * 100) : 0;

/** Calendar-month steps from today to the deadline. A due date this month still needs one month of pace. */
export function monthsUntil(deadline: string, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(deadline);
  if (!match) return 1;
  const [, targetYear, targetMonth] = match.map(Number);
  const [currentYear, currentMonth] = formatDateInput(now).split('-').map(Number);
  const months = (targetYear - currentYear) * 12 + targetMonth - currentMonth;
  return Math.max(months, 1);
}

export function averageAcrossWindow(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function latestChangeLabel(current: number, previous: number) {
  if (previous === 0 && current === 0) return 'No change';
  if (previous === 0) return 'From zero';
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.05) return 'No change';
  return `${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}%`;
}

export const relativeBarWidth = (value: number, maximum: number, minimumVisible = 1.5) => {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || value <= 0 || maximum <= 0) return 0;
  return Math.min(100, Math.max(minimumVisible, (value / maximum) * 100));
};

/** Filters that live behind “More filters”, not the always-visible Type/Sort controls. */
export const hiddenTransactionFilterCount = (filters: TransactionFilters) =>
  [filters.categoryId, filters.accountId, filters.status, filters.dateFrom, filters.dateTo].filter(
    Boolean,
  ).length;

export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function paginate<T>(items: T[], page = 1, pageSize = 10): PaginationResult<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems: items.length,
    totalPages,
  };
}
