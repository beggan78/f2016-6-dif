import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { useGameState } from './hooks/useGameState';
import { useTimers } from './hooks/useTimers';
import { useBrowserBackIntercept } from './hooks/useBrowserBackIntercept';
import { formatTime } from './utils/formatUtils';
import { formatPlayerName } from './utils/formatUtils';
import { calculateUndoTimerTarget } from './game/time/timeCalculator';
import { initializePlayers } from './utils/playerUtils';
import { initialRoster } from './constants/defaultData';
import { VIEWS } from './constants/viewConstants';
import { clearAllEvents } from './utils/gameEventLogger';
import { ConfigurationScreen } from './components/setup/ConfigurationScreen';
import { PeriodSetupScreen } from './components/setup/PeriodSetupScreen';
import { GameScreen } from './components/game/GameScreen';
import { StatsScreen } from './components/stats/StatsScreen';
import { MatchReportScreen } from './components/report/MatchReportScreen';
import { TacticalBoardScreen } from './components/tactical/TacticalBoardScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { TeamManagement } from './components/team/TeamManagement';
import { AbandonMatchModal } from './components/modals/AbandonMatchModal';
import { MatchRecoveryModal } from './components/modals/MatchRecoveryModal';
import { ConfirmationModal, ThreeOptionModal } from './components/shared/UI';
import { getSelectedSquadPlayers, getOutfieldPlayers } from './utils/playerUtils';
import { HamburgerMenu } from './components/shared/HamburgerMenu';
import { AddPlayerModal } from './components/shared/AddPlayerModal';
import { PreferencesModal } from './components/shared/PreferencesModal';
import { isDebugMode } from './utils/debugUtils';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeamProvider, useTeam } from './contexts/TeamContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { SessionExpiryModal } from './components/auth/SessionExpiryModal';
import { AuthModal, useAuthModal } from './components/auth/AuthModal';
import { ProfileCompletionPrompt } from './components/auth/ProfileCompletionPrompt';
import { InvitationWelcome } from './components/auth/InvitationWelcome';
import { TeamAccessRequestModal } from './components/team/TeamAccessRequestModal';
import { InvitationNotificationModal } from './components/team/InvitationNotificationModal';
import { detectResetTokens, shouldShowPasswordResetModal } from './utils/resetTokenUtils';
import { detectInvitationParams, clearInvitationParamsFromUrl, shouldProcessInvitation, getInvitationStatus, needsAccountCompletion, retrievePendingInvitation, hasPendingInvitation } from './utils/invitationUtils';
import { supabase } from './lib/supabase';
import { useMatchRecovery } from './hooks/useMatchRecovery';

// Dismissed modals localStorage utilities
const DISMISSED_MODALS_KEY = 'dif-coach-dismissed-modals';

