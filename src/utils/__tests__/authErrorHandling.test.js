/**
 * Authentication Error Handling Utilities Tests
 * 
 * Comprehensive testing for authentication error handling functions.
 * Ensures consistent error formatting and display across auth components.
 */

import {
  AUTH_ERROR_MESSAGES,
  formatAuthError,
  shouldDisplayError,
  getPrimaryErrorMessage,
  createAuthError,
  getErrorDisplayClasses,
  handleAuthOperation,
  createDebouncedErrorClear
} from '../authErrorHandling';

// Mock timers for debounce testing
jest.useFakeTimers();

describe('Authentication Error Handling Utilities', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('AUTH_ERROR_MESSAGES', () => {
    it('should export error message mappings', () => {
      expect(AUTH_ERROR_MESSAGES).toBeDefined();
      expect(typeof AUTH_ERROR_MESSAGES).toBe('object');
      expect(AUTH_ERROR_MESSAGES.default).toBeDefined();
    });

    it('should have user-friendly messages for common Supabase errors', () => {
      expect(AUTH_ERROR_MESSAGES['Invalid login credentials']).toContain('Invalid email or password');
      expect(AUTH_ERROR_MESSAGES['User already registered']).toContain('account with this email already exists');
      expect(AUTH_ERROR_MESSAGES['Email not confirmed']).toContain('confirmation link');
    });
  });

  describe('formatAuthError', () => {
    it('should return null for null/undefined errors', () => {
      expect(formatAuthError(null)).toBe(null);
      expect(formatAuthError(undefined)).toBe(null);
    });

    it('should format string errors', () => {
      const result = formatAuthError('Invalid login credentials');
      expect(result).toBe(AUTH_ERROR_MESSAGES['Invalid login credentials']);
    });

    it('should format Error objects', () => {
      const error = new Error('User already registered');
      const result = formatAuthError(error);
      expect(result).toBe(AUTH_ERROR_MESSAGES['User already registered']);
    });

    it('should format Supabase error objects', () => {
      const supabaseError = {
        message: 'Email not confirmed',
        error_description: 'Email not confirmed'
      };
      const result = formatAuthError(supabaseError);
      expect(result).toBe(AUTH_ERROR_MESSAGES['Email not confirmed']);
    });

    it('should handle custom error objects with msg property', () => {
      const customError = { msg: 'Too many requests' };
      const result = formatAuthError(customError);
      expect(result).toBe(AUTH_ERROR_MESSAGES['Too many requests']);
    });

    it('should return default message for unknown errors', () => {
      const result = formatAuthError('Unknown error type');
      expect(result).toBe(AUTH_ERROR_MESSAGES.default);
    });

    it('should handle case-insensitive error matching', () => {
      const result = formatAuthError('INVALID LOGIN CREDENTIALS');
      expect(result).toBe(AUTH_ERROR_MESSAGES['Invalid login credentials']);
    });
  });

  describe('shouldDisplayError', () => {
    it('should return false for null/undefined errors', () => {
      expect(shouldDisplayError(null)).toBe(false);
      expect(shouldDisplayError(undefined)).toBe(false);
    });

    it('should return false for technical errors that should be hidden', () => {
      expect(shouldDisplayError('AbortError')).toBe(false);
      expect(shouldDisplayError(new Error('CancelledError'))).toBe(false);
      expect(shouldDisplayError({ message: 'TimeoutError' })).toBe(false);
    });

    it('should return true for user-facing errors', () => {
      expect(shouldDisplayError('Invalid login credentials')).toBe(true);
      expect(shouldDisplayError(new Error('User already registered'))).toBe(true);
      expect(shouldDisplayError({ message: 'Email not confirmed' })).toBe(true);
    });
  });

  describe('getPrimaryErrorMessage', () => {
    it('should prioritize general form errors', () => {
      const options = {
        formErrors: { email: 'Invalid email' },
        authError: 'Auth error',
        generalError: 'General error'
      };
      
      const result = getPrimaryErrorMessage(options);
      expect(result).toBe(AUTH_ERROR_MESSAGES.default); // formatted version of 'General error'
    });

    it('should return auth error when no general error', () => {
      const options = {
        formErrors: { email: 'Invalid email' },
        authError: 'Invalid login credentials',
        generalError: null
      };
      
      const result = getPrimaryErrorMessage(options);
      expect(result).toBe(AUTH_ERROR_MESSAGES['Invalid login credentials']);
    });

    it('should return first form field error when no general or auth error', () => {
      const options = {
        formErrors: { 
          email: 'Invalid email',
          password: 'Password required' 
        },
        authError: null,
        generalError: null
      };
      
      const result = getPrimaryErrorMessage(options);
      expect(result).toBe('Invalid email');
    });

    it('should return null when no errors present', () => {
      const options = {
        formErrors: {},
        authError: null,
        generalError: null
      };
      
      const result = getPrimaryErrorMessage(options);
      expect(result).toBe(null);
    });

    it('should skip auth errors that should not be displayed', () => {
      const options = {
        formErrors: { email: 'Invalid email' },
        authError: 'AbortError',
        generalError: null
      };
      
      const result = getPrimaryErrorMessage(options);
      expect(result).toBe('Invalid email');
    });
  });

  describe('createAuthError', () => {
    it('should create standardized error object', () => {
      const originalError = new Error('Test error');
      const result = createAuthError(originalError, 'signin', { userId: '123' });
      
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('originalError', originalError);
      expect(result).toHaveProperty('operation', 'signin');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('shouldDisplay');
      expect(result).toHaveProperty('context', { userId: '123' });
    });

    it('should use default operation name', () => {
      const result = createAuthError('Test error');
      expect(result.operation).toBe('auth');
    });

    it('should set shouldDisplay based on error type', () => {
      const displayableError = createAuthError('Invalid login credentials');
      expect(displayableError.shouldDisplay).toBe(true);
      
      const hiddenError = createAuthError('AbortError');
      expect(hiddenError.shouldDisplay).toBe(false);
    });
  });

  describe('getErrorDisplayClasses', () => {
    it('should return banner classes by default', () => {
      const classes = getErrorDisplayClasses(true);
      expect(classes.container).toContain('bg-rose-900/50');
      expect(classes.text).toContain('text-rose-200');
    });

    it('should return inline classes for inline variant', () => {
      const classes = getErrorDisplayClasses(true, 'inline');
      expect(classes.container).toContain('text-rose-400');
      expect(classes.container).toContain('text-sm');
    });

    it('should return field classes for field variant', () => {
      const classes = getErrorDisplayClasses(true, 'field');
      expect(classes.container).toContain('border-rose-500');
      expect(classes.text).toContain('text-rose-400');
    });

    it('should return hidden classes when no error', () => {
      const classes = getErrorDisplayClasses(false, 'banner');
      expect(classes.container).toContain('hidden');
    });

    it('should fallback to banner classes for unknown variant', () => {
      const classes = getErrorDisplayClasses(true, 'unknown');
      expect(classes.container).toContain('bg-rose-900/50');
    });
  });

  describe('handleAuthOperation', () => {
    it('should handle successful operations', async () => {
      const operation = jest.fn().mockResolvedValue({ user: { id: '123' } });
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const result = await handleAuthOperation(operation, onSuccess, onError);
      
      expect(operation).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith({ user: { id: '123' } });
      expect(onError).not.toHaveBeenCalled();
      expect(result).toEqual({ user: { id: '123' } });
    });

    it('should handle operations with errors', async () => {
      const operation = jest.fn().mockResolvedValue({ error: { message: 'Test error' } });
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const result = await handleAuthOperation(operation, onSuccess, onError);
      
      expect(operation).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
      expect(result).toEqual({ error: { message: 'Test error' } });
    });

    it('should handle thrown exceptions', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Thrown error'));
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      try {
        await handleAuthOperation(operation, onSuccess, onError);
      } catch (error) {
        expect(error).toBeDefined();
        expect(onError).toHaveBeenCalled();
        return;
      }
      
      // If we reach here, the test should fail
      expect(true).toBe(false);
    });

  });

  describe('createDebouncedErrorClear', () => {
    it('should debounce function calls', () => {
      const clearFunction = jest.fn();
      const debouncedClear = createDebouncedErrorClear(clearFunction, 100);
      
      // Call multiple times rapidly
      debouncedClear();
      debouncedClear();
      debouncedClear();
      
      // Function should not be called yet
      expect(clearFunction).not.toHaveBeenCalled();
      
      // Fast-forward time
      jest.advanceTimersByTime(100);
      
      // Function should be called once
      expect(clearFunction).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on new calls', () => {
      const clearFunction = jest.fn();
      const debouncedClear = createDebouncedErrorClear(clearFunction, 100);
      
      debouncedClear();
      jest.advanceTimersByTime(50);
      
      // Call again before first timer completes
      debouncedClear();
      jest.advanceTimersByTime(50);
      
      // Should not be called yet (timer was reset)
      expect(clearFunction).not.toHaveBeenCalled();
      
      // Complete the timer
      jest.advanceTimersByTime(50);
      expect(clearFunction).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the clear function', () => {
      const clearFunction = jest.fn();
      const debouncedClear = createDebouncedErrorClear(clearFunction, 100);
      
      debouncedClear('arg1', 'arg2');
      jest.advanceTimersByTime(100);
      
      expect(clearFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should use default delay when not specified', () => {
      const clearFunction = jest.fn();
      const debouncedClear = createDebouncedErrorClear(clearFunction);
      
      debouncedClear();
      jest.advanceTimersByTime(299);
      expect(clearFunction).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1);
      expect(clearFunction).toHaveBeenCalledTimes(1);
    });
  });
});