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
import { ConfirmationModal } from './components/shared/UI';
import { getSelectedSquadPlayers, getOutfieldPlayers } from './utils/playerUtils';
import { HamburgerMenu } from './components/shared/HamburgerMenu';
import { AddPlayerModal } from './components/shared/AddPlayerModal';
import { isDebugMode } from './utils/debugUtils';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeamProvider, useTeam } from './contexts/TeamContext';
import { SessionExpiryModal } from './components/auth/SessionExpiryModal';
import { AuthModal, useAuthModal } from './components/auth/AuthModal';
import { ProfileCompletionPrompt } from './components/auth/ProfileCompletionPrompt';
import { InvitationWelcome } from './components/auth/InvitationWelcome';
import { TeamAccessRequestModal } from './components/team/TeamAccessRequestModal';
import { InvitationNotificationModal } from './components/team/InvitationNotificationModal';
import { detectResetTokens, shouldShowPasswordResetModal } from './utils/resetTokenUtils';
import { detectInvitationParams, clearInvitationParamsFromUrl, shouldProcessInvitation, getInvitationStatus, needsAccountCompletion, retrievePendingInvitation, hasPendingInvitation } from './utils/invitationUtils';
import { supabase } from './lib/supabase';

// Main App Content Component (needs to be inside AuthProvider to access useAuth)
function AppContent() {
  const gameState = useGameState();
  const timers = useTimers(gameState.periodDurationMinutes);
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
    // Reset view to ConfigurationScreen first
    gameState.setView(VIEWS.CONFIG);
    // Then perform the actual sign out
    return await signOut();
  }, [gameState, signOut]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ timeString: '' });
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [fromView, setFromView] = useState(null);
  const [showTeamAdminModal, setShowTeamAdminModal] = useState(false);
  const [selectedTeamForAdmin, setSelectedTeamForAdmin] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Invitation state
  const [invitationParams, setInvitationParams] = useState(null);
  const [isProcessingInvitation, setIsProcessingInvitation] = useState(false);
  
  // Pending invitation notifications
  const [showInvitationNotifications, setShowInvitationNotifications] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [hasCheckedInvitations, setHasCheckedInvitations] = useState(false);

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

  // Create a ref to store the pushModalState function to avoid circular dependency
  const pushModalStateRef = useRef(null);
  
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
  
  // Global navigation handler for when no modals are open
  const handleGlobalNavigation = useCallback(() => {
    // Check current view and handle accordingly
    if (gameState.view === VIEWS.PERIOD_SETUP && gameState.currentPeriodNumber === 1) {
      // Exception: PeriodSetupScreen -> ConfigurationScreen
      gameState.setView(VIEWS.CONFIG);
    } else {
      // Default: Show "Start a new game?" confirmation modal
      setShowNewGameModal(true);
      // Register this modal with the browser back intercept system
      if (pushModalStateRef.current) {
        pushModalStateRef.current(() => {
          setShowNewGameModal(false);
        });
      }
    }
  }, [gameState]);
  
  const { pushModalState, removeModalFromStack } = useBrowserBackIntercept(handleGlobalNavigation);
  
  // Store the pushModalState function in the ref
  useEffect(() => {
    pushModalStateRef.current = pushModalState;
  }, [pushModalState]);

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
      'Djurgården', // Home team name
      gameState.opponentTeamName,
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
      pushModalState(() => {
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
    removeModalFromStack();
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
    removeModalFromStack();
  };

  const handleRestartMatch = () => {
    // Clear all game events from previous games
    clearAllEvents();
    
    // Reset all timer state and clear localStorage
    timers.resetAllTimers();
    
    // Reset all game state
    gameState.setView('config');
    gameState.setCurrentPeriodNumber(1);
    gameState.setGameLog([]);
    gameState.setAllPlayers(initializePlayers(initialRoster));
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
    gameState.setOpponentTeamName('');
    gameState.clearStoredState();
  };

  const handleAddPlayer = () => {
    setShowAddPlayerModal(true);
    // Add modal to browser back button handling
    pushModalState(() => {
      setShowAddPlayerModal(false);
    });
  };

  const handleAddPlayerConfirm = (playerName) => {
    setShowAddPlayerModal(false);
    removeModalFromStack();
    gameState.addTemporaryPlayer(playerName);
  };

  const handleAddPlayerCancel = () => {
    setShowAddPlayerModal(false);
    removeModalFromStack();
  };

  // Handle new game confirmation modal
  const handleConfirmNewGame = () => {
    setShowNewGameModal(false);
    removeModalFromStack();
    handleRestartMatch();
  };

  const handleCancelNewGame = () => {
    // When user clicks Cancel button, just close the modal without triggering browser back
    setShowNewGameModal(false);
    // Remove the modal from the browser back intercept stack without triggering navigation
    removeModalFromStack();
  };

  const handleNavigateToTacticalBoard = () => {
    setFromView(gameState.view);
    gameState.setView(VIEWS.TACTICAL_BOARD);
  };

  const handleNavigateFromTacticalBoard = (fallbackView) => {
    // Navigate back to the previous view - for now, go to GAME view if available, otherwise CONFIG
    if (gameState.view === VIEWS.TACTICAL_BOARD) {
      gameState.setView(fromView || fallbackView || VIEWS.CONFIG);
    }
  };

  // Team admin modal handlers
  const handleOpenTeamAdminModal = useCallback((team) => {
    setSelectedTeamForAdmin(team);
    setShowTeamAdminModal(true);
    // Add modal to browser back button handling
    pushModalState(() => {
      setShowTeamAdminModal(false);
      setSelectedTeamForAdmin(null);
    });
  }, [pushModalState]);

  const handleCloseTeamAdminModal = useCallback(() => {
    setShowTeamAdminModal(false);
    setSelectedTeamForAdmin(null);
    removeModalFromStack();
  }, [removeModalFromStack]);

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
    if (canManageTeam && hasPendingRequests && currentTeam && !showTeamAdminModal && !needsProfileCompletion) {
      console.log(`Auto-opening admin modal for ${pendingRequestsCount} pending request(s) on team:`, currentTeam.name);
      handleOpenTeamAdminModal(currentTeam);
    }
  }, [canManageTeam, hasPendingRequests, currentTeam, showTeamAdminModal, needsProfileCompletion, pendingRequestsCount, handleOpenTeamAdminModal]);

  // Render logic
  const renderView = () => {
    switch (gameState.view) {
      case VIEWS.CONFIG:
        return (
          <ConfigurationScreen 
            allPlayers={gameState.allPlayers}
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
            opponentTeamName={gameState.opponentTeamName}
            setOpponentTeamName={gameState.setOpponentTeamName}
            captainId={gameState.captainId}
            setCaptain={gameState.setCaptain}
            debugMode={debugMode}
            authModal={authModal}
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
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            opponentTeamName={gameState.opponentTeamName}
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
            pushModalState={pushModalState}
            removeModalFromStack={removeModalFromStack}
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            opponentTeamName={gameState.opponentTeamName}
            addHomeGoal={gameState.addHomeGoal}
            addAwayGoal={gameState.addAwayGoal}
            setScore={gameState.setScore}
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
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            opponentTeamName={gameState.opponentTeamName}
            resetScore={gameState.resetScore}
            setOpponentTeamName={gameState.setOpponentTeamName}
            navigateToMatchReport={gameState.navigateToMatchReport}
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
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            periodDurationMinutes={gameState.periodDurationMinutes}
            teamConfig={gameState.teamConfig}
            homeTeamName={selectedSquadPlayers ? 'Djurgården' : 'Home'}
            awayTeamName={gameState.opponentTeamName || 'Opponent'}
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
            pushModalState={pushModalState}
            removeModalFromStack={removeModalFromStack}
            fromView={fromView}
          />
        );
      case VIEWS.TEAM_MANAGEMENT:
        return (
          <TeamManagement
            setView={gameState.setView}
          />
        );
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-2 sm:p-4 font-sans">
      <header className="w-full max-w-2xl relative text-center mb-4">
        <div className="absolute top-0 right-0">
          <HamburgerMenu 
            onRestartMatch={handleRestartMatch} 
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
            onSignOut={handleSignOut}
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">DIF F16-6 Coach</h1>
      </header>

      {/* Success Message Banner */}
      {successMessage && (
        <div className="w-full max-w-2xl mb-4">
          <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
            <p className="text-emerald-200 text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      <main className="w-full max-w-2xl bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl">
        {renderView()}
      </main>
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
      
      <ConfirmationModal
        isOpen={showNewGameModal}
        onConfirm={handleConfirmNewGame}
        onCancel={handleCancelNewGame}
        title="Start a new game?"
        message="Are you sure you want to start a new game? This will reset all progress and take you back to the configuration screen."
        confirmText="Yes, start new game"
        cancelText="Cancel"
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
      </div>
  );
}

// Main App Component with AuthProvider and TeamProvider
function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <AppContent />
      </TeamProvider>
    </AuthProvider>
  );
}

export default App;