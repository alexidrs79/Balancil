import { type ReactNode } from 'react';
import { CategoryMark } from '../../components/visuals';
import type { Category, Transaction } from '../../types';
import { formatAnalyticsMonth, formatCurrency, formatShortDate } from '../../utils/finance';

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p>{label ? formatAnalyticsMonth(label, true) : null}</p>
      {payload.map((item) => (
        <strong key={item.name} style={{ color: item.color }}>
          <span>
            <i style={{ background: item.color }} aria-hidden="true" />
            {item.name}
          </span>
          {formatCurrency(item.value)}
        </strong>
      ))}
    </div>
  );
}

export function SectionHeader({
  label,
  title,
  titleId,
  detail,
  action,
}: {
  label?: string;
  title: string;
  titleId?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <header className="data-heading">
      <div>
        {label && <p className="data-label">{label}</p>}
        <h2 id={titleId}>{title}</h2>
        {detail && <p className="data-detail">{detail}</p>}
      </div>
      {action}
    </header>
  );
}

export function TransactionRow({
  transaction,
  categories = [],
}: {
  transaction: Transaction;
  categories?: Category[];
}) {
  const category = categories.find((item) => item.id === transaction.categoryId);
  return (
    <div className="activity-row">
      <time dateTime={transaction.date}>{formatShortDate(transaction.date)}</time>
      <CategoryMark icon={category?.icon} color={category?.color} />
      <div>
        <strong>{transaction.merchant}</strong>
        <small>
          {category?.name ?? 'Other'} · {transaction.description}
        </small>
      </div>
      <b className={`money-value ${transaction.type}`}>
        {transaction.type === 'expense' ? '−' : '+'}
        {formatCurrency(transaction.amount)}
      </b>
    </div>
  );
}
