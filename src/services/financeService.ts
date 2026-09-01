import { apiClient } from '../api/client';
import type {
  Account,
  AnalyticsData,
  Budget,
  Category,
  DashboardData,
  Goal,
  GoalContribution,
  RecurringDueDraft,
  RecurringTransaction,
  EmailChangeRequest,
  Session,
  Transaction,
  Transfer,
  UserSettings,
} from '../types';

const get = async <T>(url: string) => (await apiClient.get<T>(url)).data;
const remove = async (url: string) => {
  await apiClient.delete(url);
};

export type AccountInput = Omit<Account, 'id' | 'balance'> & {
  id?: string;
  balance?: number;
};
export type CategoryInput = Omit<Category, 'id'> & { id?: string };
export type TransactionInput = Omit<Transaction, 'id'> & { id?: string };
export type TransferInput = Omit<Transfer, 'id'> & { id?: string };
export type BudgetInput = Omit<Budget, 'id' | 'spent'> & { id?: string };
export type GoalInput = Omit<Goal, 'id'> & { id?: string };
export type RecurringTransactionInput = Omit<RecurringTransaction, 'id' | 'nextDueDate'> & {
  id?: string;
  nextDueDate?: string;
};
export type AnalyticsRange = {
  months?: number;
  from?: string;
  to?: string;
};

export const financeApi = {
  getDashboard: () => get<DashboardData>('/dashboard'),
  getAccounts: () => get<Account[]>('/accounts'),
  getCategories: () => get<Category[]>('/categories'),
  getTransactions: () => get<Transaction[]>('/transactions'),
  getRecurringTransactions: () => get<RecurringTransaction[]>('/recurring-transactions'),
  getRecurringDrafts: () => get<RecurringDueDraft[]>('/recurring-drafts/pending'),
  getTransfers: () => get<Transfer[]>('/transfers'),
  getBudgets: () => get<Budget[]>('/budgets'),
  getGoals: () => get<Goal[]>('/goals'),
  getGoalContributions: (goalId: string) =>
    get<GoalContribution[]>(`/goals/${goalId}/contributions`),
  getAnalytics: (range: AnalyticsRange = { months: 6 }) => {
    const params = new URLSearchParams();
    if (range.from && range.to) {
      params.set('from', range.from);
      params.set('to', range.to);
    } else {
      params.set('months', String(range.months ?? 6));
    }
    return get<AnalyticsData>(`/analytics?${params.toString()}`);
  },

  async saveAccount(account: AccountInput) {
    const { data } = account.id
      ? await apiClient.put<Account>(`/accounts/${account.id}`, account)
      : await apiClient.post<Account>('/accounts', account);
    return data;
  },
  deleteAccount: (id: string) => remove(`/accounts/${id}`),

  async saveCategory(category: CategoryInput) {
    const { data } = category.id
      ? await apiClient.put<Category>(`/categories/${category.id}`, category)
      : await apiClient.post<Category>('/categories', category);
    return data;
  },
  deleteCategory: (id: string) => remove(`/categories/${id}`),

  async saveTransaction(transaction: TransactionInput) {
    const { data } = transaction.id
      ? await apiClient.put<Transaction>(`/transactions/${transaction.id}`, transaction)
      : await apiClient.post<Transaction>('/transactions', transaction);
    return data;
  },
  async deleteTransaction(id: string) {
    await remove(`/transactions/${id}`);
    return id;
  },

  async saveTransfer(transfer: TransferInput) {
    const { data } = transfer.id
      ? await apiClient.put<Transfer>(`/transfers/${transfer.id}`, transfer)
      : await apiClient.post<Transfer>('/transfers', transfer);
    return data;
  },
  async deleteTransfer(id: string) {
    await remove(`/transfers/${id}`);
    return id;
  },
  async saveRecurringTransaction(template: RecurringTransactionInput) {
    const { data } = template.id
      ? await apiClient.put<RecurringTransaction>(
          `/recurring-transactions/${template.id}`,
          template,
        )
      : await apiClient.post<RecurringTransaction>('/recurring-transactions', template);
    return data;
  },
  deleteRecurringTransaction: (id: string) => remove(`/recurring-transactions/${id}`),
  async postRecurringDraft(input: {
    id: string;
    overrides?: Partial<Omit<Transaction, 'id' | 'status'>>;
  }) {
    return (
      await apiClient.post<RecurringDueDraft>(
        `/recurring-drafts/${input.id}/post`,
        input.overrides ?? {},
      )
    ).data;
  },
  async skipRecurringDraft(id: string) {
    return (await apiClient.post<RecurringDueDraft>(`/recurring-drafts/${id}/skip`)).data;
  },

  async saveBudget(budget: BudgetInput) {
    const { data } = budget.id
      ? await apiClient.put<Budget>(`/budgets/${budget.id}`, budget)
      : await apiClient.post<Budget>('/budgets', budget);
    return data;
  },
  deleteBudget: (id: string) => remove(`/budgets/${id}`),

  async saveGoal(goal: GoalInput) {
    const { data } = goal.id
      ? await apiClient.put<Goal>(`/goals/${goal.id}`, goal)
      : await apiClient.post<Goal>('/goals', goal);
    return data;
  },
  deleteGoal: (id: string) => remove(`/goals/${id}`),
  async addGoalContribution(input: {
    goalId: string;
    amount: number;
    date: string;
    note?: string;
  }) {
    const { goalId, ...payload } = input;
    return (await apiClient.post<GoalContribution>(`/goals/${goalId}/contributions`, payload)).data;
  },
  async deleteGoalContribution(input: { goalId: string; contributionId: string }) {
    await remove(`/goals/${input.goalId}/contributions/${input.contributionId}`);
    return input.contributionId;
  },

  getSettings: () => get<UserSettings>('/settings'),
  async updateProfile(profile: { name: string }) {
    return (await apiClient.put<UserSettings>('/settings/profile', profile)).data;
  },
  async uploadProfileImage(image: File) {
    const form = new FormData();
    form.append('image', image);
    return (await apiClient.post<UserSettings>('/settings/profile-image', form)).data;
  },
  async removeProfileImage() {
    return (await apiClient.delete<UserSettings>('/settings/profile-image')).data;
  },
  async updatePreferences(preferences: {
    currency: string;
    locale: string;
    timezone: string;
    weekStart: 'mon' | 'sun';
  }) {
    return (await apiClient.put<UserSettings>('/settings/preferences', preferences)).data;
  },
  getSessions: () => get<Session[]>('/sessions'),
  async revokeSession(id: number) {
    await remove(`/sessions/${id}`);
    return id;
  },
  revokeOtherSessions: () => remove('/sessions/others'),
  async requestEmailChange(input: { email: string; currentPassword: string }) {
    return (
      await apiClient.post<{ emailChange: EmailChangeRequest }>('/settings/email-change', input)
    ).data.emailChange;
  },
  async getEmailChange() {
    return (
      await apiClient.get<{ emailChange: EmailChangeRequest | null }>('/settings/email-change')
    ).data.emailChange;
  },
  cancelEmailChange: () => remove('/settings/email-change'),
  async changePassword(input: {
    currentPassword: string;
    password: string;
    passwordConfirmation: string;
  }) {
    return (
      await apiClient.put<{ message: string }>('/settings/password', {
        currentPassword: input.currentPassword,
        password: input.password,
        password_confirmation: input.passwordConfirmation,
      })
    ).data;
  },
};
