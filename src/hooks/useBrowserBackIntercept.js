import { useEffect, useRef } from 'react';

/**
 * Custom hook to intercept browser back button for navigation handling
 * 
 * Supports both modal management and view navigation interception.
 * When back button is pressed, executes registered navigation handlers
 * instead of allowing browser navigation.
 * 
 * Usage Examples:
 * 
 * // For modals:
 * const { pushNavigationState } = useBrowserBackIntercept();
 * pushNavigationState(() => setModalOpen(false));
 * 
 * // For view navigation:
 * const { pushNavigationState } = useBrowserBackIntercept();
 * pushNavigationState(() => navigateToParentView());
 * 
 * // Global navigation handling:
 * const { pushNavigationState } = useBrowserBackIntercept(globalHandler);
 */
export function useBrowserBackIntercept(globalNavigationHandler) {
  const navigationStack = useRef([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Initialize with a base state on mount
    if (!hasInitialized.current) {
      window.history.replaceState({ navigationLevel: 0 }, '', window.location.href);
      hasInitialized.current = true;
    }

    const handlePopState = (event) => {

      // If we have navigation handlers registered, execute the topmost handler instead of navigating
      if (navigationStack.current.length > 0) {
        event.preventDefault();
        const topHandler = navigationStack.current.pop();
        
        // Call the navigation function for the topmost handler
        if (topHandler && typeof topHandler.navigationHandler === 'function') {
          topHandler.navigationHandler();
        }
        
        // If there are still handlers registered, push a new state
        if (navigationStack.current.length > 0) {
          window.history.pushState(
            { navigationLevel: navigationStack.current.length }, 
            '', 
            window.location.href
          );
        }
      } else if (globalNavigationHandler && typeof globalNavigationHandler === 'function') {
        // No navigation handlers registered, call the global navigation handler
        globalNavigationHandler();
      }
      // If no navigation handlers are registered and no global handler, let the browser handle the back navigation normally
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [globalNavigationHandler]);

  const pushNavigationState = (navigationCallback, handlerName = 'unnamed') => {
    if (typeof navigationCallback !== 'function') {
      console.warn('pushNavigationState requires a function to handle navigation');
      return;
    }

    // Add the navigation handler to our stack with identification
    navigationStack.current.push({ 
      navigationHandler: navigationCallback,
      handlerName: handlerName,
      registeredAt: Date.now()
    });
    
    // Push a new browser history state
    window.history.pushState(
      { navigationLevel: navigationStack.current.length }, 
      '', 
      window.location.href
    );
  };

  const popNavigationState = () => {
    if (navigationStack.current.length > 0) {
      navigationStack.current.pop();
      
      // Only go back if we're not already at the base level
      // Support both new navigationLevel and old modalLevel for compatibility
      const currentLevel = window.history.state?.navigationLevel || window.history.state?.modalLevel || 0;
      if (currentLevel > 0) {
        window.history.back();
      }
    }
  };

  const removeFromNavigationStack = () => {
    // Remove navigation handler from stack without triggering browser navigation
    if (navigationStack.current.length > 0) {
      navigationStack.current.pop();
    }
  };

  const clearNavigationStack = () => {
    navigationStack.current = [];
    // Go back to base state if we're in a navigation state
    // Support both new navigationLevel and old modalLevel for compatibility
    const currentLevel = window.history.state?.navigationLevel || window.history.state?.modalLevel || 0;
    if (currentLevel > 0) {
      window.history.go(-currentLevel);
    }
  };

  const hasActiveNavigationHandlers = () => navigationStack.current.length > 0;

  return {
    // Navigation-generic methods
    pushNavigationState,
    popNavigationState,
    removeFromNavigationStack,
    clearNavigationStack,
    hasActiveNavigationHandlers
  };
}