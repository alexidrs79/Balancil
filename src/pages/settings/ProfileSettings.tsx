import { Button, useToast } from '../../components/ui';
import { useEmailChange, useSettingsMutations } from '../../hooks/useFinance';
import type { UserSettings } from '../../types';

export function ProfileSettings({
  settings,
  saving,
  onUserChanged,
  onSave,
}: {
  settings: UserSettings;
  saving: boolean;
  onUserChanged: (user: UserSettings['user']) => void;
  onSave: (profile: { name: string }) => Promise<void>;
}) {
  const { data: pendingEmail } = useEmailChange();
  const mutations = useSettingsMutations();
  const notify = useToast();

  return (
    <div className="settings-form">
      <header className="settings-panel-heading">
        <h2>Profile information</h2>
        <p>Update your display name or securely request a new sign-in email.</p>
      </header>
      <section className="profile-photo-setting" aria-labelledby="profile-photo-title">
        <span className="profile-photo-preview">
          {settings.user.profileImageUrl ? (
            <img src={settings.user.profileImageUrl} alt="" />
          ) : (
            settings.user.initials
          )}
        </span>
        <div>
          <h3 id="profile-photo-title">Profile image</h3>
          <p>JPEG, PNG, or WebP. Maximum 2 MB.</p>
          <div>
            <label className="button button-secondary">
              {mutations.profileImage.isPending ? 'Uploading…' : 'Choose image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={mutations.profileImage.isPending}
                onChange={(event) => {
                  const image = event.target.files?.[0];
                  if (!image) return;
                  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
                    notify('Choose a JPEG, PNG, or WebP image.', 'error');
                    event.target.value = '';
                    return;
                  }
                  if (image.size > 2 * 1024 * 1024) {
                    notify('Choose an image no larger than 2 MB.', 'error');
                    event.target.value = '';
                    return;
                  }
                  void mutations.profileImage
                    .mutateAsync(image)
                    .then((next) => {
                      onUserChanged(next.user);
                      notify('Profile image updated');
                    })
                    .catch((error) =>
                      notify(
                        error instanceof Error ? error.message : 'Image could not be uploaded',
                        'error',
                      ),
                    );
                  event.target.value = '';
                }}
              />
            </label>
            {settings.user.profileImageUrl ? (
              <Button
                type="button"
                variant="ghost"
                disabled={mutations.removeProfileImage.isPending}
                onClick={() =>
                  void mutations.removeProfileImage
                    .mutateAsync()
                    .then((next) => {
                      onUserChanged(next.user);
                      notify('Profile image removed');
                    })
                    .catch((error) =>
                      notify(
                        error instanceof Error ? error.message : 'Image could not be removed',
                        'error',
                      ),
                    )
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </section>
      <form
        className="settings-subform"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSave({ name: String(form.get('name') ?? '') });
        }}
      >
        <div className="settings-field-grid">
          <label className="field-control">
            Full name
            <input name="name" required defaultValue={settings.user.name} />
          </label>
          <div className="field-control">
            <span>Current email</span>
            <p className="field-readout">{settings.user.email}</p>
            <small className="field-hint">Used to sign in until a new address is confirmed.</small>
          </div>
        </div>
        <footer className="settings-actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save name'}
          </Button>
        </footer>
      </form>

      <form
        className="settings-subform email-change-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          const form = new FormData(formElement);
          void mutations.requestEmailChange
            .mutateAsync({
              email: String(form.get('email') ?? ''),
              currentPassword: String(form.get('currentPassword') ?? ''),
            })
            .then(() => {
              formElement.reset();
              notify('Confirmation sent to the new email address');
            })
            .catch((error) =>
              notify(
                error instanceof Error ? error.message : 'Email change could not be requested',
                'error',
              ),
            );
        }}
      >
        <header className="settings-subheading">
          <h3>Change email address</h3>
          <p>Your current address remains active until you confirm the new one.</p>
        </header>
        {pendingEmail ? (
          <div className="pending-email">
            <span>
              Confirmation pending for <strong>{pendingEmail.email}</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={mutations.cancelEmailChange.isPending}
              onClick={() =>
                void mutations.cancelEmailChange
                  .mutateAsync()
                  .then(() => notify('Email change cancelled'))
                  .catch((error) =>
                    notify(
                      error instanceof Error ? error.message : 'Request could not be cancelled',
                      'error',
                    ),
                  )
              }
            >
              Cancel request
            </Button>
          </div>
        ) : (
          <>
            <div className="settings-field-grid">
              <label className="field-control">
                New email
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="field-control">
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
            </div>
            <footer className="settings-actions">
              <Button type="submit" disabled={mutations.requestEmailChange.isPending}>
                {mutations.requestEmailChange.isPending ? 'Sending…' : 'Send confirmation'}
              </Button>
            </footer>
          </>
        )}
      </form>
    </div>
  );
}
