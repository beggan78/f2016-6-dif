# Testing Guidelines for DIF F16-6 Coach Application

## Overview

This document outlines the testing strategies, patterns, and best practices established for the DIF F16-6 Coach application. These guidelines ensure consistent, maintainable, and comprehensive test coverage across all components and modules.

## Test Architecture

### Test Organization
```
src/
├── components/
│   └── __tests__/
│       ├── componentTestUtils.js     # Shared testing utilities
│       └── [component]Test.js        # Component-specific tests
├── hooks/
│   └── __tests__/
│       └── [hook]Test.js            # Hook-specific tests
├── utils/
│   └── __tests__/
│       └── [utility]Test.js         # Utility function tests
└── game/
    └── [module]/
        └── __tests__/
            └── [module]Test.js      # Game logic tests
```

### Test Categories

1. **Unit Tests** - Individual functions/utilities (✅ Complete)
2. **Hook Tests** - React hooks behavior (✅ Complete) 
3. **Component Tests** - React component rendering and interactions (✅ Complete)
4. **Integration Tests** - Cross-module functionality (Future)
5. **E2E Tests** - Complete user workflows (Future)

## Testing Patterns and Standards

### 1. Component Testing Pattern

```javascript
// Standard component test structure
describe('ComponentName', () => {
  let defaultProps;
  let mockHandlers;

  beforeEach(() => {
    // Setup mocks and default props
    mockHandlers = {
      onAction: jest.fn(),
      onOtherAction: jest.fn()
    };

    defaultProps = {
      // Required props
      requiredProp: 'value',
      ...mockHandlers
    };

    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    // Basic rendering tests
  });

  describe('User Interactions', () => {
    // Event handling tests
  });

  describe('Props and State', () => {
    // Props validation and state changes
  });

  describe('Edge Cases and Error Handling', () => {
    // Error scenarios and boundary conditions
  });
});
```

### 2. Hook Testing Pattern

```javascript
// Standard hook test structure
describe('useHookName', () => {
  beforeEach(() => {
    // Mock external dependencies
    jest.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    // Initial state and setup
  });

  describe('State Management', () => {
    // State updates and side effects
  });

  describe('Cleanup and Memory', () => {
    // Cleanup and unmount behavior
  });
});
```

### 3. Utility Testing Pattern

```javascript
// Standard utility test structure
describe('utilityFunction', () => {
  describe('Valid Inputs', () => {
    // Happy path scenarios
  });

  describe('Edge Cases', () => {
    // Boundary conditions
  });

  describe('Error Handling', () => {
    // Invalid inputs and error scenarios
  });
});
```

## Mocking Strategies

### 1. Component Mocking
```javascript
// Mock complex child components
jest.mock('../ComplexComponent', () => ({
  ComplexComponent: ({ children, ...props }) => (
    <div data-testid="complex-component" {...props}>
      {children}
    </div>
  )
}));
```

### 2. Utility Mocking
```javascript
// Mock utility functions with realistic behavior
jest.mock('../../utils/utilityModule', () => ({
  utilityFunction: jest.fn((input) => {
    // Implement simplified but realistic logic
    return expectedOutput;
  })
}));
```

### 3. External Dependencies
```javascript
// Mock external libraries
jest.mock('external-library', () => ({
  libraryFunction: jest.fn(),
  CONSTANTS: {
    VALUE: 'mock-value'
  }
}));
```

## Test Data Management

### 1. Shared Test Utilities
Use `componentTestUtils.js` for common patterns:

```javascript
// Create consistent mock data
export const createMockPlayers = (count = 7) => {
  // Standard player data structure
};

// Common user interactions
export const userInteractions = {
  fillInput: (input, value) => {
    fireEvent.change(input, { target: { value } });
  },
  submitForm: (form) => {
    fireEvent.submit(form);
  }
};
```

### 2. Mock Data Consistency
- Use realistic data that matches production patterns
- Include all required fields for proper testing
- Maintain consistent IDs and relationships

## Testing Critical Paths

### 1. User Workflow Testing
Test complete user journeys:
- Configuration → Setup → Game → Stats
- Error recovery scenarios
- Data persistence across sessions

### 2. State Management Testing
- Initial state setup
- State transitions
- Persistence and restoration
- Error handling

### 3. Business Logic Testing
- Game rule enforcement
- Time calculations
- Substitution logic
- Formation management

## Performance Testing Considerations

### 1. Component Performance
```javascript
// Test component rendering performance
it('should render efficiently with large datasets', () => {
  const largeDataset = createMockPlayers(50);
  const startTime = performance.now();
  
  render(<Component players={largeDataset} />);
  
  const endTime = performance.now();
  expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
});
```

