import { Close } from '../../components/icons';
import { Select } from '../../components/ui';
import type { Account, Category, TransactionFilters } from '../../types';

export function TransactionFilterPanel({
  filters,
  categories,
  accounts,
  open,
  dateRangeInvalid,
  hiddenFilterCount,
  matchCount,
  totalCount,
  onUpdate,
  onReset,
  onClose,
}: {
  filters: TransactionFilters;
  categories: Category[];
  accounts: Account[];
  open: boolean;
  dateRangeInvalid: boolean;
  hiddenFilterCount: number;
  matchCount: number;
  totalCount: number;
  onUpdate: <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <section
      id="transaction-filters"
      className={`transaction-filter-panel balancil-box ${open ? 'is-open' : ''}`}
      aria-label="Transaction filters"
    >
      <header>
        <div>
          <strong>Filter transactions</strong>
          <small>Narrow results without losing context.</small>
        </div>
        <button type="button" className="filter-close" aria-label="Close filters" onClick={onClose}>
          <Close size={17} />
        </button>
      </header>
      <div className="transaction-filter-grid">
        <label className="field-control">
          <span>Category</span>
          <Select
            value={filters.categoryId}
            onChange={(event) => onUpdate('categoryId', event.target.value)}
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
            onChange={(event) => onUpdate('accountId', event.target.value)}
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
              onUpdate('status', event.target.value as TransactionFilters['status'])
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
            onChange={(event) => onUpdate('dateFrom', event.target.value)}
          />
        </label>
        <label className="field-control">
          <span>To</span>
          <input
            type="date"
            value={filters.dateTo}
            aria-invalid={dateRangeInvalid}
            aria-describedby={dateRangeInvalid ? 'transaction-date-error' : undefined}
            onChange={(event) => onUpdate('dateTo', event.target.value)}
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
          {matchCount} of {totalCount} transactions
        </span>
        {hiddenFilterCount > 0 ? (
          <button type="button" onClick={onReset}>
            Clear filters
          </button>
        ) : null}
      </footer>
    </section>
  );
}
