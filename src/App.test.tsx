import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteMetadata } from './App';
import { AppNotFoundPage, NotFoundPage } from './pages/NotFoundPage';

let authenticated = false;

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: authenticated, isInitializing: false }),
}));

beforeEach(() => {
  authenticated = false;
});

function renderMetadata(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteMetadata />
    </MemoryRouter>,
  );
}

describe('route metadata', () => {
  it('sets public policy metadata and allows indexing', async () => {
    renderMetadata('/privacy');

    await waitFor(() => expect(document.title).toBe('Privacy policy — Balancil'));
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow',
    );
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:3000/privacy',
    );
  });

  it('keeps authenticated app routes out of search results', async () => {
    renderMetadata('/app/transactions');

    await waitFor(() => expect(document.title).toBe('Transactions — Balancil'));
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  it('gives password recovery a useful title without indexing it', async () => {
    renderMetadata('/forgot-password');

    await waitFor(() => expect(document.title).toBe('Reset your password — Balancil'));
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  it.each([
    ['/reset-password', 'Choose a new password — Balancil'],
    ['/confirm-email-change', 'Confirm email change — Balancil'],
  ])('sets sensitive route metadata for %s', async (path, title) => {
    renderMetadata(path);

    await waitFor(() => expect(document.title).toBe(title));
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  it('titles an unknown address as not found and keeps it unindexed', async () => {
    renderMetadata('/no-such-page');

    await waitFor(() => expect(document.title).toBe('Page not found — Balancil'));
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    // An error page must not claim to be the canonical version of a real URL.
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:3000/',
    );
  });
});

describe('not found pages', () => {
  function renderNotFound(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <NotFoundPage />
      </MemoryRouter>,
    );
  }

  it('offers recovery and policy links for signed-out visitors', () => {
    const { getByRole, queryByText } = renderNotFound('/mistyped-link');

    expect(getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(getByRole('link', { name: /Create an account/ })).toHaveAttribute('href', '/register');
    expect(getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(queryByText(/ledger has changed/i)).not.toBeInTheDocument();
    expect(queryByText(/^Requested$/i)).not.toBeInTheDocument();
  });

  it('keeps signed-in users pointed at the app rather than the marketing site', () => {
    authenticated = true;

    const { getByRole, queryByRole } = renderNotFound('/mistyped-link');

    expect(getByRole('link', { name: 'Go to your overview' })).toHaveAttribute('href', '/app');
    expect(queryByRole('link', { name: /Sign in/ })).not.toBeInTheDocument();
  });

  it('lists real destinations from the in-app variant', () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={['/app/nowhere']}>
        <AppNotFoundPage />
      </MemoryRouter>,
    );

    for (const [name, href] of [
      ['Overview', '/app'],
      ['Accounts', '/app/accounts'],
      ['Transactions', '/app/transactions'],
      ['Analytics', '/app/analytics'],
    ]) {
      expect(getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', href);
    }
  });
});
