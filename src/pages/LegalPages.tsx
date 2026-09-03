import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from '../components/icons';
import { Logo } from '../components/Logo';
import { PageHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const copy = {
  privacy: {
    title: 'How Balancil handles your data',
    shortTitle: 'Privacy policy',
    intro:
      'This policy explains what Balancil stores, why it is needed, and the controls available to you.',
    updated: '31 August 2026',
    highlights: [
      ['Manual by design', 'Balancil does not connect to banks or pull live financial feeds.'],
      ['Private by account', 'Authenticated ownership checks isolate each user’s ledger records.'],
      ['Deletable', 'You can permanently delete your account and active ledger data in Settings.'],
    ],
    sections: [
      {
        id: 'privacy-product',
        title: 'What Balancil is',
        body: 'Balancil is a manual personal-finance ledger. You enter accounts, transactions, transfers, recurring schedules, budgets, and goals. We do not sell ledger records or use them for advertising.',
      },
      {
        id: 'privacy-data',
        title: 'Data we store',
        body: 'We store the account information and financial records required to provide the product.',
        bullets: [
          'Name, email address, password hash, and optional profile image.',
          'Accounts, categories, transactions, transfers, recurring schedules, budgets, goals, and contributions.',
          'Currency, locale, timezone, week-start preference, and session metadata.',
        ],
      },
      {
        id: 'privacy-use',
        title: 'How data is used',
        body: 'Your information is used to authenticate your account, calculate the balances and insights you request, maintain your settings, and deliver security emails such as password resets and email-change confirmations.',
      },
      {
        id: 'privacy-security',
        title: 'Security and access',
        body: 'Financial records are scoped to the authenticated account. Passwords are stored as hashes, confirmation tokens are stored as hashes, and active sessions can be reviewed and revoked from Settings. No internet service can promise absolute security, so protect your password and revoke devices you no longer use.',
      },
      {
        id: 'privacy-images',
        title: 'Profile images',
        body: 'Profile images are optional and stored only to display your account identity. You can replace or remove the image at any time from Settings.',
      },
      {
        id: 'privacy-control',
        title: 'Your controls',
        body: 'You can update your profile, replace or remove your image, change your email through confirmation, revoke sessions, and delete your account. Account deletion removes the active profile and ledger records associated with it.',
      },
    ],
  },
  terms: {
    title: 'Using Balancil',
    shortTitle: 'Terms of use',
    intro:
      'Balancil is a record-keeping tool—not a bank, broker, tax adviser, or live account aggregator.',
    updated: '31 August 2026',
    highlights: [
      ['You own your entries', 'You are responsible for the records and decisions you make.'],
      ['Manual, not connected', 'Balancil does not move money or reconcile bank accounts.'],
      ['Keep records current', 'Balances and insights only reflect the entries you maintain.'],
    ],
    sections: [
      {
        id: 'terms-product',
        title: 'The product and its limits',
        body: 'Balancil helps you record financial activity and calculate summaries from the information you provide. It does not hold funds, execute payments, provide professional financial advice, or guarantee that your ledger is complete or accurate.',
      },
      {
        id: 'terms-account',
        title: 'Your account and records',
        body: 'Provide accurate registration information, keep your password and devices secure, and review records before relying on balances, budgets, analytics, or goals. You may only store information you have the right to use.',
      },
      {
        id: 'terms-use',
        title: 'Acceptable use',
        body: 'Do not attack, probe, overload, reverse engineer, or bypass access controls. Do not attempt to access another person’s ledger, upload malicious content, or use Balancil for unlawful activity.',
      },
      {
        id: 'terms-availability',
        title: 'Availability and data copies',
        body: 'We work to keep Balancil available, but interruptions can occur. Features may change where those changes preserve the product’s core purpose of a private manual ledger.',
      },
      {
        id: 'terms-decisions',
        title: 'Financial decisions',
        body: 'Charts, totals, budget states, and goal progress are informational outputs based on your entries. You remain responsible for financial, legal, and tax decisions.',
      },
      {
        id: 'terms-ending',
        title: 'Ending use',
        body: 'You may delete your account from Settings. We may suspend or close accounts that materially abuse or threaten the service. Account deletion permanently removes the active profile and ledger records.',
      },
    ],
  },
} as const;

export function PrivacyPage() {
  return <LegalDocument kind="privacy" />;
}

export function TermsPage() {
  return <LegalDocument kind="terms" />;
}

export function AppPrivacyPage() {
  return <AppLegalDocument kind="privacy" />;
}

export function AppTermsPage() {
  return <AppLegalDocument kind="terms" />;
}

const companion = (kind: keyof typeof copy) => (kind === 'privacy' ? 'terms' : 'privacy');

function LegalHighlights({ page }: { page: (typeof copy)[keyof typeof copy] }) {
  return (
    <section className="legal-highlights" aria-label={`${page.shortTitle} summary`}>
      {page.highlights.map(([title, detail], index) => (
        <div className={index === page.highlights.length - 1 ? 'contrast' : ''} key={title}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </div>
      ))}
    </section>
  );
}

function LegalSections({ page }: { page: (typeof copy)[keyof typeof copy] }) {
  return (
    <div className="legal-sections">
      {page.sections.map((section, index) => (
        <section id={section.id} key={section.id}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            {'bullets' in section ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

/* Signed-in readers stay inside the app shell, so the policy renders as an
   ordinary product page. The standalone document below is for visitors arriving
   from the landing page, who have no shell to sit in. */
function AppLegalDocument({ kind }: { kind: keyof typeof copy }) {
  const page = copy[kind];
  const otherKind = companion(kind);
  const otherPage = copy[otherKind];

  return (
    <div className="page product-page legal-doc-page">
      <PageHeader
        eyebrow="Help centre"
        title={page.shortTitle}
        description={page.intro}
        action={
          <div className="legal-meta">
            <span>Policy</span>
            <time>Effective {page.updated}</time>
          </div>
        }
      />
      <LegalHighlights page={page} />
      <LegalSections page={page} />
      <footer className="legal-next">
        <div>
          <strong>Continue to {otherPage.shortTitle.toLowerCase()}</strong>
          <small>Read the related document for the remaining details.</small>
        </div>
        <Link to={`/app/help/${otherKind}`}>
          Read {otherPage.shortTitle.toLowerCase()}
          <ChevronRight size={15} />
        </Link>
      </footer>
    </div>
  );
}

function LegalDocument({ kind }: { kind: keyof typeof copy }) {
  const page = copy[kind];
  const { isAuthenticated } = useAuth();
  const otherKind = companion(kind);
  const otherPage = copy[otherKind];

  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="brand" to={isAuthenticated ? '/app' : '/'} aria-label="Balancil home">
          <Logo />
        </Link>
        <Link className="button button-secondary legal-return" to={isAuthenticated ? '/app' : '/'}>
          <ChevronLeft size={15} />
          {isAuthenticated ? 'Back to app' : 'Back to home'}
        </Link>
      </header>
      <div className="legal-shell">
        <aside className="legal-sidebar">
          <p className="data-label">Legal centre</p>
          <nav aria-label="Legal documents">
            <Link className={kind === 'privacy' ? 'active' : ''} to="/privacy">
              Privacy policy
              <ChevronRight size={14} />
            </Link>
            <Link className={kind === 'terms' ? 'active' : ''} to="/terms">
              Terms of use
              <ChevronRight size={14} />
            </Link>
            {isAuthenticated ? (
              <Link to="/app/help/ledger-basics">
                Ledger basics
                <ChevronRight size={14} />
              </Link>
            ) : null}
          </nav>
          <div className="legal-toc">
            <strong>On this page</strong>
            {page.sections.map((section, index) => (
              <a href={`#${section.id}`} key={section.id}>
                {String(index + 1).padStart(2, '0')} {section.title}
              </a>
            ))}
          </div>
        </aside>

        <article className="legal-article">
          <header>
            <div className="legal-meta">
              <span>Policy</span>
              <time>Effective {page.updated}</time>
            </div>
            <h1>{page.title}</h1>
            <p>{page.intro}</p>
          </header>
          <LegalHighlights page={page} />
          <LegalSections page={page} />
          <footer className="legal-next">
            <div>
              <strong>Continue to {otherPage.shortTitle.toLowerCase()}</strong>
              <small>Read the related document for the remaining details.</small>
            </div>
            <Link to={`/${otherKind}`}>
              Read {otherPage.shortTitle.toLowerCase()}
              <ChevronRight size={15} />
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}

const ledgerGuides = [
  {
    number: '01',
    title: 'Start with accounts',
    body: 'Add each account with its real opening balance. Balancil is manual and does not connect to your bank.',
    to: '/app/accounts',
    action: 'Manage accounts',
  },
  {
    number: '02',
    title: 'Record money once',
    body: 'Completed income and expenses change balances. Pending and failed entries stay visible but do not affect totals.',
    to: '/app/transactions',
    action: 'Open transactions',
  },
  {
    number: '03',
    title: 'Move money correctly',
    body: 'Use account transfers for internal movement so the amount is not counted as income or spending.',
    to: '/app/accounts',
    action: 'Create a transfer',
  },
  {
    number: '04',
    title: 'Review recurring items',
    body: 'Schedules create due drafts. Review, post, or skip each occurrence—nothing posts automatically.',
    to: '/app/transactions',
    action: 'Manage schedules',
  },
  {
    number: '05',
    title: 'Plan and protect',
    body: 'Budgets use completed expense transactions. Goals use contribution history, without changing an account balance.',
    to: '/app/budgets',
    action: 'Review budgets',
  },
  {
    number: '06',
    title: 'Check your totals',
    body: 'Analytics, budgets, and goals summarize completed records. Totals follow the entries you add.',
    to: '/app/analytics',
    action: 'Open analytics',
  },
] as const;

export function LedgerBasicsPage() {
  return (
    <div className="page product-page ledger-basics-page">
      <PageHeader
        eyebrow="Help centre"
        title="Ledger basics"
        description="How Balancil records money and calculates totals from your entries."
      />
      <section className="ledger-basics-intro balancil-box">
        <p className="data-label">The core rule</p>
        <h2>Balancil reflects what you record.</h2>
        <p>
          It does not read bank accounts or move funds. Completed entries update the ledger; drafts
          and pending records wait for you.
        </p>
      </section>
      <section className="ledger-guide-grid" aria-label="Balancil ledger guide">
        <h2 className="sr-only">Using your ledger</h2>
        <ol>
          {ledgerGuides.map((guide) => (
            <li key={guide.number}>
              <span>{guide.number}</span>
              <div>
                <h3>{guide.title}</h3>
                <p>{guide.body}</p>
              </div>
              <Link to={guide.to}>
                {guide.action}
                <ChevronRight size={15} />
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <aside className="ledger-help-note">
        <strong>Need policy details?</strong>
        <span>Review how data is handled and the product’s limits.</span>
        <div>
          <Link to="/app/help/privacy">Privacy policy</Link>
          <Link to="/app/help/terms">Terms of use</Link>
        </div>
      </aside>
    </div>
  );
}
