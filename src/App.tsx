import { lazy, type ReactNode, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { Skeleton } from './components/ui';
import { useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';

const AppLayout = lazy(() =>
  import('./layouts/AppLayout').then((module) => ({ default: module.AppLayout })),
);
const LoginPage = lazy(() =>
  import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/AuthPages').then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/AuthPages').then((module) => ({ default: module.ResetPasswordPage })),
);
const ConfirmEmailChangePage = lazy(() =>
  import('./pages/AuthPages').then((module) => ({ default: module.ConfirmEmailChangePage })),
);
const PrivacyPage = lazy(() =>
  import('./pages/LegalPages').then((module) => ({ default: module.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('./pages/LegalPages').then((module) => ({ default: module.TermsPage })),
);
const LedgerBasicsPage = lazy(() =>
  import('./pages/LegalPages').then((module) => ({ default: module.LedgerBasicsPage })),
);
const AppPrivacyPage = lazy(() =>
  import('./pages/LegalPages').then((module) => ({ default: module.AppPrivacyPage })),
);
const AppTermsPage = lazy(() =>
  import('./pages/LegalPages').then((module) => ({ default: module.AppTermsPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const AppNotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.AppNotFoundPage })),
);

const DashboardPage = lazy(() =>
  import('./pages/overview/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const AccountsPage = lazy(() =>
  import('./pages/overview/AccountsPage').then((module) => ({ default: module.AccountsPage })),
);
const AnalyticsPage = lazy(() =>
  import('./pages/overview/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })),
);
const TransactionsPage = lazy(() =>
  import('./pages/transactions/TransactionsPage').then((module) => ({
    default: module.TransactionsPage,
  })),
);
const BudgetsPage = lazy(() =>
  import('./pages/BudgetsPage').then((module) => ({ default: module.BudgetsPage })),
);
const GoalsPage = lazy(() =>
  import('./pages/goals/GoalsPage').then((module) => ({ default: module.GoalsPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);

const publicMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Balancil — Manual personal ledger',
    description:
      'Record account balances, transactions, budgets, and savings goals in one manual personal ledger.',
  },
  '/login': {
    title: 'Sign in — Balancil',
    description: 'Sign in to your Balancil personal ledger.',
  },
  '/register': {
    title: 'Create an account — Balancil',
    description: 'Create a Balancil account and start a manual personal ledger.',
  },
  '/forgot-password': {
    title: 'Reset your password — Balancil',
    description: 'Request a password reset link for your Balancil account.',
  },
  '/reset-password': {
    title: 'Choose a new password — Balancil',
    description: 'Choose a new password for your Balancil account.',
  },
  '/confirm-email-change': {
    title: 'Confirm email change — Balancil',
    description: 'Confirm a requested email change for your Balancil account.',
  },
  '/privacy': {
    title: 'Privacy policy — Balancil',
    description: 'How Balancil stores and uses account and ledger data.',
  },
  '/terms': {
    title: 'Terms of use — Balancil',
    description: 'The terms and product limits for using Balancil.',
  },
};

const appTitles: Record<string, string> = {
  '/app': 'Overview',
  '/app/accounts': 'Accounts',
  '/app/transactions': 'Transactions',
  '/app/analytics': 'Analytics',
  '/app/budgets': 'Budgets',
  '/app/goals': 'Goals',
  '/app/settings': 'Settings',
  '/app/help/ledger-basics': 'Ledger basics',
  '/app/help/privacy': 'Privacy policy',
  '/app/help/terms': 'Terms of use',
};

function setMeta(name: string, content: string, property = false) {
  const attribute = property ? 'property' : 'name';
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.content = content;
}

export function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = publicMetadata[pathname];
    const isPrivate = pathname.startsWith('/app');
    const isSensitive =
      isPrivate ||
      ['/forgot-password', '/reset-password', '/confirm-email-change'].includes(pathname);
    const appTitle = appTitles[pathname];
    const title =
      page?.title ?? (appTitle ? `${appTitle} — Balancil` : 'Page not found — Balancil');
    const description =
      page?.description ?? 'Balancil is a manual personal ledger for your own financial records.';
    const configuredOrigin = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '');
    const origin = configuredOrigin || window.location.origin;
    const canonicalPath = page ? pathname : '/';
    const canonicalUrl = `${origin}${canonicalPath === '/' ? '/' : canonicalPath}`;

    document.title = title;
    setMeta('description', description);
    setMeta('robots', isSensitive || !page ? 'noindex, nofollow' : 'index, follow');
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:image', `${origin}/og-image.png`, true);
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', `${origin}/og-image.png`);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
}

/* Client-side navigation keeps the previous scroll offset, which drops readers
   into the middle of long pages such as the policies and help guide. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (!hash) {
      // Back and forward keep the position the browser restored.
      if (navigationType !== 'POP') window.scrollTo(0, 0);
      return;
    }

    // Routes are lazy, so the anchor does not exist yet when the browser tries to
    // jump to it. Retry until the target renders or the budget runs out.
    const target = decodeURIComponent(hash.slice(1));
    const deadline = Date.now() + 2000;
    let frame = 0;

    const jump = () => {
      const element = document.getElementById(target);
      if (element) {
        element.scrollIntoView();
        return;
      }
      if (Date.now() < deadline) frame = requestAnimationFrame(jump);
    };

    frame = requestAnimationFrame(jump);
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, navigationType]);

  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) {
    return (
      <div className="page auth-loading" aria-busy="true">
        <span className="sr-only">Restoring your session</span>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <RouteMetadata />
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="page">
            <Skeleton className="skeleton-card" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/confirm-email-change" element={<ConfirmEmailChangePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help/ledger-basics" element={<LedgerBasicsPage />} />
            <Route path="help/privacy" element={<AppPrivacyPage />} />
            <Route path="help/terms" element={<AppTermsPage />} />
            <Route path="*" element={<AppNotFoundPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
