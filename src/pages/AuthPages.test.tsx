import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ForgotPasswordPage, ResetPasswordPage } from './AuthPages';

describe('password recovery accessibility', () => {
  it('associates the forgot-password validation message with its field', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    const field = await screen.findByRole('textbox', { name: 'Email address' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAttribute('aria-describedby', 'forgot-email-error');
    expect(document.getElementById('forgot-email-error')).toHaveTextContent('Enter a valid email');
  });

  it('associates reset-password validation messages with both fields', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/reset-password?token=valid&email=user@example.com']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Update password' }));

    const password = screen.getByLabelText('New password');
    const confirmation = screen.getByLabelText('Confirm password');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-describedby', 'reset-password-error');
    expect(confirmation).toHaveAttribute('aria-invalid', 'true');
    expect(confirmation).toHaveAttribute('aria-describedby', 'reset-password-confirmation-error');
  });
});
