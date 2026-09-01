import { useState } from 'react';
import { Button, Modal, Select, useToast } from '../../components/ui';
import { useTransferMutations } from '../../hooks/useFinance';
import type { Account, TransactionStatus, Transfer } from '../../types';
import { formatDateInput } from '../../utils/finance';

function draftFor(transfer: Transfer | null, accounts: Account[]) {
  if (transfer) {
    return {
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: transfer.amount,
      date: transfer.date,
      description: transfer.description,
      status: transfer.status,
    };
  }
  const active = accounts.filter((account) => account.isActive !== false);
  return {
    fromAccountId: active[0]?.id ?? '',
    toAccountId: active[1]?.id ?? '',
    amount: 0,
    date: formatDateInput(),
    description: '',
    status: 'completed' as TransactionStatus,
  };
}

/**
 * Mounted only while open, so the paired accounts are re-seeded from the current
 * ledger every time rather than reused from the previous transfer.
 */
export function TransferModal({
  transfer,
  accounts,
  onClose,
}: {
  transfer: Transfer | null;
  accounts: Account[];
  onClose: () => void;
}) {
  const mutations = useTransferMutations();
  const notify = useToast();
  const [draft, setDraft] = useState(() => draftFor(transfer, accounts));
  const activeAccounts = accounts.filter((account) => account.isActive !== false);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutations.save.mutateAsync({ ...draft, id: transfer?.id });
      notify(transfer ? 'Transfer updated' : 'Transfer recorded');
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transfer could not be saved', 'error');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={transfer ? 'Edit transfer' : 'Transfer between accounts'}
      description="Move money without counting it as income or spending."
    >
      <form className="form-grid" onSubmit={save}>
        <label className="field-control">
          From account
          <Select
            required
            value={draft.fromAccountId}
            onChange={(event) => {
              const fromAccountId = event.target.value;
              setDraft((current) => ({
                ...current,
                fromAccountId,
                // Never leave both sides pointing at the same account.
                toAccountId:
                  current.toAccountId === fromAccountId
                    ? (activeAccounts.find((account) => account.id !== fromAccountId)?.id ?? '')
                    : current.toAccountId,
              }));
            }}
          >
            {activeAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="field-control">
          To account
          <Select
            required
            value={draft.toAccountId}
            onChange={(event) =>
              setDraft((current) => ({ ...current, toAccountId: event.target.value }))
            }
          >
            {activeAccounts
              .filter((account) => account.id !== draft.fromAccountId)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </Select>
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
          Date
          <input
            required
            type="date"
            value={draft.date}
            onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
          />
        </label>
        <label className="field-control span-2">
          Description
          <input
            value={draft.description}
            placeholder="Optional note"
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
          />
        </label>
        <label className="field-control span-2">
          Status
          <Select
            value={draft.status}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                status: event.target.value as TransactionStatus,
              }))
            }
          >
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </Select>
          <small className="field-hint">Only completed transfers change account balances.</small>
        </label>
        <footer className="form-actions span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutations.save.isPending}>
            {mutations.save.isPending ? 'Saving…' : 'Save transfer'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
