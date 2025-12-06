import { renderHook, act } from '@testing-library/react';
import { useMatchRecovery } from '../useMatchRecovery';

describe('useMatchRecovery', () => {
  it('returns a disabled recovery state by default', () => {
    const { result } = renderHook(() => useMatchRecovery({}));

    expect(result.current.showRecoveryModal).toBe(false);
    expect(result.current.recoveryMatch).toBeNull();
    expect(result.current.isProcessingRecovery).toBe(false);
    expect(typeof result.current.handleSaveRecovery).toBe('function');
    expect(typeof result.current.handleAbandonRecovery).toBe('function');
    expect(typeof result.current.handleCloseRecovery).toBe('function');
  });

  it('resets recovery state when dependencies change', () => {
    const { result, rerender } = renderHook(
      (props) => useMatchRecovery(props),
      { initialProps: { user: { id: 'user-1' } } }
    );

    act(() => {
      rerender({ user: { id: 'user-2' } });
    });

    expect(result.current.showRecoveryModal).toBe(false);
    expect(result.current.recoveryMatch).toBeNull();
    expect(result.current.isProcessingRecovery).toBe(false);
  });
});
