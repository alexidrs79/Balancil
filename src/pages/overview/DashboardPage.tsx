import { Alert } from '../../components/icons';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ErrorState, Skeleton, AnimatedValue, TrendBadge } from '../../components/ui';
import { AccountMark, CategoryMark, MiniSparkline, TextLink } from '../../components/visuals';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../hooks/useFinance';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  relativeBarWidth,
  averageAcrossWindow,
  savingsRate,
  chartColors,
  formatAnalyticsMonth,
} from '../../utils/finance';
import { ChartTooltip, SectionHeader, TransactionRow } from './components';

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const { user } = useAuth();
  const compactChart = useMediaQuery('(max-width: 768px)');

  if (isLoading) {
    return (
      <div className="page product-page overview-page" aria-busy="true">
        <span className="sr-only">Loading overview</span>
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
        <ErrorState
          title="We couldn’t load your overview"
          description="Please try again."
          onRetry={() => void refetch()}
        />
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
    .filter((budget) => budget.percent >= 80)
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
              titleId="money-flow-title"
              detail={flowDetail}
              action={
                <span className="chart-legend">
                  <span className="income" aria-hidden="true" /> Income{' '}
                  <span className="expense" aria-hidden="true" /> Expenses
                </span>
              }
            />
            <div className="chart-frame">
              <div className="primary-chart" aria-hidden="true">
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
              <table className="sr-only">
                <caption>Monthly income and expenses</caption>
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col">Income</th>
                    <th scope="col">Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyTrend.map((month) => (
                    <tr key={month.period}>
                      <th scope="row">{formatAnalyticsMonth(month.period, true)}</th>
                      <td>{formatCurrency(month.income)}</td>
                      <td>{formatCurrency(month.expenses)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
