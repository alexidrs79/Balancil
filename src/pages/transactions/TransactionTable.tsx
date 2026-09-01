import { Copy, Pencil, Trash } from '../../components/icons';
import { Button, LedgerList, LedgerRow, StatusPill } from '../../components/ui';
import { CategoryMark } from '../../components/visuals';
import type { Account, Category, Transaction } from '../../types';
import { formatCurrency, formatLedgerDate } from '../../utils/finance';

function statusTone(status: Transaction['status']) {
  if (status === 'failed') return 'negative';
  return status === 'pending' ? 'attention' : 'positive';
}

export function TransactionTable({
  transactions,
  categories,
  accounts,
  rangeStart,
  rangeEnd,
  matchCount,
  page,
  pageCount,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  rangeStart: number;
  rangeEnd: number;
  matchCount: number;
  page: number;
  pageCount: number;
  onDuplicate: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  return (
    <section className="transaction-table-shell balancil-box" aria-label="Transaction ledger">
      <div className="data-heading">
        <div>
          <p className="data-label">Ledger</p>
          <h2>
            Showing {rangeStart}–{rangeEnd} of {matchCount}
          </h2>
        </div>
        <p className="data-detail">
          Page {page} of {pageCount}
        </p>
      </div>
      <LedgerList
        className="transaction-ledger-list"
        aria-label="Transactions matching the filters"
      >
        {transactions.map((transaction) => {
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
                  <time dateTime={transaction.date}>{formatLedgerDate(transaction.date)}</time>
                </span>
              </div>
              <StatusPill tone={statusTone(transaction.status)}>{transaction.status}</StatusPill>
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
                  onClick={() => onDuplicate(transaction)}
                >
                  <Copy size={15} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Edit ${transaction.merchant}`}
                  onClick={() => onEdit(transaction)}
                >
                  <Pencil size={15} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${transaction.merchant}`}
                  onClick={() => onDelete(transaction)}
                >
                  <Trash size={15} />
                </Button>
              </div>
            </LedgerRow>
          );
        })}
      </LedgerList>
    </section>
  );
}
