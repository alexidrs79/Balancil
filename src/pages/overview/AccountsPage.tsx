import { ArrowRight, Pencil, Plus, Trash } from '../../components/icons';
import { useState } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LedgerList,
  LedgerRow,
  PageHeader,
  Skeleton,
  AnimatedValue,
  StatusPill,
  useToast,
} from '../../components/ui';
import { AccountMark, TextLink } from '../../components/visuals';
import {
  useAccountMutations,
  useAccounts,
  useCategories,
  useTransferMutations,
  useTransfers,
  useTransactions,
} from '../../hooks/useFinance';
import type { Account, Transfer } from '../../types';
import { formatCurrency } from '../../utils/finance';
import { SectionHeader, TransactionRow } from './components';
import { AccountModal } from './AccountModal';
import { TransferModal } from './TransferModal';
import { shortDate } from './format';

/**
 * Spells out how a stored balance was reached, so the number is never a mystery.
 * Accounts with no recorded movement yet still read as their opening figure.
 */
function balanceBreakdown(account: Account) {
  if (account.openingBalance === undefined || !account.netActivity) return null;
  const sign = account.netActivity > 0 ? '+' : '−';
  return `Opening ${formatCurrency(account.openingBalance)} · ${sign}${formatCurrency(Math.abs(account.netActivity))} recorded`;
}

