import { useState } from 'react';
import { Button } from '../../components/ui';

export function DeleteAccountSettings({
  saving,
  onDelete,
}: {
  saving: boolean;
  onDelete: (password: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void onDelete(String(form.get('password') ?? ''));
      }}
    >
      <header className="settings-panel-heading">
        <h2>Delete your Balancil account</h2>
        <p>
          This permanently removes your profile, accounts, transactions, budgets, and goals. This
          cannot be undone.
        </p>
      </header>
      <label className="form-toggle">
        <input
          type="checkbox"
          checked={confirming}
          onChange={(event) => setConfirming(event.target.checked)}
        />
        <span>I understand this cannot be undone</span>
      </label>
      <label className="field-control">
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <footer className="settings-actions">
        <Button type="submit" variant="danger" disabled={saving || !confirming}>
          {saving ? 'Deleting…' : 'Delete my account'}
        </Button>
      </footer>
    </form>
  );
}
