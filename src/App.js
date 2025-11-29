import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { useGameState } from './hooks/useGameState';
import { useTimers } from './hooks/useTimers';
import { useBrowserBackIntercept } from './hooks/useBrowserBackIntercept';
import { useScreenNavigation } from './hooks/useNavigationHistory';
import { useNavigationHistoryContext } from './contexts/NavigationHistoryContext';
import { formatTime } from './utils/formatUtils';
import { formatPlayerName } from './utils/formatUtils';
import { calculateUndoTimerTarget } from './game/time/timeCalculator';
import { initializePlayers, getSelectedSquadPlayers, getOutfieldPlayers, resetPlayersForNewMatch } from './utils/playerUtils';
import { initialRoster } from './constants/defaultData';
import { VIEWS } from './constants/viewConstants';
import { TEAM_CONFIG } from './constants/teamConstants';
import { clearAllEvents } from './utils/gameEventLogger';
import { ConfigurationScreen } from './components/setup/ConfigurationScreen';
import { PeriodSetupScreen } from './components/setup/PeriodSetupScreen';
import { GameScreen } from './components/game/GameScreen';
import { GameFinishedScreen } from './components/stats/GameFinishedScreen';
import { StatisticsScreen } from './components/statistics/StatisticsScreen';
import { MatchReportScreen } from './components/report/MatchReportScreen';
import { TacticalBoardScreen } from './components/tactical/TacticalBoardScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { TeamManagement } from './components/team/TeamManagement';
import { AbandonMatchModal } from './components/modals/AbandonMatchModal';
import { MatchRecoveryModal } from './components/modals/MatchRecoveryModal';
import { ConfirmationModal, ThreeOptionModal } from './components/shared/UI';
import { HamburgerMenu } from './components/shared/HamburgerMenu';
import { AddPlayerModal } from './components/shared/AddPlayerModal';
import { PreferencesModal } from './components/shared/PreferencesModal';
import { isDebugMode } from './utils/debugUtils';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeamProvider, useTeam } from './contexts/TeamContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { NavigationHistoryProvider } from './contexts/NavigationHistoryContext';
import { SessionExpiryModal } from './components/auth/SessionExpiryModal';
import { AuthModal, useAuthModal } from './components/auth/AuthModal';
import { ProfileCompletionPrompt } from './components/auth/ProfileCompletionPrompt';
import { InvitationWelcome } from './components/auth/InvitationWelcome';
import { TeamAccessRequestModal } from './components/team/TeamAccessRequestModal';
import { InvitationNotificationModal } from './components/team/InvitationNotificationModal';
import { detectResetTokens, shouldShowPasswordResetModal } from './utils/resetTokenUtils';
import { getInvitationStatus } from './utils/invitationUtils';
import { supabase } from './lib/supabase';
import { useMatchRecovery } from './hooks/useMatchRecovery';
import { useInvitationDetection } from './hooks/useInvitationDetection';
import { useInvitationProcessing } from './hooks/useInvitationProcessing';
import { useInvitationNotifications } from './hooks/useInvitationNotifications';
import { useStatisticsRouting } from './hooks/useStatisticsRouting';
import { updateMatchToConfirmed } from './services/matchStateManager';
import { createPersistenceManager } from './utils/persistenceManager';
import { STORAGE_KEYS, migrateStorageKeys } from './constants/storageKeys';

// Migrate old storage keys to new standardized names on app load
// This runs once per page load to ensure smooth transition
try {
  const migrationResults = migrateStorageKeys();
  if (migrationResults.migrated.length > 0 && process.env.NODE_ENV === 'development') {
    console.log('✅ Storage keys migrated:', migrationResults.migrated);
  }
} catch (error) {
  console.error('Storage key migration error:', error);
}

// Create persistence manager for dismissed modals
const dismissedModalsPersistence = createPersistenceManager(STORAGE_KEYS.DISMISSED_MODALS, {});

const getDismissedModals = () => {
  return dismissedModalsPersistence.loadState();
};

const markModalDismissed = (modalType, teamId) => {
  const dismissed = getDismissedModals();
  const key = `${modalType}_${teamId}`;
  dismissed[key] = {
    dismissedAt: Date.now(),
    teamId: teamId
  };
  dismissedModalsPersistence.saveState(dismissed);
};

const isModalDismissed = (modalType, teamId) => {
  const dismissed = getDismissedModals();
  const key = `${modalType}_${teamId}`;
  return dismissed[key] !== undefined;
};

const clearDismissedModals = () => {
  dismissedModalsPersistence.clearState();
};

