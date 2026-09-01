import type { FC, ReactNode, SVGProps } from 'react';

/**
 * Balancil icon set.
 *
 * Drawn on a 16px grid with a 12px live area, 1.5 stroke, squared terminals and
 * mitred joins. Every enclosing shape (card, receipt, wallet, calendar, vault)
 * loses its top-right corner to a 45° chamfer, the same asymmetry the card radii
 * use. Geometry stays on the half-unit grid so the marks hold their edges at the
 * 15px they render at in most of the product.
 */

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  size?: number;
};

export type IconComponent = FC<IconProps>;

function Glyph({ size = 16, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      {...props}
    >
      {children}
    </svg>
  );
}

/* Navigation ------------------------------------------------------------- */

export const Dashboard: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.75 2.75H6.5V13.25H2.75Z" />
    <path d="M9.5 2.75H11.75L13.25 4.25V7.25H9.5Z" />
    <path d="M9.5 9.75H13.25V13.25H9.5Z" />
  </Glyph>
);

export const Exchange: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.75 5.75H13" />
    <path d="M10.5 3.25L13 5.75L10.5 8.25" />
    <path d="M13.25 10.25H3" />
    <path d="M5.5 7.75L3 10.25L5.5 12.75" />
  </Glyph>
);

export const ChartColumns: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.25 13.5H13.75" />
    <path d="M4.5 13.5V8.75" />
    <path d="M8 13.5V4.75" />
    <path d="M11.5 13.5V10.5" />
  </Glyph>
);

export const Budget: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2 6H14V10.25H2Z" />
    <path d="M4.25 8.25H8" />
    <path d="M11 4.5V11.75" />
  </Glyph>
);

export const Target: IconComponent = (props) => (
  <Glyph {...props}>
    <circle cx="8" cy="8" r="5.5" />
    <circle cx="8" cy="8" r="2.25" />
    <path d="M8 8H8.01" />
  </Glyph>
);

export const Settings: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.5 5.5H13.5" />
    <path d="M5 4.25H7.25V6.75H5Z" />
    <path d="M2.5 10.5H13.5" />
    <path d="M8.75 9.25H11V11.75H8.75Z" />
  </Glyph>
);

export const SignOut: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M6.25 2.75H2.75V13.25H6.25" />
    <path d="M6 8H13.25" />
    <path d="M10.75 5.5L13.25 8L10.75 10.5" />
  </Glyph>
);

export const Menu: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.5 4.5H13.5" />
    <path d="M2.5 8H13.5" />
    <path d="M2.5 11.5H13.5" />
  </Glyph>
);

export const Close: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M4 4L12 12" />
    <path d="M12 4L4 12" />
  </Glyph>
);

export const Copy: IconComponent = (props) => (
  <Glyph {...props}>
    <rect x="5.25" y="5.25" width="8" height="8" rx="1.25" />
    <path d="M10.75 5.25V3.75A1.25 1.25 0 0 0 9.5 2.5H3.75A1.25 1.25 0 0 0 2.5 3.75V9.5a1.25 1.25 0 0 0 1.25 1.25h1.5" />
  </Glyph>
);

export const Search: IconComponent = (props) => (
  <Glyph {...props}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="M10.25 10.25L13.5 13.5" />
  </Glyph>
);

/* Account types ---------------------------------------------------------- */

export const Landmark: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2 6.25L8 2.75L14 6.25" />
    <path d="M4.75 7.75V11.5" />
    <path d="M8 7.75V11.5" />
    <path d="M11.25 7.75V11.5" />
    <path d="M2.5 13.25H13.5" />
  </Glyph>
);

export const Vault: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.5 3H11L13.5 5.5V13H2.5Z" />
    <circle cx="7" cy="8.25" r="2.25" />
    <path d="M9.5 8.25H11.5" />
  </Glyph>
);

export const CreditCard: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M1.75 4.25H11.5L14.25 7V11.75H1.75Z" />
    <path d="M1.75 7.25H14.25" />
    <path d="M4.25 9.5H7" />
  </Glyph>
);

export const Wallet: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2 4.5H11.25L14 7.25V12.5H2Z" />
    <path d="M10.5 8.5H14V10.75H10.5Z" />
  </Glyph>
);

export const Cards: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M4.5 6.5V4H11.75L14 6.25V10.75" />
    <path d="M2 6.5H10.25L12.5 8.75V13H2Z" />
  </Glyph>
);

/* Spending categories ---------------------------------------------------- */

export const Home: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2 8L8 2.75L14 8" />
    <path d="M4 8.5V13.25H12V8.5" />
  </Glyph>
);

export const Utensils: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M3.5 2.5V6.25H7V2.5" />
    <path d="M5.25 2.5V6.25" />
    <path d="M5.25 6.25V13.5" />
    <path d="M11.25 2.5L12.75 4.5V8.25H9.75V4.5Z" />
    <path d="M11.25 8.25V13.5" />
  </Glyph>
);

export const Car: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M4 8L5.5 4.75H10.5L12 8" />
    <path d="M2.25 8H13.75V11.25H2.25Z" />
    <path d="M4.75 11.25V12.75" />
    <path d="M11.25 11.25V12.75" />
  </Glyph>
);

