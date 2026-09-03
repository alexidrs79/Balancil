import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ErrorState,
  PageHeader,
  Progress,
  Skeleton,
  AnimatedValue,
  PeriodControl,
} from '../../components/ui';
import { AccountMark, CategoryMark } from '../../components/visuals';
import { useAccounts, useAnalytics, useCategories } from '../../hooks/useFinance';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateInput,
  formatLedgerDate,
  formatAnalyticsMonth,
  relativeBarWidth,
  averageAcrossWindow,
  latestChangeLabel,
  savingsRate,
} from '../../utils/finance';
import { ChartTooltip, SectionHeader } from './components';

type AnalyticsPreset = '1' | '3' | '6' | '12' | '24' | 'custom';

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
  const { data: analytics, isLoading, isError, refetch } = useAnalytics(analyticsRange);
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
        <ErrorState
          title="Analytics are unavailable"
          description="Try again in a moment."
          onRetry={() => void refetch()}
        />
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
  const rangeLabel = `${formatLedgerDate(analytics.range.from)} – ${formatLedgerDate(analytics.range.to)}`;
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
              <span className="income" aria-hidden="true" /> Income{' '}
              <span className="expense" aria-hidden="true" /> Expenses
            </span>
          }
        />
        <div className="chart-frame">
          <div className="analytics-primary-chart" aria-hidden="true">
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
          <table className="sr-only">
            <caption>Income and expenses by month for {rangeLabel}</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Income</th>
                <th scope="col">Expenses</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((month) => (
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
