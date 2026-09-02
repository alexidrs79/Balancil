import {
  Archive,
  ArrowRight,
  BankOff,
  Budget,
  Cards,
  Close,
  Menu,
  ShieldCheck,
  Target,
} from '../components/icons';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import audienceImage from '../assets/landing/audience.jpg';
import purposeImage from '../assets/landing/purpose.jpg';
import securityImage from '../assets/landing/security.jpg';
import stepOneImage from '../assets/landing/step-1.jpg';
import stepTwoImage from '../assets/landing/step-2.jpg';
import stepThreeImage from '../assets/landing/step-3.jpg';
import {
  accounts,
  categories,
  initialBudgets,
  initialGoals,
  initialTransactions,
} from '../data/mockData';
import { budgetPercentage, formatCurrency, formatShortDate, goalProgress } from '../utils/finance';

const totalBalance = accounts.reduce((total, account) => total + account.balance, 0);
const previewAccounts = accounts.slice(0, 3);
const previewTransactions = initialTransactions.slice(0, 3);
const previewBudget = initialBudgets[0];
const previewGoal = initialGoals[0];

const expenseTotal =
  initialTransactions
    .filter((transaction) => transaction.type === 'expense' && transaction.status === 'completed')
    .reduce((total, transaction) => total + transaction.amount, 0) || 1;

/** The four heaviest expense categories, mirroring the Analytics breakdown. */
const spendingByCategory = categories
  .filter((category) => category.type === 'expense')
  .map((category) => {
    const spent = initialTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          transaction.status === 'completed' &&
          transaction.categoryId === category.id,
      )
      .reduce((total, transaction) => total + transaction.amount, 0);

    return { id: category.id, name: category.name, spent, share: (spent / expenseTotal) * 100 };
  })
  .filter((category) => category.spent > 0)
  .sort((a, b) => b.spent - a.spent)
  .slice(0, 4);

/**
 * Section photography is brand texture sitting beside copy that already makes the
 * point, so it is decorative: an empty alt keeps screen readers from narrating a
 * still life that carries no information of its own.
 */
function SectionPhoto({ src, className }: { src: string; className: string }) {
  return (
    <figure className={`landing-photo ${className}`}>
      <img src={src} alt="" loading="lazy" decoding="async" width={824} height={1024} />
    </figure>
  );
}

/** Distance scrolled before the header breaks apart into its two islands. */
const DETACH_THRESHOLD = 20;

/** Tracks whether the header has broken apart into its two islands. */
function useHeaderDetached() {
  const [isDetached, setIsDetached] = useState(false);

  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      setIsDetached(window.scrollY > DETACH_THRESHOLD);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return isDetached;
}

