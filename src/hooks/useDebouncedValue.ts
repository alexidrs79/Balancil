import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay` ms. Used to keep a search box responsive while the
 * request it drives fires once the typing settles.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
