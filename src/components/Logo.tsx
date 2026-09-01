/**
 * The Balancil mark: a "B" cut into three strokes of one weight — an axis stem,
 * a short upper arm, and a deep lower bowl — so the monogram also reads as two
 * bars of unequal length measured off the same baseline.
 *
 * The strokes never touch the stem except at the bottom, which keeps the
 * counter open as a single channel; at 16px that channel stays legible where a
 * closed counter would fill in. Coordinates are tile-relative on a 48 grid, so
 * the svg is sized to the full mark and the padding here supplies the inset.
 *
 * `public/favicon.svg` is the same geometry at 64 and must be kept in sync.
 */
function Glyph() {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" focusable="false" aria-hidden="true">
      <path d="M9.3 8.1H14.5V34.5H29.2A4.15 4.15 0 0 0 29.2 26.2H17.1V21H29.2A9.35 9.35 0 0 1 29.2 39.7H9.3Z" />
      <path d="M17.1 13.6H27.9A2.6 2.6 0 0 1 27.9 18.8H17.1Z" />
    </svg>
  );
}

type LogoMarkProps = {
  /**
   * Accessible name for the mark. Only pass this where the mark stands alone;
   * beside a visible wordmark it must stay decorative so nothing announces
   * the brand twice.
   */
  label?: string;
};

export function LogoMark({ label }: LogoMarkProps) {
  return (
    <span className="brand-mark" role={label ? 'img' : undefined} aria-label={label}>
      <Glyph />
    </span>
  );
}

/** Mark plus wordmark, for every place the brand appears as a link. */
export function Logo() {
  return (
    <>
      <LogoMark />
      <b className="brand-wordmark">Balancil</b>
    </>
  );
}