export function LandingPage() {
  const isDetached = useHeaderDetached();
  useRevealOnScroll();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };

    // Matches the 860px breakpoint where the bar stops collapsing into a sheet.
    const onResize = () => {
      if (window.innerWidth > 860) setMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', close);
    window.addEventListener('resize', onResize);
    menuRef.current?.querySelector('a')?.focus();

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', close);
      window.removeEventListener('resize', onResize);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="landing landing-simple">
      <a className="skip-link" href="#landing-content">
        Skip to content
      </a>

      <header
        className={`landing-header${isDetached ? ' is-detached' : ''}${menuOpen ? ' is-menu-open' : ''}`}
      >
        <nav className="landing-nav" aria-label="Marketing navigation">
          <Link className="brand" to="/" aria-label="Balancil home">
            <Logo />
          </Link>
          {/* One cluster so the narrow layout can lift the whole thing —
              section links and account actions together — into the menu sheet. */}
          <div className="landing-nav-cluster" id="landing-section-nav" ref={menuRef}>
            <div className="landing-nav-links">
              <a href="#product" onClick={closeMenu}>
                Product
              </a>
              <a href="#how-it-works" onClick={closeMenu}>
                How it works
              </a>
              <a href="#planning" onClick={closeMenu}>
                Planning
              </a>
              <a href="#security" onClick={closeMenu}>
                Security
              </a>
            </div>
            <div className="landing-nav-actions">
              <Link to="/login" onClick={closeMenu}>
                Sign in
              </Link>
              <Link className="button" to="/register" onClick={closeMenu}>
                Get started
              </Link>
            </div>
          </div>
          <button
            type="button"
            className="landing-menu-toggle"
            ref={toggleRef}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="landing-section-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <Close size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>
      {menuOpen ? <div className="landing-menu-scrim" onClick={closeMenu} /> : null}

      <div id="landing-content" inert={menuOpen}>
        <section className="landing-hero" id="product">
          <div className="landing-hero-copy" data-reveal>
            <p className="landing-kicker">A manual personal ledger</p>
            <h1>Keep your money records in one place.</h1>
            <p className="landing-hero-lede">
              Add your accounts and transactions yourself, then use those records to track balances,
              budgets, and savings goals.
            </p>
            <div className="landing-hero-actions">
              <Link className="button" to="/register">
                Create an account
              </Link>
              <Link className="landing-text-link" to="/login">
                Sign in
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div
            className="landing-product-preview balancil-box"
            aria-label="Sample Balancil ledger illustration"
            data-reveal="late"
          >
            <header>
              <strong>Sample ledger</strong>
              <span>Illustration</span>
            </header>
            <div className="landing-product-balance">
              <span>Total balance</span>
              <strong>{formatCurrency(totalBalance)}</strong>
              <small>Across {accounts.length} active accounts</small>
            </div>
            <div className="landing-product-accounts">
              {previewAccounts.map((account) => (
                <div key={account.id}>
                  <span>
                    <strong>{account.name}</strong>
                    <small>{account.institution}</small>
                  </span>
                  <b className={account.balance < 0 ? 'negative' : undefined}>
                    {formatCurrency(account.balance)}
                  </b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-purpose" aria-labelledby="landing-purpose-title" data-reveal>
          <div>
            <p className="landing-kicker">Account balances</p>
            <h2 id="landing-purpose-title">See your recorded balances together.</h2>
            <p>
              Keep checking, savings, credit, and cash accounts in one list with a total based on
              the entries you add.
            </p>
          </div>
          <SectionPhoto src={purposeImage} className="landing-purpose-photo" />
          <dl className="balancil-box">
            <div>
              <dt>Accounts</dt>
              <dd>Every balance together</dd>
              <small>Checking, savings, credit, and cash stay readable in one list.</small>
            </div>
            <div>
              <dt>Activity</dt>
              <dd>Transactions you can scan</dd>
              <small>Merchant, category, account, and signed amount—nothing extra.</small>
            </div>
            <div>
              <dt>Planning</dt>
              <dd>Limits with context</dd>
              <small>See what remains and which category actually needs attention.</small>
            </div>
          </dl>
        </section>

        <section className="landing-steps" id="how-it-works" aria-labelledby="landing-steps-title">
          <div className="landing-steps-copy" data-reveal>
            <p className="landing-kicker">How it works</p>
            <h2 id="landing-steps-title">Start with three simple steps.</h2>
          </div>
          <ol className="landing-steps-list">
            <li data-reveal>
              <SectionPhoto src={stepOneImage} className="landing-step-photo" />
              {/* The list already conveys order, so the visible numeral is decorative. */}
              <span className="landing-step-mark" aria-hidden="true">
                1
              </span>
              <strong>Start with an empty ledger</strong>
              <p>
                A new Balancil account starts with no balances, transactions, budgets, or goals.
              </p>
            </li>
            <li data-reveal>
              <SectionPhoto src={stepTwoImage} className="landing-step-photo" />
              <span className="landing-step-mark" aria-hidden="true">
                2
              </span>
              <strong>Add your accounts manually</strong>
              <p>
                Enter each account and opening balance yourself. Balancil never claims to connect to
                your bank.
              </p>
            </li>
            <li data-reveal>
              <SectionPhoto src={stepThreeImage} className="landing-step-photo" />
              <span className="landing-step-mark" aria-hidden="true">
                3
              </span>
              <strong>Record and review activity</strong>
              <p>
                Add transactions as they happen, then use your own records for budgets, goals, and
                analytics.
              </p>
            </li>
          </ol>
        </section>

        <section className="landing-capability" id="accounts" data-reveal>
          <div className="landing-capability-copy">
            <p className="landing-kicker">Accounts</p>
            <h2>Keep each balance in one list.</h2>
            <p>
              Assets and liabilities stay separate, with a total calculated from the balances you
              record.
            </p>
          </div>
          <div className="landing-simple-list balancil-box" aria-label="Account balance preview">
            {accounts.map((account) => (
              <div key={account.id}>
                <span>
                  <strong>{account.name}</strong>
                  <small>{account.institution}</small>
                </span>
                <b className={account.balance < 0 ? 'negative' : undefined}>
                  {formatCurrency(account.balance)}
                </b>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-capability is-reversed" id="transactions" data-reveal>
          <div className="landing-capability-copy">
            <p className="landing-kicker">Transactions</p>
            <h2>Record income and expenses.</h2>
            <p>Search or filter entries by merchant, category, account, date, type, and status.</p>
          </div>
          <div className="landing-simple-list balancil-box" aria-label="Recent transaction preview">
            {previewTransactions.map((transaction) => {
              const category = categories.find((item) => item.id === transaction.categoryId);
              return (
                <div key={transaction.id}>
                  <time dateTime={transaction.date}>{formatShortDate(transaction.date)}</time>
                  <span>
                    <strong>{transaction.merchant}</strong>
                    <small>{category?.name}</small>
                  </span>
                  <b className={transaction.type === 'income' ? 'positive' : 'negative'}>
                    {transaction.type === 'expense' ? '−' : '+'}
                    {formatCurrency(transaction.amount)}
                  </b>
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-capability" id="planning" data-reveal>
          <div className="landing-capability-copy">
            <p className="landing-kicker">Budgets and goals</p>
            <h2>Track limits and savings targets.</h2>
            <p>
              Compare completed expenses with your budgets and add contributions to savings goals.
            </p>
          </div>
          <div className="landing-plan-summary balancil-box" aria-label="Budget and goal preview">
            <div>
              <span>
                <strong>Shopping budget</strong>
                <small>
                  {formatCurrency(previewBudget.spent)} of {formatCurrency(previewBudget.limit)}
                </small>
              </span>
              <b>{Math.round(budgetPercentage(previewBudget))}% used</b>
              <i aria-hidden="true">
                <span style={{ width: `${Math.min(budgetPercentage(previewBudget), 100)}%` }} />
              </i>
            </div>
            <div>
              <span>
                <strong>{previewGoal.name}</strong>
                <small>
                  {formatCurrency(previewGoal.saved)} of {formatCurrency(previewGoal.target)}
                </small>
              </span>
              <b>{Math.round(goalProgress(previewGoal))}% funded</b>
              <i aria-hidden="true">
                <span style={{ width: `${Math.min(goalProgress(previewGoal), 100)}%` }} />
              </i>
            </div>
          </div>
        </section>

        <section
          className="landing-breakdown"
          aria-labelledby="landing-breakdown-title"
          data-reveal
        >
          <div className="landing-breakdown-copy">
            <p className="landing-kicker">Analytics</p>
            <h2 id="landing-breakdown-title">Review spending by category.</h2>
            <p>
              See which categories account for the largest share of the completed expenses you
              entered.
            </p>
          </div>
          <div
            className="landing-breakdown-card balancil-box"
            aria-label="Category breakdown preview"
          >
            <header>
              <strong>Spending by category</strong>
              <span>August 2026</span>
            </header>
            <ul>
              {spendingByCategory.map((category) => (
                <li key={category.id}>
                  <span>
                    <strong>{category.name}</strong>
                    <small>{formatCurrency(category.spent)}</small>
                  </span>
                  <i aria-hidden="true">
                    <span style={{ width: `${Math.min(category.share, 100)}%` }} />
                  </i>
                  <b>{Math.round(category.share)}%</b>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-trust" id="security" data-reveal>
          <div>
            <p className="landing-kicker">Security and data</p>
            <h2>Your records belong to your account.</h2>
          </div>
          <ul className="balancil-box">
            <li>
              <ShieldCheck size={20} aria-hidden="true" />
              <span>
                <strong>Protected account access</strong>
                <p>Passwords are hashed and every financial record is isolated to its owner.</p>
              </span>
            </li>
            <li>
              <Archive size={20} aria-hidden="true" />
              <span>
                <strong>Persistent records</strong>
                <p>
                  Your accounts, transactions, budgets, and goals remain available after reloads.
                </p>
              </span>
            </li>
            <li>
              <BankOff size={20} aria-hidden="true" />
              <span>
                <strong>No bank connection</strong>
                <p>Accounts are added manually; the landing preview is illustrative.</p>
              </span>
            </li>
          </ul>
          <SectionPhoto src={securityImage} className="landing-trust-photo" />
        </section>

        <section className="landing-audience" aria-labelledby="landing-audience-title" data-reveal>
          <div className="landing-audience-copy">
            <p className="landing-kicker">Who it is for</p>
            <h2 id="landing-audience-title">For people who keep their own records.</h2>
          </div>
          <SectionPhoto src={audienceImage} className="landing-audience-photo" />
          <ul className="landing-audience-list balancil-box">
            <li>
              <Cards size={20} aria-hidden="true" />
              <span>
                <strong>You hold several accounts</strong>
                <p>Keep checking, savings, credit, and cash balances in the same ledger.</p>
              </span>
            </li>
            <li>
              <Budget size={20} aria-hidden="true" />
              <span>
                <strong>You watch a monthly limit</strong>
                <p>See completed spending against the limit you set for each category.</p>
              </span>
            </li>
            <li>
              <Target size={20} aria-hidden="true" />
              <span>
                <strong>You are funding a named goal</strong>
                <p>Add contributions and review progress toward a specific target.</p>
              </span>
            </li>
          </ul>
        </section>

        <section className="landing-cta" data-reveal>
          <h2>Start your personal ledger.</h2>
          <Link className="button" to="/register">
            Create an account
          </Link>
        </section>
      </div>

      <footer className="landing-footer" data-reveal>
        <div>
          <Link className="brand" to="/">
            <Logo />
          </Link>
          <p>Accounts, transactions, budgets, and goals in one ledger.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link to="/login">Sign in</Link>
          <Link to="/register">Get started</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
        <small>© {new Date().getFullYear()} Balancil</small>
      </footer>
    </main>
  );
}