const getDismissedModals = () => {
  try {
    const stored = localStorage.getItem(DISMISSED_MODALS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load dismissed modals:', error);
    return {};
  }
};

const markModalDismissed = (modalType, teamId) => {
  try {
    const dismissed = getDismissedModals();
    const key = `${modalType}_${teamId}`;
    dismissed[key] = {
      dismissedAt: Date.now(),
      teamId: teamId
    };
    localStorage.setItem(DISMISSED_MODALS_KEY, JSON.stringify(dismissed));
  } catch (error) {
    console.warn('Failed to mark modal as dismissed:', error);
  }
};

const isModalDismissed = (modalType, teamId) => {
  const dismissed = getDismissedModals();
  const key = `${modalType}_${teamId}`;
  return dismissed[key] !== undefined;
};

const clearDismissedModals = () => {
  try {
    localStorage.removeItem(DISMISSED_MODALS_KEY);
  } catch (error) {
    console.warn('Failed to clear dismissed modals:', error);
  }
};

// Main App Content Component (needs to be inside AuthProvider to access useAuth)
function AppContent() {
  const gameState = useGameState();
  const timers = useTimers(gameState.periodDurationMinutes, gameState.alertMinutes, gameState.playAlertSounds, gameState.currentPeriodNumber);
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
    acceptTeamInvitation,
    getUserPendingInvitations
  } = useTeam();

  // Authentication modal
  const authModal = useAuthModal();

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
  
  // Custom sign out handler that resets view to ConfigurationScreen
  const handleSignOut = useCallback(async () => {
    // Clear dismissed modals state for new session
    clearDismissedModals();
    // Reset view to ConfigurationScreen first
    gameState.setView(VIEWS.CONFIG);
    // Then perform the actual sign out
    return await signOut();
  }, [gameState, signOut]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ timeString: '' });
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [fromView, setFromView] = useState(null);
  const [showTeamAdminModal, setShowTeamAdminModal] = useState(false);
  const [selectedTeamForAdmin, setSelectedTeamForAdmin] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');


  // Create a ref to store the pushNavigationState function to avoid circular dependency
  const pushNavigationStateRef = useRef(null);

  const handleNavigateFromTacticalBoard = useCallback((fallbackView) => {
    // Navigate back to the previous view - for now, go to GAME view if available, otherwise CONFIG
    if (gameState.view === VIEWS.TACTICAL_BOARD) {
      gameState.setView(fromView || fallbackView || VIEWS.CONFIG);
    }
  }, [gameState, fromView]);
  // Invitation state
  const [invitationParams, setInvitationParams] = useState(null);
  const [isProcessingInvitation, setIsProcessingInvitation] = useState(false);

  // Pending invitation notifications
  const [showInvitationNotifications, setShowInvitationNotifications] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [hasCheckedInvitations, setHasCheckedInvitations] = useState(false);
  const [navigationData, setNavigationData] = useState(null);

  // Enhanced setView function that can accept navigation data
  const setViewWithData = useCallback((view, data = null) => {
    setNavigationData(data);
    gameState.setView(view);
  }, [gameState]);

  // Clear navigation data when view changes (except for TEAM_MANAGEMENT)
  useEffect(() => {
    if (gameState.view !== VIEWS.TEAM_MANAGEMENT && navigationData) {
      setNavigationData(null);
    }
  }, [gameState.view, navigationData]);

  // Handle invitation acceptance
  const handleInvitationAcceptance = useCallback(async (params) => {
    if (!params.invitationId) {
      console.error('No invitation ID provided');
      return;
    }

    if (isProcessingInvitation) {
      console.log('Invitation already being processed, skipping');
      return;
    }

    try {
      setIsProcessingInvitation(true);
      console.log('Processing invitation:', params.invitationId);

      const result = await acceptTeamInvitation(params.invitationId);

      if (result.success) {
        // Clear URL parameters
        clearInvitationParamsFromUrl();
        setInvitationParams(null);

        // Show welcome message
        setSuccessMessage(result.message || 'Welcome to the team!');

        // Navigate to team management view
        gameState.setView(VIEWS.TEAM_MANAGEMENT);
      } else {
        console.error('Failed to accept invitation:', result.error);
        // Could show error modal here
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
    } finally {
      setIsProcessingInvitation(false);
    }
  }, [acceptTeamInvitation, gameState, isProcessingInvitation]);

  // Handle invitation processed callback from InvitationWelcome
  const handleInvitationProcessed = useCallback((result) => {
    if (result?.success) {
      // Clear URL parameters
      clearInvitationParamsFromUrl();
      setInvitationParams(null);

      // Show welcome message
      setSuccessMessage(result.message || 'Welcome to the team!');

      // Navigate to team management view
      gameState.setView(VIEWS.TEAM_MANAGEMENT);
    }
  }, [gameState]);

  // Handle request to show sign-in modal after password setup
  const handleRequestSignIn = useCallback(() => {
    console.log('Handling sign-in request after password setup');

    // Clear invitation parameters to close InvitationWelcome modal
    clearInvitationParamsFromUrl();
    setInvitationParams(null);

    // Open the AuthModal in sign-in mode
    authModal.openLogin();
  }, [authModal]);

  // Check for pending invitation notifications
  const checkPendingInvitationNotifications = useCallback(async () => {
    if (!user || hasCheckedInvitations) return;

    try {
      console.log('Checking for pending invitation notifications...');
      const invitations = await getUserPendingInvitations();

      if (invitations && invitations.length > 0) {
        console.log(`Found ${invitations.length} pending invitation(s)`);
        setPendingInvitations(invitations);
        setShowInvitationNotifications(true);
      } else {
        console.log('No pending invitations found');
      }

      setHasCheckedInvitations(true);
    } catch (error) {
      console.error('Error checking pending invitations:', error);
      setHasCheckedInvitations(true);
    }
  }, [user, getUserPendingInvitations, hasCheckedInvitations]);

  // Handle invitation notification processed
  const handleInvitationNotificationProcessed = useCallback((processedInvitation, action) => {
    // Remove processed invitation from the list
    setPendingInvitations(prev =>
      prev.filter(inv => inv.id !== processedInvitation.id)
    );

    // Close modal if no more invitations
    setPendingInvitations(prev => {
      if (prev.length <= 1) {
        setShowInvitationNotifications(false);
      }
      return prev.filter(inv => inv.id !== processedInvitation.id);
    });

    // Show success message
    if (action === 'accepted') {
      setSuccessMessage(`Successfully joined ${processedInvitation.team.name}!`);
      // Navigate to team management view after a longer delay to ensure context is fully updated
      setTimeout(() => {
        gameState.setView(VIEWS.TEAM_MANAGEMENT);
      }, 1000);
    } else if (action === 'declined') {
      setSuccessMessage('Invitation declined');
    }

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  }, [gameState]);


  // Check for invitation parameters in URL on app load (only run once)
  useEffect(() => {
    const handleInvitationAndSession = async () => {
      const params = detectInvitationParams();

      if (params.hasInvitation) {
        console.log('Invitation detected:', params);
        setInvitationParams(params);

        // If we have Supabase tokens in the URL hash, set the session
        if (params.isSupabaseInvitation && params.accessToken && params.refreshToken) {
          try {
            console.log('Setting Supabase session with invitation tokens...');
            const { data, error } = await supabase.auth.setSession({
              access_token: params.accessToken,
              refresh_token: params.refreshToken
            });

            if (error) {
              console.error('Error setting session:', error);
            } else {
              console.log('Session set successfully:', data);
            }
          } catch (error) {
            console.error('Exception setting session:', error);
          }
        }
      }
    };

    handleInvitationAndSession();
  }, []); // Run only once on mount

  // Process invitation when user becomes authenticated (but only if they don't need password setup)
  useEffect(() => {
    if (user && invitationParams && shouldProcessInvitation(user, invitationParams)) {
      // Check if user still needs to complete account setup (password)
      if (needsAccountCompletion(invitationParams, user)) {
        console.log('User needs to complete account setup before processing invitation');
        return; // Don't process invitation yet, user needs to set password first
      }

      console.log('User is ready to process invitation');
      handleInvitationAcceptance(invitationParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invitationParams]); // Remove handleInvitationAcceptance from dependencies

  // Check for pending invitation after user signs in (for users who completed password setup)
  useEffect(() => {
    if (user && !invitationParams && hasPendingInvitation()) {
      console.log('User signed in, checking for pending invitation...');
      const pendingInvitation = retrievePendingInvitation();

      if (pendingInvitation && pendingInvitation.invitationId) {
        console.log('Processing pending invitation:', pendingInvitation);

        // Process the stored invitation
        handleInvitationAcceptance({ invitationId: pendingInvitation.invitationId });

        // Show success message with team context
        const teamContext = pendingInvitation.teamName ?
          ` Welcome to ${pendingInvitation.teamName}!` :
          ' Welcome to the team!';
        setSuccessMessage(`Successfully joined as ${pendingInvitation.role || 'member'}.${teamContext}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only run when user changes

  // Check for pending invitation notifications after user login
  useEffect(() => {
    if (user && !invitationParams && !needsProfileCompletion) {
      // Small delay to allow other authentication flows to complete
      const timer = setTimeout(() => {
        checkPendingInvitationNotifications();
      }, 1000);

      return () => clearTimeout(timer);
    }

    // Reset check flag when user changes
    if (!user) {
      setHasCheckedInvitations(false);
      setPendingInvitations([]);
      setShowInvitationNotifications(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invitationParams, needsProfileCompletion]); // Check when user state changes

  // Clear dismissed modals when user authentication state changes
  useEffect(() => {
    // Clear dismissed modals on user change (login/logout)
    // This ensures fresh modal behavior for each session
    clearDismissedModals();
  }, [user?.id]); // Only trigger when user ID changes (not on every user object change)


  // Global navigation handler for when no modals are open
  const handleGlobalNavigation = useCallback(() => {
    // Check current view and handle accordingly
    if (gameState.view === VIEWS.PERIOD_SETUP && gameState.currentPeriodNumber === 1) {
      // Exception: PeriodSetupScreen -> ConfigurationScreen
      gameState.setView(VIEWS.CONFIG);
    } else if (gameState.view === VIEWS.TACTICAL_BOARD) {
      // Navigate back from Tactical Board - same as clicking Back button
      handleNavigateFromTacticalBoard();
    } else {
      // Default: Show "Start a new game?" confirmation modal
      setShowNewGameModal(true);
      // Register this modal with the browser back intercept system
      if (pushNavigationStateRef.current) {
        pushNavigationStateRef.current(() => {
          setShowNewGameModal(false);
        });
      }
    }
  }, [gameState, handleNavigateFromTacticalBoard]);
  
  const { pushNavigationState, removeFromNavigationStack } = useBrowserBackIntercept(handleGlobalNavigation);
  
  // Database-based match abandonment state for preventing accidental data loss
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [pendingNewGameCallback, setPendingNewGameCallback] = useState(null);

  // Database-based abandonment check - uses database as source of truth
  const checkForActiveMatch = useCallback(async (callback) => {
    console.group('🚨 Database Match Abandonment Check');
    console.log('Current match ID:', gameState.currentMatchId);
    console.log('Callback type:', typeof callback);

    if (typeof callback !== 'function') {
      console.warn('checkForActiveMatch: requires a callback function');
      console.groupEnd();
      return;
    }

    // If no currentMatchId, proceed immediately
    if (!gameState.currentMatchId) {
      console.log('❌ No currentMatchId - executing callback immediately');
      console.groupEnd();
      callback();
      return;
    }

    try {
      // Query database to check if match exists and is running
      const { data: match, error } = await supabase
        .from('match')
        .select('id, state')
        .eq('id', gameState.currentMatchId)
        .eq('state', 'running')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No match found - safe to proceed
          console.log('❌ No active match found in database - executing callback immediately');
          console.groupEnd();
          callback();
          return;
        }
        
        console.error('Database error checking match:', error);
        // On error, err on side of caution and show modal
        console.log('⚠️ Database error - showing abandonment modal as precaution');
        setPendingNewGameCallback(() => callback);
        setShowAbandonModal(true);
        console.groupEnd();
        return;
      }

      if (match) {
        console.log('✅ Active match found in database - showing abandonment modal');
        console.log('Match details:', match);
        setPendingNewGameCallback(() => callback);
        setShowAbandonModal(true);
      } else {
        console.log('❌ No active match in database - executing callback immediately');
        callback();
      }
    } catch (err) {
      console.error('Unexpected error checking active match:', err);
      // On unexpected error, show modal as precaution
      console.log('⚠️ Unexpected error - showing abandonment modal as precaution');
      setPendingNewGameCallback(() => callback);
      setShowAbandonModal(true);
    }
    
    console.groupEnd();
  }, [gameState.currentMatchId]);

  // Handle abandonment confirmation - delete match record and proceed
  const handleAbandonMatch = useCallback(async () => {
    console.group('🗑️ Abandoning match - deleting database record');
    
    try {
      if (gameState.currentMatchId) {
        console.log('Deleting match record:', gameState.currentMatchId);
        
        const { error } = await supabase
          .from('match')
          .delete()
          .eq('id', gameState.currentMatchId);
          
        if (error) {
          console.error('Error deleting match record:', error);
          // Continue anyway - don't block user if deletion fails
        } else {
          console.log('✅ Match record deleted successfully');
        }
      }
      
      // Execute pending callback
      if (pendingNewGameCallback) {
        console.log('Executing pending new game callback');
        pendingNewGameCallback();
      }
      
      // Clean up modal state
      setShowAbandonModal(false);
      setPendingNewGameCallback(null);
      
    } catch (err) {
      console.error('Unexpected error during match abandonment:', err);
      
      // Even if deletion fails, proceed with callback to avoid blocking user
      if (pendingNewGameCallback) {
        console.log('Executing callback despite deletion error');
        pendingNewGameCallback();
      }
      
      setShowAbandonModal(false);
      setPendingNewGameCallback(null);
    }
    
    console.groupEnd();
  }, [gameState.currentMatchId, pendingNewGameCallback]);

  // Handle abandonment cancellation - close modal without action
  const handleCancelAbandon = useCallback(() => {
    console.log('🚫 User cancelled match abandonment');
    setShowAbandonModal(false);
    setPendingNewGameCallback(null);
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
    invitationParams,
    needsProfileCompletion,
    gameState,
    setSuccessMessage
  });
  
  // Add global helper for browser console debugging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.debugMatchState = () => {
        console.group('🔧 Debug Match State Helper');
        console.log('Game State Values:', {
          currentMatchId: gameState.currentMatchId,
          matchState: gameState.matchState,
          view: gameState.view,
          matchStartTime: gameState.matchStartTime
        });
        
        const matchStateHook = {
          currentMatchId: gameState.currentMatchId,
          matchState: gameState.matchState,
          hasActiveMatch: Boolean(gameState.currentMatchId && (gameState.matchState === 'running' || gameState.matchState === 'finished')),
          hasUnsavedMatch: Boolean(gameState.currentMatchId && gameState.matchState === 'finished'),
          isMatchRunning: Boolean(gameState.currentMatchId && gameState.matchState === 'running')
        };
        
        console.log('Calculated Match State:', matchStateHook);
        console.log('Expected Modal Behavior:', {
          'Should show abandonment modal': matchStateHook.hasActiveMatch ? '✅ YES' : '❌ NO',
          'Reason': matchStateHook.hasActiveMatch 
            ? `Active match detected (${matchStateHook.matchState})` 
            : 'No active match or invalid state'
        });
        console.groupEnd();
        
        return matchStateHook;
      };
      
      console.log('🔧 Global debug helper available: window.debugMatchState()');
    }
  }, [gameState.currentMatchId, gameState.matchState, gameState.view, gameState.matchStartTime]);
  
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

  const availableForPairing = useMemo(() => {
    if (!gameState.formation.goalie) return [];
    return getOutfieldPlayers(gameState.allPlayers, gameState.selectedSquadIds, gameState.formation.goalie);
  }, [gameState.allPlayers, gameState.selectedSquadIds, gameState.formation.goalie]);

  // Enhanced game handlers that integrate with timers
  const handleStartGame = () => {
    gameState.handleStartGame();
    timers.startTimers(
      gameState.currentPeriodNumber,
      gameState.teamConfig,
      'Djurgården', // Own team name
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

  const handleRestartMatch = () => {
    console.log('🎮 New Game clicked - current state:', {
      currentTeam: currentTeam?.name,
      teamPlayersCount: teamPlayers.length
    });
    
    // Clear all game events from previous games
    clearAllEvents();
    
    // Reset all timer state and clear localStorage
    timers.resetAllTimers();
    
    // Reset all game state
    gameState.setView('config');
    gameState.setCurrentPeriodNumber(1);
    gameState.setGameLog([]);
    
    // Sync team roster if available, otherwise use initial roster
    if (currentTeam && teamPlayers && teamPlayers.length > 0 && gameState.syncPlayersFromTeamRoster) {
      console.log('🔄 New Game: Syncing team roster players...');
      try {
        const result = gameState.syncPlayersFromTeamRoster(teamPlayers);
        if (result.success) {
          console.log('✅ New Game: Team players synced successfully');
        } else {
          console.warn('⚠️ New Game: Team sync failed, using initial roster');
          gameState.setAllPlayers(initializePlayers(initialRoster));
        }
      } catch (error) {
        console.warn('⚠️ New Game: Team sync error, using initial roster:', error);
        gameState.setAllPlayers(initializePlayers(initialRoster));
      }
    } else {
      console.log('🔄 New Game: No team selected, using initial roster');
      gameState.setAllPlayers(initializePlayers(initialRoster));
    }
    gameState.setSelectedSquadIds([]);
    gameState.setPeriodGoalieIds({});
    gameState.setFormation({
      goalie: null,
      leftPair: { defender: null, attacker: null },
      rightPair: { defender: null, attacker: null },
      subPair: { defender: null, attacker: null },
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
  };

  const handleNewGameFromMenu = async () => {
    console.log('🍔 New Game from Hamburger Menu - calling checkForActiveMatch()');
    await checkForActiveMatch(() => {
      console.log('🍔 New Game from Menu - executing callback (handleRestartMatch)');
      handleRestartMatch();
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
    console.log('⏰ New Game Confirmation (Browser Back) - calling checkForActiveMatch()');
    await checkForActiveMatch(() => {
      console.log('⏰ New Game Confirmation - executing callback');
      setShowNewGameModal(false);
      removeFromNavigationStack();
      handleRestartMatch();
    });
  };

  const handleCancelNewGame = () => {
    // When user clicks Cancel button, just close the modal without triggering browser back
    setShowNewGameModal(false);
    // Remove the modal from the browser back intercept stack without triggering navigation
    removeFromNavigationStack();
  };


  const handleLeaveSportWizard = () => {
    // Close the modal first
    setShowNewGameModal(false);
    removeFromNavigationStack();

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
    gameState.setView(VIEWS.TACTICAL_BOARD);
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
      console.log(`Team access modal dismissed for team: ${selectedTeamForAdmin.name}`);
    }
    
    setShowTeamAdminModal(false);
    setSelectedTeamForAdmin(null);
    removeFromNavigationStack();
  }, [selectedTeamForAdmin, removeFromNavigationStack]);

  const handleTeamAdminSuccess = useCallback((message) => {
    // Show success message banner
    setSuccessMessage(message);
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
    // Keep modal open for continued management
  }, []);

  // Automatic pending request modal for team admins
  useEffect(() => {
    // Only show modal if:
    // 1. User can manage team (admin or coach)
    // 2. There are pending requests
    // 3. No modal is currently open
    // 4. User is not completing their profile
    // 5. Modal has not been dismissed by user in this session
    if (canManageTeam && hasPendingRequests && currentTeam && !showTeamAdminModal && !needsProfileCompletion) {
      // Check if user has dismissed this team's access modal
      if (!isModalDismissed('team_access', currentTeam.id)) {
        console.log(`Auto-opening admin modal for ${pendingRequestsCount} pending request(s) on team:`, currentTeam.name);
        handleOpenTeamAdminModal(currentTeam);
      } else {
        console.log(`Team access modal dismissed by user for team: ${currentTeam.name}`);
      }
    }
  }, [canManageTeam, hasPendingRequests, currentTeam, showTeamAdminModal, needsProfileCompletion, pendingRequestsCount, handleOpenTeamAdminModal]);

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
            updateFormationSelection={gameState.updateFormationSelection}
            createTeamConfigFromSquadSize={gameState.createTeamConfigFromSquadSize}
            alertMinutes={gameState.alertMinutes}
            setAlertMinutes={gameState.setAlertMinutes}
            handleStartPeriodSetup={gameState.handleStartPeriodSetup}
            selectedSquadPlayers={selectedSquadPlayers}
            opponentTeam={gameState.opponentTeam}
            setOpponentTeam={gameState.setOpponentTeam}
            captainId={gameState.captainId}
            setCaptain={gameState.setCaptain}
            debugMode={debugMode}
            authModal={authModal}
            setView={gameState.setView}
            setViewWithData={setViewWithData}
            syncPlayersFromTeamRoster={gameState.syncPlayersFromTeamRoster}
          />
        );
      case VIEWS.PERIOD_SETUP:
        return (
          <PeriodSetupScreen 
            currentPeriodNumber={gameState.currentPeriodNumber}
            formation={gameState.formation}
            setFormation={gameState.setFormation}
            availableForPairing={availableForPairing}
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
            setView={gameState.setView}
            ownScore={gameState.ownScore}
            opponentScore={gameState.opponentScore}
            opponentTeam={gameState.opponentTeam}
            rotationQueue={gameState.rotationQueue}
            setRotationQueue={gameState.setRotationQueue}
            preparePeriodWithGameLog={gameState.preparePeriodWithGameLog}
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
            formatTime={formatTime}
            resetSubTimer={timers.resetSubTimer}
            handleUndoSubstitution={handleUndoSubstitution}
            handleEndPeriod={handleEndPeriod}
            nextPhysicalPairToSubOut={gameState.nextPhysicalPairToSubOut}
            nextPlayerToSubOut={gameState.nextPlayerToSubOut}
            nextPlayerIdToSubOut={gameState.nextPlayerIdToSubOut}
            nextNextPlayerIdToSubOut={gameState.nextNextPlayerIdToSubOut}
            setNextNextPlayerIdToSubOut={gameState.setNextNextPlayerIdToSubOut}
            selectedSquadPlayers={selectedSquadPlayers}
            setNextPhysicalPairToSubOut={gameState.setNextPhysicalPairToSubOut}
            setNextPlayerToSubOut={gameState.setNextPlayerToSubOut}
            setNextPlayerIdToSubOut={gameState.setNextPlayerIdToSubOut}
            teamConfig={gameState.teamConfig}
            selectedFormation={gameState.selectedFormation}
            alertMinutes={gameState.alertMinutes}
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
            getPlayerName={(playerId) => {
              const player = gameState.allPlayers.find(p => p.id === playerId);
              return player ? formatPlayerName(player) : 'Unknown Player';
            }}
          />
        );
      case VIEWS.STATS:
        return (
          <StatsScreen 
            allPlayers={gameState.gameLog[gameState.gameLog.length-1]?.finalStatsSnapshotForAllPlayers || selectedSquadPlayers}
            formatTime={formatTime}
            setView={gameState.setView}
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
            ownTeamName={selectedSquadPlayers ? 'Djurgården' : 'Own'}
            opponentTeam={gameState.opponentTeam || 'Opponent'}
            onNavigateToStats={() => gameState.setView(VIEWS.STATS)}
            onBackToGame={() => gameState.setView(VIEWS.GAME)}
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
            setView={gameState.setView}
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
            setView={gameState.setView}
            openToTab={navigationData?.openToTab}
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
            onSplitPairs={gameState.splitPairs}
            onFormPairs={gameState.formPairs}
            allPlayers={gameState.allPlayers}
            selectedSquadIds={gameState.selectedSquadIds}
            setView={gameState.setView}
            authModal={authModal}
            onOpenTeamAdminModal={handleOpenTeamAdminModal}
            onOpenPreferencesModal={handleOpenPreferencesModal}
            onSignOut={handleSignOut}
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">Sport Wizard</h1>
      </header>

      {/* Success Message Banner */}
      {successMessage && (
        <div className="w-full max-w-2xl mb-4">
          <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
            <p className="text-emerald-200 text-sm">{successMessage}</p>
          </div>
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

      {/* Match Abandonment Warning Modal */}
      <AbandonMatchModal
        isOpen={showAbandonModal}
        onAbandon={handleAbandonMatch}
        onCancel={handleCancelAbandon}
        isMatchRunning={gameState.currentMatchId && gameState.matchState === 'running'}
        hasUnsavedMatch={gameState.currentMatchId && gameState.matchState === 'finished'}
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
            setView={gameState.setView}
          />
        )}

        {/* Invitation Welcome Modal */}
        {invitationParams && invitationParams.hasInvitation && (() => {
          const invitationStatus = getInvitationStatus(user, invitationParams);
          // Show invitation welcome modal for account setup or sign-in required states
          return invitationStatus.type === 'account_setup' || invitationStatus.type === 'sign_in_required' ? (
            <InvitationWelcome
              invitationParams={invitationParams}
              onInvitationProcessed={handleInvitationProcessed}
              onRequestSignIn={handleRequestSignIn}
            />
          ) : null;
        })()}

        {/* Invitation Notification Modal */}
        <InvitationNotificationModal
          isOpen={showInvitationNotifications}
          invitations={pendingInvitations}
          onClose={() => setShowInvitationNotifications(false)}
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

// Main App Component with AuthProvider, TeamProvider, and PreferencesProvider
function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <PreferencesProvider>
          <AppContent />
        </PreferencesProvider>
      </TeamProvider>
    </AuthProvider>
  );
}

export default App;