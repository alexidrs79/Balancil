import { zodResolver } from '@hookform/resolvers/zod';
import { Cards, ChevronRight, Lock, Pencil, Plus, Shield, Trash, User } from '../components/icons';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
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
  AnimatedValue,
  Select,
  StatusPill,
  useToast,
} from '../components/ui';
import { CategoryMark, GoalMark } from '../components/visuals';
import { useAuth } from '../contexts/AuthContext';
import {
  useBudgetMutations,
  useBudgets,
  useCategories,
  useGoalContributionMutations,
  useGoalContributions,
  useGoalMutations,
  useGoals,
  useEmailChange,
  useSessions,
  useSettings,
  useSettingsMutations,
} from '../hooks/useFinance';
import type { Budget, Goal, GoalContribution, UserSettings } from '../types';
import {
  budgetPercentage,
  budgetStatus,
  formatCurrency,
  formatDate,
  formatDateInput,
  goalProgress,
  monthsUntil,
} from '../utils/finance';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Choose a category'),
  limit: z.number().positive('Enter a positive limit'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
});

const goalSchema = z.object({
  name: z.string().min(2, 'Enter a goal name'),
  target: z.number().positive('Enter a positive target'),
  saved: z.number().min(0, 'Saved amount cannot be negative'),
  deadline: z.string().min(1, 'Choose a target date'),
  color: z.string(),
});

function formatDeadline(value: string) {
  return formatDate(value, {
    month: 'long',
    year: 'numeric',
  });
}

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