export const ShoppingBag: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M3.25 5.5H10.75L13 7.75V13.25H3.25Z" />
    <path d="M6 5.5V4H10V5.5" />
  </Glyph>
);

export const Pulse: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2 8.25H5L6.5 4.75L9.25 11.75L10.75 8.25H14" />
  </Glyph>
);

export const Laptop: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M3.25 4.25H11L13 6.25V10.5H3.25Z" />
    <path d="M1.75 12.5H14.25" />
  </Glyph>
);

export const Ticket: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2 5.75H11.25L14 8.5V11.5H2Z" />
    <path d="M9 6.5V7.5" />
    <path d="M9 9.75V10.75" />
  </Glyph>
);

export const Briefcase: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2 6.25H11.25L14 9V13H2Z" />
    <path d="M6 6.25V4.5H10V6.25" />
  </Glyph>
);

export const Zap: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M8.75 2.5L2.75 9.25H8.75L7.25 13.5L13.25 6.75H7.25Z" />
  </Glyph>
);

export const Circle: IconComponent = (props) => (
  <Glyph {...props}>
    <circle cx="8" cy="8" r="4.75" />
  </Glyph>
);

/* Metrics and utility ---------------------------------------------------- */

export const Alert: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M8 2.5L14 13.25H2Z" />
    <path d="M8 6.75V9.5" />
    <path d="M8 11.25H8.01" />
  </Glyph>
);

export const Calendar: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.5 4.25H11.5L13.5 6.25V13.25H2.5Z" />
    <path d="M2.5 7.5H13.5" />
    <path d="M5.5 2.5V5" />
    <path d="M10.5 2.5V5" />
    <path d="M5.25 10H8.25" />
  </Glyph>
);

export const ArrowRight: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.5 8H13" />
    <path d="M9.5 4.5L13 8L9.5 11.5" />
  </Glyph>
);

export const ChevronLeft: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M10.25 3.5L5.5 8L10.25 12.5" />
  </Glyph>
);

export const ChevronRight: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M5.75 3.5L10.5 8L5.75 12.5" />
  </Glyph>
);

export const Plus: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M8 3.25V12.75" />
    <path d="M3.25 8H12.75" />
  </Glyph>
);

export const Pencil: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.75 13.25V10.5L10.5 2.75L13.25 5.5L5.5 13.25Z" />
    <path d="M8.75 4.5L11.5 7.25" />
  </Glyph>
);

export const Trash: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.75 4.5H13.25" />
    <path d="M6 4.5V2.75H10V4.5" />
    <path d="M4.25 4.5V13.25H11.75V4.5" />
    <path d="M6.75 7V11" />
    <path d="M9.25 7V11" />
  </Glyph>
);

export const Filter: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.25 3.5H13.75L9.25 8.75V13L6.75 11.25V8.75Z" />
  </Glyph>
);

export const Check: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M3.25 8.25L6.5 11.5L12.75 5.25" />
  </Glyph>
);

export const Eye: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M1.75 8L4.75 4.75H11.25L14.25 8L11.25 11.25H4.75Z" />
    <circle cx="8" cy="8" r="1.75" />
  </Glyph>
);

export const EyeOff: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M1.75 8L4.75 4.75H11.25L14.25 8L11.25 11.25H4.75Z" />
    <circle cx="8" cy="8" r="1.75" />
    <path d="M2.5 13.5L13.5 2.5" />
  </Glyph>
);

export const Lock: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M3.5 7.5H12.5V13.5H3.5Z" />
    <path d="M5.75 7.5V5.25H10.25V7.5" />
    <path d="M8 9.75V11.5" />
  </Glyph>
);

export const User: IconComponent = (props) => (
  <Glyph {...props}>
    <circle cx="8" cy="5.5" r="2.5" />
    <path d="M3 13.5V12L5.5 9.75H10.5L13 12V13.5" />
  </Glyph>
);

/* Trust and status ------------------------------------------------------- */

export const Shield: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M8 2.25L13.5 4.5V8.25L8 13.75L2.5 8.25V4.5Z" />
  </Glyph>
);

export const ShieldCheck: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M8 2.25L13.5 4.5V8.25L8 13.75L2.5 8.25V4.5Z" />
    <path d="M5.5 7.5L7.25 9.25L10.5 6" />
  </Glyph>
);

export const Archive: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2 4H11.5L14 6.5V13H2Z" />
    <path d="M2 8H14" />
    <path d="M6.5 10.5H9.5" />
  </Glyph>
);

export const BankOff: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M2.5 6.5L8 3.25L13.5 6.5" />
    <path d="M5.25 8V11.25" />
    <path d="M10.75 8V11.25" />
    <path d="M3 13H13" />
    <path d="M2.25 13.75L13.75 2.25" />
  </Glyph>
);

export const PaperPlane: IconComponent = (props) => (
  <Glyph {...props}>
    <path d="M14 2.5L2.25 7.75L7 9.75L9 13.5Z" />
    <path d="M14 2.5L7 9.75" />
  </Glyph>
);
