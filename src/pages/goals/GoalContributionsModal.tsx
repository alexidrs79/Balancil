import { Trash } from '../../components/icons';
import { useState } from 'react';
import { Button, Modal, Skeleton, useToast } from '../../components/ui';
import { useGoalContributionMutations, useGoalContributions } from '../../hooks/useFinance';
import type { Goal, GoalContribution } from '../../types';
import { formatCurrency, formatDateInput } from '../../utils/finance';

export function GoalContributionsModal({
  goal,
  onClose,
}: {
  goal: Goal | null;
  onClose: () => void;
}) {
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
