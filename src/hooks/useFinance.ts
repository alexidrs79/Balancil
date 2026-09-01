import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, type AnalyticsRange } from '../services/financeService';
import { authApi } from '../services/authService';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  transactions: ['transactions'] as const,
  recurringTransactions: ['recurring-transactions'] as const,
  recurringDrafts: ['recurring-drafts', 'pending'] as const,
  transfers: ['transfers'] as const,
  budgets: ['budgets'] as const,
  goals: ['goals'] as const,
  goalContributions: (goalId: string) => ['goals', goalId, 'contributions'] as const,
  analytics: (range: AnalyticsRange) =>
    ['analytics', range.months ?? null, range.from ?? null, range.to ?? null] as const,
  settings: ['settings'] as const,
  sessions: ['sessions'] as const,
  emailChange: ['settings', 'email-change'] as const,
};

export const useDashboard = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: financeApi.getDashboard });

export const useAccounts = () =>
  useQuery({ queryKey: queryKeys.accounts, queryFn: financeApi.getAccounts });

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: financeApi.getCategories });

export const useCategoryMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
  return {
    save: useMutation({ mutationFn: financeApi.saveCategory, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: financeApi.deleteCategory, onSuccess: invalidate }),
  };
};

export const useAccountMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    void queryClient.invalidateQueries({ queryKey: queryKeys.transfers });
    void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
  return {
    save: useMutation({ mutationFn: financeApi.saveAccount, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: financeApi.deleteAccount, onSuccess: invalidate }),
  };
};

export const useTransactions = () =>
  useQuery({ queryKey: queryKeys.transactions, queryFn: financeApi.getTransactions });

export const useRecurringTransactions = () =>
  useQuery({
    queryKey: queryKeys.recurringTransactions,
    queryFn: financeApi.getRecurringTransactions,
  });

export const useRecurringDrafts = () =>
  useQuery({ queryKey: queryKeys.recurringDrafts, queryFn: financeApi.getRecurringDrafts });

export const useRecurringMutations = () => {
  const queryClient = useQueryClient();
  const invalidateTemplates = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.recurringTransactions });
  const invalidateDrafts = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.recurringDrafts });
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
  return {
    save: useMutation({
      mutationFn: financeApi.saveRecurringTransaction,
      onSuccess: invalidateTemplates,
    }),
    remove: useMutation({
      mutationFn: financeApi.deleteRecurringTransaction,
      onSuccess: invalidateTemplates,
    }),
    post: useMutation({ mutationFn: financeApi.postRecurringDraft, onSuccess: invalidateDrafts }),
    skip: useMutation({ mutationFn: financeApi.skipRecurringDraft, onSuccess: invalidateDrafts }),
  };
};

export const useTransfers = () =>
  useQuery({ queryKey: queryKeys.transfers, queryFn: financeApi.getTransfers });

export const useTransferMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.transfers });
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
  return {
    save: useMutation({ mutationFn: financeApi.saveTransfer, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: financeApi.deleteTransfer, onSuccess: invalidate }),
  };
};

export const useTransactionMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
  };
  return {
    save: useMutation({ mutationFn: financeApi.saveTransaction, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: financeApi.deleteTransaction, onSuccess: invalidate }),
  };
};

export const useBudgets = () =>
  useQuery({ queryKey: queryKeys.budgets, queryFn: financeApi.getBudgets });

export const useBudgetMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
  return {
    save: useMutation({ mutationFn: financeApi.saveBudget, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: financeApi.deleteBudget, onSuccess: invalidate }),
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
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    if (goalId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions(goalId) });
    }
  };
  return {
    add: useMutation({ mutationFn: financeApi.addGoalContribution, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: financeApi.deleteGoalContribution, onSuccess: invalidate }),
  };
};

export const useGoalMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
  return {
    save: useMutation({ mutationFn: financeApi.saveGoal, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: financeApi.deleteGoal, onSuccess: invalidate }),
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
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
  return {
    profile: useMutation({ mutationFn: financeApi.updateProfile, onSuccess: invalidate }),
    profileImage: useMutation({ mutationFn: financeApi.uploadProfileImage, onSuccess: invalidate }),
    removeProfileImage: useMutation({
      mutationFn: financeApi.removeProfileImage,
      onSuccess: invalidate,
    }),
    preferences: useMutation({
      mutationFn: financeApi.updatePreferences,
      onSuccess: invalidate,
    }),
    password: useMutation({ mutationFn: financeApi.changePassword }),
    revokeSession: useMutation({
      mutationFn: financeApi.revokeSession,
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessions }),
    }),
    revokeOtherSessions: useMutation({
      mutationFn: financeApi.revokeOtherSessions,
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessions }),
    }),
    requestEmailChange: useMutation({
      mutationFn: financeApi.requestEmailChange,
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.emailChange }),
    }),
    cancelEmailChange: useMutation({
      mutationFn: financeApi.cancelEmailChange,
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.emailChange }),
    }),
    destroy: useMutation({ mutationFn: (password: string) => authApi.deleteAccount(password) }),
  };
};
