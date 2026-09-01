import { Alert, ArrowRight, Pencil, Plus, Trash } from '../components/icons';
import { useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LedgerList,
  LedgerRow,
  Modal,
  PageHeader,
  Progress,
  Select,
  Skeleton,
  AnimatedValue,
  TrendBadge,
  StatusPill,
  PeriodControl,
  useToast,
} from '../components/ui';
import { AccountMark, CategoryMark, MiniSparkline, TextLink } from '../components/visuals';
import { useAuth } from '../contexts/AuthContext';
import {
  useAccountMutations,
  useAccounts,
  useAnalytics,
  useCategories,
  useDashboard,
  useTransferMutations,
  useTransfers,
  useTransactions,
} from '../hooks/useFinance';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type {
  Account,
  AccountType,
  Category,
  Transaction,
  TransactionStatus,
  Transfer,
} from '../types';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDateInput,
  relativeBarWidth,
  averageAcrossWindow,
  latestChangeLabel,
  savingsRate,
} from '../utils/finance';

const chartColors = {
  income: 'var(--chart-income)',
  expense: 'var(--chart-expense)',
};

type AnalyticsPreset = '1' | '3' | '6' | '12' | '24' | 'custom';

function formatAnalyticsDate(value: string) {
  return formatDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAnalyticsMonth(value: string, includeYear: boolean) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const [year, month] = value.split('-').map(Number);
  return formatDate(new Date(year, month - 1, 1), {
    month: 'short',
    year: includeYear ? '2-digit' : undefined,
  });
}

