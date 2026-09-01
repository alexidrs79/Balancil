import { type ReactNode } from 'react';
import { CategoryMark } from '../../components/visuals';
import type { Category, Transaction } from '../../types';
import { formatCurrency } from '../../utils/finance';
import { formatAnalyticsMonth, shortDate } from './format';

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
  detail,
  action,
}: {
  label?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <header className="data-heading">
      <div>
        {label && <p className="data-label">{label}</p>}
        <h2>{title}</h2>
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
      <time dateTime={transaction.date}>{shortDate(transaction.date)}</time>
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
