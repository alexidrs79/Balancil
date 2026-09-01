import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Account, Goal } from '../types';
import {
  ArrowRight,
  Briefcase,
  Car,
  Circle,
  CreditCard,
  Home,
  Landmark,
  Laptop,
  PaperPlane,
  Pulse,
  Shield,
  ShoppingBag,
  Ticket,
  Utensils,
  Vault,
  Wallet,
  Zap,
  type IconComponent,
} from './icons';
import { cn } from './ui';

const categoryIcons: Record<string, IconComponent> = {
  briefcase: Briefcase,
  home: Home,
  utensils: Utensils,
  car: Car,
  bag: ShoppingBag,
  heart: Pulse,
  laptop: Laptop,
  ticket: Ticket,
  zap: Zap,
  circle: Circle,
};

const accountIcons: Record<Account['type'], IconComponent> = {
  checking: Landmark,
  savings: Vault,
  credit: CreditCard,
  cash: Wallet,
};

const FALLBACK_MARK = 'var(--muted)';

export function CategoryMark({
  icon,
  color,
  label,
}: {
  icon?: string;
  color?: string;
  label?: string;
}) {
  const Icon = categoryIcons[icon ?? ''] ?? Circle;
  return (
    <span
      className="visual-mark category-mark"
      style={{ ['--mark-color' as string]: color ?? FALLBACK_MARK }}
    >
      <Icon size={15} aria-hidden="true" focusable="false" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export function AccountMark({ type, color }: { type: Account['type']; color?: string }) {
  const Icon = accountIcons[type] ?? Landmark;
  return (
    <span
      className="visual-mark account-mark"
      style={{ ['--mark-color' as string]: color ?? 'var(--brand)' }}
    >
      <Icon size={15} aria-hidden="true" focusable="false" />
    </span>
  );
}

export function GoalMark({ goal }: { goal: Goal }) {
  const Icon = /mac|laptop|computer/i.test(goal.name)
    ? Laptop
    : /trip|travel|japan|flight/i.test(goal.name)
      ? PaperPlane
      : Shield;
  return (
    <span className="visual-mark goal-mark" style={{ ['--mark-color' as string]: goal.color }}>
      <Icon size={16} aria-hidden="true" focusable="false" />
    </span>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="section-link" to={to}>
      {children}
      <ArrowRight size={14} />
    </Link>
  );
}

// The sparkline is stretched with preserveAspectRatio="none", so geometry is inset from the
// viewBox edges and strokes are non-scaling to keep the line, caps and end dot from clipping.
const SPARK_INSET_X = 2.5;
const SPARK_TOP = 6;
const SPARK_BASE = 32;
const SPARK_FLOOR = 40;

export function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const yFor = (value: number) => SPARK_BASE - ((value - min) / span) * (SPARK_BASE - SPARK_TOP);
  const points = values.map((value, index) => {
    const x = SPARK_INSET_X + (index / (values.length - 1)) * (100 - SPARK_INSET_X * 2);
    return { x, y: yFor(value) };
  });
  const path = points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L');
  const first = points[0];
  const last = points[points.length - 1];
  const line = `M${path}`;
  const area = `M${first.x.toFixed(2)},${SPARK_FLOOR} L${path} L${last.x.toFixed(2)},${SPARK_FLOOR} Z`;
  const dot = `M${last.x.toFixed(2)},${last.y.toFixed(2)} L${last.x.toFixed(2)},${last.y.toFixed(2)}`;
  // Only meaningful when the series actually crosses zero; otherwise it would sit on
  // the plot edge and read as a border rather than a reference.
  const zeroLine = min < 0 && max > 0 ? yFor(0) : null;

  return (
    <svg
      className={cn('mini-sparkline', className)}
      viewBox={`0 0 100 ${SPARK_FLOOR}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--spark-color, var(--lime-ink))" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--spark-color, var(--lime-ink))" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {[SPARK_TOP, (SPARK_TOP + SPARK_BASE) / 2, SPARK_BASE].map((y) => (
        <path
          className="mini-sparkline-grid"
          key={y}
          d={`M0,${y} L100,${y}`}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path className="mini-sparkline-area" d={area} fill={`url(#${gradientId})`} />
      {zeroLine === null ? null : (
        <path
          className="mini-sparkline-zero"
          d={`M0,${zeroLine.toFixed(2)} L100,${zeroLine.toFixed(2)}`}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path className="mini-sparkline-line" d={line} pathLength={100} />
      <path className="mini-sparkline-dot" d={dot} />
    </svg>
  );
}
