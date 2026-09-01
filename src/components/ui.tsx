import { Archive, Calendar, Close } from './icons';
import {
  createContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...classes: Array<string | false | null | undefined>) =>
  twMerge(classes.filter(Boolean).join(' '));

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button
      className={cn(
        'button',
        variant === 'secondary' && 'button-secondary',
        variant === 'ghost' && 'button-ghost',
        variant === 'danger' && 'button-danger',
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  variant = 'bordered',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: 'bordered' | 'borderless' | 'accent' | 'contrast';
}) {
  return <div className={cn('card', `card-${variant}`, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('field-select', className)} {...props} />;
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'positive' | 'attention' | 'negative' | 'neutral';
}) {
  return <span className={cn('badge', `badge-${tone}`, className)} {...props} />;
}

export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <span className={cn('tooltip', className)}>
      <span className="tooltip-trigger" aria-describedby={id}>
        {children}
      </span>
      <span className="tooltip-content" id={id} role="tooltip">
        {content}
      </span>
    </span>
  );
}

export function LedgerList({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn('ledger-list', className)} {...props} />;
}

export function LedgerRow({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn('ledger-row', className)} {...props} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('page-header', className)}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function PeriodControl({
  label,
  detail,
  ariaLabel,
  value,
  options,
  onChange,
}: {
  label?: string;
  detail?: string;
  ariaLabel: string;
  value?: string;
  options?: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
}) {
  const isInteractive = Boolean(options?.length && onChange);

  return (
    <div
      className={cn('period-control', isInteractive && 'is-interactive')}
      aria-label={isInteractive ? undefined : ariaLabel}
    >
      <Calendar size={15} aria-hidden="true" />
      {isInteractive ? (
        <>
          <span className="period-control-choice" aria-hidden="true">
            <strong>{options?.find((option) => option.value === value)?.label ?? label}</strong>
            {detail ? <small>{detail}</small> : null}
          </span>
          <select
            className="period-control-select"
            aria-label={ariaLabel}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <span>
          <strong>{label}</strong>
          {detail ? <small>{detail}</small> : null}
        </span>
      )}
    </div>
  );
}

export function Progress({
  value,
  color,
  label,
  className,
}: {
  value: number;
  color?: string;
  label?: string;
  className?: string;
}) {
  const safeValue = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={cn('progress', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <span style={{ ['--progress' as string]: `${safeValue}%`, background: color }} />
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function AnimatedValue({
  value,
  format,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const formatter = format ?? ((next: number) => String(Math.round(next)));

  useEffect(() => {
    if (reduced) {
      displayRef.current = value;
      return;
    }
    const start = displayRef.current;
    const delta = value - start;
    if (Math.abs(delta) < 0.005) {
      displayRef.current = value;
      return;
    }
    const duration = 720;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = start + delta * eased;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reduced, value]);

  const shown = reduced ? value : display;

  return (
    <span className={className}>
      <span className="sr-only">{formatter(value)}</span>
      <span aria-hidden="true">{formatter(shown)}</span>
    </span>
  );
}

export function TrendBadge({
  value,
  label,
  positive = true,
}: {
  value: string;
  label?: string;
  positive?: boolean;
}) {
  return (
    <span className={cn('trend-badge', positive ? 'is-up' : 'is-down')}>
      <b aria-hidden="true">{positive ? '↑' : '↓'}</b>
      <span>
        {value}
        {label ? ` ${label}` : ''}
      </span>
    </span>
  );
}

export function StatusPill({
  tone = 'positive',
  children,
}: {
  tone?: 'positive' | 'attention' | 'negative' | 'neutral';
  children: ReactNode;
}) {
  return (
    <Badge className={cn('status-pill', tone)} tone={tone}>
      {children}
    </Badge>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-mark" aria-hidden="true">
        <Archive size={20} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      const initialFocus = dialogRef.current?.querySelector<HTMLElement>(
        '[data-autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])',
      );
      (initialFocus ?? dialogRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className={cn('modal', size === 'sm' && 'modal-sm', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
            <Close size={19} />
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pending = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="confirmation">
        <div className="confirmation-body">{children}</div>
        <div className="confirmation-actions">
          {/* Cancel takes initial focus so a stray Enter cannot delete a record. */}
          <Button variant="secondary" data-autofocus onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type ToastTone = 'success' | 'error';
type Toast = { id: number; message: string; tone: ToastTone };
const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = (message: string, tone: ToastTone = 'success') => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3000);
  };
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div
            className={cn('toast', `toast-${toast.tone}`)}
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
