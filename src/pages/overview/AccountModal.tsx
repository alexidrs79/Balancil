import { useState } from 'react';
import { Button, Modal, Select, useToast } from '../../components/ui';
import { useAccountMutations } from '../../hooks/useFinance';
import type { Account, AccountType } from '../../types';
import { formatCurrency } from '../../utils/finance';

const blankDraft = {
  name: '',
  type: 'checking' as AccountType,
  institution: '',
  balance: 0,
  color: '#123d34',
  isActive: true,
};

function draftFor(account: Account | null) {
  if (!account) return blankDraft;
  return {
    name: account.name,
    type: account.type,
    institution: account.institution,
    balance: account.balance,
    color: account.color,
    isActive: account.isActive ?? true,
  };
}

/**
 * Mounted only while open, so every visit starts from a clean draft rather than
 * the values left behind by the previous account.
 */
export function AccountModal({
  account,
  onClose,
}: {
  account: Account | null;
  onClose: () => void;
}) {
  const mutations = useAccountMutations();
  const notify = useToast();
  const [draft, setDraft] = useState(() => draftFor(account));

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutations.save.mutateAsync({
        ...draft,
        id: account?.id,
        balance: account ? undefined : draft.balance,
      });
      notify(account ? 'Account updated' : 'Account added');
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Account could not be saved', 'error');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={account ? 'Edit account' : 'Add an account'}
      description={
        account
          ? 'Update account details. Its balance is maintained by completed transactions.'
          : 'Add an account to your manual ledger.'
      }
    >
      <form className="form-grid" onSubmit={save}>
        <label className="field-control">
          Account name
          <input
            required
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label className="field-control">
          Account type
          <Select
            value={draft.type}
            onChange={(event) =>
              setDraft((current) => ({ ...current, type: event.target.value as AccountType }))
            }
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit card</option>
            <option value="cash">Cash</option>
          </Select>
        </label>
        <label className="field-control">
          Institution
          <input
            required
            value={draft.institution}
            onChange={(event) =>
              setDraft((current) => ({ ...current, institution: event.target.value }))
            }
          />
        </label>
        {account ? (
          <div className="field-control">
            <span>Current balance</span>
            <p className="field-readout">{formatCurrency(account.balance)}</p>
            <small className="field-hint">Set by completed transactions.</small>
          </div>
        ) : (
          <label className="field-control">
            Opening balance
            <input
              required
              type="number"
              step="0.01"
              value={draft.balance}
              onChange={(event) =>
                setDraft((current) => ({ ...current, balance: Number(event.target.value) }))
              }
            />
            <small className="field-hint">The balance before any recorded transactions.</small>
          </label>
        )}
        <label className="form-swatch span-2">
          <span>
            <strong>Account color</strong>
            <small>Used for this account&rsquo;s marker in lists and charts.</small>
          </span>
          <input
            type="color"
            value={draft.color}
            onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
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
            <strong>Active account</strong>
            <small>Inactive accounts stay visible but cannot receive new transactions.</small>
          </span>
        </label>
        <footer className="form-actions span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutations.save.isPending}>
            {mutations.save.isPending ? 'Saving…' : account ? 'Save account' : 'Add account'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
