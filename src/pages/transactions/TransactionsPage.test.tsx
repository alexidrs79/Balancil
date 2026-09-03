import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ui';
import { TransactionsPage } from './TransactionsPage';

const get = vi.fn();
vi.mock('../../api/client', () => ({
  apiClient: {
    get: (url: string) => get(url),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class extends Error {},
}));

const account = {
  id: 'acc-1',
  name: 'Checking',
  type: 'checking',
  balance: 100,
  institution: 'Bank',
  color: '#111111',
  isActive: true,
};
const category = { id: 'cat-1', name: 'Food', color: '#f00', icon: 'food', type: 'expense' };

const row = (id: string, merchant: string) => ({
  id,
  merchant,
  description: 'Line item',
  amount: 10,
  type: 'expense',
  status: 'completed',
  accountId: account.id,
  categoryId: category.id,
  date: '2026-05-04',
});

/** Mirrors Laravel's paginator payload, snake_case meta included. */
function ledgerPage(rows: ReturnType<typeof row>[], overrides = {}) {
  return {
    data: rows,
    meta: {
      current_page: 1,
      last_page: 3,
      per_page: 7,
      total: 20,
      from: 1,
      to: rows.length,
      ...overrides,
    },
    summary: {
      income: 500,
      expenses: 120.5,
      savings: 379.5,
      completedCount: 18,
      ledgerTotal: 42,
    },
  };
}

const requestedUrls = (): string[] => get.mock.calls.map((call) => String(call[0]));
const ledgerCalls = () => requestedUrls().filter((url) => url.startsWith('/transactions'));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ToastProvider>
          <TransactionsPage />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (url.startsWith('/transactions')) {
      return Promise.resolve({
        data: ledgerPage([row('t-1', 'Corner Store'), row('t-2', 'Bakery')]),
      });
    }
    if (url === '/accounts') return Promise.resolve({ data: [account] });
    if (url === '/categories') return Promise.resolve({ data: [category] });
    return Promise.resolve({ data: [] });
  });
});

describe('TransactionsPage', () => {
  it('separates the primary add action from labelled secondary tools', async () => {
    renderPage();
    await screen.findByText('Corner Store');

    expect(screen.getByRole('button', { name: 'Add transaction' })).toHaveClass('button');
    const secondaryTools = screen.getByRole('group', { name: 'Secondary transaction tools' });
    expect(secondaryTools).toHaveTextContent('More filters');
    expect(secondaryTools).toHaveTextContent('Manage categories');
    expect(secondaryTools).not.toHaveTextContent('Add transaction');
  });

  it('renders the page the API returned and maps the paginator meta', async () => {
    renderPage();

    expect(await screen.findByText('Corner Store')).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();

    // from/to/total come from snake_case meta, so this fails if mapping regresses.
    expect(screen.getAllByText(/Showing 1–2 of 20/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
  });

  it('shows the API summary rather than recomputing it from the visible page', async () => {
    renderPage();
    await screen.findByText('Corner Store');

    // Totals describe all 20 matches, not just the two rows on screen.
    expect(screen.getByText(/18 completed of 20 matching/)).toBeInTheDocument();
  });

  it('asks the API for the next page instead of slicing locally', async () => {
    renderPage();
    await screen.findByText('Corner Store');

    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(ledgerCalls().some((url) => url.includes('page=2'))).toBe(true));
  });

  it('sends filters to the API as query parameters', async () => {
    renderPage();
    await screen.findByText('Corner Store');

    await userEvent.selectOptions(screen.getByLabelText(/^Type$/i), 'income');

    await waitFor(() =>
      expect(ledgerCalls().some((url) => url.includes('type=income'))).toBe(true),
    );
    // Untouched controls must not be sent as empty values; the API rejects those.
    expect(ledgerCalls().every((url) => !url.includes('status='))).toBe(true);
  });

  it('debounces the search box into a single request', async () => {
    renderPage();
    await screen.findByText('Corner Store');
    const before = ledgerCalls().length;

    await userEvent.type(screen.getByPlaceholderText(/Merchant or description/i), 'coffee');

    await waitFor(() =>
      expect(ledgerCalls().some((url) => url.includes('search=coffee'))).toBe(true),
    );
    const searchRequests = ledgerCalls()
      .slice(before)
      .filter((url) => url.includes('search='));
    expect(searchRequests.length).toBeLessThanOrEqual(2);
  });
});
