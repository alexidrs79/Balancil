import { useLayoutEffect } from 'react';

const READY = 'reveal-ready';
const VISIBLE = 'is-visible';

/**
 * Fades `[data-reveal]` blocks up as they scroll into view.
 *
 * The hidden starting state is applied from script rather than the stylesheet, so a
 * blocked or failed bundle leaves the page fully readable instead of stranded at zero
 * opacity. Reduced-motion and missing-observer paths mark everything visible outright.
 */
export function useRevealOnScroll() {
  useLayoutEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      for (const target of targets) target.classList.add(VISIBLE);
      return;
    }

    const root = document.documentElement;
    root.classList.add(READY);

    // Blocks already on screen enter on the next frame instead of waiting for the
    // observer, so the first view reads as a load entrance rather than a late jump.
    const frame = requestAnimationFrame(() => {
      for (const target of targets) {
        if (target.getBoundingClientRect().top < window.innerHeight) {
          target.classList.add(VISIBLE);
        }
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add(VISIBLE);
          // Revealing once keeps the page from re-animating on scroll-up.
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    for (const target of targets) observer.observe(target);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      // `is-visible` is deliberately left in place: clearing it would replay every
      // entrance when Fast Refresh remounts the page.
      root.classList.remove(READY);
    };
  }, []);
}
