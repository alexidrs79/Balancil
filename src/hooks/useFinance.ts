import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { financeApi, type AnalyticsRange } from '../services/financeService';
import type { TransactionQuery } from '../types';
import { authApi } from '../services/authService';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  transactions: ['transactions'] as const,
  transactionPage: (query: TransactionQuery) => ['transactions', query] as const,
  recurringTransactions: ['recurring-transactions'] as const,
  recurringDrafts: ['recurring-drafts', 'pending'] as const,
  transfers: ['transfers'] as const,
  budgets: ['budgets'] as const,
  goals: ['goals'] as const,
  goalContributions: (goalId: string) => ['goals', goalId, 'contributions'] as const,
  analytics: (range: AnalyticsRange) =>
    ['analytics', range.months ?? null, range.from ?? null, range.to ?? null] as const,
  analyticsPrefix: ['analytics'] as const,
  settings: ['settings'] as const,
  sessions: ['sessions'] as const,
  emailChange: ['settings', 'email-change'] as const,
};

function invalidate(queryClient: QueryClient, keys: readonly QueryKey[]) {
  for (const queryKey of keys) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

/** Views that change when a completed ledger entry is created, edited, or removed. */
const ledgerKeys: QueryKey[] = [
  queryKeys.transactions,
  queryKeys.accounts,
  queryKeys.dashboard,
  queryKeys.budgets,
  queryKeys.analyticsPrefix,
];

export const useDashboard = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: financeApi.getDashboard });

export const useAccounts = () =>
  useQuery({ queryKey: queryKeys.accounts, queryFn: financeApi.getAccounts });

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: financeApi.getCategories });

export const useCategoryMutations = () => {
  const queryClient = useQueryClient();
  const refresh = () =>
    invalidate(queryClient, [
      queryKeys.categories,
      queryKeys.dashboard,
      queryKeys.budgets,
      queryKeys.transactions,
      queryKeys.analyticsPrefix,
    ]);
  return {
    save: useMutation({ mutationFn: financeApi.saveCategory, onSuccess: refresh }),
    remove: useMutation({ mutationFn: financeApi.deleteCategory, onSuccess: refresh }),
  };
};

export const useAccountMutations = () => {
  const queryClient = useQueryClient();
  const refresh = () => invalidate(queryClient, [...ledgerKeys, queryKeys.transfers]);
  return {
    save: useMutation({ mutationFn: financeApi.saveAccount, onSuccess: refresh }),
    remove: useMutation({ mutationFn: financeApi.deleteAccount, onSuccess: refresh }),
  };
};

/**
 * Import touches balances, budgets and every derived view, so a successful run
 * refreshes the same things a manual entry would.
 */
export const useTransactionImport = () => {
  const queryClient = useQueryClient();
  return {
    preview: useMutation({ mutationFn: financeApi.previewTransactionImport }),
    commit: useMutation({
      mutationFn: financeApi.importTransactions,
      onSuccess: () => invalidate(queryClient, ledgerKeys),
    }),
  };
};

export const useTransactions = (query: TransactionQuery = {}) =>
  useQuery({
    queryKey: queryKeys.transactionPage(query),
    queryFn: () => financeApi.getTransactions(query),
    // Keep the previous page on screen while the next one loads, so paging and
    // filtering never flash an empty table.
    placeholderData: keepPreviousData,
  });

export const useRecurringTransactions = () =>
  useQuery({
    queryKey: queryKeys.recurringTransactions,
    queryFn: financeApi.getRecurringTransactions,
  });

export const useRecurringDrafts = () =>
  useQuery({ queryKey: queryKeys.recurringDrafts, queryFn: financeApi.getRecurringDrafts });

export const useRecurringMutations = () => {
  const queryClient = useQueryClient();
  const refreshTemplates = () => invalidate(queryClient, [queryKeys.recurringTransactions]);
  const refreshDrafts = () => invalidate(queryClient, [queryKeys.recurringDrafts, ...ledgerKeys]);
  return {
    save: useMutation({
      mutationFn: financeApi.saveRecurringTransaction,
      onSuccess: refreshTemplates,
    }),
    remove: useMutation({
      mutationFn: financeApi.deleteRecurringTransaction,
      onSuccess: refreshTemplates,
    }),
    post: useMutation({ mutationFn: financeApi.postRecurringDraft, onSuccess: refreshDrafts }),
    skip: useMutation({ mutationFn: financeApi.skipRecurringDraft, onSuccess: refreshDrafts }),
  };
};

export const useTransfers = () =>
  useQuery({ queryKey: queryKeys.transfers, queryFn: financeApi.getTransfers });

