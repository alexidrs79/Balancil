import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Close,
  Copy,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash,
} from '../components/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  Button,
  AnimatedValue,
  Card,
  ConfirmDialog,
  EmptyState,
  LedgerList,
  LedgerRow,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StatusPill,
  useToast,
} from '../components/ui';
import { CategoryMark } from '../components/visuals';
import {
  useAccounts,
  useCategories,
  useCategoryMutations,
  useRecurringDrafts,
  useRecurringMutations,
  useRecurringTransactions,
  useTransactionMutations,
  useTransactions,
} from '../hooks/useFinance';
import type {
  Account,
  Category,
  RecurringFrequency,
  RecurringTransaction,
  Transaction,
  TransactionFilters,
} from '../types';
import {
  calculateSummary,
  filterTransactions,
  formatCurrency,
  formatDate as formatLocalizedDate,
  formatDateInput,
  hiddenTransactionFilterCount,
} from '../utils/finance';

const transactionSchema = z.object({
  merchant: z.string().min(2, 'Merchant must be at least 2 characters'),
  description: z.string().min(2, 'Add a short description'),
  amount: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value > 0, 'Amount must be greater than zero'),
  type: z.enum(['income', 'expense']),
  status: z.enum(['completed', 'pending', 'failed']),
  categoryId: z.string().min(1, 'Choose a category'),
  accountId: z.string().min(1, 'Choose an account'),
  date: z.string().min(1, 'Choose a date'),
});

type TransactionForm = z.output<typeof transactionSchema>;
type TransactionFormInput = z.input<typeof transactionSchema>;

const defaultFilters: TransactionFilters = {
  search: '',
  categoryId: '',
  accountId: '',
  type: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  sort: 'newest',
};

