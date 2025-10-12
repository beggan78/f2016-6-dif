/**
 * Structured Error Handling Framework
 * Provides consistent error reporting, logging, and recovery mechanisms across the application
 */

// Error categories for structured classification
export const ERROR_CATEGORIES = {
  GAME_LOGIC: 'game_logic',
  TIMER: 'timer',
  STORAGE: 'storage',
  FORMATION: 'formation',
  PLAYER: 'player',
  VALIDATION: 'validation',
  NETWORK: 'network',
  UI: 'ui'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',           // Minor issues that don't affect functionality
  MEDIUM: 'medium',     // Issues that may affect some functionality
  HIGH: 'high',         // Critical issues that affect core functionality
  CRITICAL: 'critical'  // Issues that break the application
};

/**
 * Structured error data interface
 */
class GameError extends Error {
  constructor(message, category, severity = ERROR_SEVERITY.MEDIUM, context = {}) {
    super(message);
    this.name = 'GameError';
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = Date.now();
    this.stack = Error.captureStackTrace ? Error.captureStackTrace(this, GameError) : new Error().stack;
  }
}

/**
 * Main error handler with structured logging and recovery
 */
export const handleError = (error, context = {}) => {
  // Ensure we have a GameError instance
  const gameError = error instanceof GameError ? error : new GameError(
    error.message || 'Unknown error',
    context.category || ERROR_CATEGORIES.UI,
    context.severity || ERROR_SEVERITY.MEDIUM,
    context
  );

  // Create structured error report
  const errorReport = {
    message: gameError.message,
    category: gameError.category,
    severity: gameError.severity,
    timestamp: gameError.timestamp,
    context: {
      ...gameError.context,
      ...context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      stack: gameError.stack
    }
  };

  // Log based on severity
  switch (gameError.severity) {
    case ERROR_SEVERITY.CRITICAL:
      console.error('🚨 [CRITICAL ERROR]', errorReport);
      break;
    case ERROR_SEVERITY.HIGH:
      console.error('❌ [HIGH ERROR]', errorReport);
      break;
    case ERROR_SEVERITY.MEDIUM:
      console.warn('⚠️ [MEDIUM ERROR]', errorReport);
      break;
    case ERROR_SEVERITY.LOW:
      console.info('ℹ️ [LOW ERROR]', errorReport);
      break;
    default:
      console.warn('⚠️ [ERROR]', errorReport);
  }

  return errorReport;
};

/**
 * Error recovery strategies
 */
export const ErrorRecovery = {
  /**
   * Try operation with fallback
   */
  withFallback: (operation, fallback, context = {}) => {
    try {
      return operation();
    } catch (error) {
      handleError(error, { ...context, strategy: 'fallback' });
      return fallback;
    }
  },

  /**
   * Retry operation with exponential backoff
   */
  withRetry: async (operation, maxRetries = 3, context = {}) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          handleError(error, { 
            ...context, 
            strategy: 'retry_exhausted',
            attempts: attempt 
          });
          throw error;
        }
        
        // Log retry attempt
        handleError(error, { 
          ...context, 
          strategy: 'retrying',
          attempt,
          severity: ERROR_SEVERITY.LOW 
        });
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
    
    throw lastError;
  },

  /**
   * Safe JSON parsing with fallback
   */
  safeJsonParse: (jsonString, fallback = null, context = {}) => {
    return ErrorRecovery.withFallback(
      () => JSON.parse(jsonString),
      fallback,
      { ...context, category: ERROR_CATEGORIES.STORAGE }
    );
  },

  /**
   * Safe localStorage operations
   *
   * @deprecated Use PersistenceManager instead for all localStorage operations.
   * PersistenceManager provides better error handling, validation, and quota management.
   *
   * Example:
   *   import { createPersistenceManager } from '../utils/persistenceManager';
   *   import { STORAGE_KEYS } from '../constants/storageKeys';
   *   const manager = createPersistenceManager(STORAGE_KEYS.YOUR_KEY, defaultValue);
   *   const data = manager.loadState();
   *   manager.saveState(newData);
   *
   * These methods are kept for backward compatibility but should not be used in new code.
   */
  safeLocalStorage: {
    get: (key, fallback = null) => {
      console.warn('ErrorRecovery.safeLocalStorage.get is deprecated. Use PersistenceManager instead.');
      return ErrorRecovery.withFallback(
        () => {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : fallback;
        },
        fallback,
        { category: ERROR_CATEGORIES.STORAGE, operation: 'get', key }
      );
    },

    set: (key, value) => {
      console.warn('ErrorRecovery.safeLocalStorage.set is deprecated. Use PersistenceManager instead.');
      return ErrorRecovery.withFallback(
        () => {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        },
        false,
        { category: ERROR_CATEGORIES.STORAGE, operation: 'set', key }
      );
    }
  }
};

/**
 * Specialized error creators for common scenarios
 */
export const createError = {
  gameLogic: (message, context = {}) => new GameError(
    message,
    ERROR_CATEGORIES.GAME_LOGIC,
    ERROR_SEVERITY.HIGH,
    context
  ),

  timer: (message, context = {}) => new GameError(
    message,
    ERROR_CATEGORIES.TIMER,
    ERROR_SEVERITY.MEDIUM,
    context
  ),

  storage: (message, context = {}) => new GameError(
    message,
    ERROR_CATEGORIES.STORAGE,
    ERROR_SEVERITY.MEDIUM,
    context
  ),

  formation: (message, context = {}) => new GameError(
    message,
    ERROR_CATEGORIES.FORMATION,
    ERROR_SEVERITY.HIGH,
    context
  ),

  validation: (message, context = {}) => new GameError(
    message,
    ERROR_CATEGORIES.VALIDATION,
    ERROR_SEVERITY.LOW,
    context
  )
};

/**
 * React hook for error handling in components
 */
export const useErrorHandler = () => {
  const handleComponentError = (error, componentName, additionalContext = {}) => {
    const context = {
      component: componentName,
      category: ERROR_CATEGORIES.UI,
      ...additionalContext
    };
    
    return handleError(error, context);
  };

  return { handleError: handleComponentError };
};

/**
 * Error boundary context for React error boundaries
 */
export const logErrorBoundary = (error, errorInfo, componentName) => {
  return handleError(error, {
    category: ERROR_CATEGORIES.UI,
    severity: ERROR_SEVERITY.HIGH,
    component: componentName,
    errorInfo,
    type: 'react_error_boundary'
  });
};

const ErrorHandler = {
  handleError,
  ErrorRecovery,
  createError,
  useErrorHandler,
  logErrorBoundary,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  GameError
};

export default ErrorHandler;