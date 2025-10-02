import { renderHook } from '@testing-library/react';
import { useFieldPositionHandlers } from '../useFieldPositionHandlers';

jest.mock('../useQuickTapWithScrollDetection');

describe('useFieldPositionHandlers', () => {
  beforeEach(() => {
    const { useQuickTapWithScrollDetection } = require('../useQuickTapWithScrollDetection');
    useQuickTapWithScrollDetection.mockReturnValue({
      onTouchStart: jest.fn(),
      onTouchEnd: jest.fn(),
      onMouseDown: jest.fn(),
      onMouseUp: jest.fn(),
      onMouseLeave: jest.fn()
    });
  });

  it('exposes quick tap handlers for 7v7 midfielder positions', () => {
    const fieldPositionCallbacks = {
      leftMidfielderCallback: jest.fn(),
      centerMidfielderCallback: jest.fn(),
      rightMidfielderCallback: jest.fn()
    };

    const { result } = renderHook(() =>
      useFieldPositionHandlers(fieldPositionCallbacks, { substitutionType: 'individual' })
    );

    // Verify the handler object contains the midfielder event handlers
    expect(result.current).toBeDefined();
    expect(Object.keys(result.current)).toContain('leftMidfielderEvents');
    expect(Object.keys(result.current)).toContain('centerMidfielderEvents');
    expect(Object.keys(result.current)).toContain('rightMidfielderEvents');

    // Verify they are the mocked quick tap handlers with the expected properties
    expect(result.current.leftMidfielderEvents).toHaveProperty('onTouchStart');
    expect(result.current.leftMidfielderEvents).toHaveProperty('onTouchEnd');
    expect(result.current.leftMidfielderEvents).toHaveProperty('onMouseDown');
    expect(result.current.leftMidfielderEvents).toHaveProperty('onMouseUp');
    expect(result.current.leftMidfielderEvents).toHaveProperty('onMouseLeave');

    expect(result.current.centerMidfielderEvents).toHaveProperty('onTouchStart');
    expect(result.current.rightMidfielderEvents).toHaveProperty('onTouchStart');
  });

  it('registers quick tap callbacks for each 7v7 midfielder slot', () => {
    const { useQuickTapWithScrollDetection } = require('../useQuickTapWithScrollDetection');
    const leftMidfielderCallback = jest.fn();
    const centerMidfielderCallback = jest.fn();
    const rightMidfielderCallback = jest.fn();

    renderHook(() =>
      useFieldPositionHandlers(
        {
          leftMidfielderCallback,
          centerMidfielderCallback,
          rightMidfielderCallback
        },
        { substitutionType: 'individual' }
      )
    );

    const registeredCallbacks = useQuickTapWithScrollDetection.mock.calls.map(([cb]) => cb);

    expect(registeredCallbacks).toContain(leftMidfielderCallback);
    expect(registeredCallbacks).toContain(centerMidfielderCallback);
    expect(registeredCallbacks).toContain(rightMidfielderCallback);
  });
});