function formatDate(value: string) {
  return formatLocalizedDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TransactionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedFromHeader = Boolean(
    (location.state as { createTransaction?: boolean } | null)?.createTransaction,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data = [], isLoading, isError } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: recurringDrafts = [] } = useRecurringDrafts();
  const activeAccounts = accounts.filter((account) => account.isActive !== false);
  const mutations = useTransactionMutations();
  const recurringMutations = useRecurringMutations();
  const notify = useToast();
  const [filters, setFilters] = useState<TransactionFilters>(() => ({
    ...defaultFilters,
    search: new URLSearchParams(location.search).get('q') ?? '',
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null | undefined>(undefined);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const dateRangeInvalid = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo,
  );
  const effectiveFilters = useMemo(
    () =>
      dateRangeInvalid
        ? {
            ...filters,
            dateFrom: '',
            dateTo: '',
          }
        : filters,
    [dateRangeInvalid, filters],
  );
  const filtered = useMemo(
    () => filterTransactions(data, effectiveFilters),
    [data, effectiveFilters],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hiddenFilterCount = hiddenTransactionFilterCount(filters);
  const filteredSummary = useMemo(() => calculateSummary(filtered), [filtered]);
  const completedCount = filtered.filter(
    (transaction) => transaction.status === 'completed',
  ).length;
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (params.get('focus') === 'search' || query) {
      searchInputRef.current?.focus();
    }
  }, [isLoading, location.search]);

  const updateFilter = <K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  // The header's quick-add action lives outside this route, so it asks for the
  // modal through router state rather than a query string, which would remount
  // the page and discard the filters already in place.
  const closeTransactionModal = () => {
    setEditing(undefined);
    setDuplicating(false);
    if (requestedFromHeader) {
      navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      notify('Transaction deleted');
      setDeleting(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transaction could not be deleted', 'error');
    }
  };

  return (
    <div className="page product-page transactions-page">
      <PageHeader
        eyebrow="Ledger"
        title="Transactions"
        description="Search and edit the transactions you record."
      />

      <section
        className="financial-summary balancil-box transactions-summary"
        aria-label="Transactions summary"
      >
        <div>
          <span>Completed net for this selection</span>
          <strong className={filteredSummary.savings < 0 ? 'negative' : undefined}>
            <AnimatedValue value={filteredSummary.savings} format={formatCurrency} />
          </strong>
          <small>
            {completedCount} completed of {filtered.length} shown
            {hiddenFilterCount > 0
              ? ` · ${hiddenFilterCount} ${hiddenFilterCount === 1 ? 'filter' : 'filters'} applied`
              : ' · no filters applied'}
          </small>
        </div>
        <dl>
          <div>
            <dt>Money in</dt>
            <dd>
              <AnimatedValue value={filteredSummary.income} format={formatCurrency} />
            </dd>
            <small>Completed income in this selection</small>
          </div>
          <div>
            <dt>Money out</dt>
            <dd className="negative">
              <AnimatedValue value={filteredSummary.expenses} format={formatCurrency} />
            </dd>
            <small>Completed expenses in this selection</small>
          </div>
        </dl>
      </section>

      <section className="transaction-toolbar section-open" aria-label="Transaction controls">
        <div className="transaction-toolbar-primary">
          <label className="field-control transaction-search-field">
            <span>Filter ledger</span>
            <span className="transaction-search input-shell">
              <Search size={17} aria-hidden="true" />
              <input
                ref={searchInputRef}
                placeholder="Merchant or description…"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
              />
            </span>
          </label>
          <label className="field-control">
            <span>Type</span>
            <Select
              value={filters.type}
              onChange={(event) =>
                updateFilter('type', event.target.value as TransactionFilters['type'])
              }
            >
              <option value="">Income & expenses</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </Select>
          </label>
          <label className="field-control">
            <span>Sort</span>
            <Select
              value={filters.sort}
              onChange={(event) =>
                updateFilter('sort', event.target.value as TransactionFilters['sort'])
              }
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </Select>
          </label>
        </div>
        <div className="transaction-toolbar-actions">
          <Button
            variant="secondary"
            className="inline-action filter-toggle is-always"
            aria-expanded={filtersOpen}
            aria-controls="transaction-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter size={16} />
            More filters
            {hiddenFilterCount > 0 ? (
              <span
                className="filter-count"
                aria-label={`${hiddenFilterCount} hidden filters applied`}
              >
                {hiddenFilterCount}
              </span>
            ) : null}
          </Button>
          <Button
            variant="secondary"
            className="inline-action"
            onClick={() => setCategoriesOpen(true)}
          >
            <Pencil size={16} />
            Manage categories
          </Button>
          <Button
            variant="secondary"
            className="inline-action"
            disabled={!activeAccounts.length || !categories.length}
            onClick={() => setRecurringOpen(true)}
          >
            <Calendar size={16} />
            Recurring
          </Button>
          {activeAccounts.length > 0 ? (
            <Button variant="secondary" className="inline-action" onClick={() => setEditing(null)}>
              <Plus size={16} />
              Add transaction
            </Button>
          ) : (
            <Link className="button button-secondary inline-action" to="/app/accounts">
              <Plus size={16} />
              Add account first
            </Link>
          )}
        </div>
      </section>

      {recurringDrafts.length ? (
        <section className="recurring-due-panel balancil-box" aria-labelledby="recurring-due-title">
          <header>
            <div>
              <p className="data-label">Review required</p>
              <h2 id="recurring-due-title">Recurring transactions due</h2>
              <small>Nothing is posted until you approve it.</small>
            </div>
            <strong>{recurringDrafts.length}</strong>
          </header>
          <div>
            {recurringDrafts.map((draft) => {
              const account = accounts.find((item) => item.id === draft.payload.accountId);
              const category = categories.find((item) => item.id === draft.payload.categoryId);
              return (
                <article key={draft.id}>
                  <CategoryMark icon={category?.icon} color={category?.color} />
                  <div>
                    <strong>{draft.payload.merchant}</strong>
                    <small>
                      Due {formatDate(draft.dueDate)} · {account?.name ?? 'Unknown account'} ·{' '}
                      {category?.name ?? 'Unknown category'}
                    </small>
                  </div>
                  <b className={`money-value ${draft.payload.type}`}>
                    {formatCurrency(draft.payload.amount)}
                  </b>
                  <div className="recurring-review-actions">
                    <Button
                      variant="ghost"
                      disabled={recurringMutations.skip.isPending}
                      onClick={() =>
                        void recurringMutations.skip
                          .mutateAsync(draft.id)
                          .then(() => notify('Recurring item skipped'))
                          .catch((error) =>
                            notify(
                              error instanceof Error ? error.message : 'Item could not be skipped',
                              'error',
                            ),
                          )
                      }
                    >
                      Skip
                    </Button>
                    <Button
                      disabled={recurringMutations.post.isPending}
                      onClick={() =>
                        void recurringMutations.post
                          .mutateAsync({ id: draft.id })
                          .then(() => notify('Recurring transaction posted'))
                          .catch((error) =>
                            notify(
                              error instanceof Error ? error.message : 'Item could not be posted',
                              'error',
                            ),
                          )
                      }
                    >
                      Post
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section
        id="transaction-filters"
        className={`transaction-filter-panel balancil-box ${filtersOpen ? 'is-open' : ''}`}
        aria-label="Transaction filters"
      >
        <header>
          <div>
            <strong>Filter transactions</strong>
            <small>Narrow results without losing context.</small>
          </div>
          <button
            type="button"
            className="filter-close"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <Close size={17} />
          </button>
        </header>
        <div className="transaction-filter-grid">
          <label className="field-control">
            <span>Category</span>
            <Select
              value={filters.categoryId}
              onChange={(event) => updateFilter('categoryId', event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="field-control">
            <span>Account</span>
            <Select
              value={filters.accountId}
              onChange={(event) => updateFilter('accountId', event.target.value)}
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="field-control">
            <span>Status</span>
            <Select
              value={filters.status}
              onChange={(event) =>
                updateFilter('status', event.target.value as TransactionFilters['status'])
              }
            >
              <option value="">Any status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </Select>
          </label>
          <label className="field-control">
            <span>From</span>
            <input
              type="date"
              value={filters.dateFrom}
              aria-invalid={dateRangeInvalid}
              aria-describedby={dateRangeInvalid ? 'transaction-date-error' : undefined}
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
            />
          </label>
          <label className="field-control">
            <span>To</span>
            <input
              type="date"
              value={filters.dateTo}
              aria-invalid={dateRangeInvalid}
              aria-describedby={dateRangeInvalid ? 'transaction-date-error' : undefined}
              onChange={(event) => updateFilter('dateTo', event.target.value)}
            />
          </label>
          {dateRangeInvalid ? (
            <small
              className="field-error transaction-date-error"
              id="transaction-date-error"
              role="alert"
            >
              “From” must be on or before “To”. Dates are not applied until the range is valid.
            </small>
          ) : null}
        </div>
        <footer>
          <span>
            {filtered.length} of {data.length} transactions
          </span>
          {hiddenFilterCount > 0 ? (
            <button type="button" onClick={resetFilters}>
              Clear filters
            </button>
          ) : null}
        </footer>
      </section>

      {isLoading ? (
        <div className="transaction-loading" aria-busy="true">
          <span className="sr-only">Loading transactions</span>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton className="table-skeleton" key={item} />
          ))}
        </div>
      ) : isError ? (
        <Card className="error-state" role="alert">
          <h2>Transactions are unavailable</h2>
          <p>Try again in a moment.</p>
        </Card>
      ) : !data.length ? (
        <EmptyState
          title="Record your first transaction"
          description="Completed income and expenses update account balances. Pending and failed rows do not."
          action={
            activeAccounts.length > 0 ? (
              <Button variant="secondary" onClick={() => setEditing(null)}>
                <Plus size={16} />
                Add transaction
              </Button>
            ) : (
              <Link className="button button-secondary" to="/app/accounts">
                Add an account first
              </Link>
            )
          }
        />
      ) : !visible.length ? (
        <EmptyState
          title="No transactions match these filters"
          description="Adjust the dates, type, or search, or clear the filters."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              <Filter size={16} />
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <section className="transaction-table-shell balancil-box" aria-label="Transaction ledger">
            <div className="data-heading">
              <div>
                <p className="data-label">Ledger</p>
                <h2>
                  Showing {rangeStart}–{rangeEnd} of {filtered.length}
                </h2>
              </div>
              <p className="data-detail">
                Page {safePage} of {pages}
              </p>
            </div>
            <LedgerList
              className="transaction-ledger-list"
              aria-label="Transactions matching the filters"
            >
              {visible.map((transaction) => {
                const category = categories.find((item) => item.id === transaction.categoryId);
                const account = accounts.find((item) => item.id === transaction.accountId);
                return (
                  <LedgerRow
                    className="transaction-ledger-row"
                    aria-label={`${transaction.merchant}, ${transaction.description}, ${transaction.status}, ${transaction.type === 'expense' ? 'minus' : 'plus'} ${formatCurrency(transaction.amount)}`}
                    key={transaction.id}
                  >
                    <CategoryMark icon={category?.icon} color={category?.color} />
                    <div className="transaction-row-copy">
                      <strong>{transaction.merchant}</strong>
                      <small>{transaction.description}</small>
                      <span>
                        {category?.name ?? 'Other'} · {account?.name ?? 'Unknown'} ·{' '}
                        <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                      </span>
                    </div>
                    <StatusPill
                      tone={
                        transaction.status === 'failed'
                          ? 'negative'
                          : transaction.status === 'pending'
                            ? 'attention'
                            : 'positive'
                      }
                    >
                      {transaction.status}
                    </StatusPill>
                    <b className={`money-value ${transaction.type}`}>
                      <span className="money-sign" aria-hidden="true">
                        {transaction.type === 'expense' ? '−' : '+'}
                      </span>
                      {formatCurrency(transaction.amount)}
                    </b>
                    <div className="row-actions">
                      <Button
                        variant="ghost"
                        aria-label={`Duplicate ${transaction.merchant}`}
                        onClick={() => {
                          setDuplicating(true);
                          setEditing({
                            ...transaction,
                            id: '',
                            date: formatDateInput(),
                          });
                        }}
                      >
                        <Copy size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Edit ${transaction.merchant}`}
                        onClick={() => setEditing(transaction)}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Delete ${transaction.merchant}`}
                        onClick={() => setDeleting(transaction)}
                      >
                        <Trash size={15} />
                      </Button>
                    </div>
                  </LedgerRow>
                );
              })}
            </LedgerList>
          </section>

          <footer className="transaction-pagination">
            <span>
              Showing {rangeStart}–{rangeEnd} of {filtered.length}
            </span>
            <div>
              <Button
                variant="secondary"
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="secondary"
                disabled={safePage === pages}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </footer>
        </>
      )}

      {editing !== undefined || requestedFromHeader ? (
        <TransactionModal
          transaction={editing}
          accounts={accounts}
          categories={categories}
          open
          duplicate={duplicating}
          onClose={closeTransactionModal}
          onSaved={() => {
            closeTransactionModal();
            notify(
              duplicating
                ? 'Transaction duplicated'
                : editing
                  ? 'Transaction updated'
                  : 'Transaction added',
            );
          }}
        />
      ) : null}
      <CategoryManager
        categories={categories}
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />
      <RecurringManager
        accounts={activeAccounts}
        categories={categories}
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete transaction?"
        description="This action cannot be undone."
        confirmLabel="Delete transaction"
        pending={mutations.remove.isPending}
      >
        <p>
          Delete <strong>{deleting?.merchant}</strong> for{' '}
          {deleting && formatCurrency(deleting.amount)}? Any balance it contributed will be
          reversed.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function RecurringManager({
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
                      {template.frequency} · Next {formatDate(template.nextDueDate)}
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

function TransactionModal({
  transaction,
  accounts,
  categories,
  open,
  duplicate,
  onClose,
  onSaved,
}: {
  transaction: Transaction | null | undefined;
  accounts: Account[];
  categories: Category[];
  open: boolean;
  duplicate?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mutations = useTransactionMutations();
  const notify = useToast();
  const availableAccounts = transaction
    ? accounts.filter(
        (account) => account.isActive !== false || account.id === transaction.accountId,
      )
    : accounts.filter((account) => account.isActive !== false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<TransactionFormInput, unknown, TransactionForm>({
    resolver: zodResolver(transactionSchema),
    values: {
      merchant: transaction?.merchant ?? '',
      description: transaction?.description ?? '',
      amount: transaction?.amount ?? 0,
      type: transaction?.type ?? 'expense',
      status: transaction?.status ?? 'completed',
      categoryId: transaction?.categoryId ?? '',
      accountId: transaction?.accountId ?? availableAccounts[0]?.id ?? '',
      date: transaction?.date ?? formatDateInput(),
    },
  });
  const selectedType = useWatch({ control, name: 'type' });
  const selectedCategoryId = useWatch({ control, name: 'categoryId' });

  useEffect(() => {
    if (
      categories.length > 0 &&
      selectedCategoryId &&
      !categories.some(
        (category) => category.id === selectedCategoryId && category.type === selectedType,
      )
    ) {
      setValue('categoryId', '', { shouldValidate: true });
    }
  }, [categories, selectedCategoryId, selectedType, setValue]);
  const submit = handleSubmit(async (values) => {
    try {
      await mutations.save.mutateAsync({
        ...values,
        id: transaction?.id,
      });
      reset();
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transaction could not be saved', 'error');
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        duplicate ? 'Duplicate transaction' : transaction ? 'Edit transaction' : 'Add transaction'
      }
      description="Add or edit a transaction in your ledger."
    >
      <form className="form-grid" onSubmit={submit}>
        <label className="field-control span-2">
          Merchant
          <input
            aria-invalid={Boolean(errors.merchant)}
            aria-describedby={errors.merchant ? 'transaction-merchant-error' : undefined}
            {...register('merchant')}
            placeholder="e.g. Green Market"
          />
          {errors.merchant && (
            <small className="field-error" id="transaction-merchant-error">
              {errors.merchant.message}
            </small>
          )}
        </label>
        <label className="field-control span-2">
          Description
          <input
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'transaction-description-error' : undefined}
            {...register('description')}
            placeholder="What was this for?"
          />
          {errors.description && (
            <small className="field-error" id="transaction-description-error">
              {errors.description.message}
            </small>
          )}
        </label>
        <label className="field-control">
          Amount
          <input
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'transaction-amount-error' : undefined}
            {...register('amount', { valueAsNumber: true })}
            inputMode="decimal"
          />
          {errors.amount && (
            <small className="field-error" id="transaction-amount-error">
              {errors.amount.message}
            </small>
          )}
        </label>
        <label className="field-control">
          Type
          <Select {...register('type')}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </label>
        <label className="field-control">
          Category
          <Select
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? 'transaction-category-error' : undefined}
            {...register('categoryId')}
          >
            <option value="">Choose category</option>
            {categories
              .filter((category) => category.type === selectedType)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </Select>
          {errors.categoryId && (
            <small className="field-error" id="transaction-category-error">
              {errors.categoryId.message}
            </small>
          )}
        </label>
        <label className="field-control">
          Account
          <Select {...register('accountId')}>
            {availableAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="field-control">
          Date
          <input type="date" {...register('date')} />
        </label>
        <label className="field-control">
          Status
          <Select {...register('status')}>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </Select>
          <small className="field-hint">Only completed transactions change balances.</small>
        </label>
        <footer className="form-actions span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutations.save.isPending}>
            {mutations.save.isPending ? 'Saving…' : 'Save transaction'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function CategoryManager({
  categories,
  open,
  onClose,
}: {
  categories: Category[];
  open: boolean;
  onClose: () => void;
}) {
  const mutations = useCategoryMutations();
  const notify = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    type: 'expense' as Category['type'],
    color: '#64748b',
    icon: 'circle',
  });

  const startEditing = (category?: Category) => {
    setEditing(category ?? null);
    setDraft(
      category
        ? {
            name: category.name,
            type: category.type ?? 'expense',
            color: category.color,
            icon: category.icon,
          }
        : { name: '', type: 'expense', color: '#64748b', icon: 'circle' },
    );
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutations.save.mutateAsync({
        ...draft,
        type: draft.type ?? 'expense',
        id: editing?.id,
      });
      notify(editing ? 'Category updated' : 'Category added');
      startEditing();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Category could not be saved', 'error');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      notify('Category removed');
      setDeleting(null);
      if (editing?.id === deleting.id) startEditing();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Category could not be removed', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage categories"
      description="Create and maintain the categories used by transactions and budgets."
    >
      <div className="category-manager">
        <div className="category-manager-list" aria-label="Your categories">
          {categories.map((category) => (
            <div className="category-manager-row" key={category.id}>
              <CategoryMark icon={category.icon} color={category.color} />
              <span>
                <strong>{category.name}</strong>
                <small>{category.type ?? 'expense'}</small>
              </span>
              <div className="row-actions">
                <Button
                  variant="ghost"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => startEditing(category)}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => setDeleting(category)}
                >
                  <Trash size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {deleting ? (
          <div className="confirmation category-manager-form">
            <div className="confirmation-body">
              <p>
                Delete <strong>{deleting.name}</strong>? Categories used by transactions or budgets
                cannot be deleted.
              </p>
            </div>
            <div className="confirmation-actions">
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={remove} disabled={mutations.remove.isPending}>
                {mutations.remove.isPending ? 'Deleting…' : 'Delete category'}
              </Button>
            </div>
          </div>
        ) : (
          <form className="form-grid category-manager-form" onSubmit={save}>
            <label className="field-control span-2">
              Category name
              <input
                required
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="field-control">
              Type
              <Select
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value as Category['type'],
                  }))
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </label>
            <label className="field-control">
              Icon
              <Select
                value={draft.icon}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, icon: event.target.value }))
                }
              >
                {[
                  'briefcase',
                  'home',
                  'utensils',
                  'car',
                  'bag',
                  'heart',
                  'laptop',
                  'ticket',
                  'zap',
                  'circle',
                ].map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </Select>
            </label>
            <label className="form-swatch span-2">
              <span>
                <strong>Category color</strong>
                <small>Used for this category&rsquo;s marker in lists and charts.</small>
              </span>
              <input
                type="color"
                value={draft.color}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, color: event.target.value }))
                }
              />
            </label>
            <footer className="form-actions span-2">
              {editing ? (
                <Button type="button" variant="secondary" onClick={() => startEditing()}>
                  Cancel edit
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={onClose}>
                  Close
                </Button>
              )}
              <Button type="submit" disabled={mutations.save.isPending}>
                {mutations.save.isPending ? 'Saving…' : editing ? 'Save category' : 'Add category'}
              </Button>
            </footer>
          </form>
        )}
      </div>
    </Modal>
  );
}
