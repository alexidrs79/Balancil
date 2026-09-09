import { describe, expect, it } from 'vitest';
import { balanceBreakdown } from './AccountsPage';
import type { Account } from '../../types';

function account(partial: Partial<Account>): Account {
  return {
    id: '1',
    name: 'Checking',
    type: 'checking',
    balance: 0,
    institution: 'Bank',
    color: '#123d34',
    isActive: true,
    ...partial,
  };
}

describe('balanceBreakdown', () => {
  it('shows opening alone when nothing has been recorded yet', () => {
    expect(
      balanceBreakdown(account({ openingBalance: 500, netActivity: 0, balance: 500 })),
    ).toBe('Opening $500.00');
  });

  it('explains a positive net movement', () => {
    expect(
      balanceBreakdown(account({ openingBalance: 100, netActivity: 1000, balance: 1100 })),
    ).toBe('Opening $100.00 · +$1,000.00 recorded');
  });

  it('explains a negative net movement', () => {
    expect(
      balanceBreakdown(account({ openingBalance: 2000, netActivity: -700, balance: 1300 })),
    ).toBe('Opening $2,000.00 · −$700.00 recorded');
  });

  it('hides the line when the API omitted the breakdown fields', () => {
    expect(balanceBreakdown(account({ balance: 100 }))).toBeNull();
  });
});
