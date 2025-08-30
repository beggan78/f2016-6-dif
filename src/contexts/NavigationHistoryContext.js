import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { VIEWS } from '../constants/viewConstants';

const NavigationHistoryContext = createContext({
  // Core state
  currentView: null,
  previousView: null,
  navigationHistory: [],
  
  // Navigation methods
  navigateTo: () => {},
  navigateBack: () => {},
  getPreviousView: () => null,
  clearHistory: () => {},
  canNavigateBack: false
});

// localStorage key for persisting navigation history
const NAVIGATION_HISTORY_KEY = 'sport-wizard-navigation-history';

// Helper functions for localStorage operations
const saveHistoryToStorage = (history) => {
  try {
    localStorage.setItem(NAVIGATION_HISTORY_KEY, JSON.stringify({
      history,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to save navigation history to localStorage:', error);
  }
};

const loadHistoryFromStorage = () => {
  try {
    const stored = localStorage.getItem(NAVIGATION_HISTORY_KEY);
    if (!stored) return [];
    
    const { history, timestamp } = JSON.parse(stored);
    
    // Clear history if it's older than 1 hour to prevent stale navigation
    const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(NAVIGATION_HISTORY_KEY);
      return [];
    }
    
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.warn('Failed to load navigation history from localStorage:', error);
    // Clear corrupted data
    localStorage.removeItem(NAVIGATION_HISTORY_KEY);
    return [];
  }
};

const clearHistoryFromStorage = () => {
  try {
    localStorage.removeItem(NAVIGATION_HISTORY_KEY);
  } catch (error) {
    console.warn('Failed to clear navigation history from localStorage:', error);
  }
};

// Valid views for navigation (prevent navigation to invalid views)
const VALID_VIEWS = Object.values(VIEWS);

// Views that should not be tracked in history (automatic transitions)
// These are part of the automatic game flow: CONFIG → PERIOD_SETUP → GAME → STATS
const UNTRACKED_VIEWS = new Set([
  // Automatic game flow transitions that shouldn't create navigation history:
  // - PERIOD_SETUP is reached automatically after "Start Period Setup" from CONFIG
  // - GAME is reached automatically after "Start Game" from PERIOD_SETUP  
  // Note: STATS was removed from untracked views because users often navigate TO stats 
  // intentionally (not just automatically), and need proper back navigation from MatchReport
  VIEWS.PERIOD_SETUP, // Automatic transition from CONFIG
  VIEWS.GAME          // Automatic transition from PERIOD_SETUP
]);

// Default fallback view when no history exists
const DEFAULT_FALLBACK_VIEW = VIEWS.CONFIG;

// Maximum history entries to prevent memory issues
const MAX_HISTORY_ENTRIES = 10;

// Context-aware fallback logic based on current app state
const getContextAwareFallback = (currentView) => {
  // If we're in a post-game view (STATS or MATCH_REPORT), prefer staying in that context
  if (currentView === VIEWS.MATCH_REPORT) {
    return VIEWS.STATS; // From match report, go to stats
  }
  
  // For most cases, CONFIG is the safest fallback
  return DEFAULT_FALLBACK_VIEW;
};

export function NavigationHistoryProvider({ children }) {
  // Initialize history from localStorage
  const [navigationHistory, setNavigationHistory] = useState(() => loadHistoryFromStorage());
  const [currentView, setCurrentView] = useState(null);
  
  // Use ref to track if we're in the middle of a navigation operation
  const isNavigating = useRef(false);
  
  // Track the last programmatic navigation to prevent sync conflicts
  const lastProgrammaticNavigation = useRef({ view: null, timestamp: 0 });

  // Computed properties
  const previousView = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;
  const canNavigateBack = navigationHistory.length > 0;

  // Persist history changes to localStorage
  useEffect(() => {
    saveHistoryToStorage(navigationHistory);
  }, [navigationHistory]);

  const navigateTo = useCallback((view, data = null, options = {}) => {
    // Validate view - ensure it's a simple string
    if (!view || typeof view !== 'string' || !VALID_VIEWS.includes(view)) {
      console.warn('Invalid view for navigation:', view, 'Expected one of:', VALID_VIEWS);
      return false;
    }

    // Prevent recursive navigation calls
    if (isNavigating.current) {
      console.warn('Navigation already in progress, skipping:', view);
      return false;
    }

    isNavigating.current = true;

    try {
      // Don't navigate if already at the same view
      if (currentView === view) {
        if (process.env.NODE_ENV === 'development') {
          console.log('NavigationHistoryContext: Skipping navigation - already at view:', view, 'currentView:', currentView);
        }
        return true;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('NavigationHistoryContext: Navigating from', currentView, 'to', view);
      }

      // Don't track certain automatic transitions
      const shouldTrack = !UNTRACKED_VIEWS.has(view) && !options.skipHistory;
      
      // If we have a current view and should track it, add to history
      if (currentView && shouldTrack) {
        setNavigationHistory(prev => {
          const newHistory = [...prev];
          
          // Avoid duplicate consecutive entries
          if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== currentView) {
            newHistory.push(currentView);
            if (process.env.NODE_ENV === 'development') {
              console.log('NavigationHistoryContext: Added to history:', currentView, 'New history:', [...newHistory, view]);
            }
          }
          
          // Limit history size to prevent memory issues
          if (newHistory.length > MAX_HISTORY_ENTRIES) {
            return newHistory.slice(-MAX_HISTORY_ENTRIES);
          }
          
          // Limit history size to prevent memory issues
          const MAX_HISTORY_SIZE = 20;
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift(); // Remove oldest entry
          }
          
          return newHistory;
        });
      } else if (process.env.NODE_ENV === 'development') {
        console.log('NavigationHistoryContext: NOT adding to history - currentView:', currentView, 'shouldTrack:', shouldTrack, 'target view:', view);
      }

      // Update current view - ensure it's a clean string
      setCurrentView(String(view));
      
      // Record this programmatic navigation to prevent sync conflicts
      lastProgrammaticNavigation.current = {
        view: String(view),
        timestamp: Date.now()
      };

      return true;
    } catch (error) {
      console.error('Error during navigation:', error);
      return false;
    } finally {
      isNavigating.current = false;
    }
  }, [currentView]);

  const navigateBack = useCallback((fallbackView = null) => {
    if (isNavigating.current) {
      console.warn('NavigationHistory: Navigation already in progress, skipping navigateBack');
      return null;
    }

    isNavigating.current = true;

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('NavigationHistoryContext: navigateBack called, current history:', navigationHistory, 'currentView:', currentView);
      }
      
      if (navigationHistory.length > 0) {
        // Get the most recent view from history
        const targetView = navigationHistory[navigationHistory.length - 1];
        
        if (process.env.NODE_ENV === 'development') {
          console.log('NavigationHistoryContext: Found target view in history:', targetView);
        }
        
        // Validate target view is a clean string
        if (!targetView || typeof targetView !== 'string' || !VALID_VIEWS.includes(targetView)) {
          console.error('NavigationHistory: Invalid target view from history:', targetView, 'Expected one of:', VALID_VIEWS);
          // Fall through to fallback logic
        } else {
          // Remove the last entry from history
          setNavigationHistory(prev => prev.slice(0, -1));
          
          // Navigate to the target view - ensure it's a clean string
          setCurrentView(String(targetView));
          
          if (process.env.NODE_ENV === 'development') {
            console.log('NavigationHistoryContext: Successfully navigated back to:', targetView);
          }
          
          return String(targetView);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('NavigationHistoryContext: No history available, using fallback');
      }
      
      // No history available or invalid history entry, use context-aware fallback
      const contextFallback = getContextAwareFallback(currentView);
      const targetView = fallbackView || contextFallback;
      
      // Validate fallback view
      if (!targetView || typeof targetView !== 'string' || !VALID_VIEWS.includes(targetView)) {
        console.error('NavigationHistory: Invalid fallback view:', targetView, 'Using CONFIG as final fallback');
        setCurrentView(VIEWS.CONFIG);
        return VIEWS.CONFIG;
      }
      
      setCurrentView(String(targetView));
      return String(targetView);
    } catch (error) {
      console.error('Error during back navigation:', error);
      // Fallback to CONFIG on any error
      console.log('NavigationHistory: Error fallback to CONFIG');
      setCurrentView(VIEWS.CONFIG);
      return VIEWS.CONFIG;
    } finally {
      isNavigating.current = false;
    }
  }, [navigationHistory, currentView]);

  const getPreviousView = useCallback(() => {
    return previousView;
  }, [previousView]);

  const clearHistory = useCallback(() => {
    setNavigationHistory([]);
    setCurrentView(null);
    clearHistoryFromStorage();
  }, []);

  // Method to sync current view from external sources (like gameState.view)
  const syncCurrentView = useCallback((externalView) => {
    if (externalView && typeof externalView === 'string' && VALID_VIEWS.includes(externalView)) {
      // Check if we recently navigated programmatically to prevent sync conflicts
      const timeSinceLastNavigation = Date.now() - lastProgrammaticNavigation.current.timestamp;
      const recentNavigationThreshold = 100; // 100ms threshold
      
      if (timeSinceLastNavigation < recentNavigationThreshold && 
          lastProgrammaticNavigation.current.view !== externalView) {
        if (process.env.NODE_ENV === 'development') {
          console.log('NavigationHistoryContext: Skipping sync to prevent conflict - recent programmatic navigation to', 
                      lastProgrammaticNavigation.current.view, 'but external trying to sync to', externalView, 
                      'timeSince:', timeSinceLastNavigation + 'ms');
        }
        return; // Skip this sync to prevent conflict
      }
      
      if (process.env.NODE_ENV === 'development' && currentView !== externalView) {
        console.log('NavigationHistoryContext: Syncing currentView from', currentView, 'to', externalView, 
                    'timeSinceLastNav:', timeSinceLastNavigation + 'ms');
      }
      setCurrentView(String(externalView));
    }
  }, [currentView]);

  // Provide context-aware fallback based on current application state
  const getContextAwareFallbackView = useCallback(() => {
    return getContextAwareFallback(currentView);
  }, [currentView]);

  const contextValue = useMemo(() => {
    const value = {
      // State
      currentView,
      previousView,
      
      // Methods
      navigateTo,
      navigateBack,
      getPreviousView,
      clearHistory,
      syncCurrentView,
      getContextAwareFallback: getContextAwareFallbackView,
      
      // Computed properties
      canNavigateBack
    };

    // Define navigationHistory as a getter that always returns a fresh copy
    Object.defineProperty(value, 'navigationHistory', {
      get() {
        return [...navigationHistory];
      },
      enumerable: true,
      configurable: true
    });

    return value;
  }, [currentView, previousView, navigationHistory, navigateTo, navigateBack, getPreviousView, clearHistory, syncCurrentView, getContextAwareFallbackView, canNavigateBack]);

  return (
    <NavigationHistoryContext.Provider value={contextValue}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

// Custom hook to use NavigationHistoryContext
export function useNavigationHistoryContext() {
  const context = useContext(NavigationHistoryContext);
  
  if (!context) {
    throw new Error('useNavigationHistory must be used within a NavigationHistoryProvider');
  }
  
  return context;
}

// Export context for testing
export { NavigationHistoryContext };