export const useTransferMutations = () => {
  const queryClient = useQueryClient();
  const refresh = () =>
    invalidate(queryClient, [queryKeys.transfers, queryKeys.accounts, queryKeys.dashboard]);
  return {
    save: useMutation({ mutationFn: financeApi.saveTransfer, onSuccess: refresh }),
    remove: useMutation({ mutationFn: financeApi.deleteTransfer, onSuccess: refresh }),
  };
};

export const useTransactionMutations = () => {
  const queryClient = useQueryClient();
  const refresh = () => invalidate(queryClient, ledgerKeys);
  return {
    save: useMutation({ mutationFn: financeApi.saveTransaction, onSuccess: refresh }),
    remove: useMutation({ mutationFn: financeApi.deleteTransaction, onSuccess: refresh }),
  };
};

export const useBudgets = () =>
  useQuery({ queryKey: queryKeys.budgets, queryFn: financeApi.getBudgets });

export const useBudgetMutations = () => {
  const queryClient = useQueryClient();
  const refresh = () => invalidate(queryClient, [queryKeys.budgets, queryKeys.dashboard]);
  return {
    save: useMutation({ mutationFn: financeApi.saveBudget, onSuccess: refresh }),
    remove: useMutation({ mutationFn: financeApi.deleteBudget, onSuccess: refresh }),
  };
};

export const useGoals = () => useQuery({ queryKey: queryKeys.goals, queryFn: financeApi.getGoals });

export const useGoalContributions = (goalId?: string) =>
  useQuery({
    queryKey: queryKeys.goalContributions(goalId ?? ''),
    queryFn: () => financeApi.getGoalContributions(goalId!),
    enabled: Boolean(goalId),
  });

export const useGoalContributionMutations = (goalId?: string) => {
  const queryClient = useQueryClient();
  const refresh = () =>
    invalidate(queryClient, [
      queryKeys.goals,
      queryKeys.dashboard,
      ...(goalId ? [queryKeys.goalContributions(goalId)] : []),
    ]);
  return {
    add: useMutation({ mutationFn: financeApi.addGoalContribution, onSuccess: refresh }),
    remove: useMutation({ mutationFn: financeApi.deleteGoalContribution, onSuccess: refresh }),
  };
};

export const useGoalMutations = () => {
  const queryClient = useQueryClient();
  const refresh = () => invalidate(queryClient, [queryKeys.goals, queryKeys.dashboard]);
  return {
    save: useMutation({ mutationFn: financeApi.saveGoal, onSuccess: refresh }),
    remove: useMutation({ mutationFn: financeApi.deleteGoal, onSuccess: refresh }),
  };
};

export const useAnalytics = (range: AnalyticsRange) =>
  useQuery({
    queryKey: queryKeys.analytics(range),
    queryFn: () => financeApi.getAnalytics(range),
  });

export const useSettings = () =>
  useQuery({ queryKey: queryKeys.settings, queryFn: financeApi.getSettings });

export const useSessions = () =>
  useQuery({ queryKey: queryKeys.sessions, queryFn: financeApi.getSessions });

export const useEmailChange = () =>
  useQuery({ queryKey: queryKeys.emailChange, queryFn: financeApi.getEmailChange });

export const useSettingsMutations = () => {
  const queryClient = useQueryClient();
  const refreshSettings = () => invalidate(queryClient, [queryKeys.settings, queryKeys.dashboard]);
  const refreshSessions = () => invalidate(queryClient, [queryKeys.sessions]);
  const refreshEmailChange = () => invalidate(queryClient, [queryKeys.emailChange]);
  return {
    profile: useMutation({ mutationFn: financeApi.updateProfile, onSuccess: refreshSettings }),
    profileImage: useMutation({
      mutationFn: financeApi.uploadProfileImage,
      onSuccess: refreshSettings,
    }),
    removeProfileImage: useMutation({
      mutationFn: financeApi.removeProfileImage,
      onSuccess: refreshSettings,
    }),
    preferences: useMutation({
      mutationFn: financeApi.updatePreferences,
      onSuccess: refreshSettings,
    }),
    password: useMutation({ mutationFn: financeApi.changePassword }),
    revokeSession: useMutation({
      mutationFn: financeApi.revokeSession,
      onSuccess: refreshSessions,
    }),
    revokeOtherSessions: useMutation({
      mutationFn: financeApi.revokeOtherSessions,
      onSuccess: refreshSessions,
    }),
    requestEmailChange: useMutation({
      mutationFn: financeApi.requestEmailChange,
      onSuccess: refreshEmailChange,
    }),
    cancelEmailChange: useMutation({
      mutationFn: financeApi.cancelEmailChange,
      onSuccess: refreshEmailChange,
    }),
    destroy: useMutation({ mutationFn: (password: string) => authApi.deleteAccount(password) }),
  };
};
