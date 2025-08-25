import { renderHook, act } from '@testing-library/react';
import { useMatchAbandonmentGuard } from '../useMatchAbandonmentGuard';
import { useMatchState } from '../useMatchState';

// Mock the useMatchState hook
jest.mock('../useMatchState');
const mockUseMatchState = useMatchState;

describe('useMatchAbandonmentGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes callback immediately when no active match', () => {
    mockUseMatchState.mockReturnValue({
      hasActiveMatch: false,
      hasUnsavedMatch: false,
      isMatchRunning: false,
      currentMatchId: null
    });

    const mockCallback = jest.fn();
    const { result } = renderHook(() => useMatchAbandonmentGuard());

    act(() => {
      result.current.requestNewGame(mockCallback);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(result.current.showModal).toBe(false);
  });

  it('shows modal when active match exists', () => {
    mockUseMatchState.mockReturnValue({
      hasActiveMatch: true,
      hasUnsavedMatch: false,
      isMatchRunning: true,
      currentMatchId: 'match-123'
    });

    const mockCallback = jest.fn();
    const { result } = renderHook(() => useMatchAbandonmentGuard());

    act(() => {
      result.current.requestNewGame(mockCallback);
    });

    expect(mockCallback).not.toHaveBeenCalled();
    expect(result.current.showModal).toBe(true);
  });

  it('executes callback when user abandons match', () => {
    mockUseMatchState.mockReturnValue({
      hasActiveMatch: true,
      hasUnsavedMatch: true,
      isMatchRunning: false,
      currentMatchId: 'match-123'
    });

    const mockCallback = jest.fn();
    const { result } = renderHook(() => useMatchAbandonmentGuard());

    // Request new game (should show modal)
    act(() => {
      result.current.requestNewGame(mockCallback);
    });

    expect(result.current.showModal).toBe(true);
    expect(mockCallback).not.toHaveBeenCalled();

    // User confirms abandonment
    act(() => {
      result.current.handleAbandon();
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(result.current.showModal).toBe(false);
  });

  it('cancels abandonment without executing callback', () => {
    mockUseMatchState.mockReturnValue({
      hasActiveMatch: true,
      hasUnsavedMatch: true,
      isMatchRunning: false,
      currentMatchId: 'match-123'
    });

    const mockCallback = jest.fn();
    const { result } = renderHook(() => useMatchAbandonmentGuard());

    // Request new game (should show modal)
    act(() => {
      result.current.requestNewGame(mockCallback);
    });

    expect(result.current.showModal).toBe(true);

    // User cancels
    act(() => {
      result.current.handleCancel();
    });

    expect(mockCallback).not.toHaveBeenCalled();
    expect(result.current.showModal).toBe(false);
  });

  it('warns when requestNewGame called without callback function', () => {
    mockUseMatchState.mockReturnValue({
      hasActiveMatch: false,
      hasUnsavedMatch: false,
      isMatchRunning: false,
      currentMatchId: null
    });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useMatchAbandonmentGuard());

    act(() => {
      result.current.requestNewGame('not-a-function');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'useMatchAbandonmentGuard: requestNewGame requires a callback function'
    );

    consoleSpy.mockRestore();
  });
});