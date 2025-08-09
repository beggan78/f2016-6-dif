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
  const globalNavHandlerRef = useRef(globalNavigationHandler);

  // Keep the ref updated with the latest handler
  useEffect(() => {
    globalNavHandlerRef.current = globalNavigationHandler;
  }, [globalNavigationHandler]);

  useEffect(() => {
    console.log('[BackIntercept] useEffect RUNNING. Adding popstate listener.');
    // Initialize with a base state on mount
    if (!hasInitialized.current) {
      console.log('[BackIntercept] First run: initializing history state.');
      window.history.replaceState({ handlerLevel: 0 }, '', window.location.href);
      hasInitialized.current = true;
    }

    const handlePopState = (event) => {
      console.log('[BackIntercept] popstate event triggered.');
      console.log(`[BackIntercept] Stack size on entry: ${backHandlerStack.current.length}`);
      // If we have handlers on the stack, execute the topmost one
      if (backHandlerStack.current.length > 0) {
        console.log('[BackIntercept] Handler stack is not empty. Intercepting.');
        const topHandler = backHandlerStack.current.pop();
        console.log(`[BackIntercept] Popped handler. New stack size: ${backHandlerStack.current.length}`);
        
        if (topHandler && typeof topHandler.handler === 'function') {
          console.log('[BackIntercept] Executing handler.');
          topHandler.handler();
        }
        
        // ALWAYS push a new state to replace the one that was just
        // popped by the user's back navigation. This effectively "cancels"
        // the browser's default back action.
        console.log('[BackIntercept] Pushing new history state to cancel navigation.');
        window.history.pushState(
          { handlerLevel: backHandlerStack.current.length }, 
          '', 
          window.location.href
        );

      } else if (globalNavHandlerRef.current && typeof globalNavHandlerRef.current === 'function') {
        console.log('[BackIntercept] Handler stack is empty. Calling global navigation handler.');
        // No handlers, call the global navigation handler from the ref
        globalNavHandlerRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      console.log('[BackIntercept] useEffect CLEANUP. Removing popstate listener.');
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // <--- Empty dependency array to run only once

  const pushBackHandler = (handler) => {
    console.log('[BackIntercept] pushBackHandler called.');
    if (typeof handler !== 'function') {
      console.warn('pushBackHandler requires a function');
      return;
    }

    backHandlerStack.current.push({ handler });
    console.log(`[BackIntercept] Stack size after push: ${backHandlerStack.current.length}`);
    
    window.history.pushState(
      { handlerLevel: backHandlerStack.current.length }, 
      '', 
      window.location.href
    );
    console.log(`[BackIntercept] Pushed state to history with level: ${backHandlerStack.current.length}`);
  };

  const popBackHandler = () => {
    console.log('[BackIntercept] popBackHandler called.');
    console.log(`[BackIntercept] Stack size before pop: ${backHandlerStack.current.length}`);
    // Remove handler from stack without triggering browser navigation
    if (backHandlerStack.current.length > 0) {
      backHandlerStack.current.pop();
    }
    console.log(`[BackIntercept] Stack size after pop: ${backHandlerStack.current.length}`);
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