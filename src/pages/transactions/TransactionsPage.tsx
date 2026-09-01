import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Pencil,
  Plus,
  Search,
  Upload,
} from '../../components/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  AnimatedValue,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
  useToast,
} from '../../components/ui';
import {
  useAccounts,
  useCategories,
  useRecurringDrafts,
  useTransactionMutations,
  useTransactions,
} from '../../hooks/useFinance';
import { financeApi } from '../../services/financeService';
import { downloadBlob } from '../../utils/download';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { Transaction, TransactionFilters, TransactionQuery } from '../../types';
import { formatCurrency, formatDateInput, hiddenTransactionFilterCount } from '../../utils/finance';
import { TransactionModal } from './TransactionModal';
import { RecurringManager } from './RecurringManager';
import { CategoryManager } from './CategoryManager';
import { RecurringDuePanel } from './RecurringDuePanel';
import { TransactionTable } from './TransactionTable';
import { TransactionFilterPanel } from './TransactionFilterPanel';
import { TransactionImportModal } from './TransactionImportModal';

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

export function TransactionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedFromHeader = Boolean(
    (location.state as { createTransaction?: boolean } | null)?.createTransaction,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: recurringDrafts = [] } = useRecurringDrafts();
  const activeAccounts = accounts.filter((account) => account.isActive !== false);
  const mutations = useTransactionMutations();
  const notify = useToast();
  const [filters, setFilters] = useState<TransactionFilters>(() => ({
    ...defaultFilters,
    search: new URLSearchParams(location.search).get('q') ?? '',
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<Transaction | null | undefined>(undefined);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const dateRangeInvalid = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo,
  );
  // Typing should not fire a request per keystroke; the rest of the controls are
  // discrete choices, so only the search box is debounced.
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const query = useMemo<TransactionQuery>(
    () => ({
      ...filters,
      search: debouncedSearch,
      // An inverted range is a half-finished edit, not a request for no results.
      ...(dateRangeInvalid ? { dateFrom: '', dateTo: '' } : {}),
      page,
      perPage: pageSize,
    }),
    [filters, debouncedSearch, dateRangeInvalid, page],
  );
  const { data: ledger, isLoading, isError } = useTransactions(query);
  const visible = ledger?.data ?? [];
  const meta = ledger?.meta;
  const summary = ledger?.summary;
  const matchCount = meta?.total ?? 0;
  const ledgerTotal = summary?.ledgerTotal ?? 0;
  const pages = Math.max(1, meta?.lastPage ?? 1);
  const safePage = meta?.currentPage ?? page;
  const hiddenFilterCount = hiddenTransactionFilterCount(filters);
  const filteredSummary = summary ?? { income: 0, expenses: 0, savings: 0 };
  const completedCount = summary?.completedCount ?? 0;
  const rangeStart = meta?.from ?? 0;
  const rangeEnd = meta?.to ?? 0;

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

  // Exports what the filters currently describe, not just the page on screen.
  const exportLedger = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await financeApi.exportTransactions(query);
      downloadBlob(blob, filename);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The export could not be created', 'error');
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      // Removing the only row on a trailing page would otherwise strand the view
      // past the end of the ledger.
      if (visible.length === 1 && page > 1) setPage(page - 1);
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
            {completedCount} completed of {matchCount} matching
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
          <Button
            variant="secondary"
            className="inline-action"
            disabled={!ledgerTotal || exporting}
            onClick={() => void exportLedger()}
          >
            <Download size={16} />
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
          <Button
            variant="secondary"
            className="inline-action"
            disabled={!activeAccounts.length || !categories.length}
            onClick={() => setImportOpen(true)}
          >
            <Upload size={16} />
            Import
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

      <RecurringDuePanel drafts={recurringDrafts} accounts={accounts} categories={categories} />

      <TransactionFilterPanel
        filters={filters}
        categories={categories}
        accounts={accounts}
        open={filtersOpen}
        dateRangeInvalid={dateRangeInvalid}
        hiddenFilterCount={hiddenFilterCount}
        matchCount={matchCount}
        totalCount={ledgerTotal}
        onUpdate={updateFilter}
        onReset={resetFilters}
        onClose={() => setFiltersOpen(false)}
      />

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
      ) : !ledgerTotal ? (
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
          <TransactionTable
            transactions={visible}
            categories={categories}
            accounts={accounts}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            matchCount={matchCount}
            page={safePage}
            pageCount={pages}
            onDuplicate={(transaction) => {
              setDuplicating(true);
              setEditing({ ...transaction, id: '', date: formatDateInput() });
            }}
            onEdit={setEditing}
            onDelete={setDeleting}
          />

          <footer className="transaction-pagination">
            <span>
              Showing {rangeStart}–{rangeEnd} of {matchCount}
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
      {importOpen ? <TransactionImportModal onClose={() => setImportOpen(false)} /> : null}
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
