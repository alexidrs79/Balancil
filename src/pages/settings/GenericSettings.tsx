import { Button, Select } from '../../components/ui';
import type { UserSettings } from '../../types';

export function GenericSettings({
  section,
  settings,
  saving,
  onPreferences,
  onPassword,
}: {
  section: string;
  settings: UserSettings;
  saving: boolean;
  onPreferences: (preferences: {
    currency: string;
    locale: string;
    timezone: string;
    weekStart: 'mon' | 'sun';
  }) => Promise<void>;
  onPassword: (password: {
    currentPassword: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<void>;
}) {
  const content: Record<string, [string, string]> = {
    security: ['Security', 'Keep your Balancil account protected.'],
    region: ['Format & region', 'Choose how amounts and dates appear throughout your ledger.'],
  };
  const [title, description] = content[section] ?? content.region;

  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (section === 'security') {
          void onPassword({
            currentPassword: String(form.get('currentPassword') ?? ''),
            password: String(form.get('password') ?? ''),
            passwordConfirmation: String(form.get('passwordConfirmation') ?? ''),
          });
        } else {
          void onPreferences({
            currency: String(form.get('currency') ?? 'USD'),
            locale: String(form.get('locale') ?? 'en-US'),
            timezone: String(form.get('timezone') ?? 'UTC'),
            weekStart: String(form.get('weekStart') ?? 'mon') as 'mon' | 'sun',
          });
        }
      }}
    >
      <header className="settings-panel-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="settings-preferences">
        {section === 'security' ? (
          <>
            <div className="settings-field-grid settings-region-fields">
              <label className="field-control">
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <label className="field-control">
                New password
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label className="field-control span-2">
                Confirm new password
                <input
                  name="passwordConfirmation"
                  type="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                />
              </label>
            </div>
          </>
        ) : (
          <div className="settings-field-grid settings-region-fields">
            <label className="field-control">
              Ledger currency
              <Select name="currency" defaultValue={settings.user.currency}>
                <option>USD</option>
                <option>AMD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>JPY</option>
                <option>CAD</option>
                <option>AUD</option>
              </Select>
              <small>
                This changes how amounts are labelled. Balancil does not convert existing values.
              </small>
            </label>
            <label className="field-control">
              Number and date format
              <Select name="locale" defaultValue={settings.user.locale ?? 'en-US'}>
                <option value="en-US">English (United States)</option>
                <option value="en-GB">English (United Kingdom)</option>
                <option value="de-DE">Deutsch</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
                <option value="it-IT">Italiano</option>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="ja-JP">日本語</option>
                <option value="ko-KR">한국어</option>
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁體中文</option>
              </Select>
            </label>
            <label className="field-control">
              Timezone
              <Select name="timezone" defaultValue={settings.user.timezone ?? 'UTC'}>
                {Array.from(
                  new Set([
                    settings.user.timezone ?? 'UTC',
                    'UTC',
                    'America/Los_Angeles',
                    'America/New_York',
                    'Europe/London',
                    'Europe/Paris',
                    'Asia/Dubai',
                    'Asia/Tehran',
                    'Asia/Tokyo',
                    'Australia/Sydney',
                  ]),
                ).map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone.replaceAll('_', ' ')}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field-control">
              Week starts on
              <Select name="weekStart" defaultValue={settings.user.weekStart ?? 'mon'}>
                <option value="mon">Monday</option>
                <option value="sun">Sunday</option>
              </Select>
            </label>
          </div>
        )}
      </div>
      <footer className="settings-actions">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : section === 'security' ? 'Update password' : 'Save preferences'}
        </Button>
      </footer>
    </form>
  );
}
