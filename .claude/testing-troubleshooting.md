# Testing Troubleshooting Guide

## Common Jest Mocking Issues and Solutions

This document provides quick solutions to common testing issues encountered in the DIF F16-6 Coach application.

*See `.claude/testing-guidelines.md` for comprehensive testing patterns and best practices.*

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

### Problem: Utility Function Mocks Not Matching Expected Behavior
**Common Issues**:
- `sanitizeNameInput` mock not handling edge cases (length limits, character filtering)
- `calculateRolePoints` mock not returning expected object structure
- Mock functions returning undefined instead of realistic data

**Solution**: Create realistic mock implementations that match actual function behavior
- Return proper data structures (objects with expected properties)
- Handle edge cases (null/undefined inputs, boundary conditions)
- Use simplified but realistic business logic in mocks

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
**Issue**: React warnings cluttering test output (key warnings, prop warnings)

**Solution**: Selectively suppress known warnings while preserving real errors
- Mock `console.error` to filter specific warning patterns
- Restore original console behavior after tests
- Only suppress expected warnings, not real errors

## 9. Memory Management in Tests

### Problem: Memory Leaks in Test Suites
**Issue**: Tests leaving behind mocks, event listeners, or React components

**Solution**: Implement proper cleanup patterns
- Use `jest.clearAllMocks()` in `beforeEach`
- Use `cleanup()` from @testing-library/react in `afterEach`
- Use `jest.restoreAllMocks()` in `afterAll`
- Clear timers and intervals in cleanup

## 10. Debugging Test Failures

### Debugging Tools
- Use `screen.debug()` to see what's actually rendered
- Use `screen.debug(element)` to debug specific elements
- Check query failures with `screen.queryByText()` vs `screen.getByText()`
- Use browser DevTools React extension for component inspection

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