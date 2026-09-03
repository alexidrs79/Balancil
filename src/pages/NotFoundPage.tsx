import { Link } from 'react-router-dom';
import { ArrowRight, ChartColumns, Dashboard, Exchange, Wallet } from '../components/icons';
import { Logo } from '../components/Logo';
import { PageHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const DESTINATIONS = [
  { to: '/app', icon: Dashboard, label: 'Overview', hint: 'Balances and this month so far' },
  { to: '/app/accounts', icon: Wallet, label: 'Accounts', hint: 'Where your money sits' },
  {
    to: '/app/transactions',
    icon: Exchange,
    label: 'Transactions',
    hint: 'Everything you recorded',
  },
  {
    to: '/app/analytics',
    icon: ChartColumns,
    label: 'Analytics',
    hint: 'Income and spending over time',
  },
];

/** The catch-all for visitors who are not inside the app shell. */
export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="error-page">
      <header className="error-page-header">
        <Link className="brand" to="/" aria-label="Balancil home">
          <Logo />
        </Link>
      </header>

      <div className="error-page-body">
        <section className="error-card">
          <p className="error-code" aria-hidden="true">
            404
          </p>
          <h1>We couldn&rsquo;t find that page</h1>
          <p className="error-lead">The link may be mistyped, or the page may have been removed.</p>

          <div className="error-actions">
            {isAuthenticated ? (
              <Link className="button" to="/app">
                Go to your overview
              </Link>
            ) : (
              <>
                <Link className="button" to="/">
                  Back to home
                </Link>
                <Link className="landing-text-link" to="/register">
                  Create an account
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
          <nav className="error-help-links" aria-label="Helpful links">
            {!isAuthenticated ? <Link to="/login">Sign in</Link> : null}
            <Link to={isAuthenticated ? '/app/help/privacy' : '/privacy'}>Privacy</Link>
            <Link to={isAuthenticated ? '/app/help/terms' : '/terms'}>Terms</Link>
          </nav>
        </section>
      </div>
    </main>
  );
}

/** The catch-all for signed-in users, kept inside the app shell so navigation survives. */
export function AppNotFoundPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="404"
        title="We couldn't find that page"
        description="The link may be mistyped, or the page may have been removed."
      />

      <section className="surface-panel balancil-box error-panel">
        <nav className="error-destinations" aria-label="Go to">
          {DESTINATIONS.map(({ to, icon: Icon, label, hint }) => (
            <Link className="error-destination" key={to} to={to}>
              <span className="error-destination-mark" aria-hidden="true">
                <Icon size={16} />
              </span>
              <span className="error-destination-copy">
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
