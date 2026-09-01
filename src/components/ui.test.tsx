import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, ConfirmDialog, Modal, ToastProvider, useToast } from '../components/ui';

describe('Button', () => {
  it('renders accessible button text and handles clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save changes</Button>);
    const button = screen.getByRole('button', { name: 'Save changes' });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects the disabled state', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

function ToastControls() {
  const notify = useToast();
  return (
    <>
      <button onClick={() => notify('Saved')}>Success</button>
      <button onClick={() => notify('Could not save', 'error')}>Error</button>
    </>
  );
}

describe('ToastProvider', () => {
  it('announces success and error feedback with the correct urgency', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastControls />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Success' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');

    await user.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
  });
});

function ControlledModal() {
  const [value, setValue] = useState('');
  return (
    <Modal open title="Edit account" onClose={() => undefined}>
      <label>
        Account name
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
    </Modal>
  );
}

describe('Modal', () => {
  it('keeps a controlled input focused while its parent rerenders', async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    const input = screen.getByRole('textbox', { name: 'Account name' });
    await user.click(input);
    await user.type(input, 'Primary checking');

    expect(input).toHaveValue('Primary checking');
    expect(input).toHaveFocus();
  });
});

describe('ConfirmDialog', () => {
  function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete budget?"
        description="This action cannot be undone."
        confirmLabel="Delete budget"
        {...overrides}
      >
        <p>Delete the budget for Food?</p>
      </ConfirmDialog>,
    );
    return { onConfirm, onClose };
  }

  it('focuses cancel so a stray Enter cannot delete a record', async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderDialog();

    // Initial focus is applied on the next animation frame.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());

    await user.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirms only when the destructive action is chosen', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete budget' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks repeat submissions while the delete is in flight', () => {
    renderDialog({ pending: true });
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
  });
});
