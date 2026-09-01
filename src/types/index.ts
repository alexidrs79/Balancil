export type AccountType = 'checking' | 'savings' | 'credit' | 'cash';
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type TransactionSort = 'newest' | 'oldest' | 'highest' | 'lowest';
export type BudgetStatus = 'healthy' | 'warning' | 'exceeded';

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  currency: string;
  locale?: string;
  timezone?: string;
  weekStart?: 'mon' | 'sun';
  profileImageUrl?: string | null;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type?: TransactionType;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  /** Balance entered when the account was created, before any recorded activity. */
  openingBalance?: number;
  /** Net effect of every completed transaction and transfer on this account. */
  netActivity?: number;
  institution: string;
  color: string;
  isActive?: boolean;
}

export interface Transaction {
  id: string;
  merchant: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  date: string;
  status: TransactionStatus;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description: string;
  status: TransactionStatus;
}

export interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  spent: number;
  period?: 'weekly' | 'monthly' | 'yearly';
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  color: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  note: string | null;
}

export interface TransactionFilters {
  search?: string;
  categoryId?: string;
  accountId?: string;
  type?: '' | TransactionType;
  status?: '' | TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  sort?: TransactionSort;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: string;
}

export interface UserSettings {
  user: User;
}

export interface Session {
  id: number;
  name: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  isCurrent: boolean;
}

export interface EmailChangeRequest {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string | null;
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  accountId: string;
  categoryId: string;
  merchant: string;
  description: string;
  amount: number;
  type: TransactionType;
  frequency: RecurringFrequency;
  interval: number;
  startDate: string;
  nextDueDate: string;
  endDate: string | null;
  isActive: boolean;
}

export interface RecurringDueDraft {
  id: string;
  templateId: string;
  dueDate: string;
  payload: Omit<Transaction, 'id'>;
  status: 'pending' | 'posted' | 'skipped';
  transactionId: string | null;
  reviewedAt: string | null;
}

export interface MonthlyTrendPoint {
  month: string;
  /** `YYYY-MM`. Always sent: both the dashboard and analytics payloads come from the
      same backend service method. */
  period: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface FinanceSummary {
  income: number;
  expenses: number;
  savings: number;
}

export interface CategorySpending {
  categoryId: string;
  amount: number;
  percentage: number;
}

export interface AnalyticsData {
  summary: FinanceSummary;
  monthlyTrend: MonthlyTrendPoint[];
  categorySpending: CategorySpending[];
  savingsRate: number;
  range: {
    from: string;
    to: string;
  };
}

export interface DashboardData {
  user: User;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  monthlyTrend: MonthlyTrendPoint[];
  categorySpending: CategorySpending[];
  summary: FinanceSummary;
}