### 2. Memory Management
```javascript
// Test memory cleanup
it('should clean up properly on unmount', () => {
  const { unmount } = renderHook(() => useCustomHook());
  
  unmount();
  
  // Verify cleanup occurred
  expect(mockCleanupFunction).toHaveBeenCalled();
});
```

## Accessibility Testing

### 1. Basic Accessibility
```javascript
// Test ARIA labels and keyboard navigation
it('should have proper accessibility attributes', () => {
  render(<Component />);
  
  const element = screen.getByRole('button');
  expect(element).toHaveAccessibleName();
  expect(element).toHaveAttribute('aria-label');
});
```

### 2. Keyboard Navigation
```javascript
// Test keyboard interactions
it('should handle keyboard navigation', () => {
  render(<Component />);
  
  const element = screen.getByRole('button');
  fireEvent.keyDown(element, { key: 'Enter' });
  
  expect(mockHandler).toHaveBeenCalled();
});
```

## Error Handling Testing

### 1. Component Error Boundaries
```javascript
// Test error boundary behavior
it('should handle component errors gracefully', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  
  expect(() => {
    render(<ComponentThatThrows />);
  }).not.toThrow();
  
  consoleSpy.mockRestore();
});
```

### 2. Async Error Handling
```javascript
// Test async operation failures
it('should handle async errors', async () => {
  mockAsyncFunction.mockRejectedValue(new Error('Network error'));
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });
});
```

## Testing Best Practices

### 1. Test Naming
- Use descriptive test names that explain the scenario
- Follow the pattern: "should [expected behavior] when [condition]"
- Group related tests in describe blocks

### 2. Test Independence
- Each test should be independent and isolated
- Use `beforeEach` for setup, `afterEach` for cleanup
- Clear mocks between tests

### 3. Assertion Quality
- Use specific, meaningful assertions
- Test behavior, not implementation details
- Assert on user-visible outcomes

### 4. Mock Management
- Mock external dependencies, not internal logic
- Use realistic mock implementations
- Verify mock calls when testing side effects

## Common Pitfalls and Solutions

### 1. Mocking Issues
**Problem**: Jest module mocking with variable hoisting
```javascript
// ❌ This fails due to hoisting
const mockFn = jest.fn();
jest.mock('./module', () => ({ fn: mockFn }));

// ✅ This works
jest.mock('./module', () => ({
  fn: jest.fn()
}));
```

### 2. Async Testing
**Problem**: Testing async operations without proper waiting
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

### 3. State Testing
**Problem**: Testing internal state instead of behavior
```javascript
// ❌ Testing implementation details
expect(component.state.value).toBe('expected');

// ✅ Testing user-visible behavior
expect(screen.getByDisplayValue('expected')).toBeInTheDocument();
```

## Test Coverage Goals

### Minimum Coverage Requirements
- **Critical paths**: 100% coverage
- **Components**: 90% coverage
- **Hooks**: 95% coverage
- **Utilities**: 95% coverage
- **Game logic**: 100% coverage

### Coverage Quality Metrics
- All user interaction flows tested
- All error scenarios covered
- All edge cases handled
- Performance regression prevention

## Maintenance Guidelines

### 1. Test Updates
- Update tests when changing component APIs
- Add tests for new features before implementation
- Refactor tests when refactoring code

### 2. Test Reviews
- Review test coverage in pull requests
- Ensure new code includes appropriate tests
- Maintain test quality standards

### 3. Performance Monitoring
- Monitor test execution time
- Optimize slow tests
- Maintain fast feedback cycles

## Tools and Configuration

### Required Dependencies
```json
{
  "@testing-library/react": "^13.4.0",
  "@testing-library/jest-dom": "^5.16.5",
  "@testing-library/user-event": "^14.4.3",
  "jest": "^27.5.1"
}
```

### Jest Configuration
Key Jest settings for optimal testing:
- `testEnvironment: "jsdom"`
- `setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"]`
- Coverage thresholds for quality gates

## Future Enhancements

### 1. Integration Testing
- Cross-component communication testing
- State synchronization validation
- API integration testing

### 2. E2E Testing
- Complete user workflow automation
- Browser compatibility testing
- Performance benchmarking

### 3. Visual Regression Testing
- Component visual consistency
- Responsive design validation
- Theme and styling verification

---

This document should be updated as testing strategies evolve and new patterns emerge. Refer to existing test files for concrete examples of these patterns in action.