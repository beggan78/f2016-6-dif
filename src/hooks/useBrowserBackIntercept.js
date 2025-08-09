import { useEffect, useRef } from 'react';

/**
 * Custom hook to intercept browser back button and execute custom handlers.
 * 
 * This hook manages a stack of back button handlers. When the browser's back
 * button is pressed, the topmost handler is executed instead of navigating.
 */
export function useBrowserBackIntercept(globalNavigationHandler) {
  const backHandlerStack = useRef([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Initialize with a base state on mount
    if (!hasInitialized.current) {
      window.history.replaceState({ handlerLevel: 0 }, '', window.location.href);
      hasInitialized.current = true;
    }

    const handlePopState = (event) => {
      // If we have handlers on the stack, execute the topmost one
      if (backHandlerStack.current.length > 0) {
        event.preventDefault();
        const topHandler = backHandlerStack.current.pop();
        
        if (topHandler && typeof topHandler.handler === 'function') {
          topHandler.handler();
        }
        
        if (backHandlerStack.current.length > 0) {
          window.history.pushState(
            { handlerLevel: backHandlerStack.current.length }, 
            '', 
            window.location.href
          );
        }
      } else if (globalNavigationHandler && typeof globalNavigationHandler === 'function') {
        // No handlers, call the global navigation handler
        globalNavigationHandler();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [globalNavigationHandler]);

  const pushBackHandler = (handler) => {
    if (typeof handler !== 'function') {
      console.warn('pushBackHandler requires a function');
      return;
    }

    backHandlerStack.current.push({ handler });
    
    window.history.pushState(
      { handlerLevel: backHandlerStack.current.length }, 
      '', 
      window.location.href
    );
  };

  const popBackHandler = () => {
    // Remove handler from stack without triggering browser navigation
    if (backHandlerStack.current.length > 0) {
      backHandlerStack.current.pop();
    }
  };

  const clearBackHandlerStack = () => {
    backHandlerStack.current = [];
    if (window.history.state?.handlerLevel > 0) {
      window.history.go(-window.history.state.handlerLevel);
    }
  };

  return {
    pushBackHandler,
    popBackHandler,
    clearBackHandlerStack,
    hasOpenHandlers: () => backHandlerStack.current.length > 0
  };
}