export function GoalsPage() {
  const { data = [], isLoading, isError } = useGoals();
  const mutations = useGoalMutations();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [fundingGoal, setFundingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<{ id: string; label: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      target: undefined,
      saved: 0,
      deadline: '',
      color: '#D7F266',
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await mutations.save.mutateAsync({
        ...values,
        id: editingGoal?.id,
      });
      reset();
      setOpen(false);
      setEditingGoal(null);
      notify(editingGoal ? 'Goal updated' : 'Goal created');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Goal could not be saved', 'error');
    }
  });

  const openGoal = (goal?: Goal) => {
    setEditingGoal(goal ?? null);
    reset(
      goal
        ? {
            name: goal.name,
            target: goal.target,
            saved: goal.saved,
            deadline: goal.deadline,
            color: goal.color,
          }
        : {
            name: '',
            target: undefined,
            saved: 0,
            deadline: '',
            color: '#D7F266',
          },
    );
    setOpen(true);
  };

  const closeGoal = () => {
    setOpen(false);
    setEditingGoal(null);
  };

  const removeGoal = async () => {
    if (!deletingGoal) return;
    try {
      await mutations.remove.mutateAsync(deletingGoal.id);
      notify('Goal removed');
      setDeletingGoal(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Goal could not be removed', 'error');
    }
  };
  const saved = data.reduce((sum, goal) => sum + goal.saved, 0);
  const target = data.reduce((sum, goal) => sum + goal.target, 0);
  const remaining = Math.max(target - saved, 0);
  const overallProgress = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  if (isLoading || isError) {
    return (
      <div className="page product-page goals-page">
        <PageHeader
          eyebrow="Planning"
          title="Savings goals"
          description="Progress, deadlines, and remaining amounts."
        />
        {isLoading ? (
          <div className="management-loading" aria-busy="true">
            <span className="sr-only">Loading goals</span>
            {[1, 2, 3].map((item) => (
              <Skeleton className="goal-skeleton-row" key={item} />
            ))}
          </div>
        ) : (
          <Card className="error-state" role="alert">
            <h2>Goals are unavailable</h2>
            <p>Refresh and try again.</p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="page product-page goals-page">
      <PageHeader
        eyebrow="Planning"
        title="Savings goals"
        description="Progress, deadlines, and remaining amounts."
      />

      <section
        className="financial-summary balancil-box goals-header-stat"
        aria-label="Goals summary"
      >
        <div>
          <span>Saved toward goals</span>
          <strong>
            <AnimatedValue value={saved} format={formatCurrency} />
          </strong>
          <div className="budget-summary-progress">
            <Progress value={overallProgress} label="Combined goal progress" />
            <small>{overallProgress}% of combined targets</small>
          </div>
        </div>
        <dl>
          <div>
            <dt>Combined target</dt>
            <dd>
              <AnimatedValue value={target} format={formatCurrency} />
            </dd>
            <small>
              Across {data.length} {data.length === 1 ? 'goal' : 'goals'}
            </small>
          </div>
          <div>
            <dt>Still to fund</dt>
            <dd>
              <AnimatedValue value={remaining} format={formatCurrency} />
            </dd>
            <small>{100 - overallProgress}% left to save</small>
          </div>
          <div>
            <dt>Active goals</dt>
            <dd>
              <AnimatedValue value={data.length} />
            </dd>
            <small>Currently being tracked</small>
          </div>
        </dl>
      </section>

      {!data.length ? (
        <EmptyState
          title="Create your first savings goal"
          description="Define a target and Balancil will make the remaining work clear."
          action={
            <Button onClick={() => openGoal()}>
              <Plus size={16} />
              New goal
            </Button>
          }
        />
      ) : (
        <section className="goal-list balancil-box" aria-label="Savings goals">
          <header className="goal-list-toolbar data-heading">
            <div>
              <p className="data-label">Recorded targets</p>
              <h2>
                {data.length} {data.length === 1 ? 'goal' : 'goals'}
              </h2>
            </div>
            <Button variant="secondary" className="inline-action" onClick={() => openGoal()}>
              <Plus size={16} />
              New goal
            </Button>
          </header>
          {data.map((goal) => {
            const progress = goalProgress(goal);
            const amountRemaining = Math.max(goal.target - goal.saved, 0);
            const complete = amountRemaining === 0;
            const overdue = !complete && new Date(`${goal.deadline}T23:59:59`) < new Date();
            const monthlyNeeded = amountRemaining / monthsUntil(goal.deadline);
            return (
              <article className="goal-row" key={goal.id}>
                <header>
                  <div className="goal-identity">
                    <GoalMark goal={goal} />
                    <div>
                      <p>Target by {formatDeadline(goal.deadline)}</p>
                      <h2>{goal.name}</h2>
                    </div>
                  </div>
                  <div className="row-actions">
                    <Button
                      variant="ghost"
                      aria-label={`Add contribution to ${goal.name}`}
                      onClick={() => setFundingGoal(goal)}
                    >
                      <Plus size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`Edit ${goal.name}`}
                      onClick={() => openGoal(goal)}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`Delete ${goal.name}`}
                      disabled={mutations.remove.isPending}
                      onClick={() => setDeletingGoal({ id: goal.id, label: goal.name })}
                    >
                      <Trash size={15} />
                    </Button>
                  </div>
                </header>
                <div className="goal-figures">
                  <div>
                    <span>Saved</span>
                    <strong>{formatCurrency(goal.saved)}</strong>
                  </div>
                  <div>
                    <span>Target</span>
                    <strong>{formatCurrency(goal.target)}</strong>
                  </div>
                  <div>
                    <span>Remaining</span>
                    <strong>{formatCurrency(amountRemaining)}</strong>
                  </div>
                  <div>
                    <span>{complete || overdue ? 'Status' : 'Monthly pace'}</span>
                    <strong>
                      {complete
                        ? 'Funded'
                        : overdue
                          ? 'Past target date'
                          : formatCurrency(monthlyNeeded)}
                    </strong>
                  </div>
                </div>
                <div className="goal-progress-row">
                  <Progress
                    value={progress}
                    color="var(--brand-2)"
                    label={`${goal.name} progress`}
                  />
                  <span>{progress}%</span>
                </div>
                <footer>
                  {complete
                    ? 'This goal is fully funded.'
                    : overdue
                      ? `The target date passed with ${formatCurrency(amountRemaining)} remaining.`
                      : `Save approximately ${formatCurrency(monthlyNeeded)} per month to finish by ${formatDeadline(goal.deadline)}.`}
                </footer>
              </article>
            );
          })}
        </section>
      )}

      <Modal
        open={open}
        onClose={closeGoal}
        title={editingGoal ? 'Edit savings goal' : 'Create a savings goal'}
        description="Set the target amount and deadline."
      >
        <form className="form-grid" onSubmit={submit}>
          <label className="field-control span-2">
            Goal name
            <input
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'goal-name-error' : undefined}
              {...register('name')}
              placeholder="e.g. New MacBook"
            />
            {errors.name && (
              <small className="field-error" id="goal-name-error">
                {errors.name.message}
              </small>
            )}
          </label>
          <label className="field-control">
            Target amount
            <input
              aria-invalid={Boolean(errors.target)}
              aria-describedby={errors.target ? 'goal-target-error' : undefined}
              {...register('target', { valueAsNumber: true })}
              inputMode="decimal"
            />
            {errors.target && (
              <small className="field-error" id="goal-target-error">
                {errors.target.message}
              </small>
            )}
          </label>
          {editingGoal ? (
            <div className="field-control">
              <span>Contributed</span>
              <p className="field-readout">{formatCurrency(editingGoal.saved)}</p>
              <small className="field-hint">Managed through contribution history.</small>
            </div>
          ) : (
            <label className="field-control">
              Starting contribution
              <input
                aria-invalid={Boolean(errors.saved)}
                aria-describedby={errors.saved ? 'goal-saved-error' : undefined}
                {...register('saved', { valueAsNumber: true })}
                inputMode="decimal"
              />
              {errors.saved && (
                <small className="field-error" id="goal-saved-error">
                  {errors.saved.message}
                </small>
              )}
            </label>
          )}
          <label className="field-control span-2">
            Target date
            <input
              type="date"
              aria-invalid={Boolean(errors.deadline)}
              aria-describedby={errors.deadline ? 'goal-deadline-error' : undefined}
              {...register('deadline')}
            />
            {errors.deadline && (
              <small className="field-error" id="goal-deadline-error">
                {errors.deadline.message}
              </small>
            )}
          </label>
          <label className="form-swatch span-2">
            <span>
              <strong>Goal color</strong>
              <small>Used for this goal&rsquo;s marker and progress bar.</small>
            </span>
            <input type="color" {...register('color')} />
          </label>
          <footer className="form-actions span-2">
            <Button type="button" variant="secondary" onClick={closeGoal}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutations.save.isPending}>
              {mutations.save.isPending ? 'Saving…' : editingGoal ? 'Save goal' : 'Create goal'}
            </Button>
          </footer>
        </form>
      </Modal>
      <GoalContributionsModal goal={fundingGoal} onClose={() => setFundingGoal(null)} />
      <ConfirmDialog
        open={Boolean(deletingGoal)}
        onClose={() => setDeletingGoal(null)}
        onConfirm={removeGoal}
        title="Delete savings goal?"
        description="This action cannot be undone."
        confirmLabel="Delete goal"
        pending={mutations.remove.isPending}
      >
        <p>
          Delete <strong>{deletingGoal?.label}</strong>? Its contribution history will also be
          removed.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function GoalContributionsModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { data: contributions = [], isLoading } = useGoalContributions(goal?.id);
  const mutations = useGoalContributionMutations(goal?.id);
  const notify = useToast();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(formatDateInput());
  const [note, setNote] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const contributed = contributions.reduce((total, contribution) => total + contribution.amount, 0);

  const addContribution = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goal) return;
    try {
      await mutations.add.mutateAsync({
        goalId: goal.id,
        amount,
        date,
        note: note.trim() || undefined,
      });
      setAmount(0);
      setNote('');
      notify('Contribution added');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Contribution could not be added', 'error');
    }
  };

  const removeContribution = async (contribution: GoalContribution) => {
    if (!goal) return;
    try {
      await mutations.remove.mutateAsync({
        goalId: goal.id,
        contributionId: contribution.id,
      });
      setPendingDeleteId(null);
      notify('Contribution removed');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Contribution could not be removed', 'error');
    }
  };

  return (
    <Modal
      open={Boolean(goal)}
      onClose={onClose}
      title={goal ? `Contribute to ${goal.name}` : 'Goal contributions'}
      description="Every entry becomes part of this goal’s progress history."
    >
      <form className="form-grid contribution-form" onSubmit={addContribution}>
        <label className="field-control">
          Amount
          <input
            required
            min="0.01"
            step="0.01"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </label>
        <label className="field-control">
          Date
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="field-control span-2">
          Note
          <input
            value={note}
            placeholder="Optional context"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <footer className="form-actions span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" disabled={mutations.add.isPending}>
            {mutations.add.isPending ? 'Adding…' : 'Add contribution'}
          </Button>
        </footer>
      </form>
      <section className="contribution-history" aria-label="Contribution history">
        <header>
          <strong>History</strong>
          <small>{formatCurrency(isLoading ? (goal?.saved ?? 0) : contributed)} contributed</small>
        </header>
        {isLoading ? (
          <Skeleton className="goal-skeleton-row" />
        ) : contributions.length ? (
          <ul>
            {contributions.map((contribution) => (
              <li key={contribution.id}>
                <div>
                  <strong>{formatCurrency(contribution.amount)}</strong>
                  <small>
                    {contribution.date}
                    {contribution.note ? ` · ${contribution.note}` : ''}
                  </small>
                </div>
                {pendingDeleteId === contribution.id ? (
                  <div className="contribution-confirm">
                    <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      disabled={mutations.remove.isPending}
                      onClick={() => void removeContribution(contribution)}
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    aria-label={`Delete ${formatCurrency(contribution.amount)} contribution`}
                    onClick={() => setPendingDeleteId(contribution.id)}
                  >
                    <Trash size={15} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No contributions recorded yet.</p>
        )}
      </section>
    </Modal>
  );
}

const settingSections = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Name and email address',
    icon: User,
  },
  { id: 'security', label: 'Security', description: 'Change your password', icon: Lock },
  {
    id: 'region',
    label: 'Format & region',
    description: 'Currency, dates, and timezone',
    icon: Cards,
  },
  { id: 'sessions', label: 'Sessions', description: 'Devices signed in', icon: Lock },
  {
    id: 'help',
    label: 'Help & legal',
    description: 'Guides and policies',
    icon: Shield,
  },
  {
    id: 'account',
    label: 'Delete account',
    description: 'Remove your ledger',
    icon: Trash,
  },
];

export function SettingsPage() {
  const [section, setSection] = useState('profile');
  const notify = useToast();
  const { data: settings, isLoading, isError } = useSettings();
  const mutations = useSettingsMutations();
  const { updateUser, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="page product-page settings-page" aria-busy="true">
        <Skeleton className="skeleton-title" />
        <Skeleton className="position-skeleton" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="page product-page settings-page">
        <EmptyState
          title="Settings are unavailable"
          description="Refresh the page and try again."
        />
      </div>
    );
  }

  const memberSince = settings.user.createdAt
    ? formatDate(settings.user.createdAt, {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="page product-page settings-page">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Profile, password, sessions, formats, and account deletion."
      />

      <section
        className="financial-summary balancil-box settings-summary has-text-value"
        aria-label="Account summary"
      >
        <div>
          <span>Signed in as</span>
          <strong>{settings.user.name}</strong>
          <small>
            {settings.user.email}
            {memberSince ? ` · Member since ${memberSince}` : ''}
          </small>
        </div>
        <dl>
          <div>
            <dt>Ledger currency</dt>
            <dd>{settings.user.currency}</dd>
            <small>Applied to every amount without currency conversion</small>
          </div>
          <div>
            <dt>Regional format</dt>
            <dd>{settings.user.locale ?? 'en-US'}</dd>
            <small>{settings.user.timezone ?? 'UTC'}</small>
          </div>
        </dl>
      </section>

      <div className="settings-shell">
        <nav className="settings-section-nav section-open" aria-label="Settings sections">
          {settingSections.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={17} />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <section className="settings-panel balancil-box">
          {section === 'profile' ? (
            <ProfileSettings
              settings={settings}
              saving={mutations.profile.isPending}
              onUserChanged={updateUser}
              onSave={async (profile) => {
                try {
                  const next = await mutations.profile.mutateAsync(profile);
                  updateUser(next.user);
                  notify('Profile settings saved');
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Profile could not be saved',
                    'error',
                  );
                }
              }}
            />
          ) : section === 'account' ? (
            <DeleteAccountSettings
              saving={mutations.destroy.isPending}
              onDelete={async (password) => {
                try {
                  await mutations.destroy.mutateAsync(password);
                  await logout();
                  navigate('/');
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Account could not be deleted',
                    'error',
                  );
                }
              }}
            />
          ) : section === 'help' ? (
            <HelpSettings />
          ) : section === 'sessions' ? (
            <SessionSettings
              onCurrentRevoked={async () => {
                await logout();
                navigate('/login');
              }}
            />
          ) : (
            <GenericSettings
              section={section}
              settings={settings}
              saving={mutations.preferences.isPending || mutations.password.isPending}
              onPreferences={async (preferences) => {
                try {
                  const next = await mutations.preferences.mutateAsync(preferences);
                  updateUser(next.user);
                  notify('Preferences saved');
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Preferences could not be saved',
                    'error',
                  );
                }
              }}
              onPassword={async (password) => {
                try {
                  await mutations.password.mutateAsync(password);
                  notify('Password updated');
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Password could not be updated',
                    'error',
                  );
                }
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function HelpSettings() {
  return (
    <div className="settings-form">
      <header className="settings-panel-heading">
        <h2>Help & legal</h2>
        <p>Understand how your ledger works and review Balancil’s policies.</p>
      </header>
      <div className="settings-resource-list">
        <Link to="/app/help/privacy">
          <span>
            <strong>Privacy policy</strong>
            <small>How account and ledger data are handled.</small>
          </span>
          <ChevronRight size={16} />
        </Link>
        <Link to="/app/help/terms">
          <span>
            <strong>Terms of use</strong>
            <small>The rules and limitations for using Balancil.</small>
          </span>
          <ChevronRight size={16} />
        </Link>
        <Link to="/app/help/ledger-basics">
          <span>
            <strong>Ledger basics</strong>
            <small>Add, filter, and maintain your transaction history.</small>
          </span>
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function SessionSettings({ onCurrentRevoked }: { onCurrentRevoked: () => Promise<void> }) {
  const { data: sessions = [], isLoading } = useSessions();
  const mutations = useSettingsMutations();
  const notify = useToast();

  const revoke = async (session: (typeof sessions)[number]) => {
    try {
      await mutations.revokeSession.mutateAsync(session.id);
      if (session.isCurrent) {
        await onCurrentRevoked();
        return;
      }
      notify('Session revoked');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Session could not be revoked', 'error');
    }
  };

  return (
    <div className="settings-form">
      <header className="settings-panel-heading">
        <h2>Active sessions</h2>
        <p>Review devices that can access your Balancil account.</p>
      </header>
      {isLoading ? (
        <Skeleton className="position-skeleton" />
      ) : (
        <div className="session-list">
          {sessions.map((session) => (
            <article key={session.id}>
              <div>
                <strong>
                  {session.isCurrent ? 'This device' : session.name || 'Balancil session'}
                </strong>
                <small>
                  {session.ipAddress || 'IP unavailable'} ·{' '}
                  {session.lastUsedAt
                    ? `Used ${formatDate(session.lastUsedAt, { dateStyle: 'short', timeStyle: 'short' })}`
                    : `Created ${session.createdAt ? formatDate(session.createdAt, { dateStyle: 'short', timeStyle: 'short' }) : 'recently'}`}
                </small>
                {session.userAgent ? (
                  <small title={session.userAgent}>{session.userAgent}</small>
                ) : null}
              </div>
              <Button
                variant="secondary"
                disabled={mutations.revokeSession.isPending}
                onClick={() => void revoke(session)}
              >
                {session.isCurrent ? 'Sign out' : 'Revoke'}
              </Button>
            </article>
          ))}
        </div>
      )}
      {sessions.some((session) => !session.isCurrent) ? (
        <footer className="settings-actions">
          <Button
            variant="secondary"
            disabled={mutations.revokeOtherSessions.isPending}
            onClick={() =>
              void mutations.revokeOtherSessions
                .mutateAsync()
                .then(() => notify('Other sessions revoked'))
                .catch((error) =>
                  notify(
                    error instanceof Error ? error.message : 'Sessions could not be revoked',
                    'error',
                  ),
                )
            }
          >
            {mutations.revokeOtherSessions.isPending ? 'Revoking…' : 'Revoke all other sessions'}
          </Button>
        </footer>
      ) : null}
    </div>
  );
}

function ProfileSettings({
  settings,
  saving,
  onUserChanged,
  onSave,
}: {
  settings: UserSettings;
  saving: boolean;
  onUserChanged: (user: UserSettings['user']) => void;
  onSave: (profile: { name: string }) => Promise<void>;
}) {
  const { data: pendingEmail } = useEmailChange();
  const mutations = useSettingsMutations();
  const notify = useToast();

  return (
    <div className="settings-form">
      <header className="settings-panel-heading">
        <h2>Profile information</h2>
        <p>Update your display name or securely request a new sign-in email.</p>
      </header>
      <section className="profile-photo-setting" aria-labelledby="profile-photo-title">
        <span className="profile-photo-preview">
          {settings.user.profileImageUrl ? (
            <img src={settings.user.profileImageUrl} alt="" />
          ) : (
            settings.user.initials
          )}
        </span>
        <div>
          <h3 id="profile-photo-title">Profile image</h3>
          <p>JPEG, PNG, or WebP. Maximum 2 MB.</p>
          <div>
            <label className="button button-secondary">
              {mutations.profileImage.isPending ? 'Uploading…' : 'Choose image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={mutations.profileImage.isPending}
                onChange={(event) => {
                  const image = event.target.files?.[0];
                  if (!image) return;
                  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
                    notify('Choose a JPEG, PNG, or WebP image.', 'error');
                    event.target.value = '';
                    return;
                  }
                  if (image.size > 2 * 1024 * 1024) {
                    notify('Choose an image no larger than 2 MB.', 'error');
                    event.target.value = '';
                    return;
                  }
                  void mutations.profileImage
                    .mutateAsync(image)
                    .then((next) => {
                      onUserChanged(next.user);
                      notify('Profile image updated');
                    })
                    .catch((error) =>
                      notify(
                        error instanceof Error ? error.message : 'Image could not be uploaded',
                        'error',
                      ),
                    );
                  event.target.value = '';
                }}
              />
            </label>
            {settings.user.profileImageUrl ? (
              <Button
                type="button"
                variant="ghost"
                disabled={mutations.removeProfileImage.isPending}
                onClick={() =>
                  void mutations.removeProfileImage
                    .mutateAsync()
                    .then((next) => {
                      onUserChanged(next.user);
                      notify('Profile image removed');
                    })
                    .catch((error) =>
                      notify(
                        error instanceof Error ? error.message : 'Image could not be removed',
                        'error',
                      ),
                    )
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </section>
      <form
        className="settings-subform"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSave({ name: String(form.get('name') ?? '') });
        }}
      >
        <div className="settings-field-grid">
          <label className="field-control">
            Full name
            <input name="name" required defaultValue={settings.user.name} />
          </label>
          <div className="field-control">
            <span>Current email</span>
            <p className="field-readout">{settings.user.email}</p>
            <small className="field-hint">Used to sign in until a new address is confirmed.</small>
          </div>
        </div>
        <footer className="settings-actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save name'}
          </Button>
        </footer>
      </form>

      <form
        className="settings-subform email-change-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          const form = new FormData(formElement);
          void mutations.requestEmailChange
            .mutateAsync({
              email: String(form.get('email') ?? ''),
              currentPassword: String(form.get('currentPassword') ?? ''),
            })
            .then(() => {
              formElement.reset();
              notify('Confirmation sent to the new email address');
            })
            .catch((error) =>
              notify(
                error instanceof Error ? error.message : 'Email change could not be requested',
                'error',
              ),
            );
        }}
      >
        <header className="settings-subheading">
          <h3>Change email address</h3>
          <p>Your current address remains active until you confirm the new one.</p>
        </header>
        {pendingEmail ? (
          <div className="pending-email">
            <span>
              Confirmation pending for <strong>{pendingEmail.email}</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={mutations.cancelEmailChange.isPending}
              onClick={() =>
                void mutations.cancelEmailChange
                  .mutateAsync()
                  .then(() => notify('Email change cancelled'))
                  .catch((error) =>
                    notify(
                      error instanceof Error ? error.message : 'Request could not be cancelled',
                      'error',
                    ),
                  )
              }
            >
              Cancel request
            </Button>
          </div>
        ) : (
          <>
            <div className="settings-field-grid">
              <label className="field-control">
                New email
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="field-control">
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
            </div>
            <footer className="settings-actions">
              <Button type="submit" disabled={mutations.requestEmailChange.isPending}>
                {mutations.requestEmailChange.isPending ? 'Sending…' : 'Send confirmation'}
              </Button>
            </footer>
          </>
        )}
      </form>
    </div>
  );
}

function GenericSettings({
  section,
  settings,
  saving,
  onPreferences,
  onPassword,
}: {
  section: string;
  settings: UserSettings;
  saving: boolean;
  onPreferences: (preferences: {
    currency: string;
    locale: string;
    timezone: string;
    weekStart: 'mon' | 'sun';
  }) => Promise<void>;
  onPassword: (password: {
    currentPassword: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<void>;
}) {
  const content: Record<string, [string, string]> = {
    security: ['Security', 'Keep your Balancil account protected.'],
    region: ['Format & region', 'Choose how amounts and dates appear throughout your ledger.'],
  };
  const [title, description] = content[section] ?? content.region;

  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (section === 'security') {
          void onPassword({
            currentPassword: String(form.get('currentPassword') ?? ''),
            password: String(form.get('password') ?? ''),
            passwordConfirmation: String(form.get('passwordConfirmation') ?? ''),
          });
        } else {
          void onPreferences({
            currency: String(form.get('currency') ?? 'USD'),
            locale: String(form.get('locale') ?? 'en-US'),
            timezone: String(form.get('timezone') ?? 'UTC'),
            weekStart: String(form.get('weekStart') ?? 'mon') as 'mon' | 'sun',
          });
        }
      }}
    >
      <header className="settings-panel-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="settings-preferences">
        {section === 'security' ? (
          <>
            <div className="settings-field-grid settings-region-fields">
              <label className="field-control">
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <label className="field-control">
                New password
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label className="field-control span-2">
                Confirm new password
                <input
                  name="passwordConfirmation"
                  type="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                />
              </label>
            </div>
          </>
        ) : (
          <div className="settings-field-grid settings-region-fields">
            <label className="field-control">
              Ledger currency
              <Select name="currency" defaultValue={settings.user.currency}>
                <option>USD</option>
                <option>AMD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>JPY</option>
                <option>CAD</option>
                <option>AUD</option>
              </Select>
              <small>
                This changes how amounts are labelled. Balancil does not convert existing values.
              </small>
            </label>
            <label className="field-control">
              Number and date format
              <Select name="locale" defaultValue={settings.user.locale ?? 'en-US'}>
                <option value="en-US">English (United States)</option>
                <option value="en-GB">English (United Kingdom)</option>
                <option value="de-DE">Deutsch</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
                <option value="it-IT">Italiano</option>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="ja-JP">日本語</option>
                <option value="ko-KR">한국어</option>
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁體中文</option>
              </Select>
            </label>
            <label className="field-control">
              Timezone
              <Select name="timezone" defaultValue={settings.user.timezone ?? 'UTC'}>
                {Array.from(
                  new Set([
                    settings.user.timezone ?? 'UTC',
                    'UTC',
                    'America/Los_Angeles',
                    'America/New_York',
                    'Europe/London',
                    'Europe/Paris',
                    'Asia/Dubai',
                    'Asia/Tehran',
                    'Asia/Tokyo',
                    'Australia/Sydney',
                  ]),
                ).map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone.replaceAll('_', ' ')}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field-control">
              Week starts on
              <Select name="weekStart" defaultValue={settings.user.weekStart ?? 'mon'}>
                <option value="mon">Monday</option>
                <option value="sun">Sunday</option>
              </Select>
            </label>
          </div>
        )}
      </div>
      <footer className="settings-actions">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : section === 'security' ? 'Update password' : 'Save preferences'}
        </Button>
      </footer>
    </form>
  );
}

function DeleteAccountSettings({
  saving,
  onDelete,
}: {
  saving: boolean;
  onDelete: (password: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void onDelete(String(form.get('password') ?? ''));
      }}
    >
      <header className="settings-panel-heading">
        <h2>Delete your Balancil account</h2>
        <p>
          This permanently removes your profile, accounts, transactions, budgets, and goals. This
          cannot be undone.
        </p>
      </header>
      <label className="form-toggle">
        <input
          type="checkbox"
          checked={confirming}
          onChange={(event) => setConfirming(event.target.checked)}
        />
        <span>I understand this cannot be undone</span>
      </label>
      <label className="field-control">
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <footer className="settings-actions">
        <Button type="submit" variant="danger" disabled={saving || !confirming}>
          {saving ? 'Deleting…' : 'Delete my account'}
        </Button>
      </footer>
    </form>
  );
}
