import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('holds the previous value until the delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ value: 'ab' });
    expect(result.current).toBe('a');

    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe('ab');
  });

  it('only settles on the last value when typing continues', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    });

    for (const value of ['c', 'co', 'cof', 'coff']) {
      rerender({ value });
      act(() => void vi.advanceTimersByTime(200));
    }
    expect(result.current).toBe('');

    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe('coff');
  });
});
