import type { Account, Budget, Category, Goal, Transaction } from '../types';

/**
 * Illustration figures for the public landing page only. They are not loaded into
 * a signed-in ledger and are not a substitute for the user's own records.
 */
export const categories: Category[] = [
  { id: 'salary', name: 'Income', color: '#1a5c52', icon: 'briefcase', type: 'income' },
  { id: 'housing', name: 'Housing', color: '#7165a8', icon: 'home', type: 'expense' },
  { id: 'food', name: 'Food & dining', color: '#d28b38', icon: 'utensils', type: 'expense' },
  { id: 'transport', name: 'Transport', color: '#3689a8', icon: 'car', type: 'expense' },
  { id: 'shopping', name: 'Shopping', color: '#b75f7c', icon: 'bag', type: 'expense' },
  { id: 'software', name: 'Software', color: '#7760b0', icon: 'laptop', type: 'expense' },
];

export const accounts: Account[] = [
  {
    id: 'checking',
    name: 'Everyday Checking',
    type: 'checking',
    balance: 8420.5,
    institution: 'Harbor Trust',
    color: '#0f3d36',
    isActive: true,
  },
  {
    id: 'savings',
    name: 'Growth Savings',
    type: 'savings',
    balance: 12840.2,
    institution: 'Harbor Trust',
    color: '#c8e86a',
    isActive: true,
  },
  {
    id: 'credit',
    name: 'Platinum Card',
    type: 'credit',
    balance: -1240.35,
    institution: 'Ararat Credit',
    color: '#354052',
    isActive: true,
  },
  {
    id: 'cash',
    name: 'Cash Wallet',
    type: 'cash',
    balance: 380,
    institution: 'Personal',
    color: '#c8a96b',
    isActive: true,
  },
];

const today = new Date();
const date = (daysAgo: number) => {
  const value = new Date(today);
  value.setDate(value.getDate() - daysAgo);
  return value.toISOString().slice(0, 10);
};

function entry(
  id: string,
  merchant: string,
  description: string,
  amount: number,
  type: Transaction['type'],
  categoryId: string,
  accountId: string,
  daysAgo: number,
  status: Transaction['status'] = 'completed',
): Transaction {
  return {
    id,
    merchant,
    description,
    amount,
    type,
    categoryId,
    accountId,
    date: date(daysAgo),
    status,
  };
}

export const initialTransactions: Transaction[] = [
  entry('t1', 'Acme Studio', 'Monthly salary', 6800, 'income', 'salary', 'checking', 1),
  entry('t2', 'GUM Market', 'Weekly groceries', 86.42, 'expense', 'food', 'credit', 1),
  entry('t3', 'Notion', 'Team plan subscription', 18, 'expense', 'software', 'credit', 2),
  entry('t4', 'Cascade Residence', 'Monthly rent', 1650, 'expense', 'housing', 'checking', 6),
  entry('t5', 'Apple Store', 'Desk accessories', 189, 'expense', 'shopping', 'credit', 9),
  entry('t6', 'Yerevan Metro', 'Transit card refill', 24, 'expense', 'transport', 'checking', 4),
  entry('t7', 'Reebok', 'Running shoes', 128, 'expense', 'shopping', 'credit', 12),
  entry('t8', 'Cloudflare', 'Domain services', 24, 'expense', 'software', 'credit', 14),
];

export const initialBudgets: Budget[] = [
  { id: 'b1', categoryId: 'shopping', limit: 400, spent: 317, period: 'monthly' },
];

export const initialGoals: Goal[] = [
  {
    id: 'g1',
    name: 'New MacBook Pro',
    target: 2500,
    saved: 1450,
    deadline: '2026-12-15',
    color: '#D7F266',
  },
];
