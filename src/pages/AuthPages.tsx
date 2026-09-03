import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff } from '../components/icons';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/authService';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
const registerSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(12, 'Use at least 12 characters'),
});
const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
const resetSchema = z
  .object({
    password: z.string().min(12, 'Use at least 12 characters'),
    passwordConfirmation: z.string().min(12, 'Confirm your password'),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  });

function AuthShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="brand" to="/">
          <Logo />
        </Link>
      </header>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="auth-kicker">Balancil account</p>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
        <p className="auth-legal">Your financial records are private to your Balancil account.</p>
      </section>
    </main>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isInitializing } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [apiError, setApiError] = useState('');
  // Bumped on every failure so the alert remounts and replays its shake animation.
  const [attempt, setAttempt] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  const submit = handleSubmit(async ({ email, password }) => {
    try {
      await login(email, password, remember);
      navigate('/app');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to sign in');
      setAttempt((value) => value + 1);
    }
  });
  if (isInitializing) {
    return (
      <div className="page auth-loading" aria-busy="true">
        <span className="sr-only">Restoring your session</span>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return (
    <AuthShell title="Welcome back" description="Sign in to review your accounts and activity.">
      <form className="auth-form" onSubmit={submit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <small className="field-error" id="login-email-error">
              {errors.email.message}
            </small>
          )}
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {errors.password && (
            <small className="field-error" id="login-password-error">
              {errors.password.message}
            </small>
          )}
        </label>
        <div className="form-row">
          <label className="remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember me
          </label>
          <Link to="/forgot-password">Forgot password</Link>
        </div>
        {apiError && (
          <p className="form-error" role="alert" key={attempt}>
            {apiError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            'Signing in…'
          ) : (
            <>
              Sign in <ArrowRight size={18} />
            </>
          )}
        </Button>
      </form>
      <div className="auth-switch">
        New to Balancil? <Link to="/register">Create an account</Link>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isAuthenticated, isInitializing } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  const submit = handleSubmit(async ({ name, email, password }) => {
    try {
      setApiError('');
      await registerUser(name, email, password);
      navigate('/app');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to create your account');
    }
  });
  if (isInitializing) {
    return (
      <div className="page auth-loading" aria-busy="true">
        <span className="sr-only">Restoring your session</span>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return (
    <AuthShell
      title="Create your account"
      description="Open a private ledger for accounts, transactions, budgets, and goals."
    >
      <form className="auth-form" onSubmit={submit}>
        <label>
          Full name
          <input
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'register-name-error' : undefined}
            {...register('name')}
          />
          {errors.name && (
            <small className="field-error" id="register-name-error">
              {errors.name.message}
            </small>
          )}
        </label>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            {...register('email')}
            placeholder="you@example.com"
          />
          {errors.email && (
            <small className="field-error" id="register-email-error">
              {errors.email.message}
            </small>
          )}
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'register-password-error' : undefined}
              {...register('password')}
              placeholder="At least 12 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {errors.password && (
            <small className="field-error" id="register-password-error">
              {errors.password.message}
            </small>
          )}
        </label>
        {apiError ? (
          <p className="form-error" role="alert">
            {apiError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            'Creating account…'
          ) : (
            <>
              Create account <ArrowRight size={18} />
            </>
          )}
        </Button>
        <p className="auth-consent">
          By creating an account, you agree to the <Link to="/terms">Terms of Use</Link> and
          acknowledge the <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </form>
      <div className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [apiError, setApiError] = useState('');
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });
  const submit = handleSubmit(async ({ email }) => {
    try {
      setApiError('');
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to send a reset link');
    }
  });

  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email for your Balancil account. If it is registered, we send a reset link."
    >
      {sent ? (
        <p className="auth-legal" role="status">
          If that email is registered, a reset link is on its way. Check your inbox, and the spam
          folder if it does not appear.
        </p>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'forgot-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <small className="field-error" id="forgot-email-error">
                {errors.email.message}
              </small>
            )}
          </div>
          {apiError ? (
            <p className="form-error" role="alert">
              {apiError}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
      <div className="auth-switch">
        <Link to="/login">Back to sign in</Link>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });
  const submit = handleSubmit(async ({ password, passwordConfirmation }) => {
    try {
      setApiError('');
      await authApi.resetPassword({ token, email, password, passwordConfirmation });
      navigate('/login');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to update the password');
    }
  });

  if (!token || !email) {
    return (
      <AuthShell title="Reset link missing" description="Use the link from the email we sent.">
        <div className="auth-switch">
          <Link to="/forgot-password">Request a new link</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" description={`Resetting the password for ${email}.`}>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'reset-password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <small className="field-error" id="reset-password-error">
              {errors.password.message}
            </small>
          )}
        </div>
        <div className="auth-field">
          <label htmlFor="reset-password-confirmation">Confirm password</label>
          <input
            id="reset-password-confirmation"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.passwordConfirmation)}
            aria-describedby={
              errors.passwordConfirmation ? 'reset-password-confirmation-error' : undefined
            }
            {...register('passwordConfirmation')}
          />
          {errors.passwordConfirmation && (
            <small className="field-error" id="reset-password-confirmation-error">
              {errors.passwordConfirmation.message}
            </small>
          )}
        </div>
        {apiError ? (
          <p className="form-error" role="alert">
            {apiError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  );
}

export function ConfirmEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error',
  );
  const [message, setMessage] = useState(
    token ? 'Confirming your new address…' : 'This link is incomplete.',
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    void authApi
      .confirmEmailChange(token)
      .then((result) => {
        if (!active) return;
        setStatus('success');
        setMessage(result.message);
      })
      .catch((error) => {
        if (!active) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'This link is invalid or has expired.');
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthShell title="Confirm email change" description={message}>
      <div className={`auth-status ${status}`} role="status" aria-live="polite">
        {status === 'loading'
          ? 'Please wait while Balancil verifies the confirmation link.'
          : status === 'success'
            ? 'Your new email address is ready to use.'
            : 'Sign in, then request another confirmation from Profile settings.'}
      </div>
      <Link className="button primary" to="/login">
        Sign in
      </Link>
    </AuthShell>
  );
}