function AccountLedger({
  items,
  label,
  onEdit,
  onDelete,
}: {
  items: Account[];
  label: string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  return (
    <div className="account-group">
      <h3>
        <AccountMark type={items[0]?.type ?? 'checking'} color={items[0]?.color} />
        {label}
      </h3>
      <LedgerList className="account-ledger-list" aria-label={`${label} accounts`}>
        {items.map((account) => {
          const latestActivity = account.lastActivityAt;
          const breakdown = balanceBreakdown(account);
          return (
            <LedgerRow
              className="account-ledger-row"
              aria-label={`${account.name}, ${account.institution}, ${formatCurrency(account.balance)}${breakdown ? `, ${breakdown}` : ''}, ${account.isActive === false ? 'inactive' : 'active'}`}
              key={account.id}
            >
              <div className="ledger-account-name">
                <AccountMark type={account.type} color={account.color} />
                <span className="ledger-account-copy">
                  <strong>{account.name}</strong>
                  <small>
                    {account.institution} · <span className="capitalize">{account.type}</span>
                  </small>
                  <small>
                    {latestActivity
                      ? `Latest activity ${shortDate(latestActivity)}`
                      : 'No recent activity'}
                  </small>
                </span>
              </div>
              <StatusPill tone={account.isActive === false ? 'neutral' : 'positive'}>
                {account.isActive === false ? 'Inactive' : 'Active'}
              </StatusPill>
              <div className={`ledger-balance ${account.balance < 0 ? 'negative' : ''}`}>
                <strong>{formatCurrency(account.balance)}</strong>
                {breakdown ? <small>{breakdown}</small> : null}
              </div>
              <div className="row-actions">
                <Button
                  variant="ghost"
                  aria-label={`Edit ${account.name}`}
                  onClick={() => onEdit(account)}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${account.name}`}
                  onClick={() => onDelete(account)}
                >
                  <Trash size={15} />
                </Button>
              </div>
            </LedgerRow>
          );
        })}
      </LedgerList>
    </div>
  );
}

export function AccountsPage() {
  const { data: accounts = [], isLoading, isError } = useAccounts();
  // Only the handful shown under "Recent activity"; the ledger lives on its own page.
  const { data: recentPage } = useTransactions({ perPage: 6 });
  const recentTransactions = recentPage?.data ?? [];
  const { data: transfers = [] } = useTransfers();
  const { data: categories = [] } = useCategories();
  const mutations = useAccountMutations();
  const transferMutations = useTransferMutations();
  const notify = useToast();
  const [connectOpen, setConnectOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<Transfer | null>(null);
  const assets = accounts
    .filter((account) => account.balance > 0)
    .reduce((total, account) => total + account.balance, 0);
  const liabilities = Math.abs(
    accounts
      .filter((account) => account.balance < 0)
      .reduce((total, account) => total + account.balance, 0),
  );
  const combined = assets - liabilities;
  const retainedShare = assets > 0 ? Math.round((Math.max(combined, 0) / assets) * 100) : 0;
  const creditCount = accounts.filter((account) => account.balance < 0).length;
  const accountGroups = [
    {
      label: 'Cash & checking',
      items: accounts.filter((account) => account.type === 'checking' || account.type === 'cash'),
    },
    {
      label: 'Savings',
      items: accounts.filter((account) => account.type === 'savings'),
    },
    {
      label: 'Credit cards',
      items: accounts.filter((account) => account.type === 'credit'),
    },
  ].filter((group) => group.items.length > 0);

  const openAccount = (account?: Account) => {
    setEditingAccount(account ?? null);
    setConnectOpen(true);
  };

  const closeAccountModal = () => {
    setConnectOpen(false);
    setEditingAccount(null);
  };

  const deleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      await mutations.remove.mutateAsync(deletingAccount.id);
      notify('Account removed');
      setDeletingAccount(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Account could not be removed', 'error');
    }
  };

  const openTransfer = (transfer?: Transfer) => {
    setEditingTransfer(transfer ?? null);
    setTransferOpen(true);
  };

  const closeTransferModal = () => {
    setTransferOpen(false);
    setEditingTransfer(null);
  };

  const deleteTransfer = async () => {
    if (!deletingTransfer) return;
    try {
      await transferMutations.remove.mutateAsync(deletingTransfer.id);
      setDeletingTransfer(null);
      notify('Transfer removed');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transfer could not be removed', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="page product-page accounts-page" aria-busy="true">
        <Skeleton className="skeleton-title" />
        <Skeleton className="position-skeleton" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page product-page accounts-page">
        <Card className="error-state" role="alert">
          <h2>Accounts are unavailable</h2>
          <p>Try again in a moment.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page product-page accounts-page">
      <PageHeader
        eyebrow="Balances"
        title="Accounts"
        description="Balances and account details in one place."
      />

      <section
        className="financial-summary balancil-box accounts-summary"
        aria-label="Accounts summary"
      >
        <div>
          <span>Combined balance</span>
          <strong>
            <AnimatedValue value={combined} format={formatCurrency} />
          </strong>
          <small>
            {retainedShare}% remains after liabilities · {accounts.length}{' '}
            {accounts.length === 1 ? 'account' : 'accounts'}
          </small>
        </div>
        <dl>
          <div>
            <dt>Assets</dt>
            <dd>
              <AnimatedValue value={assets} format={formatCurrency} />
            </dd>
            <small>Positive account balances</small>
          </div>
          <div>
            <dt>Liabilities</dt>
            <dd className="negative">
              <AnimatedValue value={liabilities} format={formatCurrency} />
            </dd>
            <small>
              {creditCount} {creditCount === 1 ? 'account' : 'accounts'} carrying a balance
            </small>
          </div>
        </dl>
      </section>

      {!accounts.length ? (
        <EmptyState
          title="Add your first account"
          description="Create an account in your ledger to start recording balances and activity."
          action={
            <Button onClick={() => openAccount()}>
              <Plus size={16} />
              Add account
            </Button>
          }
        />
      ) : (
        <>
          <section className="surface-panel balancil-box account-ledger-section">
            <SectionHeader
              label="Accounts"
              title="Your accounts"
              detail="Balances use your selected ledger currency"
              action={
                <div className="inline-actions">
                  <Button
                    variant="secondary"
                    className="inline-action"
                    disabled={accounts.filter((account) => account.isActive !== false).length < 2}
                    onClick={() => openTransfer()}
                  >
                    <ArrowRight size={16} />
                    Transfer
                  </Button>
                  <Button
                    variant="secondary"
                    className="inline-action"
                    onClick={() => openAccount()}
                  >
                    <Plus size={16} />
                    Add account
                  </Button>
                </div>
              }
            />
            <div className="account-groups">
              {accountGroups.map((group) => (
                <AccountLedger
                  key={group.label}
                  label={group.label}
                  items={group.items}
                  onEdit={openAccount}
                  onDelete={setDeletingAccount}
                />
              ))}
            </div>
          </section>

          {transfers.length ? (
            <section className="surface-panel balancil-box account-transfer-section">
              <SectionHeader
                label="Transfers"
                title="Account transfers"
                detail="Internal movements do not count as income or spending"
              />
              <LedgerList>
                {transfers.map((transfer) => {
                  const from = accounts.find((account) => account.id === transfer.fromAccountId);
                  const to = accounts.find((account) => account.id === transfer.toAccountId);
                  return (
                    <LedgerRow className="transfer-ledger-row" key={transfer.id}>
                      <span className="transfer-route-icon" aria-hidden="true">
                        <ArrowRight size={16} />
                      </span>
                      <div className="ledger-main">
                        <strong>
                          {from?.name ?? 'Unknown account'} to {to?.name ?? 'Unknown account'}
                        </strong>
                        <small>
                          {transfer.description || 'Account transfer'} · {transfer.date}
                        </small>
                      </div>
                      <StatusPill
                        tone={
                          transfer.status === 'completed'
                            ? 'positive'
                            : transfer.status === 'pending'
                              ? 'attention'
                              : 'negative'
                        }
                      >
                        {transfer.status}
                      </StatusPill>
                      <b className="money-value">{formatCurrency(transfer.amount)}</b>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          aria-label={`Edit transfer from ${from?.name ?? 'account'}`}
                          onClick={() => openTransfer(transfer)}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={`Delete transfer from ${from?.name ?? 'account'}`}
                          onClick={() => setDeletingTransfer(transfer)}
                        >
                          <Trash size={15} />
                        </Button>
                      </div>
                    </LedgerRow>
                  );
                })}
              </LedgerList>
            </section>
          ) : null}

          <section className="surface-panel section-open account-activity-section">
            <SectionHeader
              label="Recent activity"
              title="Recent account activity"
              detail="Across all accounts"
              action={<TextLink to="/app/transactions">View in transactions</TextLink>}
            />
            <div className="activity-list">
              {recentTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  categories={categories}
                />
              ))}
            </div>
          </section>
        </>
      )}
      {connectOpen && <AccountModal account={editingAccount} onClose={closeAccountModal} />}
      {transferOpen && (
        <TransferModal
          transfer={editingTransfer}
          accounts={accounts}
          onClose={closeTransferModal}
        />
      )}
      <ConfirmDialog
        open={Boolean(deletingAccount)}
        onClose={() => setDeletingAccount(null)}
        onConfirm={deleteAccount}
        title="Delete account?"
        description="This action cannot be undone."
        confirmLabel="Delete account"
        pending={mutations.remove.isPending}
      >
        <p>
          Delete <strong>{deletingAccount?.name}</strong>? Accounts that already have transactions
          cannot be deleted — mark them inactive instead.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(deletingTransfer)}
        onClose={() => setDeletingTransfer(null)}
        onConfirm={deleteTransfer}
        title="Delete transfer?"
        description="Any completed balance movement will be reversed."
        confirmLabel="Delete transfer"
        pending={transferMutations.remove.isPending}
      >
        <p>Delete this {deletingTransfer && formatCurrency(deletingTransfer.amount)} transfer?</p>
      </ConfirmDialog>
    </div>
  );
}
