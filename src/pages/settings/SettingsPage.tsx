import { Cards, ChevronRight, Lock, Shield, Trash, User } from '../../components/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorState, PageHeader, Skeleton, useToast } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings, useSettingsMutations } from '../../hooks/useFinance';
import { formatDate } from '../../utils/finance';
import { HelpSettings } from './HelpSettings';
import { SessionSettings } from './SessionSettings';
import { ProfileSettings } from './ProfileSettings';
import { GenericSettings } from './GenericSettings';
import { DeleteAccountSettings } from './DeleteAccountSettings';

const settingSections = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Name and email address',
    icon: User,
  },
  { id: 'security', label: 'Security', description: 'Change your password', icon: Lock },
  {
    id: 'region',
    label: 'Format & region',
    description: 'Currency, dates, and timezone',
    icon: Cards,
  },
  { id: 'sessions', label: 'Sessions', description: 'Devices signed in', icon: Lock },
  {
    id: 'help',
    label: 'Help & legal',
    description: 'Guides and policies',
    icon: Shield,
  },
  {
    id: 'account',
    label: 'Delete account',
    description: 'Remove your ledger',
    icon: Trash,
  },
];

export function SettingsPage() {
  const [section, setSection] = useState('profile');
  const notify = useToast();
  const { data: settings, isLoading, isError, refetch } = useSettings();
  const mutations = useSettingsMutations();
  const { updateUser, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="page product-page settings-page" aria-busy="true">
        <Skeleton className="skeleton-title" />
        <Skeleton className="position-skeleton" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="page product-page settings-page">
        <ErrorState
          title="Settings are unavailable"
          description="Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const memberSince = settings.user.createdAt
    ? formatDate(settings.user.createdAt, {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="page product-page settings-page">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Profile, password, sessions, formats, and account deletion."
      />

      <section
        className="financial-summary balancil-box settings-summary has-text-value"
        aria-label="Account summary"
      >
        <div>
          <span>Signed in as</span>
          <strong>{settings.user.name}</strong>
          <small>
            {settings.user.email}
            {memberSince ? ` · Member since ${memberSince}` : ''}
          </small>
        </div>
        <dl>
          <div>
            <dt>Ledger currency</dt>
            <dd>{settings.user.currency}</dd>
            <small>Applied to every amount without currency conversion</small>
          </div>
          <div>
            <dt>Regional format</dt>
            <dd>{settings.user.locale ?? 'en-US'}</dd>
            <small>{settings.user.timezone ?? 'UTC'}</small>
          </div>
        </dl>
      </section>

      <div className="settings-shell">
        <nav className="settings-section-nav section-open" aria-label="Settings sections">
          {settingSections.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={17} />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <section className="settings-panel balancil-box">
          {section === 'profile' ? (
            <ProfileSettings
              settings={settings}
              saving={mutations.profile.isPending}
              onUserChanged={updateUser}
              onSave={async (profile) => {
                try {
                  const next = await mutations.profile.mutateAsync(profile);
                  updateUser(next.user);
                  notify('Profile settings saved');
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Profile could not be saved',
                    'error',
                  );
                }
              }}
            />
          ) : section === 'account' ? (
            <DeleteAccountSettings
              saving={mutations.destroy.isPending}
              onDelete={async (password) => {
                try {
                  await mutations.destroy.mutateAsync(password);
                  await logout();
                  navigate('/');
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Account could not be deleted',
                    'error',
                  );
                }
              }}
            />
          ) : section === 'help' ? (
            <HelpSettings />
          ) : section === 'sessions' ? (
            <SessionSettings
              onCurrentRevoked={async () => {
                await logout();
                navigate('/login');
              }}
            />
          ) : (
            <GenericSettings
              section={section}
              settings={settings}
              saving={mutations.preferences.isPending || mutations.password.isPending}
              onPreferences={async (preferences) => {
                try {
                  const next = await mutations.preferences.mutateAsync(preferences);
                  updateUser(next.user);
                  notify('Preferences saved');
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Preferences could not be saved',
                    'error',
                  );
                }
              }}
              onPassword={async (password) => {
                try {
                  await mutations.password.mutateAsync(password);
                  notify('Password updated');
                } catch (error) {
                  notify(
                    error instanceof Error ? error.message : 'Password could not be updated',
                    'error',
                  );
                }
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}
