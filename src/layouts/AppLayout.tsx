import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Budget,
  ChartColumns,
  ChevronRight,
  Close,
  CreditCard,
  Dashboard,
  Exchange,
  Menu,
  Plus,
  Settings,
  SignOut,
  Target,
} from '../components/icons';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const ledgerNavigation = [
  { to: '/app', label: 'Overview', icon: Dashboard, end: true },
  { to: '/app/accounts', label: 'Accounts', icon: CreditCard, end: false },
  { to: '/app/transactions', label: 'Transactions', icon: Exchange, end: false },
];

const planning = [
  { to: '/app/analytics', label: 'Analytics', icon: ChartColumns, end: false },
  { to: '/app/budgets', label: 'Budgets', icon: Budget, end: false },
  { to: '/app/goals', label: 'Goals', icon: Target, end: false },
];

const navigation = [...ledgerNavigation, ...planning];

export function AppLayout() {
  const [sidebarPath, setSidebarPath] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mobileOpen = sidebarPath === location.pathname;
  const closeSidebar = () => {
    setSidebarPath(null);
    setAccountMenuOpen(false);
  };
  const activeRoute =
    [...navigation, { to: '/app/settings', label: 'Settings' }, { to: '/app/help', label: 'Help' }]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) =>
        item.to === '/app' ? location.pathname === item.to : location.pathname.startsWith(item.to),
      )?.label ?? 'Not found';

  const signOut = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const openNewTransaction = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, select, [contenteditable="true"]') ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }
      event.preventDefault();
      navigate('/app/transactions', { state: { createTransaction: true } });
    };
    window.addEventListener('keydown', openNewTransaction);
    return () => window.removeEventListener('keydown', openNewTransaction);
  }, [navigate]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <NavLink to="/app" className="brand">
            <Logo />
          </NavLink>
          <Button
            variant="ghost"
            className="mobile-close"
            aria-label="Close navigation"
            onClick={closeSidebar}
          >
            <Close size={20} />
          </Button>
        </div>
        <nav aria-label="Primary navigation">
          <p className="nav-label">Ledger</p>
          {ledgerNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <p className="nav-label nav-label-later">Planning</p>
          {planning.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className={`profile-card ${accountMenuOpen ? 'is-open' : ''}`}
            onClick={() => setAccountMenuOpen((current) => !current)}
            aria-label="Open account menu"
            aria-expanded={accountMenuOpen}
            aria-controls="sidebar-account-menu"
          >
            <span className="avatar">
              {user?.profileImageUrl ? <img src={user.profileImageUrl} alt="" /> : user?.initials}
            </span>
            <span>
              <strong title={user?.name}>{user?.name}</strong>
              <small title={user?.email}>{user?.email}</small>
            </span>
            <ChevronRight size={16} />
          </button>
          {accountMenuOpen ? (
            <div className="account-menu" id="sidebar-account-menu">
              <NavLink to="/app/settings" onClick={closeSidebar}>
                <Settings size={16} />
                <span>Settings</span>
              </NavLink>
              <button type="button" onClick={signOut}>
                <SignOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>
      {mobileOpen ? (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      ) : null}
      <div className="main-column">
        <header className="topbar">
          <Button
            variant="ghost"
            className="menu-button"
            aria-label="Open navigation"
            onClick={() => setSidebarPath(location.pathname)}
          >
            <Menu size={21} />
          </Button>
          <strong className="topbar-route">{activeRoute}</strong>
          <Button
            className="topbar-action"
            onClick={() => navigate('/app/transactions', { state: { createTransaction: true } })}
          >
            <Plus size={16} />
            <span>Add transaction</span>
          </Button>
        </header>
        <main className="route-stage" key={`${location.pathname}${location.search}`}>
          <Outlet />
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.slice(0, 4).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className={
              location.pathname.startsWith('/app/budgets') ||
              location.pathname.startsWith('/app/goals') ||
              location.pathname.startsWith('/app/settings') ||
              location.pathname.startsWith('/app/help')
                ? 'active'
                : undefined
            }
            onClick={() => setSidebarPath(location.pathname)}
            aria-label="Open more navigation"
          >
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
