# Testing Troubleshooting Guide

## Common Jest Mocking Issues and Solutions

This document provides quick solutions to common testing issues encountered in the DIF F16-6 Coach application.

## 1. Module Mocking Issues

### Problem: Variable Hoisting in Jest Mocks
```javascript
// ❌ This fails due to hoisting
const mockFn = jest.fn();
jest.mock('./module', () => ({ fn: mockFn }));
```

**Error**: `ReferenceError: Cannot access 'mockFn' before initialization`

**Solution**: Define mocks inline or use jest.requireActual
```javascript
// ✅ Option 1: Inline definition
jest.mock('./module', () => ({
  fn: jest.fn((input) => expectedOutput)
}));

// ✅ Option 2: Use requireActual for partial mocks
jest.mock('./module', () => {
  const actual = jest.requireActual('./module');
  return {
    ...actual,
    fn: jest.fn((input) => expectedOutput)
  };
});
```

### Problem: Mock Returns Undefined
**Symptom**: `TypeError: Cannot destructure property 'x' of '...' as it is undefined`

**Root Cause**: Mock function returns undefined instead of expected object structure

**Solution**: Ensure mock implementation returns proper structure
```javascript
// ❌ Mock returns undefined
jest.mock('./utils', () => ({
  calculateSomething: jest.fn()
}));

// ✅ Mock returns expected structure
jest.mock('./utils', () => ({
  calculateSomething: jest.fn((input) => ({
    result: 'expected',
    data: []
  }))
}));
```

## 2. Component Mocking Solutions

### Problem: Complex Child Component Mocking
```javascript
// ✅ Simple mock for complex components
jest.mock('../ComplexComponent', () => ({
  ComplexComponent: ({ children, onClick, ...props }) => (
    <div 
      data-testid="complex-component" 
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}));
```

### Problem: Icon Library Mocking
```javascript
// ✅ Mock Lucide React icons
jest.mock('lucide-react', () => ({
  IconName: ({ className, ...props }) => (
    <div data-testid="icon-name" className={className} {...props} />
  ),
  AnotherIcon: ({ className, ...props }) => (
    <div data-testid="another-icon" className={className} {...props} />
  )
}));
```

## 3. Utility Function Mocking

### Problem: Input Sanitization Mock (AddPlayerModal Issue)
**Issue**: `sanitizeNameInput` mock not handling edge cases properly

**Solution**: Realistic mock implementation
```javascript
jest.mock('../../../utils/inputSanitization', () => ({
  sanitizeNameInput: jest.fn((input) => {
    if (typeof input !== 'string') return '';
    
    let result = input;
    if (result.length > 50) {
      result = result.substring(0, 50);
    }
    
    // Remove invalid characters
    result = result.replace(/[^a-zA-ZÀ-ÿ0-9\s\-'&.]/g, '');
    
    return result;
  })
}));
```

### Problem: Role Points Calculation Mock (StatsScreen Issue)
**Issue**: `calculateRolePoints` mock not matching expected return structure

**Solution**: Match actual function behavior
```javascript
jest.mock('../../../utils/rolePointUtils', () => ({
  calculateRolePoints: jest.fn((player) => {
    if (!player || !player.stats) {
      return { goaliePoints: 0, defenderPoints: 0, attackerPoints: 0 };
    }
    
    const goaliePoints = player.stats.periodsAsGoalie || 0;
    const remainingPoints = 3 - goaliePoints;
    
    if (remainingPoints <= 0) {
      return { goaliePoints, defenderPoints: 0, attackerPoints: 0 };
    }
    
    // Simplified but realistic logic
    const totalOutfieldTime = 
      (player.stats.timeAsDefenderSeconds || 0) + 
      (player.stats.timeAsAttackerSeconds || 0);
    
    if (totalOutfieldTime === 0) {
      return { goaliePoints, defenderPoints: 0, attackerPoints: 0 };
    }
    
    const defenderPoints = Math.round(
      ((player.stats.timeAsDefenderSeconds || 0) / totalOutfieldTime) * 
      remainingPoints * 2
    ) / 2;
    
    return {
      goaliePoints,
      defenderPoints,
      attackerPoints: remainingPoints - defenderPoints
    };
  })
}));
```

