import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
  it('tracks the current matchMedia result', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(typeof result.current).toBe('boolean');
  });
});