// Main App Content Component (needs to be inside AuthProvider to access useAuth)
function AppContent() {
  // Create the main gameState instance without circular dependencies
  const gameState = useGameState();
  
  // Set up navigation system using gameState.setView directly
  // Disable global browser back when GameScreen is active with pending or running match to avoid handler conflicts
  const shouldDisableGlobalBrowserBack = gameState.view === VIEWS.GAME && 
    (gameState.matchState === 'pending' || gameState.matchState === 'running');

  const navigationHistory = useScreenNavigation(gameState.setView, {
    enableBrowserBack: !shouldDisableGlobalBrowserBack, // Disable when GameScreen handles it
    fallbackView: VIEWS.CONFIG
  });
  
  // Enhanced navigation functions that track history
  const navigateToView = useCallback((view, data = null) => {
    return navigationHistory.navigateTo(view, data);
  }, [navigationHistory]);
  
  const navigateBack = useCallback((fallback = null) => {
    return navigationHistory.navigateBack(fallback);
  }, [navigationHistory]);

  const timers = useTimers(
    gameState.periodDurationMinutes,
    gameState.alertMinutes,
    gameState.playAlertSounds,
    gameState.currentPeriodNumber,
    gameState.view === VIEWS.GAME
  );
  const {
    showSessionWarning,
    sessionExpiry,
    extendSession,
    dismissSessionWarning,
    signOut,
    loading: authLoading,
    needsProfileCompletion,
    user
  } = useAuth();

  const {
    currentTeam,
    teamPlayers,
    hasPendingRequests,
    pendingRequestsCount,
    canManageTeam,
    isMatchRunning
  } = useTeam();

  const ownTeamName = useMemo(() => {
    if (user && currentTeam?.club?.name) {
      return currentTeam.club.name;
    }
    return TEAM_CONFIG.OWN_TEAM_NAME;
  }, [user, currentTeam]);

  // Authentication modal
  const authModal = useAuthModal();

  useStatisticsRouting(gameState.view, navigateToView);



  // Check for password reset tokens or codes in URL on app load
  useEffect(() => {
    const { hasTokens } = detectResetTokens();

    // If we have password reset tokens or magic link codes, open the auth modal in reset mode
    if (hasTokens) {
      authModal.openReset();
    }
  }, [authModal]);

  // Check if user becomes authenticated via magic link and should show password reset
  useEffect(() => {
    if (shouldShowPasswordResetModal(user)) {
      authModal.openReset();
    }
  }, [user, authModal]);





  // Debug mode detection
  const debugMode = isDebugMode();
  
  // Access navigation history context for lifecycle management
  const { clearHistory, syncCurrentView } = useNavigationHistoryContext();

  // Sync navigation history currentView with gameState.view
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('App.js sync useEffect: gameState.view changed to:', gameState.view, 'calling syncCurrentView');
    }
    syncCurrentView(gameState.view);
  }, [gameState.view, syncCurrentView]);
  
  
  const [showSignOutConfirmModal, setShowSignOutConfirmModal] = useState(false);
  const [configSessionToken, setConfigSessionToken] = useState(0);

  const executeSignOut = useCallback(async () => {
    // Clear dismissed modals state for new session
    clearDismissedModals();
    // Clear navigation history for new session
    clearHistory();
    // Reset view to ConfigurationScreen first
    gameState.setView(VIEWS.CONFIG);
    // Then perform the actual sign out
    return await signOut();
  }, [gameState, signOut, clearHistory]);

  // Custom sign out handler that resets view to ConfigurationScreen
  const handleSignOut = useCallback(async () => {
    if (gameState.matchState === 'running') {
      setShowSignOutConfirmModal(true);
      return;
    }

    await executeSignOut();
  }, [executeSignOut, gameState.matchState]);

  const beginNewConfigurationSession = useCallback(() => {
    setConfigSessionToken((prev) => prev + 1);
  }, []);

  const handleConfirmSignOut = useCallback(async () => {
    setShowSignOutConfirmModal(false);
    await executeSignOut();
  }, [executeSignOut]);

  const handleCancelSignOut = useCallback(() => {
    setShowSignOutConfirmModal(false);
  }, []);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ timeString: '' });
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const closeNewGameModalRef = useRef(() => {
    setShowNewGameModal(false);
  });
  const newGameModalNavigationActiveRef = useRef(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [fromView, setFromView] = useState(null);
  const [showTeamAdminModal, setShowTeamAdminModal] = useState(false);
  const [selectedTeamForAdmin, setSelectedTeamForAdmin] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Enhanced success message function with built-in auto-dismiss (defined early to prevent initialization errors)
  const showSuccessMessage = useCallback((message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000); // 3 second auto-dismiss
  }, []);


  // Create a ref to store the pushNavigationState function to avoid circular dependency
  const pushNavigationStateRef = useRef(null);

  const handleNavigateFromTacticalBoard = useCallback((fallbackView) => {
    // Navigate back to the previous view - for now, go to GAME view if available, otherwise CONFIG
    if (gameState.view === VIEWS.TACTICAL_BOARD) {
      gameState.setView(fromView || fallbackView || VIEWS.CONFIG);
    }
  }, [gameState, fromView]);

  // Navigation data state (for passing data between views)
  const [navigationData, setNavigationData] = useState(null);

  // Invitation hooks - extracted for better separation of concerns and testability
  const invitationDetection = useInvitationDetection();
  
  const invitationProcessing = useInvitationProcessing({
    onSuccess: showSuccessMessage,
    onNavigate: gameState.setView,
    clearInvitationParams: invitationDetection.clearInvitationParams
  });
  
  const invitationNotifications = useInvitationNotifications({
    onSuccess: showSuccessMessage,
    onNavigate: gameState.setView,
    currentView: gameState.view,
    currentMatchState: gameState.matchState
  });

  // setViewWithData is now defined above with navigation history integration

  // Clear navigation data when view changes (except for TEAM_MANAGEMENT)
  useEffect(() => {
    if (gameState.view !== VIEWS.TEAM_MANAGEMENT && navigationData) {
      setNavigationData(null);
    }
  }, [gameState.view, navigationData]);



  // Handle invitation processed callback from InvitationWelcome - now delegated to hook
  const handleInvitationProcessed = invitationProcessing.handleInvitationProcessed;

  // Handle request to show sign-in modal after password setup
  const handleRequestSignIn = useCallback((email = '') => {
    console.log('Handling sign-in request after password setup', email);

    // Clear invitation parameters to close InvitationWelcome modal
    invitationDetection.clearInvitationParams();

    // Open the AuthModal in sign-in mode with prepopulated email
    authModal.openLogin(email);
  }, [authModal, invitationDetection]);

  // Invitation notification handlers - now delegated to hook
  const checkPendingInvitationNotifications = invitationNotifications.checkPendingInvitationNotifications;
  const handleInvitationNotificationProcessed = invitationNotifications.handleInvitationNotificationProcessed;

  // Process invitation when user becomes authenticated (now handled by hooks)
  useEffect(() => {
    invitationProcessing.processInvitationForUser(invitationDetection.invitationParams);
  }, [user, invitationDetection.invitationParams, invitationProcessing]);

  // Check for pending invitation after user signs in (now handled by hooks)
  useEffect(() => {
    invitationProcessing.processPendingInvitationForUser(invitationDetection.invitationParams);
  }, [user, invitationDetection.invitationParams, invitationProcessing]);

  // Check for pending invitation notifications after user login (now handled by hooks)
  useEffect(() => {
    if (user && !invitationDetection.invitationParams && !needsProfileCompletion) {
      // Small delay to allow other authentication flows to complete
      const timer = setTimeout(() => {
        checkPendingInvitationNotifications();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, invitationDetection.invitationParams, needsProfileCompletion, checkPendingInvitationNotifications]);

  // Timer display is now handled directly in GameScreen component











  // Clear dismissed modals when user authentication state changes
  useEffect(() => {
    // Clear dismissed modals on user change (login/logout)
    // This ensures fresh modal behavior for each session
    clearDismissedModals();
  }, [user?.id]); // Only trigger when user ID changes (not on every user object change)


  // Global navigation handler for when no modals are open
  const handleGlobalNavigation = useCallback(() => {
    console.log('🌐 App: handleGlobalNavigation called', {
      currentView: gameState.view,
      currentPeriodNumber: gameState.currentPeriodNumber,
      matchState: gameState.matchState,
      canNavigateWithHistory: navigationHistory.canNavigateBack,
      navigationHistoryLength: navigationHistory.navigationHistory?.length || 0,
      previousView: navigationHistory.previousView
    });

    // Check current view and handle accordingly
    
    // Try to use navigation history first for most views
    const canNavigateWithHistory = navigationHistory.canNavigateBack;
    
    if (gameState.view === VIEWS.TACTICAL_BOARD) {
      // Navigate back from Tactical Board - same as clicking Back button
      console.log('🌐 App: Handling Tactical Board back navigation');
      handleNavigateFromTacticalBoard();
    } else if (gameState.view === VIEWS.PERIOD_SETUP && gameState.currentPeriodNumber === 1 && !canNavigateWithHistory) {
      // Exception: PeriodSetupScreen -> ConfigurationScreen (only when no history available)
      console.log('🌐 App: PERIOD_SETUP -> CONFIG (no history available)');
      gameState.setView(VIEWS.CONFIG);
    } else if (canNavigateWithHistory) {
      // Use navigation history when available
      console.log('🌐 App: Using navigation history to go back', {
        targetView: navigationHistory.previousView
      });
      navigateBack();
    } else {
      // Default fallback: Show "Start a new game?" confirmation modal
      console.log('🌐 App: Showing new game modal (default fallback)');
      setShowNewGameModal(true);
      // Register this modal with the browser back intercept system
      if (pushNavigationStateRef.current && !newGameModalNavigationActiveRef.current) {
        newGameModalNavigationActiveRef.current = true;
        pushNavigationStateRef.current(() => {
          newGameModalNavigationActiveRef.current = false;
          closeNewGameModalRef.current({ removeNavigationState: false });
        }, 'App-NewGameModal');
      }
    }
  }, [gameState, handleNavigateFromTacticalBoard, navigationHistory.canNavigateBack, navigationHistory.navigationHistory, navigationHistory.previousView, navigateBack]);
  
  const { pushNavigationState, removeFromNavigationStack } = useBrowserBackIntercept(handleGlobalNavigation);

  const closeNewGameModal = useCallback((options = {}) => {
    const { removeNavigationState = true } = options;

    newGameModalNavigationActiveRef.current = false;
    setShowNewGameModal(false);

    if (removeNavigationState) {
      removeFromNavigationStack();
    }
  }, [removeFromNavigationStack]);

  useEffect(() => {
    closeNewGameModalRef.current = closeNewGameModal;
  }, [closeNewGameModal]);
  
  // Database-based match abandonment state for preventing accidental data loss
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showFinishedMatchModal, setShowFinishedMatchModal] = useState(false);
  const [pendingNewGameCallback, setPendingNewGameCallback] = useState(null);
  const [foundMatchState, setFoundMatchState] = useState(null);

  // Database-based abandonment check - uses database as source of truth
  const checkForActiveMatch = useCallback(async (callback) => {
    if (typeof callback !== 'function') {
      console.warn('checkForActiveMatch: requires a callback function');
      return;
    }

    // If no currentMatchId, proceed immediately
    if (!gameState.currentMatchId) {
      callback();
      return;
    }

    try {
      // Query database to check if match exists and is running or finished
      const { data: match, error } = await supabase
        .from('match')
        .select('id, state')
        .eq('id', gameState.currentMatchId)
        .is('deleted_at', null)
        .in('state', ['running', 'finished'])
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No match found - safe to proceed
          callback();
          return;
        }
        
        console.error('Database error checking match:', error);
        // On error, err on side of caution and show abandon modal (safest default)
        setFoundMatchState('running'); // Default to running for safety
        setPendingNewGameCallback(() => callback);
        setShowAbandonModal(true);
        return;
      }

      if (match) {
        setFoundMatchState(match.state);
        setPendingNewGameCallback(() => callback);
        
        if (match.state === 'running') {
          setShowAbandonModal(true);
        } else if (match.state === 'finished') {
          setShowFinishedMatchModal(true);
        }
      } else {
        callback();
      }
    } catch (err) {
      console.error('Unexpected error checking active match:', err);
      // On unexpected error, show abandon modal as precaution (safest default)
      setFoundMatchState('running'); // Default to running for safety
      setPendingNewGameCallback(() => callback);
      setShowAbandonModal(true);
    }
  }, [gameState.currentMatchId]);

  // Handle abandonment confirmation - mark match record as deleted and proceed
  const handleAbandonMatch = useCallback(async () => {
    try {
      if (gameState.currentMatchId) {
        const nowIso = new Date().toISOString();

        const { error } = await supabase
          .from('match')
          .update({
            deleted_at: nowIso
          })
          .eq('id', gameState.currentMatchId)
          .is('deleted_at', null);
          
        if (error) {
          console.error('Error marking match as deleted:', error);
          // Continue anyway - don't block user if deletion fails
        }
      }
      
      // Execute pending callback
      if (pendingNewGameCallback) {
        pendingNewGameCallback();
      }
      
      // Clean up modal state
      setShowAbandonModal(false);
      setPendingNewGameCallback(null);
      
    } catch (err) {
      console.error('Unexpected error during match abandonment:', err);
      
      // Even if deletion fails, proceed with callback to avoid blocking user
      if (pendingNewGameCallback) {
        pendingNewGameCallback();
      }
      
      setShowAbandonModal(false);
      setPendingNewGameCallback(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentMatchId, pendingNewGameCallback]);

  // Handle abandonment cancellation - close modal without action
  const handleCancelAbandon = useCallback(() => {
    setShowAbandonModal(false);
    setPendingNewGameCallback(null);
  }, []); 

  // Three-option modal handlers for finished matches
  
  // Handle "Save Match" option - save to history and proceed
  const handleSaveFinishedMatch = useCallback(async () => {
    
    try {
      if (gameState.currentMatchId) {
        
        const result = await updateMatchToConfirmed(gameState.currentMatchId);
        
        if (result.success) {
          showSuccessMessage('Match saved successfully!');
        } else {
          console.error('Failed to save match:', result.error);
          showSuccessMessage('Error saving match. Please try again.');
        }
      }
      
      // Execute pending callback (proceed to new game)
      if (pendingNewGameCallback) {
        pendingNewGameCallback();
      }
      
      // Clean up modal state
      setShowFinishedMatchModal(false);
      setPendingNewGameCallback(null);
      setFoundMatchState(null);
      
    } catch (err) {
      console.error('Unexpected error saving match:', err);
      showSuccessMessage('Error saving match. Please try again.');
      
      // Don't proceed with new game if save failed - keep user on current screen
      setShowFinishedMatchModal(false);
      setPendingNewGameCallback(null);
      setFoundMatchState(null);
    }
    
  }, [gameState.currentMatchId, pendingNewGameCallback, showSuccessMessage]);

  // Handle "Delete Match" option - mark database record as deleted and proceed
  const handleDeleteFinishedMatch = useCallback(async () => {
    try {
      if (gameState.currentMatchId) {
        const nowIso = new Date().toISOString();

        const { error } = await supabase
          .from('match')
          .update({
            deleted_at: nowIso
          })
          .eq('id', gameState.currentMatchId)
          .is('deleted_at', null);
          
        if (error) {
          console.error('Error marking match as deleted:', error);
          showSuccessMessage('Error deleting match. Please try again.');
        } else {
          showSuccessMessage('Match deleted successfully!');
        }
      }
      
      // Execute pending callback (proceed to new game)
      if (pendingNewGameCallback) {
        pendingNewGameCallback();
      }
      
      // Clean up modal state
      setShowFinishedMatchModal(false);
      setPendingNewGameCallback(null);
      setFoundMatchState(null);
      
    } catch (err) {
      console.error('Unexpected error during match deletion:', err);
      showSuccessMessage('Error deleting match. Please try again.');
      
      // Even if deletion fails, proceed with callback to avoid blocking user
      if (pendingNewGameCallback) {
        pendingNewGameCallback();
      }
      
      setShowFinishedMatchModal(false);
      setPendingNewGameCallback(null);
      setFoundMatchState(null);
    }
    
  }, [gameState.currentMatchId, pendingNewGameCallback, showSuccessMessage]);

  // Handle "Cancel" option for finished match modal
  const handleCancelFinishedMatch = useCallback(() => {
    setShowFinishedMatchModal(false);
    setPendingNewGameCallback(null);
    setFoundMatchState(null);
  }, []);

  // Match recovery functionality
  const {
    showRecoveryModal,
    recoveryMatch,
    isProcessingRecovery,
    handleSaveRecovery,
    handleAbandonRecovery,
    handleCloseRecovery
  } = useMatchRecovery({
    user,
    currentTeam,
    invitationParams: invitationDetection.invitationParams,
    needsProfileCompletion,
    gameState,
    setSuccessMessage
  });
  
  
  // Store the pushNavigationState function in the ref
  useEffect(() => {
    pushNavigationStateRef.current = pushNavigationState;
  }, [pushNavigationState]);

  const selectedSquadPlayers = useMemo(() => {
    return getSelectedSquadPlayers(gameState.allPlayers, gameState.selectedSquadIds);
  }, [gameState.allPlayers, gameState.selectedSquadIds]);

  // Global browser back handler - integrated with useBrowserBackIntercept
  useEffect(() => {
    // Wait a bit to ensure app is fully mounted
    const setupTimer = setTimeout(() => {
      // Push a state to history stack to detect back navigation
      window.history.pushState({ app: 'dif-coach' }, '', window.location.href);
    }, 100);

    return () => {
      clearTimeout(setupTimer);
    };
  }, []);

  const availableForAssignment = useMemo(() => {
    if (!gameState.formation.goalie) return [];
    return getOutfieldPlayers(gameState.allPlayers, gameState.selectedSquadIds, gameState.formation.goalie);
  }, [gameState.allPlayers, gameState.selectedSquadIds, gameState.formation.goalie]);

  // Enhanced game handlers that integrate with timers
  const handleStartGame = () => {
    gameState.handleStartGame();
    // Note: Timers are now started when user clicks Start Match button
  };

  // New handler for when user actually starts the match
  const handleActualMatchStartWithTimers = () => {
    // First call the game state handler to update match state
    gameState.handleActualMatchStart();
    
    // Then start the timers
    timers.startTimers(
      gameState.currentPeriodNumber,
      gameState.teamConfig,
      ownTeamName, // Own team name
      gameState.opponentTeam,
      gameState.formation,
      gameState.numPeriods,
      gameState.allPlayers
    );
  };


  const handleUndoSubstitution = (subTimerSecondsAtSubstitution, substitutionTimestamp) => {
    const targetSubTimerSeconds = calculateUndoTimerTarget(
      subTimerSecondsAtSubstitution,
      substitutionTimestamp || gameState.lastSubstitutionTimestamp
    );
    
    timers.restoreSubTimer(targetSubTimerSeconds);
  };

  const handleEndPeriod = () => {
    // Check if period is ending more than 1 minute early
    const remainingMinutes = Math.floor(timers.matchTimerSeconds / 60);
    const remainingSeconds = timers.matchTimerSeconds % 60;
    
    if (timers.matchTimerSeconds > 60) { // More than 1 minute remaining
      const timeString = remainingMinutes > 0 
        ? `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
        : `${remainingSeconds} seconds`;
      
      setConfirmModalData({ timeString });
      setShowConfirmModal(true);
      // Add modal to browser back button handling
      pushNavigationState(() => {
        setShowConfirmModal(false);
      });
      return;
    }
    
    // Proceed with ending the period
    const isMatchEnd = gameState.currentPeriodNumber >= gameState.numPeriods;
    timers.stopTimers(
      gameState.currentPeriodNumber,
      isMatchEnd,
      gameState.formation,
      gameState.teamConfig
    );
    gameState.handleEndPeriod(timers.isSubTimerPaused);
  };

  const handleConfirmEndPeriod = () => {
    setShowConfirmModal(false);
    removeFromNavigationStack();
    const isMatchEnd = gameState.currentPeriodNumber >= gameState.numPeriods;
    timers.stopTimers(
      gameState.currentPeriodNumber,
      isMatchEnd,
      gameState.formation,
      gameState.teamConfig
    );
    gameState.handleEndPeriod(timers.isSubTimerPaused);
  };

  const handleCancelEndPeriod = () => {
    setShowConfirmModal(false);
    removeFromNavigationStack();
  };

  const handleRestartMatch = (options = {}) => {
    const { preserveConfiguration = false } = options;

    if (preserveConfiguration) {
      const configSnapshot = {
        selectedSquadIds: [...(gameState.selectedSquadIds || [])],
        periodGoalieIds: { ...(gameState.periodGoalieIds || {}) },
        formation: gameState.formation ? { ...gameState.formation } : null,
        teamConfig: gameState.teamConfig ? { ...gameState.teamConfig } : null,
        selectedFormation: gameState.selectedFormation,
        numPeriods: gameState.numPeriods,
        periodDurationMinutes: gameState.periodDurationMinutes,
        opponentTeam: gameState.opponentTeam,
        matchType: gameState.matchType,
        venueType: gameState.venueType,
        captainId: gameState.captainId,
        alertMinutes: gameState.alertMinutes
      };

      const resetPlayers = resetPlayersForNewMatch(gameState.allPlayers || []);

      // Clear runtime-only match state
      clearAllEvents();
      clearHistory();
      timers.clearAllTimersForNewGame();

      gameState.setView(VIEWS.CONFIG);
      gameState.setCurrentPeriodNumber(1);
      gameState.setGameLog([]);
      gameState.setMatchEvents([]);
      gameState.setMatchStartTime(null);
      gameState.setGoalScorers({});
      gameState.setEventSequenceNumber(0);
      gameState.setLastEventBackup(null);
      gameState.setRotationQueue([]);
      gameState.setNextPlayerToSubOut(null, true);
      gameState.setNextPlayerIdToSubOut(null);
      gameState.setNextNextPlayerIdToSubOut(null);
      gameState.setLastSubstitutionTimestamp(null);
      gameState.setTimerPauseStartTime(null);
      gameState.setTotalMatchPausedDuration(0);
      gameState.setMatchState('not_started');
      gameState.setMatchCreated(false);
      gameState.setCurrentMatchId(null);
      gameState.resetScore();

      gameState.setAllPlayers(resetPlayers);
      if (configSnapshot.teamConfig) {
        gameState.updateTeamConfig(configSnapshot.teamConfig);
      }
      if (configSnapshot.selectedFormation) {
        gameState.setSelectedFormation(configSnapshot.selectedFormation);
      }
      if (configSnapshot.formation) {
        gameState.setFormation(configSnapshot.formation);
      }
      gameState.setSelectedSquadIds(configSnapshot.selectedSquadIds || []);
      gameState.setPeriodGoalieIds(configSnapshot.periodGoalieIds || {});
      if (typeof configSnapshot.numPeriods === 'number') {
        gameState.setNumPeriods(configSnapshot.numPeriods);
      }
      if (typeof configSnapshot.periodDurationMinutes === 'number') {
        gameState.setPeriodDurationMinutes(configSnapshot.periodDurationMinutes);
      }
      if (typeof configSnapshot.alertMinutes === 'number') {
        gameState.setAlertMinutes(configSnapshot.alertMinutes);
      }
      gameState.setOpponentTeam(configSnapshot.opponentTeam || '');
      if (configSnapshot.matchType) {
        gameState.setMatchType(configSnapshot.matchType);
      }
      if (configSnapshot.venueType) {
        gameState.setVenueType(configSnapshot.venueType);
      }
      gameState.setCaptain(configSnapshot.captainId || null);
      gameState.setHasActiveConfiguration(true);

      beginNewConfigurationSession();
      return;
    }

    // Clear all game events from previous games
    clearAllEvents();
    
    // Clear navigation history for new game
    clearHistory();
    
    // Reset all timer state and clear localStorage
    timers.clearAllTimersForNewGame();
    
    // Reset all game state
    gameState.setView(VIEWS.CONFIG);
    gameState.setCurrentPeriodNumber(1);
    gameState.setGameLog([]);
    
    // Sync team roster if available, otherwise use initial roster
    if (currentTeam && teamPlayers && teamPlayers.length > 0 && gameState.syncPlayersFromTeamRoster) {
      try {
        const result = gameState.syncPlayersFromTeamRoster(teamPlayers);
        if (result.success) {
        } else {
          console.warn('⚠️ New Game: Team sync failed, using initial roster');
          gameState.setAllPlayers(initializePlayers(initialRoster));
        }
      } catch (error) {
        console.warn('⚠️ New Game: Team sync error, using initial roster:', error);
        gameState.setAllPlayers(initializePlayers(initialRoster));
      }
    } else {
      gameState.setAllPlayers(initializePlayers(initialRoster));
    }
    gameState.setSelectedSquadIds([]);
    gameState.setPeriodGoalieIds({});
    gameState.setFormation({
      goalie: null,
      // 6-player formation structure
      leftDefender: null,
      rightDefender: null,
      leftAttacker: null,
      rightAttacker: null,
      substitute: null,
    });
    gameState.resetScore();
    gameState.setOpponentTeam('');
    gameState.clearStoredState();

    beginNewConfigurationSession();
  };

  const handleNewGameFromMenu = async () => {
    const shouldPreserveConfiguration = gameState.matchState === 'running';

    await checkForActiveMatch(() => {
      handleRestartMatch({ preserveConfiguration: shouldPreserveConfiguration });
    });
  };

  const handleAddPlayer = () => {
    setShowAddPlayerModal(true);
    // Add modal to browser back button handling
    pushNavigationState(() => {
      setShowAddPlayerModal(false);
    });
  };

  const handleAddPlayerConfirm = (playerName) => {
    setShowAddPlayerModal(false);
    removeFromNavigationStack();
    gameState.addTemporaryPlayer(playerName);
  };

  const handleAddPlayerCancel = () => {
    setShowAddPlayerModal(false);
    removeFromNavigationStack();
  };

  // Handle new game confirmation modal
  const handleConfirmNewGame = async () => {
    await checkForActiveMatch(() => {
      closeNewGameModal();
      handleRestartMatch();
    });
  };

  const handleCancelNewGame = () => {
    // When user clicks Cancel button, just close the modal without triggering browser back
    closeNewGameModal();
  };


  const handleLeaveSportWizard = () => {
    // Close the modal first
    closeNewGameModal();

    // Navigate back to where the user was before entering the Sport Wizard app
    // Go back to the state before we initialized the app
    const currentLevel = window.history.state?.navigationLevel || window.history.state?.modalLevel || 0;
    if (currentLevel > 0) {
      // Go back to before any navigation states were pushed
      window.history.go(-(currentLevel + 1));
    } else {
      // If no navigation states, try to go back one step
      // This handles the case where user came directly to the app
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // If this is the only page in history, try to close the window
        // This will only work if the app was opened by script, otherwise it's ignored
        window.close();
      }
    }
  };

  const handleNavigateToTacticalBoard = () => {
    setFromView(gameState.view);
    navigateToView(VIEWS.TACTICAL_BOARD, { fromView: gameState.view });
  };

  // Team admin modal handlers
  const handleOpenTeamAdminModal = useCallback((team) => {
    setSelectedTeamForAdmin(team);
    setShowTeamAdminModal(true);
    // Add modal to browser back button handling
    pushNavigationState(() => {
      setShowTeamAdminModal(false);
      setSelectedTeamForAdmin(null);
    });
  }, [pushNavigationState]);

  // Preferences modal handlers
  const handleOpenPreferencesModal = useCallback(() => {
    setShowPreferencesModal(true);
    // Add modal to browser back button handling
    pushNavigationState(() => {
      setShowPreferencesModal(false);
    });
  }, [pushNavigationState]);

  const handleClosePreferencesModal = useCallback(() => {
    setShowPreferencesModal(false);
  }, []);

  const handleCloseTeamAdminModal = useCallback(() => {
    // Mark this team's access modal as dismissed for this session
    if (selectedTeamForAdmin) {
      markModalDismissed('team_access', selectedTeamForAdmin.id);
    }
    
    setShowTeamAdminModal(false);
    setSelectedTeamForAdmin(null);
    removeFromNavigationStack();
  }, [selectedTeamForAdmin, removeFromNavigationStack]);

  const handleTeamAdminSuccess = useCallback((message) => {
    // Show success message banner
    showSuccessMessage(message);
    // Keep modal open for continued management
  }, [showSuccessMessage]);

  // Automatic pending request modal for team admins
  useEffect(() => {
    // Only show modal if:
    // 1. User can manage team (admin or coach)
    // 2. There are pending requests
    // 3. No modal is currently open
    // 4. User is not completing their profile
    // 5. Modal has not been dismissed by user in this session
    if (isMatchRunning) {
      return;
    }

    if (canManageTeam && hasPendingRequests && currentTeam && !showTeamAdminModal && !needsProfileCompletion) {
      // Check if user has dismissed this team's access modal
      if (!isModalDismissed('team_access', currentTeam.id)) {
        handleOpenTeamAdminModal(currentTeam);
      } else {
      }
    }
  }, [canManageTeam, hasPendingRequests, currentTeam, showTeamAdminModal, needsProfileCompletion, pendingRequestsCount, handleOpenTeamAdminModal, isMatchRunning]);

  // Render logic
  const renderView = () => {
    switch (gameState.view) {
      case VIEWS.CONFIG:
        return (
          <ConfigurationScreen 
            allPlayers={gameState.allPlayers}
            setAllPlayers={gameState.setAllPlayers}
            selectedSquadIds={gameState.selectedSquadIds}
            setSelectedSquadIds={gameState.setSelectedSquadIds}
            numPeriods={gameState.numPeriods}
            setNumPeriods={gameState.setNumPeriods}
            periodDurationMinutes={gameState.periodDurationMinutes}
            setPeriodDurationMinutes={gameState.setPeriodDurationMinutes}
            periodGoalieIds={gameState.periodGoalieIds}
            setPeriodGoalieIds={gameState.setPeriodGoalieIds}
            teamConfig={gameState.teamConfig}
            updateTeamConfig={gameState.updateTeamConfig}
            selectedFormation={gameState.selectedFormation}
            setSelectedFormation={gameState.setSelectedFormation}
            updateFormationSelection={gameState.updateFormationSelection}
            createTeamConfigFromSquadSize={gameState.createTeamConfigFromSquadSize}
            formation={gameState.formation}
            setFormation={gameState.setFormation}
            alertMinutes={gameState.alertMinutes}
            setAlertMinutes={gameState.setAlertMinutes}
            handleStartPeriodSetup={gameState.handleStartPeriodSetup}
            handleSaveConfiguration={gameState.handleSaveConfiguration}
            selectedSquadPlayers={selectedSquadPlayers}
            opponentTeam={gameState.opponentTeam}
            setOpponentTeam={gameState.setOpponentTeam}
            matchType={gameState.matchType}
            setMatchType={gameState.setMatchType}
            venueType={gameState.venueType}
            setVenueType={gameState.setVenueType}
            captainId={gameState.captainId}
            setCaptain={gameState.setCaptain}
            debugMode={debugMode}
            authModal={authModal}
            setView={navigateToView}
            syncPlayersFromTeamRoster={gameState.syncPlayersFromTeamRoster}
            setCurrentMatchId={gameState.setCurrentMatchId}
            setMatchCreated={gameState.setMatchCreated}
            hasActiveConfiguration={gameState.hasActiveConfiguration}
            setHasActiveConfiguration={gameState.setHasActiveConfiguration}
            clearStoredState={gameState.clearStoredState}
            configurationSessionId={configSessionToken}
          />
        );
      case VIEWS.PERIOD_SETUP:
        return (
          <PeriodSetupScreen
            currentPeriodNumber={gameState.currentPeriodNumber}
            formation={gameState.formation}
            setFormation={gameState.setFormation}
            availableForAssignment={availableForAssignment}
            allPlayers={gameState.allPlayers}
            setAllPlayers={gameState.setAllPlayers}
            handleStartGame={handleStartGame}
            gameLog={gameState.gameLog}
            selectedSquadPlayers={selectedSquadPlayers}
            periodGoalieIds={gameState.periodGoalieIds}
            setPeriodGoalieIds={gameState.setPeriodGoalieIds}
            numPeriods={gameState.numPeriods}
            teamConfig={gameState.teamConfig}
            selectedFormation={gameState.selectedFormation}
            setView={navigateToView}
            ownScore={gameState.ownScore}
            opponentScore={gameState.opponentScore}
            opponentTeam={gameState.opponentTeam}
            ownTeamName={ownTeamName}
            rotationQueue={gameState.rotationQueue}
            setRotationQueue={gameState.setRotationQueue}
            preparePeriodWithGameLog={gameState.preparePeriodWithGameLog}
            handleSavePeriodConfiguration={gameState.handleSavePeriodConfiguration}
            matchState={gameState.matchState}
            debugMode={debugMode}
          />
        );
      case VIEWS.GAME:
        return (
          <GameScreen 
            currentPeriodNumber={gameState.currentPeriodNumber}
            formation={gameState.formation}
            setFormation={gameState.setFormation}
            allPlayers={gameState.allPlayers}
            setAllPlayers={gameState.setAllPlayers}
            matchTimerSeconds={timers.matchTimerSeconds}
            subTimerSeconds={timers.subTimerSeconds}
            isSubTimerPaused={timers.isSubTimerPaused}
            pauseSubTimer={timers.pauseSubTimer}
            resumeSubTimer={timers.resumeSubTimer}
            setShowNewGameModal={setShowNewGameModal}
            formatTime={formatTime}
            resetSubTimer={timers.resetSubTimer}
            handleUndoSubstitution={handleUndoSubstitution}
            handleEndPeriod={handleEndPeriod}
            nextPlayerToSubOut={gameState.nextPlayerToSubOut}
            nextPlayerIdToSubOut={gameState.nextPlayerIdToSubOut}
            nextNextPlayerIdToSubOut={gameState.nextNextPlayerIdToSubOut}
            setNextNextPlayerIdToSubOut={gameState.setNextNextPlayerIdToSubOut}
            selectedSquadPlayers={selectedSquadPlayers}
            setNextPlayerToSubOut={gameState.setNextPlayerToSubOut}
            setNextPlayerIdToSubOut={gameState.setNextPlayerIdToSubOut}
            teamConfig={gameState.teamConfig}
            selectedFormation={gameState.selectedFormation}
            alertMinutes={gameState.alertMinutes}
            ownTeamName={ownTeamName}
            togglePlayerInactive={gameState.togglePlayerInactive}
            switchPlayerPositions={gameState.switchPlayerPositions}
            rotationQueue={gameState.rotationQueue}
            setRotationQueue={gameState.setRotationQueue}
            switchGoalie={gameState.switchGoalie}
            setLastSubstitutionTimestamp={gameState.setLastSubstitutionTimestamp}
            getOutfieldPlayers={gameState.getOutfieldPlayers}
            pushNavigationState={pushNavigationState}
            removeFromNavigationStack={removeFromNavigationStack}
            ownScore={gameState.ownScore}
            opponentScore={gameState.opponentScore}
            opponentTeam={gameState.opponentTeam}
            addGoalScored={gameState.addGoalScored}
            addGoalConceded={gameState.addGoalConceded}
            setScore={gameState.setScore}
            matchEvents={gameState.matchEvents || []}
            goalScorers={gameState.goalScorers || {}}
            matchStartTime={gameState.matchStartTime}
            matchState={gameState.matchState}
            handleActualMatchStart={handleActualMatchStartWithTimers}
            periodDurationMinutes={gameState.periodDurationMinutes}
            trackGoalScorer={gameState.trackGoalScorer}
            getPlayerName={(playerId) => {
              const player = gameState.allPlayers.find(p => p.id === playerId);
              return player ? formatPlayerName(player) : 'Unknown Player';
            }}
            setView={gameState.setView}
          />
        );
      case VIEWS.STATS:
        return (
          <GameFinishedScreen
            allPlayers={gameState.gameLog[gameState.gameLog.length-1]?.finalStatsSnapshotForAllPlayers || selectedSquadPlayers}
            setView={navigateToView}
            onNavigateBack={navigateBack}
            setAllPlayers={gameState.setAllPlayers}
            setSelectedSquadIds={gameState.setSelectedSquadIds}
            setPeriodGoalieIds={gameState.setPeriodGoalieIds}
            setGameLog={gameState.setGameLog}
            initializePlayers={initializePlayers}
            initialRoster={initialRoster}
            clearStoredState={gameState.clearStoredState}
            clearTimerState={timers.clearTimerState}
            ownScore={gameState.ownScore}
            opponentScore={gameState.opponentScore}
            opponentTeam={gameState.opponentTeam}
            resetScore={gameState.resetScore}
            setOpponentTeam={gameState.setOpponentTeam}
            navigateToMatchReport={gameState.navigateToMatchReport}
            currentMatchId={gameState.currentMatchId}
            matchEvents={gameState.matchEvents || []}
            goalScorers={gameState.goalScorers || {}}
            authModal={authModal}
            checkForActiveMatch={checkForActiveMatch}
            selectedSquadIds={gameState.selectedSquadIds}
            onStartNewConfigurationSession={beginNewConfigurationSession}
            matchStartTime={gameState.matchStartTime}
            periodDurationMinutes={gameState.periodDurationMinutes}
            gameLog={gameState.gameLog}
            formation={gameState.formation}
            ownTeamName={ownTeamName}
        />
      );
      case VIEWS.MATCH_REPORT:
        return (
          <MatchReportScreen 
            matchEvents={gameState.matchEvents || []}
            matchStartTime={gameState.matchStartTime}
            allPlayers={gameState.allPlayers}
            gameLog={gameState.gameLog}
            ownScore={gameState.ownScore}
            opponentScore={gameState.opponentScore}
            periodDurationMinutes={gameState.periodDurationMinutes}
            teamConfig={gameState.teamConfig}
            ownTeamName={ownTeamName}
            opponentTeam={gameState.opponentTeam || 'Opponent'}
            onNavigateBack={() => navigateBack(VIEWS.STATS)}
            goalScorers={gameState.goalScorers || {}}
            getPlayerName={(playerId) => {
              const player = gameState.allPlayers.find(p => p.id === playerId);
              return player ? formatPlayerName(player) : 'Unknown Player';
            }}
            formatTime={formatTime}
            selectedSquadIds={gameState.selectedSquadIds}
            formation={gameState.formation}
            debugMode={debugMode}
          />
        );
      case VIEWS.PROFILE:
        return (
          <ProfileScreen
            onNavigateBack={navigateBack}
            onNavigateTo={navigateToView}
            pushNavigationState={pushNavigationState}
            removeFromNavigationStack={removeFromNavigationStack}
          />
        );
      case VIEWS.TACTICAL_BOARD:
        return (
          <TacticalBoardScreen
            onNavigateBack={handleNavigateFromTacticalBoard}
            pushNavigationState={pushNavigationState}
            removeFromNavigationStack={removeFromNavigationStack}
            fromView={fromView}
          />
        );
      case VIEWS.TEAM_MANAGEMENT:
        return (
          <TeamManagement
            onNavigateBack={navigateBack}
            pushNavigationState={pushNavigationState}
            removeFromNavigationStack={removeFromNavigationStack}
            openToTab={navigationData?.openToTab}
          />
        );
      case VIEWS.STATISTICS:
        return (
          <StatisticsScreen
            onNavigateBack={navigateBack}
            authModal={authModal}
          />
        );
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-2 sm:p-4 font-sans">
      
      <header className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl relative text-center mb-4">
        <div className="absolute top-0 right-0">
          <HamburgerMenu 
            onRestartMatch={handleNewGameFromMenu} 
            onAddPlayer={handleAddPlayer}
            onNavigateToTacticalBoard={handleNavigateToTacticalBoard}
            currentView={gameState.view}
            teamConfig={gameState.teamConfig}
            allPlayers={gameState.allPlayers}
            selectedSquadIds={gameState.selectedSquadIds}
            setView={navigateToView}
            authModal={authModal}
            onOpenTeamAdminModal={handleOpenTeamAdminModal}
            onOpenPreferencesModal={handleOpenPreferencesModal}
            onSignOut={handleSignOut}
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">Sport Wizard</h1>
      </header>

      {/* Success Message Banner - Floating Overlay */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-emerald-900/80 backdrop-blur-sm border border-emerald-600 rounded-lg shadow-2xl shadow-emerald-500/50">
          <p className="text-emerald-200 text-sm font-medium">✓ {successMessage}</p>
        </div>
      )}

      {gameState.view === VIEWS.TACTICAL_BOARD ? (
        <div className="w-full">
          {renderView()}
        </div>
      ) : (
        <main className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl">
          {renderView()}
        </main>
      )}
      <footer className="mt-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Coach App by Codewizard</p>
      </footer>
      
      <ConfirmationModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmEndPeriod}
        onCancel={handleCancelEndPeriod}
        title="End Period Early?"
        message={`There are still ${confirmModalData.timeString} remaining in this period. Are you sure you want to end the period early?`}
      />

      <ConfirmationModal
        isOpen={showSignOutConfirmModal}
        onConfirm={handleConfirmSignOut}
        onCancel={handleCancelSignOut}
        title="Sign Out During Active Match?"
        message="You have a match currently running. Signing out now may stop tracking this match. Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Stay Logged In"
      />
      
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={handleAddPlayerCancel}
        onAddPlayer={handleAddPlayerConfirm}
      />
      
      <ThreeOptionModal
        isOpen={showNewGameModal}
        onPrimary={handleCancelNewGame}
        onSecondary={handleConfirmNewGame}
        onTertiary={handleLeaveSportWizard}
        title="Start a new game?"
        message="Are you sure you want to start a new game? This will reset all progress and take you back to the configuration screen."
        primaryText="Stay on page"
        secondaryText="Yes, start new game"
        tertiaryText="Leave Sport Wizard"
        primaryVariant="accent"
        secondaryVariant="primary"
        tertiaryVariant="danger"
      />

      {/* Match Abandonment Warning Modal (for running matches) */}
      <AbandonMatchModal
        isOpen={showAbandonModal}
        onAbandon={handleAbandonMatch}
        onCancel={handleCancelAbandon}
        isMatchRunning={foundMatchState === 'running'}
        hasUnsavedMatch={foundMatchState === 'finished'}
      />

      {/* Finished Match Three-Option Modal */}
      <ThreeOptionModal
        isOpen={showFinishedMatchModal}
        onPrimary={handleSaveFinishedMatch}
        onSecondary={handleDeleteFinishedMatch}
        onTertiary={handleCancelFinishedMatch}
        title="Finished match found"
        message="You have a finished match that hasn't been saved to history yet. What would you like to do?"
        primaryText="Save Match"
        secondaryText="Delete Match"
        tertiaryText="Cancel"
        primaryVariant="primary"
        secondaryVariant="danger"
        tertiaryVariant="accent"
      />

      {/* Match Recovery Modal */}
      <MatchRecoveryModal
        isOpen={showRecoveryModal}
        match={recoveryMatch}
        onSave={handleSaveRecovery}
        onDelete={handleAbandonRecovery}
        onClose={handleCloseRecovery}
        saving={isProcessingRecovery}
        deleting={isProcessingRecovery}
      />


        {/* Session Expiry Warning Modal */}
        <SessionExpiryModal
          isOpen={showSessionWarning}
          onExtend={extendSession}
          onDismiss={dismissSessionWarning}
          onSignOut={handleSignOut}
          sessionExpiry={sessionExpiry}
          loading={authLoading}
        />

        {/* Authentication Modal */}
        <AuthModal
          isOpen={authModal.isOpen}
          onClose={authModal.closeModal}
          initialMode={authModal.mode}
          initialEmail={authModal.initialEmail}
        />

        {/* Team Admin Modal */}
        {showTeamAdminModal && selectedTeamForAdmin && (
          <TeamAccessRequestModal
            team={selectedTeamForAdmin}
            onClose={handleCloseTeamAdminModal}
            onSuccess={handleTeamAdminSuccess}
            isStandaloneMode={true}
          />
        )}

        {/* Profile Completion Prompt */}
        {needsProfileCompletion && (
          <ProfileCompletionPrompt
            setView={navigateToView}
          />
        )}

        {/* Invitation Welcome Modal */}
        {invitationDetection.invitationParams && invitationDetection.invitationParams.hasInvitation && (() => {
          const invitationStatus = getInvitationStatus(user, invitationDetection.invitationParams);
          // Show invitation welcome modal for account setup or sign-in required states
          return invitationStatus.type === 'account_setup' || invitationStatus.type === 'sign_in_required' ? (
            <InvitationWelcome
              invitationParams={invitationDetection.invitationParams}
              onInvitationProcessed={handleInvitationProcessed}
              onRequestSignIn={handleRequestSignIn}
            />
          ) : null;
        })()}

        {/* Invitation Notification Modal */}
        <InvitationNotificationModal
          isOpen={invitationNotifications.showInvitationNotifications}
          invitations={invitationNotifications.pendingInvitations}
          onClose={() => {}}
          onInvitationProcessed={handleInvitationNotificationProcessed}
        />

        {/* Preferences Modal */}
        <PreferencesModal
          isOpen={showPreferencesModal}
          onClose={handleClosePreferencesModal}
        />
      </div>
  );
}

// Main App Component with AuthProvider, TeamProvider, PreferencesProvider, and NavigationHistoryProvider
function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <PreferencesProvider>
          <NavigationHistoryProvider>
            <AppContent />
          </NavigationHistoryProvider>
        </PreferencesProvider>
      </TeamProvider>
    </AuthProvider>
  );
}

export default App;