## 4. Browser API Mocking

### Problem: Clipboard API Not Available in Tests
```javascript
// ✅ Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue()
  },
  writable: true
});
```

### Problem: Window.history Mocking for Navigation
```javascript
// ✅ Mock window.history methods
const mockReplaceState = jest.fn();
const mockPushState = jest.fn();
const mockBack = jest.fn();

beforeEach(() => {
  Object.defineProperty(window, 'history', {
    value: {
      replaceState: mockReplaceState,
      pushState: mockPushState,
      back: mockBack,
      state: { modalLevel: 0 }
    },
    writable: true
  });
});
```

## 5. Async Testing Issues

### Problem: Testing Async Operations Without Proper Waiting
```javascript
// ❌ This may fail due to timing
it('should update after async operation', () => {
  render(<AsyncComponent />);
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

// ✅ This waits properly
it('should update after async operation', async () => {
  render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

### Problem: Timer-Based Testing
```javascript
// ✅ Use fake timers for timer testing
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

it('should handle timer operations', () => {
  render(<TimerComponent />);
  
  // Fast-forward time
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

## 6. State Testing Anti-Patterns

### Problem: Testing Implementation Details
```javascript
// ❌ Testing internal state
expect(component.state.value).toBe('expected');

// ✅ Testing user-visible behavior
expect(screen.getByDisplayValue('expected')).toBeInTheDocument();
```

### Problem: Testing Props Instead of Behavior
```javascript
// ❌ Testing props were passed
expect(mockComponent).toHaveBeenCalledWith(
  expect.objectContaining({ prop: 'value' })
);

// ✅ Testing behavior result
expect(screen.getByText('Expected Result')).toBeInTheDocument();
```

## 7. Form Testing Solutions

### Problem: Input Change Events Not Triggering Updates
```javascript
// ❌ Basic change event might not work with some inputs
fireEvent.change(input, { target: { value: 'new value' } });

// ✅ Use userEvent for more realistic interactions
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.type(input, 'new value');
```

### Problem: Form Submission Testing
```javascript
// ✅ Test form submission properly
it('should handle form submission', () => {
  const mockSubmit = jest.fn();
  render(<Form onSubmit={mockSubmit} />);
  
  const input = screen.getByLabelText('Name');
  const submitButton = screen.getByRole('button', { name: /submit/i });
  
  fireEvent.change(input, { target: { value: 'test' } });
  fireEvent.click(submitButton);
  
  expect(mockSubmit).toHaveBeenCalledWith('test');
});
```

## 8. Console Warning Suppression

### Problem: React Key Warnings in Tests
```javascript
// ✅ Suppress specific warnings during tests
beforeEach(() => {
  const originalError = console.error;
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Filter React key warnings
    if (args[0]?.includes?.('Each child in a list should have a unique "key" prop')) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterEach(() => {
  console.error.mockRestore();
});
```

## 9. Memory Management in Tests

### Problem: Memory Leaks in Test Suites
```javascript
// ✅ Proper cleanup in tests
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup(); // From @testing-library/react
});

afterAll(() => {
  // Restore any global mocks
  jest.restoreAllMocks();
});
```

## 10. Debugging Test Failures

### Debugging Tool: Screen Debug
```javascript
// ✅ Debug what's actually rendered
it('should render correctly', () => {
  render(<Component />);
  
  // See what's rendered
  screen.debug();
  
  // Or debug specific element
  const element = screen.getByTestId('test-element');
  screen.debug(element);
});
```

### Debugging Tool: Query Failures
```javascript
// ✅ Debug query failures
it('should find element', () => {
  render(<Component />);
  
  // This will show available elements if query fails
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
  
  // Alternative: check what's available
  expect(screen.queryByText('Expected Text')).toBeInTheDocument();
});
```

## Quick Reference Commands

### Run Specific Test
```bash
npm test -- ComponentName.test.js
```

### Run Test with Coverage
```bash
npm test -- --coverage ComponentName.test.js
```

### Run Test in Watch Mode
```bash
npm test -- --watch ComponentName.test.js
```

### Debug Test with Verbose Output
```bash
npm test -- --verbose ComponentName.test.js
```

---

When encountering new testing issues, add the solution to this document for future reference.