import { describe, expect, it } from 'vitest';
import type { Budget, TransactionFilters } from '../types';
import {
  budgetPercentage,
  budgetStatus,
  formatDate,
  formatDateInput,
  goalProgress,
  hiddenTransactionFilterCount,
  relativeBarWidth,
  savingsRate,
  monthsUntil,
  averageAcrossWindow,
  latestChangeLabel,
} from './finance';

const baseFilters: TransactionFilters = {
  search: '',
  categoryId: '',
  accountId: '',
  type: '',
  dateFrom: '',
  dateTo: '',
  sort: 'newest',
};

describe('date formatting', () => {
  it('uses the requested reporting timezone for date input defaults', () => {
    const instant = new Date('2026-09-01T01:00:00Z');

    expect(formatDateInput(instant, 'America/Los_Angeles')).toBe('2026-08-31');
    expect(formatDateInput(instant, 'Asia/Tehran')).toBe('2026-09-01');
  });

  it('does not shift date-only ledger values into an adjacent day', () => {
    expect(formatDate('2026-09-01', { year: 'numeric', month: '2-digit', day: '2-digit' })).toBe(
      '09/01/2026',
    );
  });
});

describe('budget helpers', () => {
  const healthy: Budget = { id: 'b1', categoryId: 'food', limit: 500, spent: 200 };
  const warning: Budget = { id: 'b2', categoryId: 'food', limit: 500, spent: 420 };
  const exceeded: Budget = { id: 'b3', categoryId: 'food', limit: 500, spent: 560 };

  it('calculates budget percentage safely', () => {
    expect(budgetPercentage(healthy)).toBe(40);
    expect(budgetPercentage({ spent: 10, limit: 0 })).toBe(0);
  });

  it('classifies budget status thresholds', () => {
    expect(budgetStatus(healthy)).toBe('healthy');
    expect(budgetStatus(warning)).toBe('warning');
    expect(budgetStatus(exceeded)).toBe('exceeded');
  });
});

describe('goalProgress', () => {
  it('caps progress at 100 percent', () => {
    expect(goalProgress({ saved: 800, target: 1000 })).toBe(80);
    expect(goalProgress({ saved: 1500, target: 1000 })).toBe(100);
    expect(goalProgress({ saved: 10, target: 0 })).toBe(0);
  });
});

describe('savingsRate', () => {
  it('returns zero when there is no income', () => {
    expect(savingsRate(0, 0)).toBe(0);
    expect(savingsRate(0, 10)).toBe(0);
  });

  it('rounds the kept share of income', () => {
    expect(savingsRate(5300, 3453.7)).toBe(65);
  });
});

describe('monthsUntil', () => {
  const now = new Date('2026-09-01T12:00:00');

  it('counts calendar months and keeps a one-month floor', () => {
    expect(monthsUntil('2026-09-30', now)).toBe(1);
    expect(monthsUntil('2026-12-01', now)).toBe(3);
    expect(monthsUntil('2026-08-01', now)).toBe(1);
  });
});

describe('averageAcrossWindow', () => {
  it('divides by every month in the window, including zeros', () => {
    expect(averageAcrossWindow([])).toBe(0);
    expect(averageAcrossWindow([0, 0, 0, 0, 5200, 0])).toBeCloseTo(5200 / 6);
  });
});

describe('latestChangeLabel', () => {
  it('does not call a jump from zero no change', () => {
    expect(latestChangeLabel(0, 0)).toBe('No change');
    expect(latestChangeLabel(1800, 0)).toBe('From zero');
    expect(latestChangeLabel(0, 1800)).toBe('−100.0%');
    expect(latestChangeLabel(1800, 1800)).toBe('No change');
  });
});

describe('hiddenTransactionFilterCount', () => {
  it('counts only filters hidden behind More filters', () => {
    expect(hiddenTransactionFilterCount(baseFilters)).toBe(0);
    expect(
      hiddenTransactionFilterCount({
        ...baseFilters,
        type: 'expense',
        sort: 'highest',
        search: 'metro',
      }),
    ).toBe(0);
    expect(
      hiddenTransactionFilterCount({
        ...baseFilters,
        categoryId: 'food',
        status: 'pending',
        dateFrom: '2026-08-01',
      }),
    ).toBe(3);
  });
});

describe('relativeBarWidth', () => {
  it('keeps tiny positive values visible and caps oversized values', () => {
    expect(relativeBarWidth(0, 100)).toBe(0);
    expect(relativeBarWidth(0.01, 100)).toBe(1.5);
    expect(relativeBarWidth(50, 100)).toBe(50);
    expect(relativeBarWidth(100, 100)).toBe(100);
    expect(relativeBarWidth(120, 100)).toBe(100);
  });
});
