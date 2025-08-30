import { useCallback, useEffect } from 'react';
import { useNavigationHistoryContext } from '../contexts/NavigationHistoryContext';
import { useBrowserBackIntercept } from './useBrowserBackIntercept';

/**
 * Enhanced navigation history hook that integrates with browser back button handling
 * 
 * This hook combines the NavigationHistoryContext with the existing useBrowserBackIntercept
 * system to provide seamless navigation that works with both programmatic navigation
 * and browser back button presses.
 * 
 * Usage:
 * 
 * // Basic usage in a screen component
 * const { navigateTo, navigateBack, canNavigateBack } = useNavigationHistory();
 * 
 * // Navigate to a new screen
 * const handleGoToProfile = () => navigateTo(VIEWS.PROFILE);
 * 
 * // Go back to previous screen
 * const handleBack = () => navigateBack();
 * 
 * // Advanced usage with browser back integration
 * const { navigateTo, navigateBack, registerBackHandler } = useNavigationHistory({
 *   enableBrowserBackIntegration: true
 * });
 * 
 * useEffect(() => {
 *   registerBackHandler(); // Automatically handle browser back button
 * }, [registerBackHandler]);
 */
export function useNavigationHistory(options = {}) {
  const {
    enableBrowserBackIntegration = false,
    fallbackView = null,
    onNavigate = null
  } = options;

  // Get navigation history context
  const navigationContext = useNavigationHistoryContext();
  
  // Get browser back intercept functionality
  const {
    pushNavigationState,
    removeFromNavigationStack,
    hasActiveNavigationHandlers
  } = useBrowserBackIntercept();

  // Enhanced navigateTo that optionally calls external setView function
  const navigateTo = useCallback((view, data = null, navigationOptions = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('useNavigationHistory: navigateTo called with view:', view, 'data:', data);
    }
    
    const success = navigationContext.navigateTo(view, data, navigationOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('useNavigationHistory: navigationContext.navigateTo returned:', success);
    }
    
    if (success && onNavigate) {
      // Call external navigation function (like gameState.setView)
      try {
        if (typeof onNavigate === 'function') {
          if (process.env.NODE_ENV === 'development') {
            console.log('useNavigationHistory: calling external onNavigate function with view:', view);
          }
          onNavigate(view, data);
        }
      } catch (error) {
        console.error('Error in external navigation callback:', error);
        // Don't let external navigation errors break our navigation state
      }
    }
    
    return success;
  }, [navigationContext, onNavigate]);

  // Enhanced navigateBack that works with external setView function  
  const navigateBack = useCallback((fallback = null) => {
    const targetView = navigationContext.navigateBack(fallback || fallbackView);
    
    if (targetView && onNavigate) {
      // Call external navigation function (like gameState.setView)
      try {
        if (typeof onNavigate === 'function') {
          onNavigate(targetView);
        } else {
          console.error('useNavigationHistory: onNavigate is not a function:', typeof onNavigate);
        }
      } catch (error) {
        console.error('Error in external navigation callback:', error);
        // Don't let external navigation errors break our navigation state
      }
    }
    
    return targetView;
  }, [navigationContext, onNavigate, fallbackView]);

  // Register browser back handler that uses navigation history
  const registerBackHandler = useCallback(() => {
    if (!enableBrowserBackIntegration) return null;

    const backHandler = () => {
      // Use navigation history to go back
      navigateBack();
    };

    // Register with browser back intercept system
    pushNavigationState(backHandler);
    
    // Return cleanup function
    return () => {
      removeFromNavigationStack();
    };
  }, [enableBrowserBackIntegration, navigateBack, pushNavigationState, removeFromNavigationStack]);

  // Auto-register browser back handler if enabled
  useEffect(() => {
    if (enableBrowserBackIntegration) {
      const cleanup = registerBackHandler();
      return cleanup;
    }
  }, [enableBrowserBackIntegration, registerBackHandler]);

  // Enhanced context with additional functionality
  return {
    // Core navigation history functionality
    ...navigationContext,
    
    // Enhanced methods
    navigateTo,
    navigateBack,
    
    // Browser integration
    registerBackHandler,
    hasActiveNavigationHandlers,
    
    // Utility methods
    isBackNavigationAvailable: navigationContext.canNavigateBack || hasActiveNavigationHandlers()
  };
}

/**
 * Simple hook variant that just provides basic navigation history without browser integration
 * Use this when you only need the navigation history functionality without browser back button handling
 */
export function useSimpleNavigationHistory() {
  return useNavigationHistoryContext();
}

/**
 * Hook variant for screen components that need to integrate with external navigation systems
 * This is the most common usage pattern for screen components in this app
 * 
 * @param {Function} externalNavigate - Function to call for actual view changes (e.g., gameState.setView)
 * @param {Object} options - Configuration options
 */
export function useScreenNavigation(externalNavigate, options = {}) {
  const {
    enableBrowserBack = true,
    fallbackView = null,
    ...restOptions
  } = options;

  return useNavigationHistory({
    enableBrowserBackIntegration: enableBrowserBack,
    fallbackView,
    onNavigate: externalNavigate,
    ...restOptions
  });
}

export default useNavigationHistory;