function ChartTooltip({
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

function SectionHeader({
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

function shortDate(value: string) {
  return formatDate(value, {
    month: 'short',
    day: 'numeric',
  });
}

function latestActivityForAccount(accountId: string, transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.accountId === accountId)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
}

function TransactionRow({
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
  transactions,
  onEdit,
  onDelete,
}: {
  items: Account[];
  label: string;
  transactions: Transaction[];
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
          const latestActivity = latestActivityForAccount(account.id, transactions);
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

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const { user } = useAuth();
  const compactChart = useMediaQuery('(max-width: 768px)');

  if (isLoading) {
    return (
      <div className="page product-page overview-page">
        <Skeleton className="skeleton-title" />
        <Skeleton className="position-skeleton" />
        <div className="overview-detail-grid">
          <Skeleton className="overview-chart-skeleton" />
          <Skeleton className="overview-chart-skeleton" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page product-page">
        <Card className="error-state" role="alert">
          <h2>We couldn’t load your overview</h2>
          <p>Please refresh and try again.</p>
        </Card>
      </div>
    );
  }

  const summary = data.summary;
  const totalBalance = data.accounts.reduce((total, account) => total + account.balance, 0);
  const savingsRateValue = savingsRate(summary.income, summary.savings);
  const spendingByCategory = data.categories
    .filter((category) => category.type === 'expense')
    .map((category) => ({
      ...category,
      value:
        data.categorySpending.find((spending) => spending.categoryId === category.id)?.amount ?? 0,
    }))
    .filter((category) => category.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxCategory = Math.max(...spendingByCategory.map((category) => category.value), 1);
  const attentionBudget = data.budgets
    .map((budget) => ({
      ...budget,
      category: data.categories.find((category) => category.id === budget.categoryId),
      percent: budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent)[0];
  const flowMonths = data.monthlyTrend.length;
  const hasFlowActivity = data.monthlyTrend.some((month) => month.income > 0 || month.expenses > 0);
  const flowDetail = flowMonths
    ? `Income compared with expenses over ${flowMonths} ${flowMonths === 1 ? 'month' : 'months'}`
    : 'Income compared with expenses';
  const averageMonthlyIncome = averageAcrossWindow(data.monthlyTrend.map((month) => month.income));
  const averageMonthlySpend = averageAcrossWindow(data.monthlyTrend.map((month) => month.expenses));
  const netAcrossTrend = data.monthlyTrend.reduce((total, month) => total + month.savings, 0);
  const trendStartLabel = flowMonths ? formatAnalyticsMonth(data.monthlyTrend[0].period, true) : '';
  const trendEndLabel = flowMonths
    ? formatAnalyticsMonth(data.monthlyTrend[flowMonths - 1].period, true)
    : '';
  const now = new Date();
  const timeZone = user?.timezone ?? 'UTC';
  const currentHour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone,
    }).format(now),
  );
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const fullDate = formatDate(now, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
  const currentPeriod = formatDate(now, {
    month: 'long',
    year: 'numeric',
    timeZone,
  });
  const onboardingSteps = [
    {
      label: 'Add an account',
      detail: 'Record the starting balance of a real account.',
      to: '/app/accounts',
      done: data.accounts.length > 0,
    },
    {
      label: 'Record a transaction',
      detail: 'Add completed income or spending to update the ledger.',
      to: '/app/transactions',
      done: data.transactions.length > 0,
    },
    {
      label: 'Set a budget',
      detail: 'Give one expense category a weekly, monthly, or yearly limit.',
      to: '/app/budgets',
      done: data.budgets.length > 0,
    },
    {
      label: 'Create a savings goal',
      detail: 'Name a target and start tracking contributions.',
      to: '/app/goals',
      done: data.goals.length > 0,
    },
  ];
  const onboardingComplete = onboardingSteps.every((step) => step.done);

  return (
    <div className="page product-page overview-page">
      <header className="overview-intro">
        <div>
          <p className="eyebrow">{fullDate}</p>
          <h1>
            {greeting}, {firstName}
          </h1>
          <p>Account balances and activity for {currentPeriod}.</p>
        </div>
      </header>

      {!onboardingComplete ? (
        <section className="onboarding-checklist balancil-box" aria-labelledby="onboarding-title">
          <header>
            <div>
              <p className="data-label">Getting started</p>
              <h2 id="onboarding-title">Build your ledger</h2>
            </div>
            <strong>
              {onboardingSteps.filter((step) => step.done).length}/{onboardingSteps.length}
            </strong>
          </header>
          <ol>
            {onboardingSteps.map((step, index) => (
              <li className={step.done ? 'is-complete' : ''} key={step.label}>
                <span aria-hidden="true">{step.done ? '✓' : index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </div>
                {step.done ? <small>Done</small> : <TextLink to={step.to}>Start</TextLink>}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {data.accounts.length === 0 ? (
        <p className="onboarding-note">
          Balancil uses only the records you enter. It does not connect to banks or import live
          feeds.
        </p>
      ) : (
        <>
          <section className="liquidity-hero balancil-box" aria-labelledby="available-balance">
            <div className="liquidity-hero-main">
              <div className="liquidity-copy">
                <p id="available-balance">Total balance</p>
                <strong className="position-value">
                  <AnimatedValue value={totalBalance} format={formatCurrency} />
                </strong>
                <TrendBadge
                  positive={summary.savings >= 0}
                  value={`${summary.savings >= 0 ? '+' : '−'}${formatCurrency(Math.abs(summary.savings))}`}
                  label="net this month"
                />
              </div>
              <figure className="liquidity-spark-figure">
                <MiniSparkline
                  values={data.monthlyTrend.map((point) => point.savings)}
                  className="liquidity-spark"
                />
                <figcaption className="liquidity-spark-caption">
                  <span>{trendStartLabel}</span>
                  <strong>Net by month</strong>
                  <span>{trendEndLabel}</span>
                </figcaption>
              </figure>
            </div>
            <div className="overview-facts" aria-label="Monthly totals">
              <dl>
                <div>
                  <dt>Monthly in</dt>
                  <dd className="positive">
                    <AnimatedValue value={summary.income} format={formatCurrency} />
                  </dd>
                  <small>Completed income this month</small>
                </div>
                <div>
                  <dt>Monthly out</dt>
                  <dd className="negative">
                    <AnimatedValue value={summary.expenses} format={formatCurrency} />
                  </dd>
                  <small>Completed expenses this month</small>
                </div>
                <div>
                  <dt>Savings rate</dt>
                  <dd>
                    <AnimatedValue
                      value={savingsRateValue}
                      format={(value) => `${Math.round(value)}%`}
                    />
                  </dd>
                  <small>{formatCurrency(Math.max(summary.savings, 0))} kept this month</small>
                </div>
              </dl>
            </div>
          </section>

          {attentionBudget ? (
            <aside
              className="overview-insight section-open"
              aria-labelledby="overview-insight-title"
            >
              <span className="overview-insight-icon" aria-hidden="true">
                <Alert size={18} />
              </span>
              <div>
                <p>Budget watch</p>
                <strong id="overview-insight-title">
                  {attentionBudget.category?.name ?? 'Top category'} is at {attentionBudget.percent}
                  % of budget
                </strong>
                <small>
                  {formatCurrency(Math.max(attentionBudget.limit - attentionBudget.spent, 0))}{' '}
                  remains before the {attentionBudget.period ?? 'monthly'} limit.
                </small>
              </div>
              <span className="overview-insight-progress" aria-hidden="true">
                <span
                  style={{
                    ['--insight-progress' as string]: `${Math.min(attentionBudget.percent, 100)}%`,
                  }}
                />
              </span>
              <TextLink to="/app/budgets">Review budget</TextLink>
            </aside>
          ) : null}

          <div className="overview-split">
            <section className="surface-panel balancil-box account-summary-list">
              <SectionHeader
                label="Accounts"
                title="Where your money sits"
                action={<TextLink to="/app/accounts">View accounts</TextLink>}
              />
              <div className="account-rows">
                {data.accounts.map((account) => (
                  <div className="account-summary-row" key={account.id}>
                    <AccountMark type={account.type} color={account.color} />
                    <div>
                      <strong>{account.name}</strong>
                      <small>{account.institution}</small>
                    </div>
                    <b className={account.balance < 0 ? 'negative' : ''}>
                      {formatCurrency(account.balance)}
                    </b>
                  </div>
                ))}
              </div>
              <footer className="panel-total">
                <span>Total across {data.accounts.length} accounts</span>
                <b>{formatCurrency(totalBalance)}</b>
              </footer>
            </section>

            <section className="surface-panel balancil-box recent-activity-section">
              <SectionHeader
                label="Recent activity"
                title="Latest transactions"
                action={<TextLink to="/app/transactions">View all</TextLink>}
              />
              <div className="activity-list">
                {data.transactions.slice(0, 5).map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    categories={data.categories}
                  />
                ))}
              </div>
            </section>
          </div>

          <section
            className="surface-panel section-open money-flow-section"
            aria-labelledby="money-flow-title"
          >
            <SectionHeader
              label="Money flow"
              title="How your money is changing"
              detail={flowDetail}
              action={
                <span className="chart-legend">
                  <i className="income" /> Income <i className="expense" /> Expenses
                </span>
              }
            />
            <div className="chart-frame">
              <div className="primary-chart" id="money-flow-title">
                {hasFlowActivity ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.monthlyTrend}
                      margin={{ top: 12, right: 8, bottom: 0, left: compactChart ? -24 : 0 }}
                    >
                      <defs>
                        <linearGradient id="money-flow-income" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColors.income} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={chartColors.income} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="money-flow-expense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColors.expense} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={chartColors.expense} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="rgb(20 32 28 / 0.09)"
                        strokeWidth={1}
                      />
                      <XAxis
                        dataKey="period"
                        axisLine={{ stroke: 'rgb(20 32 28 / 0.16)' }}
                        tickLine={false}
                        tickMargin={12}
                        interval={compactChart ? 1 : 0}
                        tickFormatter={(value) => formatAnalyticsMonth(String(value), false)}
                        tick={{ fill: 'var(--muted)', fontSize: compactChart ? 10 : 11 }}
                      />
                      <YAxis
                        hide={compactChart}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        width={72}
                        tick={{ fill: 'var(--muted)', fontSize: 11 }}
                        tickFormatter={(value) => formatCompactCurrency(Number(value))}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ stroke: 'rgb(20 32 28 / 0.14)', strokeWidth: 1 }}
                      />
                      <Area
                        type="linear"
                        dataKey="income"
                        stroke={chartColors.income}
                        strokeWidth={2.2}
                        fill="url(#money-flow-income)"
                        isAnimationActive
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
                      <Area
                        type="linear"
                        dataKey="expenses"
                        stroke={chartColors.expense}
                        strokeWidth={2}
                        fill="url(#money-flow-expense)"
                        isAnimationActive
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    <strong>No completed activity yet</strong>
                    <small>Add a completed transaction to start the trend.</small>
                  </div>
                )}
              </div>
              <dl className="chart-insights">
                <div>
                  <dt>Average in over {flowMonths} months</dt>
                  <dd>{formatCurrency(averageMonthlyIncome)}</dd>
                </div>
                <div>
                  <dt>Average out over {flowMonths} months</dt>
                  <dd>{formatCurrency(averageMonthlySpend)}</dd>
                </div>
                <div>
                  <dt>Net across {flowMonths} months</dt>
                  <dd className={netAcrossTrend < 0 ? 'negative' : undefined}>
                    {formatCurrency(netAcrossTrend)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="surface-panel balancil-box spending-summary-section">
            <SectionHeader
              label="Spending summary"
              title={formatCurrency(summary.expenses)}
              detail={`${spendingByCategory.length} active categories this month`}
              action={<TextLink to="/app/analytics">View analysis</TextLink>}
            />
            <ul className="ranked-list">
              {spendingByCategory.length === 0 ? (
                <li className="analytics-list-empty">No completed expenses this month yet.</li>
              ) : null}
              {spendingByCategory.slice(0, 5).map((category) => {
                const share = summary.expenses ? (category.value / summary.expenses) * 100 : 0;
                return (
                  <li
                    className="ranked-row"
                    key={category.id}
                    style={{
                      ['--bar' as string]: `${relativeBarWidth(category.value, maxCategory)}%`,
                      ['--mark-color' as string]: category.color,
                    }}
                  >
                    <span className="ranked-name">
                      <CategoryMark icon={category.icon} color={category.color} />
                      {category.name}
                    </span>
                    <span className="ranked-track" aria-hidden="true">
                      <span />
                    </span>
                    <strong className="ranked-amount">{formatCurrency(category.value)}</strong>
                    <span className="ranked-share">{share.toFixed(1)}%</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

export function AccountsPage() {
  const { data: accounts = [], isLoading, isError } = useAccounts();
  const { data: transactions = [] } = useTransactions();
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
  const [transferDraft, setTransferDraft] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    date: formatDateInput(),
    description: '',
    status: 'completed' as TransactionStatus,
  });
  const [accountDraft, setAccountDraft] = useState({
    name: '',
    type: 'checking' as AccountType,
    institution: '',
    balance: 0,
    color: '#123d34',
    isActive: true,
  });
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

  const saveAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = {
        ...accountDraft,
        id: editingAccount?.id,
        balance: editingAccount ? undefined : accountDraft.balance,
      };
      await mutations.save.mutateAsync(payload);
      setConnectOpen(false);
      setEditingAccount(null);
      setAccountDraft({
        name: '',
        type: 'checking',
        institution: '',
        balance: 0,
        color: '#123d34',
        isActive: true,
      });
      notify(editingAccount ? 'Account updated' : 'Account added');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Account could not be saved', 'error');
    }
  };

  const openAccount = (account?: Account) => {
    setEditingAccount(account ?? null);
    setAccountDraft(
      account
        ? {
            name: account.name,
            type: account.type,
            institution: account.institution,
            balance: account.balance,
            color: account.color,
            isActive: account.isActive ?? true,
          }
        : {
            name: '',
            type: 'checking',
            institution: '',
            balance: 0,
            color: '#123d34',
            isActive: true,
          },
    );
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
    const activeAccounts = accounts.filter((account) => account.isActive !== false);
    setEditingTransfer(transfer ?? null);
    setTransferDraft(
      transfer
        ? {
            fromAccountId: transfer.fromAccountId,
            toAccountId: transfer.toAccountId,
            amount: transfer.amount,
            date: transfer.date,
            description: transfer.description,
            status: transfer.status,
          }
        : {
            fromAccountId: activeAccounts[0]?.id ?? '',
            toAccountId: activeAccounts[1]?.id ?? '',
            amount: 0,
            date: formatDateInput(),
            description: '',
            status: 'completed',
          },
    );
    setTransferOpen(true);
  };

  const saveTransfer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await transferMutations.save.mutateAsync({
        ...transferDraft,
        id: editingTransfer?.id,
      });
      setTransferOpen(false);
      setEditingTransfer(null);
      notify(editingTransfer ? 'Transfer updated' : 'Transfer recorded');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Transfer could not be saved', 'error');
    }
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
                  transactions={transactions}
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
              {transactions.slice(0, 6).map((transaction) => (
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
      <Modal
        open={connectOpen}
        onClose={closeAccountModal}
        title={editingAccount ? 'Edit account' : 'Add an account'}
        description={
          editingAccount
            ? 'Update account details. Its balance is maintained by completed transactions.'
            : 'Add an account to your manual ledger.'
        }
      >
        <form className="form-grid" onSubmit={saveAccount}>
          <label className="field-control">
            Account name
            <input
              required
              value={accountDraft.name}
              onChange={(event) =>
                setAccountDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label className="field-control">
            Account type
            <Select
              value={accountDraft.type}
              onChange={(event) =>
                setAccountDraft((current) => ({
                  ...current,
                  type: event.target.value as AccountType,
                }))
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
              value={accountDraft.institution}
              onChange={(event) =>
                setAccountDraft((current) => ({ ...current, institution: event.target.value }))
              }
            />
          </label>
          {editingAccount ? (
            <div className="field-control">
              <span>Current balance</span>
              <p className="field-readout">{formatCurrency(editingAccount.balance)}</p>
              <small className="field-hint">Set by completed transactions.</small>
            </div>
          ) : (
            <label className="field-control">
              Opening balance
              <input
                required
                type="number"
                step="0.01"
                value={accountDraft.balance}
                onChange={(event) =>
                  setAccountDraft((current) => ({
                    ...current,
                    balance: Number(event.target.value),
                  }))
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
              value={accountDraft.color}
              onChange={(event) =>
                setAccountDraft((current) => ({ ...current, color: event.target.value }))
              }
            />
          </label>
          <label className="form-toggle span-2">
            <input
              type="checkbox"
              checked={accountDraft.isActive}
              onChange={(event) =>
                setAccountDraft((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            <span>
              <strong>Active account</strong>
              <small>Inactive accounts stay visible but cannot receive new transactions.</small>
            </span>
          </label>
          <footer className="form-actions span-2">
            <Button type="button" variant="secondary" onClick={closeAccountModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutations.save.isPending}>
              {mutations.save.isPending
                ? 'Saving…'
                : editingAccount
                  ? 'Save account'
                  : 'Add account'}
            </Button>
          </footer>
        </form>
      </Modal>
      <Modal
        open={transferOpen}
        onClose={() => {
          setTransferOpen(false);
          setEditingTransfer(null);
        }}
        title={editingTransfer ? 'Edit transfer' : 'Transfer between accounts'}
        description="Move money without counting it as income or spending."
      >
        <form className="form-grid" onSubmit={saveTransfer}>
          <label className="field-control">
            From account
            <Select
              required
              value={transferDraft.fromAccountId}
              onChange={(event) => {
                const fromAccountId = event.target.value;
                setTransferDraft((current) => ({
                  ...current,
                  fromAccountId,
                  toAccountId:
                    current.toAccountId === fromAccountId
                      ? (accounts.find(
                          (account) => account.isActive !== false && account.id !== fromAccountId,
                        )?.id ?? '')
                      : current.toAccountId,
                }));
              }}
            >
              {accounts
                .filter((account) => account.isActive !== false)
                .map((account) => (
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
              value={transferDraft.toAccountId}
              onChange={(event) =>
                setTransferDraft((current) => ({ ...current, toAccountId: event.target.value }))
              }
            >
              {accounts
                .filter(
                  (account) =>
                    account.isActive !== false && account.id !== transferDraft.fromAccountId,
                )
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
              value={transferDraft.amount}
              onChange={(event) =>
                setTransferDraft((current) => ({
                  ...current,
                  amount: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="field-control">
            Date
            <input
              required
              type="date"
              value={transferDraft.date}
              onChange={(event) =>
                setTransferDraft((current) => ({ ...current, date: event.target.value }))
              }
            />
          </label>
          <label className="field-control span-2">
            Description
            <input
              value={transferDraft.description}
              placeholder="Optional note"
              onChange={(event) =>
                setTransferDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label className="field-control span-2">
            Status
            <Select
              value={transferDraft.status}
              onChange={(event) =>
                setTransferDraft((current) => ({
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setTransferOpen(false);
                setEditingTransfer(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={transferMutations.save.isPending}>
              {transferMutations.save.isPending ? 'Saving…' : 'Save transfer'}
            </Button>
          </footer>
        </form>
      </Modal>
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

export function AnalyticsPage() {
  const [rangePreset, setRangePreset] = useState<AnalyticsPreset>('6');
  const [customRange, setCustomRange] = useState(() => {
    const today = formatDateInput();
    return {
      from: `${today.slice(0, 7)}-01`,
      to: today,
    };
  });
  const compactChart = useMediaQuery('(max-width: 768px)');
  const analyticsRange =
    rangePreset === 'custom'
      ? customRange
      : {
          months: Number(rangePreset),
        };
  const { data: analytics, isLoading, isError } = useAnalytics(analyticsRange);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  if (isLoading) {
    return (
      <div className="page product-page analytics-page" aria-busy="true">
        <Skeleton className="skeleton-title" />
        <Skeleton className="position-skeleton" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="page product-page analytics-page">
        <Card className="error-state" role="alert">
          <h2>Analytics are unavailable</h2>
          <p>Try again in a moment.</p>
        </Card>
      </div>
    );
  }

  const { summary } = analytics;
  const trendData = analytics.monthlyTrend;
  const currentMonth = trendData.at(-1) ?? { month: '', income: 0, expenses: 0, savings: 0 };
  const previousMonth = trendData.at(-2);
  const spendChangeLabel = previousMonth
    ? latestChangeLabel(currentMonth.expenses, previousMonth.expenses)
    : 'No change';
  const savingsRateValue = savingsRate(summary.income, summary.savings);
  const rangeLabel = `${formatAnalyticsDate(analytics.range.from)} – ${formatAnalyticsDate(analytics.range.to)}`;
  const monthCount = trendData.length;
  const hasTrendActivity = trendData.some((month) => month.income > 0 || month.expenses > 0);
  const spendingByCategory = analytics.categorySpending
    .map((spending) => {
      const category = categories.find((item) => item.id === spending.categoryId);
      return {
        id: spending.categoryId,
        name: category?.name ?? 'Other',
        icon: category?.icon,
        color: category?.color,
        value: spending.amount,
      };
    })
    .filter((category) => category.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxCategory = Math.max(...spendingByCategory.map((category) => category.value), 1);
  const positiveAccounts = accounts.filter((account) => account.balance > 0);
  const totalAssets = positiveAccounts.reduce((total, account) => total + account.balance, 0);
  const averageMonthlySpend = averageAcrossWindow(trendData.map((month) => month.expenses));

  return (
    <div className="page product-page analytics-page">
      <PageHeader
        eyebrow="Reports"
        title="Analytics"
        description="Review income and completed spending for the period you choose."
        action={
          <div className="analytics-range-action">
            <PeriodControl
              value={rangePreset}
              detail={rangePreset === 'custom' ? 'Custom range' : 'Reporting period'}
              ariaLabel="Analytics date range"
              options={[
                { value: '1', label: 'This month' },
                { value: '3', label: 'Last 3 months' },
                { value: '6', label: 'Last 6 months' },
                { value: '12', label: 'Last 12 months' },
                { value: '24', label: 'Last 24 months' },
                { value: 'custom', label: 'Custom range' },
              ]}
              onChange={(value) => setRangePreset(value as AnalyticsPreset)}
            />
            {rangePreset === 'custom' ? (
              <div className="analytics-custom-range" aria-label="Custom analytics date range">
                <label>
                  From
                  <input
                    type="date"
                    value={customRange.from}
                    max={customRange.to}
                    onChange={(event) => {
                      const from = event.target.value;
                      setCustomRange((current) => ({
                        from,
                        to: from > current.to ? from : current.to,
                      }));
                    }}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={customRange.to}
                    min={customRange.from}
                    max={formatDateInput()}
                    onChange={(event) => {
                      const to = event.target.value;
                      setCustomRange((current) => ({
                        from: to < current.from ? to : current.from,
                        to,
                      }));
                    }}
                  />
                </label>
              </div>
            ) : null}
          </div>
        }
      />

      <section className="analytics-summary balancil-box" aria-label="Selected period summary">
        <div className="analytics-summary-primary">
          <span>Spending in selected period</span>
          <strong>
            <AnimatedValue value={summary.expenses} format={formatCurrency} />
          </strong>
          <small>{rangeLabel}</small>
        </div>
        <dl>
          <div>
            <dt>Income</dt>
            <dd>
              <AnimatedValue value={summary.income} format={formatCurrency} />
            </dd>
            <small>Completed income in this period</small>
          </div>
          <div>
            <dt>Saved</dt>
            <dd>
              <AnimatedValue value={summary.savings} format={formatCurrency} />
            </dd>
            <small>Income minus expenses</small>
          </div>
          <div>
            <dt>Savings rate</dt>
            <dd>
              <AnimatedValue value={savingsRateValue} format={(value) => `${Math.round(value)}%`} />
            </dd>
            <small>Across the selected period</small>
          </div>
        </dl>
      </section>

      <section className="surface-panel section-open analytics-trend-section">
        <SectionHeader
          label="Trend"
          title="Income and expenses over time"
          detail={rangeLabel}
          action={
            <span className="chart-legend">
              <i className="income" /> Income <i className="expense" /> Expenses
            </span>
          }
        />
        <div className="chart-frame">
          <div className="analytics-primary-chart">
            {hasTrendActivity ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendData}
                  barGap={6}
                  barCategoryGap={monthCount > 12 ? '22%' : '30%'}
                  margin={{ top: 12, right: 8, bottom: 0, left: compactChart ? -24 : 0 }}
                >
                  <CartesianGrid vertical={false} stroke="rgb(20 32 28 / 0.09)" strokeWidth={1} />
                  <XAxis
                    dataKey="period"
                    axisLine={{ stroke: 'rgb(20 32 28 / 0.16)' }}
                    tickLine={false}
                    tickMargin={12}
                    interval={
                      compactChart
                        ? Math.max(0, Math.ceil(monthCount / 4) - 1)
                        : monthCount > 12
                          ? 2
                          : 0
                    }
                    tickFormatter={(value) => formatAnalyticsMonth(String(value), monthCount > 12)}
                    tick={{ fill: 'var(--muted)', fontSize: compactChart ? 10 : 11 }}
                  />
                  <YAxis
                    hide={compactChart}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    width={72}
                    tickFormatter={(value) => formatCompactCurrency(Number(value))}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(18 61 52 / 0.045)' }} />
                  <Bar
                    dataKey="income"
                    fill="var(--chart-income)"
                    maxBarSize={28}
                    radius={[5, 5, 0, 0]}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="expenses"
                    fill="var(--chart-expense)"
                    maxBarSize={28}
                    radius={[5, 5, 0, 0]}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <strong>No completed activity in this period</strong>
                <small>Choose another date range or add a completed transaction.</small>
              </div>
            )}
          </div>
          <dl className="chart-insights">
            <div>
              <dt>Average spend over {monthCount} months</dt>
              <dd>{formatCurrency(averageMonthlySpend)}</dd>
            </div>
            <div>
              <dt>Latest month</dt>
              <dd>{formatCurrency(currentMonth.expenses)}</dd>
            </div>
            <div>
              <dt>Latest change</dt>
              <dd>{spendChangeLabel}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="overview-split analytics-breakdown-grid">
        <section className="surface-panel balancil-box analytics-category-section">
          <SectionHeader
            label="Where your money went"
            title="Spending by category"
            detail={rangeLabel}
          />
          <div className="category-analysis-list">
            {spendingByCategory.length === 0 ? (
              <p className="analytics-list-empty">No completed expenses in this period.</p>
            ) : null}
            {spendingByCategory.slice(0, 7).map((category) => {
              const share = summary.expenses
                ? Math.round((category.value / summary.expenses) * 100)
                : 0;
              return (
                <div
                  className="category-analysis-row"
                  key={category.id}
                  style={{
                    ['--bar' as string]: `${relativeBarWidth(category.value, maxCategory)}%`,
                  }}
                >
                  <span>
                    <CategoryMark icon={category.icon} color={category.color} />
                    {category.name}
                  </span>
                  <b>{share}%</b>
                  <strong>{formatCurrency(category.value)}</strong>
                  <div aria-hidden="true">
                    <i />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface-panel balancil-box allocation-section">
          <SectionHeader
            label="Allocation"
            title="Account distribution"
            detail={`${formatCurrency(totalAssets)} in positive balances`}
          />
          <div className="allocation-list">
            {positiveAccounts.length === 0 ? (
              <p className="analytics-list-empty">No positive account balances to compare.</p>
            ) : null}
            {positiveAccounts.map((account) => {
              const share = totalAssets ? Math.round((account.balance / totalAssets) * 100) : 0;
              return (
                <div className="allocation-row" key={account.id}>
                  <div>
                    <AccountMark type={account.type} color={account.color} />
                    <span>{account.name}</span>
                    <b>{share}%</b>
                  </div>
                  <Progress
                    value={share}
                    color="var(--brand-2)"
                    label={`${account.name} allocation`}
                  />
                  <small>{formatCurrency(account.balance)}</small>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
