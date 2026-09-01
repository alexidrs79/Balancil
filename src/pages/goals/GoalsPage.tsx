import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash } from '../../components/icons';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  Progress,
  Skeleton,
  AnimatedValue,
  useToast,
} from '../../components/ui';
import { GoalMark } from '../../components/visuals';
import { useGoalMutations, useGoals } from '../../hooks/useFinance';
import type { Goal } from '../../types';
import { formatCurrency, formatDate, goalProgress, monthsUntil } from '../../utils/finance';
import { GoalContributionsModal } from './GoalContributionsModal';

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
