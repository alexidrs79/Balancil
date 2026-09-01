# Balancil

Balancil is a private personal ledger: accounts, transactions, budgets, savings
goals, and spending trends. You enter the records. It does not connect to banks,
import feeds, or move money.

The React app talks to a Laravel REST API. Each account is isolated. Sessions use
Sanctum bearer tokens.

## What it is (and is not)

- Manual accounts and transactions. No Plaid, open banking, or live balances.
- Completed transactions update account balances, budgets, dashboard, and analytics.
  Pending and failed rows do not.
- Display currency is a label only. Balancil does not convert amounts.
- The landing-page product shot is a labelled sample, not a signed-in ledger.
- “Remember me” is off by default. When enabled, it stores a 30-day token in
  `localStorage`; otherwise the 12-hour token stays in `sessionStorage`. Browser
  storage is XSS-sensitive, so the frontend also ships a restrictive script policy.

## Stack

- React 19, TypeScript, Vite, React Router
- TanStack Query and Axios
- React Hook Form, Zod, Recharts
- Laravel 13, Sanctum bearer tokens, SQLite by default
- Vitest, Testing Library, PHPUnit

## Run it locally

You need **two processes**: the Laravel API on port 8000, and the Vite app on port 5173. If only the app is running, the page loads but sign-in fails.

### Requirements

- Node.js 22 or newer
- PHP 8.3 or newer, with the SQLite extension
- Composer

On macOS with Homebrew: `brew install node php composer`. Confirm SQLite with `php -m | grep -i sqlite`.

### First-time setup

From the project root:

```bash
npm install

cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
```

Do **not** seed on a machine that will be exposed. `php artisan db:seed` creates a
local-only demo user (`alex@balancil.app` / `balancil123`) and is skipped unless
`APP_ENV=local`.

### Every time you develop

Open **two terminals**.

Terminal 1 — API:

```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

Leave this running. You should see `http://127.0.0.1:8000`.

Terminal 2 — app:

```bash
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the Laravel server. Keep `FRONTEND_URL=http://localhost:5173` in `backend/.env` so CORS and password-reset links match. If Vite picks another port, change `FRONTEND_URL` to that origin and restart `php artisan serve`.

Create an account from **Create an account**, or use the demo user if you seeded.

To stop: Ctrl+C in both terminals.

### If sign-in fails

The app can still open while the API is down. Start `php artisan serve` first, then reload the tab. Local mail uses the log driver: password-reset links are written to `backend/storage/logs/laravel.log`.

Newly registered users get default categories and a USD display currency, and no accounts or history.

A production build should set `VITE_API_URL` to the public API origin and `VITE_SITE_URL` to the public site origin. Leave those unset for local Vite.

## Data behavior

- Accounts with transaction history cannot be deleted. Mark them inactive, or
  remove the transactions first.
- Categories used by transactions or budgets cannot be deleted.
- Budget spending is completed expenses in the budget’s current period.
- Dashboard and analytics are computed by the API.
- `GET /api/transactions` is paginated (`page`, `perPage`, max 100) and does its own
  filtering, search, and sorting. Each response carries `meta` for the pager and a
  `summary` covering the whole filtered ledger, not just the page on screen. The
  client never downloads the full ledger to filter it.
- Records are scoped to their owner by a global query scope that is fail-closed: with
  no authenticated user a query returns nothing. Console and queue code that spans
  users opts out explicitly.
- Transactions import and export as CSV. Export writes whatever the current filters
  describe. Import is two steps: a preview reports every problem and every row already
  in the ledger, and nothing is written until it is confirmed. A file with any bad row
  is refused outright rather than half-loaded, and rows already present are skipped so
  re-importing the same file cannot double a balance.
- An account records its opening balance independently of its current one, so
  `php artisan ledger:reconcile` can check every stored balance against the
  transactions and transfers behind it.
- Settings can delete the entire Balancil account and its ledger rows.

## Production (go live)

1. Provision HTTPS for the frontend and the API. Set `APP_ENV=production`,
   `APP_DEBUG=false`, `APP_URL` and `FRONTEND_URL` to those https origins.
2. Generate a new `APP_KEY`. Never reuse a key from git or a laptop.
3. Point `MAIL_*` at a real mailer. Password reset will not work on the log driver.
4. SQLite is acceptable only for a tiny private launch with file backups. Prefer
   Postgres or MySQL (`DB_CONNECTION`) before you have more than one server.
5. Run `php artisan migrate --force` **without** `--seed`.
6. Profile images stay on Laravel’s private disk and are returned through
   one-hour signed URLs. Do not expose `storage/app/private`.
7. Build with `VITE_SITE_URL=https://your-domain.example npm run build`; this
   writes production canonical URLs and `sitemap.xml`. Host `dist/` behind HTTPS.
   Configure a SPA fallback so `/login`, `/privacy`, `/app/*` serve `index.html`
   (`public/_redirects` is for Netlify). Set `VITE_API_URL` at build time.
8. CORS allows only `FRONTEND_URL`. A `*` origin is ignored. Set
   `TRUSTED_PROXIES` to the load balancer’s exact IP/CIDR list; never use `*`.
9. Reproduce the security headers in `public/_headers` if the host does not read
   Netlify header files. Add HSTS after every route works over HTTPS.
10. Run Laravel’s scheduler every minute so recurring drafts are generated:
    `* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1`.
11. Run `php artisan ledger:reconcile` on a schedule as well. Investigate before
    reaching for `--fix`: drift means something upstream wrote a balance wrongly.
12. Smoke: register → add account → add transaction → see it on overview →
    change password → sign out → sign in → forgot password email → export CSV →
    re-import it and confirm nothing doubles → delete account on a throwaway user.

Health: `GET /up` (Laravel) and `GET /` on the API returns `{ "ok": true, "name": "Balancil" }`.

## Commands

CI runs all of the below on every push and pull request
(`.github/workflows/ci.yml`).

Frontend:

```bash
npm run dev
npm run build
npm run lint
npm run format:check
npm test
```

Backend:

```bash
cd backend
php artisan migrate
php artisan test
vendor/bin/pint --test
php artisan route:list --path=api

# Check every account balance against its ledger. --fix rewrites drifted balances.
php artisan ledger:reconcile
```

## Architecture

```text
src/
  api/           Axios client, auth token handling, API errors
  components/    Shared interface and visualization components
  contexts/      Auth session restoration and state
  hooks/         TanStack Query server-state hooks
  pages/         Marketing, auth, and legal routes
    overview/    Dashboard, accounts, analytics
    transactions/  Ledger, filters, transaction and recurring modals
    goals/       Goals and contributions
    settings/    Profile, sessions, preferences, account deletion
  services/      Laravel REST service boundary
  styles/        One cascade split into ordered parts; index.css imports them
  types/         Shared frontend contracts
  utils/         Formatting and client-side calculations

backend/
  app/           Models, requests, resources, controllers, services
  database/      Migrations, factories, local-only demo seeder
  routes/        Authenticated REST endpoints
  tests/         Auth, isolation, CRUD, reporting, and settings tests
```

## Day-two (not this launch)

httpOnly cookie sessions, 2FA, signup email verification, bank aggregation,
Postgres as the default, error monitoring, automated encrypted backups.

## License

MIT
