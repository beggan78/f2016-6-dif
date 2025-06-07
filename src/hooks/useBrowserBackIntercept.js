import { useEffect, useRef } from 'react';

/**
 * Custom hook to intercept browser back button and close modals instead of navigating away
 * 
 * Usage:
 * const { pushModalState, popModalState } = useBrowserBackIntercept();
 * 
 * // When opening a modal:
 * pushModalState(() => setModalOpen(false));
 * 
 * // When closing a modal normally:
 * popModalState();
 * setModalOpen(false);
 */
export function useBrowserBackIntercept() {
  const modalStack = useRef([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Initialize with a base state on mount
    if (!hasInitialized.current) {
      window.history.replaceState({ modalLevel: 0 }, '', window.location.href);
      hasInitialized.current = true;
    }

    const handlePopState = (event) => {
      // If we have modals open, close the topmost modal instead of navigating
      if (modalStack.current.length > 0) {
        event.preventDefault();
        const topModal = modalStack.current.pop();
        
        // Call the close function for the topmost modal
        if (topModal && typeof topModal.closeModal === 'function') {
          topModal.closeModal();
        }
        
        // If there are still modals open, push a new state
        if (modalStack.current.length > 0) {
          window.history.pushState(
            { modalLevel: modalStack.current.length }, 
            '', 
            window.location.href
          );
        }
      }
      // If no modals are open, let the browser handle the back navigation normally
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const pushModalState = (closeModalCallback) => {
    if (typeof closeModalCallback !== 'function') {
      console.warn('pushModalState requires a function to close the modal');
      return;
    }

    // Add the modal to our stack
    modalStack.current.push({ closeModal: closeModalCallback });
    
    // Push a new browser history state
    window.history.pushState(
      { modalLevel: modalStack.current.length }, 
      '', 
      window.location.href
    );
  };

  const popModalState = () => {
    if (modalStack.current.length > 0) {
      modalStack.current.pop();
      
      // Only go back if we're not already at the base level
      if (window.history.state?.modalLevel > 0) {
        window.history.back();
      }
    }
  };

  const clearModalStack = () => {
    modalStack.current = [];
    // Go back to base state if we're in a modal state
    if (window.history.state?.modalLevel > 0) {
      window.history.go(-window.history.state.modalLevel);
    }
  };

  return {
    pushModalState,
    popModalState,
    clearModalStack,
    hasOpenModals: () => modalStack.current.length > 0
  };
}