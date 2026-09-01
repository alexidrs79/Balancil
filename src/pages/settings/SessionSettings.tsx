import { Button, Skeleton, useToast } from '../../components/ui';
import { useSessions, useSettingsMutations } from '../../hooks/useFinance';
import { formatDate } from '../../utils/finance';

export function SessionSettings({ onCurrentRevoked }: { onCurrentRevoked: () => Promise<void> }) {
  const { data: sessions = [], isLoading } = useSessions();
  const mutations = useSettingsMutations();
  const notify = useToast();

  const revoke = async (session: (typeof sessions)[number]) => {
    try {
      await mutations.revokeSession.mutateAsync(session.id);
      if (session.isCurrent) {
        await onCurrentRevoked();
        return;
      }
      notify('Session revoked');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Session could not be revoked', 'error');
    }
  };

  return (
    <div className="settings-form">
      <header className="settings-panel-heading">
        <h2>Active sessions</h2>
        <p>Review devices that can access your Balancil account.</p>
      </header>
      {isLoading ? (
        <Skeleton className="position-skeleton" />
      ) : (
        <div className="session-list">
          {sessions.map((session) => (
            <article key={session.id}>
              <div>
                <strong>
                  {session.isCurrent ? 'This device' : session.name || 'Balancil session'}
                </strong>
                <small>
                  {session.ipAddress || 'IP unavailable'} ·{' '}
                  {session.lastUsedAt
                    ? `Used ${formatDate(session.lastUsedAt, { dateStyle: 'short', timeStyle: 'short' })}`
                    : `Created ${session.createdAt ? formatDate(session.createdAt, { dateStyle: 'short', timeStyle: 'short' }) : 'recently'}`}
                </small>
                {session.userAgent ? (
                  <small title={session.userAgent}>{session.userAgent}</small>
                ) : null}
              </div>
              <Button
                variant="secondary"
                disabled={mutations.revokeSession.isPending}
                onClick={() => void revoke(session)}
              >
                {session.isCurrent ? 'Sign out' : 'Revoke'}
              </Button>
            </article>
          ))}
        </div>
      )}
      {sessions.some((session) => !session.isCurrent) ? (
        <footer className="settings-actions">
          <Button
            variant="secondary"
            disabled={mutations.revokeOtherSessions.isPending}
            onClick={() =>
              void mutations.revokeOtherSessions
                .mutateAsync()
                .then(() => notify('Other sessions revoked'))
                .catch((error) =>
                  notify(
                    error instanceof Error ? error.message : 'Sessions could not be revoked',
                    'error',
                  ),
                )
            }
          >
            {mutations.revokeOtherSessions.isPending ? 'Revoking…' : 'Revoke all other sessions'}
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
