import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ui';
import type { TransactionImportReview } from '../../types';
import { TransactionImportModal } from './TransactionImportModal';

const post = vi.fn();
vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: (url: string, body: unknown) => post(url, body),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class extends Error {},
}));

const goodRow = {
  line: 2,
  date: '2026-05-04',
  merchant: 'Market',
  description: 'Groceries',
  amount: 25,
  type: 'expense' as const,
  status: 'completed' as const,
  account: 'Checking',
  accountId: 'acc-1',
  category: 'Food',
  categoryId: 'cat-1',
  errors: [],
  duplicate: false,
};

const review = (overrides: Partial<TransactionImportReview> = {}): TransactionImportReview => ({
  rows: [goodRow],
  valid: 1,
  invalid: 0,
  ...overrides,
});

const onClose = vi.fn();

function renderModal() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TransactionImportModal onClose={onClose} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const upload = async () => {
  const file = new File(['date,merchant\n'], 'ledger.csv', { type: 'text/csv' });
  await userEvent.upload(screen.getByLabelText(/CSV file/i), file);
};

/** Whether a given call was the preview pass or the committing one. */
const isPreview = (body: unknown) => body instanceof FormData && body.get('preview') === '1';

beforeEach(() => {
  post.mockReset();
  onClose.mockReset();
});

describe('TransactionImportModal', () => {
  it('previews a file without importing it', async () => {
    post.mockResolvedValue({ data: review() });
    renderModal();
    await upload();

    expect(await screen.findByText('Market')).toBeInTheDocument();
    // The only request so far is the preview pass.
    expect(post).toHaveBeenCalledTimes(1);
    expect(isPreview(post.mock.calls[0][1])).toBe(true);
  });

  it('refuses to import while any line has a problem', async () => {
    post.mockResolvedValue({
      data: review({
        rows: [{ ...goodRow, errors: ['Date could not be read. Use YYYY-MM-DD.'] }],
        valid: 0,
        invalid: 1,
      }),
    });
    renderModal();
    await upload();

    expect(await screen.findByText(/Date could not be read/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import$/ })).toBeDisabled();
  });

  it('does not count rows already in the ledger towards the import', async () => {
    post.mockResolvedValue({
      data: review({ rows: [{ ...goodRow, duplicate: true }], valid: 1, invalid: 0 }),
    });
    renderModal();
    await upload();

    expect(await screen.findByText('Already added')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import$/ })).toBeDisabled();
  });

  it('commits the file once confirmed and closes', async () => {
    post.mockImplementation((_url: string, body: unknown) =>
      Promise.resolve({ data: isPreview(body) ? review() : { imported: 1, skipped: 0 } }),
    );
    renderModal();
    await upload();

    await userEvent.click(await screen.findByRole('button', { name: /Import 1 transaction/ }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(post.mock.calls.filter(([, body]) => !isPreview(body))).toHaveLength(1);
  });
});
