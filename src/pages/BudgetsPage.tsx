import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash } from '../components/icons';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LedgerList,
  LedgerRow,
  Modal,
  PageHeader,
  Progress,
  Skeleton,
  Select,
  StatusPill,
  useToast,
} from '../components/ui';
import { CategoryMark } from '../components/visuals';
import { useBudgetMutations, useBudgets, useCategories } from '../hooks/useFinance';
import type { Budget } from '../types';
import { budgetPercentage, budgetStatus, formatCurrency } from '../utils/finance';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Choose a category'),
  limit: z.number().positive('Enter a positive limit'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
});

export function BudgetsPage() {
  const { data = [], isLoading, isError } = useBudgets();
  const { data: categories = [] } = useCategories();
  const mutations = useBudgetMutations();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<{ id: string; label: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { categoryId: '', limit: undefined, period: 'monthly' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await mutations.save.mutateAsync({ ...values, id: editingBudget?.id });
      reset();
      setOpen(false);
      setEditingBudget(null);
      notify(editingBudget ? 'Budget updated' : 'Budget created');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Budget could not be saved', 'error');
    }
  });

  const openBudget = (budget?: Budget) => {
    setEditingBudget(budget ?? null);
    reset(
      budget
        ? {
            categoryId: budget.categoryId,
            limit: budget.limit,
            period: budget.period ?? 'monthly',
          }
        : { categoryId: '', limit: undefined, period: 'monthly' },
    );
    setOpen(true);
  };

  const closeBudget = () => {
    setOpen(false);
    setEditingBudget(null);
  };

  const removeBudget = async () => {
    if (!deletingBudget) return;
    try {
      await mutations.remove.mutateAsync(deletingBudget.id);
      notify('Budget removed');
      setDeletingBudget(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Budget could not be removed', 'error');
    }
  };
  const attentionCount = data.filter((budget) => budgetStatus(budget) !== 'healthy').length;

  if (isLoading || isError) {
    return (
      <div className="page product-page budgets-page">
        <PageHeader
          eyebrow="Planning"
          title="Budgets"
          description="Category limits, current-period spending, and what needs attention."
        />
        {isLoading ? (
          <div className="management-loading" aria-busy="true">
            <span className="sr-only">Loading budgets</span>
            {[1, 2, 3, 4].map((item) => (
              <Skeleton className="management-skeleton-row" key={item} />
            ))}
          </div>
        ) : (
          <Card className="error-state" role="alert">
            <h2>Budgets are unavailable</h2>
            <p>Refresh and try again.</p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="page product-page budgets-page">
      <PageHeader
        eyebrow="Planning"
        title="Budgets"
        description="Category limits, current-period spending, and what needs attention."
      />

      {!data.length ? (
        <EmptyState
          title="Start your first budget"
          description="Set a category limit for a weekly, monthly, or yearly period."
          action={
            <Button onClick={() => openBudget()}>
              <Plus size={16} />
              Create budget
            </Button>
          }
        />
      ) : (
        <section className="surface-panel balancil-box budget-ledger-section">
          <header className="data-heading">
            <div>
              <p className="data-label">Current budget periods</p>
              <h2>Category limits</h2>
              <p className="data-detail">Color appears only when a category needs attention.</p>
            </div>
            <Button className="inline-action" onClick={() => openBudget()}>
              <Plus size={16} />
              Create budget
            </Button>
          </header>
          <p className="budget-attention-label">
            {attentionCount} {attentionCount === 1 ? 'category needs' : 'categories need'} attention
          </p>
          <LedgerList className="budget-ledger-list" aria-label="Budgets by category and period">
            {data.map((budget) => {
              const category = categories.find((item) => item.id === budget.categoryId);
              const percentage = Math.round(budgetPercentage(budget));
              const status = budgetStatus(budget);
              const left = budget.limit - budget.spent;
              return (
                <LedgerRow
                  className={`budget-ledger-row ${status}`}
                  aria-label={`${category?.name ?? 'Unknown category'}, ${percentage}% used, ${formatCurrency(left)} ${left < 0 ? 'over limit' : 'remaining'}`}
                  key={budget.id}
                >
                  <div className="budget-row-identity">
                    <CategoryMark icon={category?.icon} color={category?.color} />
                    <span>
                      <strong>{category?.name ?? 'Unknown category'}</strong>
                      <small>
                        <span className="capitalize">{budget.period ?? 'monthly'}</span> ·{' '}
                        {formatCurrency(budget.spent)} spent of {formatCurrency(budget.limit)}
                      </small>
                    </span>
                  </div>
                  <div className="budget-row-progress">
                    <div className="budget-utilization">
                      <Progress
                        value={percentage}
                        color={
                          status === 'exceeded'
                            ? 'var(--danger)'
                            : status === 'warning'
                              ? 'var(--attention)'
                              : 'var(--brand-2)'
                        }
                        label={`${category?.name ?? 'Budget'} utilization`}
                      />
                      <span>{percentage}% used</span>
                    </div>
                    <StatusPill
                      tone={
                        status === 'exceeded'
                          ? 'negative'
                          : status === 'warning'
                            ? 'attention'
                            : 'positive'
                      }
                    >
                      {status === 'exceeded'
                        ? 'Over limit'
                        : status === 'warning'
                          ? 'Attention'
                          : 'On track'}
                    </StatusPill>
                  </div>
                  <strong className={`budget-row-remaining ${left < 0 ? 'negative' : ''}`}>
                    {formatCurrency(left)}
                    <small>{left < 0 ? 'over limit' : 'remaining'}</small>
                  </strong>
                  <div className="row-actions">
                    <Button
                      variant="ghost"
                      aria-label={`Edit ${category?.name ?? 'category'} budget`}
                      onClick={() => openBudget(budget)}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`Delete ${category?.name ?? 'category'} budget`}
                      disabled={mutations.remove.isPending}
                      onClick={() =>
                        setDeletingBudget({
                          id: budget.id,
                          label: category?.name ?? 'this category',
                        })
                      }
                    >
                      <Trash size={15} />
                    </Button>
                  </div>
                </LedgerRow>
              );
            })}
          </LedgerList>
        </section>
      )}

      <Modal
        open={open}
        onClose={closeBudget}
        title={editingBudget ? 'Edit budget' : 'Create a budget'}
        description="Set a spending limit and reporting period for a category."
      >
        <form className="form-grid" onSubmit={submit}>
          <label className="field-control span-2">
            Category
            <Select
              aria-invalid={Boolean(errors.categoryId)}
              aria-describedby={errors.categoryId ? 'budget-category-error' : undefined}
              {...register('categoryId')}
            >
              <option value="">Choose a category</option>
              {categories
                .filter((category) => category.type === 'expense')
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </Select>
            {errors.categoryId && (
              <small className="field-error" id="budget-category-error">
                {errors.categoryId.message}
              </small>
            )}
          </label>
          <label className="field-control">
            Spending limit
            <input
              aria-invalid={Boolean(errors.limit)}
              aria-describedby={errors.limit ? 'budget-limit-error' : undefined}
              {...register('limit', { valueAsNumber: true })}
              inputMode="decimal"
            />
            {errors.limit && (
              <small className="field-error" id="budget-limit-error">
                {errors.limit.message}
              </small>
            )}
          </label>
          <label className="field-control">
            Period
            <Select {...register('period')}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </label>
          <footer className="form-actions span-2">
            <Button variant="secondary" type="button" onClick={closeBudget}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutations.save.isPending}>
              {mutations.save.isPending
                ? 'Saving…'
                : editingBudget
                  ? 'Save budget'
                  : 'Create budget'}
            </Button>
          </footer>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(deletingBudget)}
        onClose={() => setDeletingBudget(null)}
        onConfirm={removeBudget}
        title="Delete budget?"
        description="This action cannot be undone."
        confirmLabel="Delete budget"
        pending={mutations.remove.isPending}
      >
        <p>
          Delete the budget for <strong>{deletingBudget?.label}</strong>? The category and its
          transactions are not affected.
        </p>
      </ConfirmDialog>
    </div>
  );
}
