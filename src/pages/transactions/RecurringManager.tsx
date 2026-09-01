import { Calendar, Pencil, Plus, Trash } from '../../components/icons';
import { useState } from 'react';
import { Button, Modal, Select, StatusPill, useToast } from '../../components/ui';
import { useRecurringMutations, useRecurringTransactions } from '../../hooks/useFinance';
import type {
  Account,
  Category,
  RecurringFrequency,
  RecurringTransaction,
  Transaction,
} from '../../types';
import { formatCurrency, formatDateInput, formatLedgerDate } from '../../utils/finance';

export function RecurringManager({
  accounts,
  categories,
  open,
  onClose,
}: {
  accounts: Account[];
  categories: Category[];
  open: boolean;
  onClose: () => void;
}) {
  const { data: templates = [] } = useRecurringTransactions();
  const mutations = useRecurringMutations();
  const notify = useToast();
  const [editing, setEditing] = useState<RecurringTransaction | null | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    accountId: '',
    categoryId: '',
    merchant: '',
    description: '',
    amount: 0,
    type: 'expense' as Transaction['type'],
    frequency: 'monthly' as RecurringFrequency,
    interval: 1,
    startDate: formatDateInput(),
    endDate: '',
    isActive: true,
  });

  const openEditor = (template?: RecurringTransaction) => {
    setEditing(template ?? null);
    setDraft(
      template
        ? {
            accountId: template.accountId,
            categoryId: template.categoryId,
            merchant: template.merchant,
            description: template.description,
            amount: template.amount,
            type: template.type,
            frequency: template.frequency,
            interval: template.interval,
            startDate: template.startDate,
            endDate: template.endDate ?? '',
            isActive: template.isActive,
          }
        : {
            accountId: accounts[0]?.id ?? '',
            categoryId: categories.find((category) => category.type === 'expense')?.id ?? '',
            merchant: '',
            description: '',
            amount: 0,
            type: 'expense',
            frequency: 'monthly',
            interval: 1,
            startDate: formatDateInput(),
            endDate: '',
            isActive: true,
          },
    );
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutations.save.mutateAsync({
        ...draft,
        id: editing?.id,
        nextDueDate: editing?.nextDueDate,
        endDate: draft.endDate || null,
      });
      notify(editing ? 'Recurring schedule updated' : 'Recurring schedule created');
      setEditing(undefined);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Schedule could not be saved', 'error');
    }
  };

  const close = () => {
    setEditing(undefined);
    setPendingDeleteId(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        editing === undefined
          ? 'Recurring transactions'
          : editing
            ? 'Edit recurring transaction'
            : 'New recurring transaction'
      }
      description="Schedules create due items for your approval; they never post automatically."
    >
      {editing === undefined ? (
        <div className="recurring-manager">
          <header>
            <div>
              <strong>Schedules</strong>
              <small>{templates.length} recurring templates</small>
            </div>
            <Button onClick={() => openEditor()}>
              <Plus size={15} />
              New schedule
            </Button>
          </header>
          {templates.length ? (
            <ul>
              {templates.map((template) => (
                <li key={template.id}>
                  <div>
                    <strong>{template.merchant}</strong>
                    <small>
                      {formatCurrency(template.amount)} · Every{' '}
                      {template.interval > 1 ? `${template.interval} ` : ''}
                      {template.frequency} · Next {formatLedgerDate(template.nextDueDate)}
                    </small>
                  </div>
                  <StatusPill tone={template.isActive ? 'positive' : 'neutral'}>
                    {template.isActive ? 'active' : 'paused'}
                  </StatusPill>
                  {pendingDeleteId === template.id ? (
                    <div className="recurring-template-actions">
                      <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        disabled={mutations.remove.isPending}
                        onClick={() =>
                          void mutations.remove
                            .mutateAsync(template.id)
                            .then(() => {
                              setPendingDeleteId(null);
                              notify('Recurring schedule deleted');
                            })
                            .catch((error) =>
                              notify(
                                error instanceof Error
                                  ? error.message
                                  : 'Schedule could not be deleted',
                                'error',
                              ),
                            )
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <div className="row-actions">
                      <Button
                        variant="ghost"
                        aria-label={`Edit ${template.merchant} schedule`}
                        onClick={() => openEditor(template)}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Delete ${template.merchant} schedule`}
                        onClick={() => setPendingDeleteId(template.id)}
                      >
                        <Trash size={15} />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="recurring-empty">
              <Calendar size={20} />
              <p>Create a schedule for bills, subscriptions, or regular income.</p>
            </div>
          )}
          <footer className="form-actions">
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
          </footer>
        </div>
      ) : (
        <form className="form-grid" onSubmit={save}>
          <label className="field-control span-2">
            Merchant
            <input
              required
              value={draft.merchant}
              onChange={(event) =>
                setDraft((current) => ({ ...current, merchant: event.target.value }))
              }
            />
          </label>
          <label className="field-control span-2">
            Description
            <input
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <label className="field-control">
            Amount
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              inputMode="decimal"
              value={draft.amount}
              onChange={(event) =>
                setDraft((current) => ({ ...current, amount: Number(event.target.value) }))
              }
            />
          </label>
          <label className="field-control">
            Type
            <Select
              value={draft.type}
              onChange={(event) => {
                const type = event.target.value as Transaction['type'];
                setDraft((current) => ({
                  ...current,
                  type,
                  categoryId: categories.find((category) => category.type === type)?.id ?? '',
                }));
              }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </label>
          <label className="field-control">
            Category
            <Select
              required
              value={draft.categoryId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, categoryId: event.target.value }))
              }
            >
              {categories
                .filter((category) => category.type === draft.type)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </Select>
          </label>
          <label className="field-control">
            Account
            <Select
              required
              value={draft.accountId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, accountId: event.target.value }))
              }
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="field-control">
            Frequency
            <Select
              value={draft.frequency}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  frequency: event.target.value as RecurringFrequency,
                }))
              }
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every two weeks</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </label>
          <label className="field-control">
            Repeat interval
            <input
              required
              min="1"
              max="100"
              type="number"
              value={draft.interval}
              onChange={(event) =>
                setDraft((current) => ({ ...current, interval: Number(event.target.value) }))
              }
            />
          </label>
          <label className="field-control">
            Starts
            <input
              required
              type="date"
              value={draft.startDate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, startDate: event.target.value }))
              }
            />
          </label>
          <label className="field-control">
            Ends
            <input
              type="date"
              min={draft.startDate}
              value={draft.endDate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, endDate: event.target.value }))
              }
            />
          </label>
          <label className="form-toggle span-2">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) =>
                setDraft((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            <span>
              <strong>Active schedule</strong>
              <small>Paused schedules do not create new due items.</small>
            </span>
          </label>
          <footer className="form-actions span-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(undefined)}>
              Back
            </Button>
            <Button type="submit" disabled={mutations.save.isPending}>
              {mutations.save.isPending ? 'Saving…' : 'Save schedule'}
            </Button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
