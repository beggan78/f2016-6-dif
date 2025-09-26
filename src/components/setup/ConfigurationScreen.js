import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Shuffle, Cloud, Upload, Layers, UserPlus, HelpCircle, Save } from 'lucide-react';
import { Select, Button, Input } from '../shared/UI';
import { PERIOD_OPTIONS, DURATION_OPTIONS, ALERT_OPTIONS } from '../../constants/gameConfig';
import { FORMATIONS, FORMATS, FORMAT_CONFIGS, getValidFormations, FORMATION_DEFINITIONS, createTeamConfig, SUBSTITUTION_TYPES, PAIR_ROLE_ROTATION_DEFINITIONS } from '../../constants/teamConfiguration';
import { getInitialFormationTemplate } from '../../constants/gameModes';
import { sanitizeNameInput } from '../../utils/inputSanitization';
import { getRandomPlayers, randomizeGoalieAssignments } from '../../utils/debugUtils';
import { formatPlayerName } from '../../utils/formatUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { useFormationVotes } from '../../hooks/useFormationVotes';
import { TeamManagement } from '../team/TeamManagement';
import { dataSyncManager } from '../../utils/DataSyncManager';
import { FeatureGate } from '../auth/FeatureGate';
import { FormationPreview } from './FormationPreview';
import FeatureVoteModal from '../shared/FeatureVoteModal';
import PairRoleRotationHelpModal from '../shared/PairRoleRotationHelpModal';
import { VIEWS } from '../../constants/viewConstants';
import { MATCH_TYPE_OPTIONS } from '../../constants/matchTypes';
import { VENUE_TYPE_OPTIONS, DEFAULT_VENUE_TYPE } from '../../constants/matchVenues';
import { DETECTION_TYPES } from '../../services/sessionDetectionService';
import { checkForPendingMatches, createResumeDataForConfiguration } from '../../services/pendingMatchService';
import { discardPendingMatch } from '../../services/matchStateManager';
import { PendingMatchResumeModal } from '../match/PendingMatchResumeModal';


export function ConfigurationScreen({ 
  allPlayers, 
  setAllPlayers,
  selectedSquadIds, 
  setSelectedSquadIds, 
  numPeriods, 
  setNumPeriods, 
  periodDurationMinutes, 
  setPeriodDurationMinutes, 
  periodGoalieIds, 
  setPeriodGoalieIds, 
  teamConfig,
  updateTeamConfig,
  selectedFormation,
  setSelectedFormation,
  updateFormationSelection,
  createTeamConfigFromSquadSize,
  formation,
  setFormation,
  alertMinutes,
  setAlertMinutes,
  handleStartPeriodSetup, 
  handleSaveConfiguration,
  selectedSquadPlayers,
  opponentTeam,
  setOpponentTeam,
  matchType,
  setMatchType,
  venueType,
  setVenueType,
  captainId,
  setCaptain,
  debugMode = false,
  authModal,
  setView,
  syncPlayersFromTeamRoster,
  setCurrentMatchId,
  setMatchCreated,
  hasActiveConfiguration,
  setHasActiveConfiguration,
  clearStoredState
}) {
  const [isVoteModalOpen, setIsVoteModalOpen] = React.useState(false);
  const [formationToVoteFor, setFormationToVoteFor] = React.useState(null);
  const [playerSyncStatus, setPlayerSyncStatus] = React.useState({ loading: false, message: '' });
  const [isPairRoleHelpModalOpen, setIsPairRoleHelpModalOpen] = React.useState(false);
  const [saveConfigStatus, setSaveConfigStatus] = React.useState({ loading: false, message: '', error: null });
  
  // Direct pending match state (no navigation complexity)
  const [pendingMatches, setPendingMatches] = useState([]);
  const [showPendingMatchModal, setShowPendingMatchModal] = useState(false);
  const [pendingMatchLoading, setPendingMatchLoading] = useState(false);
  const [pendingMatchModalClosed, setPendingMatchModalClosed] = useState(() => {
    // Initialize from sessionStorage if available to prevent race condition on mount
    try {
      return sessionStorage.getItem('sport-wizard-pending-modal-closed') === 'true';
    } catch {
      return false;
    }
  });
  const [pendingMatchError, setPendingMatchError] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  // Track if current match is a resumed match to prevent inappropriate state clearing
  const [isResumedMatch, setIsResumedMatch] = useState(false);

  const currentFormat = teamConfig?.format || FORMATS.FORMAT_5V5;

  // Ref to track resume data processing to prevent infinite loops
  const resumeDataProcessedRef = useRef(false);
  // Ref to track if resume data has been applied to prevent reapplication
  const resumeDataAppliedRef = useRef(false);
  // Ref to track team sync completion to coordinate with resume data processing
  const teamSyncCompletedRef = useRef(false);
  const isProcessingResumeDataRef = useRef(false);
  const processingTimeoutRef = useRef(null);
  
  // Component unmount cleanup to prevent memory leaks
  React.useEffect(() => {
    return () => {
      // Reset all resume processing refs on component unmount

      resumeDataProcessedRef.current = false;
      resumeDataAppliedRef.current = false;
      isProcessingResumeDataRef.current = false;
      teamSyncCompletedRef.current = false;
      
      // Clear any pending timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this only runs on mount/unmount
  
  // Auth and Team hooks (must be before useEffect that use these values)
  const { isAuthenticated, user, sessionDetectionResult } = useAuth();
  const { currentTeam, teamPlayers, hasTeams, hasClubs, loading: teamLoading } = useTeam();
  
  
  // Reset pending match modal closure state when user signs out
  React.useEffect(() => {
    if (!user?.id) {
      // User signed out - reset closure state (sign-in state is handled by initializer)
      setPendingMatchModalClosed(false);
    }
  }, [user?.id]);
  
  // Function to load pending matches with error handling
  const loadPendingMatches = React.useCallback(async (teamId, showLoadingState = false) => {
    try {
      if (showLoadingState) {
        setPendingMatchLoading(true);
      }
      setPendingMatchError(null);
      
      const result = await checkForPendingMatches(teamId);
      if (result.shouldShow && result.pendingMatches.length > 0) {
        setPendingMatches(result.pendingMatches);
        setShowPendingMatchModal(true);
      }
    } catch (error) {
      console.error('❌ Failed to check for pending matches:', error);
      setPendingMatchError({
        message: 'Failed to check for pending matches. Please check your internet connection and try again.',
        detail: error.message,
        canRetry: true
      });
    } finally {
      setPendingMatchLoading(false);
    }
  }, []);
  
  // Direct pending match detection (no navigation complexity)
  React.useEffect(() => {
    if (sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN && 
        currentTeam?.id && 
        !teamLoading && 
        !pendingMatchModalClosed) {
      // Add 1 second delay before showing the modal so user sees main UI first
      setTimeout(() => {
        loadPendingMatches(currentTeam.id, false);
      }, 1500); // 1.5 seconds delay
    }
  }, [sessionDetectionResult, currentTeam?.id, teamLoading, pendingMatchModalClosed, loadPendingMatches]);
  
  // Retry handler for pending match loading
  const retryLoadPendingMatches = React.useCallback(() => {
    if (currentTeam?.id) {
      loadPendingMatches(currentTeam.id, true);
    }
  }, [currentTeam?.id, loadPendingMatches]);
  
  // Modal closure handler - defined early so other handlers can use it
  // When "Configure New Match" is clicked, it should reset the same way as "New Game" from Hamburger Menu
  const handleClosePendingMatchModal = React.useCallback(() => {
    setShowPendingMatchModal(false);
    setPendingMatchModalClosed(true);
    sessionStorage.setItem('sport-wizard-pending-modal-closed', 'true');

    // Reset state to match "New Game" behavior from Hamburger Menu
    setOpponentTeam('');  // Clear opponent team name
    setMatchType('league');  // Reset to default match type
    setVenueType(DEFAULT_VENUE_TYPE);
    setCaptain(null);     // Clear captain selection

    // Clear resumed match state and data
    setIsResumedMatch(false);
    setResumeData(null);
    resumeDataAppliedRef.current = false;

    clearStoredState();   // Clear localStorage and match state
  }, [setOpponentTeam, setMatchType, setVenueType, setCaptain, clearStoredState]);

  // Modal closure handler specifically for resume flow - does NOT clear stored state
  const handleResumeMatchModalClose = React.useCallback(() => {
    setShowPendingMatchModal(false);
    setPendingMatchModalClosed(true);
    sessionStorage.setItem('sport-wizard-pending-modal-closed', 'true');
    // NOTE: No clearStoredState() call - preserve resumed match ID and state
  }, []);

  const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', error: null });
  const [showMigration, setShowMigration] = useState(false);
  
  // Formation voting hook
  const { 
    submitVote, 
    loading: voteLoading, 
    error: voteError, 
    successMessage: voteSuccessMessage, 
    infoMessage: voteInfoMessage,
    clearMessages: clearVoteMessages,
    isAuthenticated: isVoteAuthenticated
  } = useFormationVotes();

  // Handle substitution mode changes
  const handleSubstitutionModeChange = React.useCallback((newSubstitutionType) => {
    if (!teamConfig) return;

    const format = teamConfig.format || FORMATS.FORMAT_5V5;
    const formatConfig = FORMAT_CONFIGS[format] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];
    if (!formatConfig.allowedSubstitutionTypes.includes(newSubstitutionType)) {
      console.warn(`Substitution type ${newSubstitutionType} not supported for format ${format}`);
      return;
    }

    const newTeamConfig = createTeamConfig(
      format,
      teamConfig.squadSize || selectedSquadIds.length,
      teamConfig.formation || selectedFormation,
      newSubstitutionType,
      teamConfig.pairRoleRotation
    );

    updateTeamConfig(newTeamConfig);
    setHasActiveConfiguration(true);
  }, [teamConfig, selectedSquadIds.length, selectedFormation, updateTeamConfig, setHasActiveConfiguration]);

  // Handle pair role rotation changes
  const handlePairRoleRotationChange = React.useCallback((newPairRoleRotation) => {
    if (!teamConfig || teamConfig.substitutionType !== SUBSTITUTION_TYPES.PAIRS) return;

    const newTeamConfig = createTeamConfig(
      teamConfig.format || FORMATS.FORMAT_5V5,
      teamConfig.squadSize || selectedSquadIds.length,
      teamConfig.formation || selectedFormation,
      teamConfig.substitutionType,
      newPairRoleRotation
    );

    updateTeamConfig(newTeamConfig);
    setHasActiveConfiguration(true);
  }, [teamConfig, selectedSquadIds.length, selectedFormation, updateTeamConfig, setHasActiveConfiguration]);

  // Auto-select "Pairs" substitution mode when 7 players + 2-2 formation is selected
  React.useEffect(() => {
    if (
      teamConfig?.format === FORMATS.FORMAT_5V5 &&
      selectedSquadIds.length === 7 &&
      selectedFormation === FORMATIONS.FORMATION_2_2
    ) {
      // If no substitution type is set or if we need to default to pairs
      if (!teamConfig?.substitutionType) {
        handleSubstitutionModeChange(SUBSTITUTION_TYPES.PAIRS);
      }
    }
  }, [teamConfig?.format, selectedSquadIds.length, selectedFormation, teamConfig?.substitutionType, handleSubstitutionModeChange]);

  // Sync team roster to game state on mount and when team/players change
  React.useEffect(() => {
    // Guard: Skip team sync if resume processing is currently happening
    if (isProcessingResumeDataRef.current) {
      return;
    }
    
    // Check sync requirements with descriptive variables
    const hasCurrentTeam = !!currentTeam;
    const hasTeamPlayers = teamPlayers && teamPlayers.length > 0;
    const hasSyncFunction = !!syncPlayersFromTeamRoster;
    
    
    if (!hasCurrentTeam || !hasTeamPlayers || !hasSyncFunction) {
      // Mark sync as "completed" when skipped so resume processing doesn't wait indefinitely
      teamSyncCompletedRef.current = true;
      return; // No team selected or no sync function available
    }

    const performSync = async () => {
      setPlayerSyncStatus({ loading: true, message: 'Syncing team roster...' });
      teamSyncCompletedRef.current = false;
      
      try {
        const result = syncPlayersFromTeamRoster(teamPlayers);
        
        if (result.success) {
          setPlayerSyncStatus({ 
            loading: false, 
            message: result.message === 'No sync needed' ? '' : `✅ ${result.message}` 
          });
          
          // Mark team sync as completed
          teamSyncCompletedRef.current = true;
          
          // Clear success message after 3 seconds
          if (result.message !== 'No sync needed') {
            setTimeout(() => {
              setPlayerSyncStatus(prev => ({ ...prev, message: '' }));
            }, 3000);
          }
        } else {
          setPlayerSyncStatus({ 
            loading: false, 
            message: `⚠️ Sync failed: ${result.error}` 
          });
          teamSyncCompletedRef.current = false;
        }
      } catch (error) {
        console.error('ConfigurationScreen sync error:', error);
        setPlayerSyncStatus({ 
          loading: false, 
          message: `⚠️ Sync error: ${error.message}` 
        });
        teamSyncCompletedRef.current = false;
      }
    };

    performSync();
  }, [currentTeam, currentTeam?.id, teamPlayers, syncPlayersFromTeamRoster]);

  const handleFormationChange = (newFormation) => {
    const definition = FORMATION_DEFINITIONS[newFormation];
    if (definition && definition.status === 'coming-soon') {
      setFormationToVoteFor(newFormation);
      setIsVoteModalOpen(true);
    } else {
      updateFormationSelection(newFormation);
    }
  };

  const handleVoteConfirm = async () => {
    if (!formationToVoteFor) return;
    
    // Clear any previous messages
    clearVoteMessages();
    
    // Check if user is authenticated
    if (!isVoteAuthenticated) {
      console.error('User must be authenticated to vote');
      // The modal will handle showing authentication requirement
      return;
    }
    
    // Submit the vote for the actively selected format
    const result = await submitVote(formationToVoteFor, currentFormat);
    
    if (result.success) {
      // Close modal on success after a brief delay to show success message
      setTimeout(() => {
        setIsVoteModalOpen(false);
        // Clear the formation to vote for
        setFormationToVoteFor(null);
      }, 2000);
    }
    // On error, keep modal open to show error message
  };

  // Update DataSyncManager when user changes
  useEffect(() => {
    if (user?.id) {
      dataSyncManager.setUserId(user.id);

      // Check if user has local data that could be migrated
      const localMatches = dataSyncManager.getLocalMatches();
      setShowMigration(localMatches.length > 0);
    } else {
      dataSyncManager.setUserId(null);
      setShowMigration(false);
    }
  }, [user]);

  // Determine which players to show and if team has no players
  const hasNoTeamPlayers = isAuthenticated && currentTeam && teamPlayers.length === 0;
  const playersToShow = isAuthenticated && currentTeam && teamPlayers.length > 0
    ? teamPlayers.map(player => ({
        id: player.id,
        name: player.name,
        jerseyNumber: player.jersey_number
      }))
    : allPlayers;
  
  // Clear selectedSquadIds when team has no players to avoid showing orphaned selections
  // Only clear on NEW_SIGN_IN to preserve squad selection on page refresh
  // BUT: Skip this cleanup when resume data is being processed to avoid clearing resumed selections
  React.useEffect(() => {
    // Skip cleanup if resume data is present or being processed or this is a resumed match
    if (isProcessingResumeDataRef.current || isResumedMatch) {
      return;
    }

    if (hasNoTeamPlayers && selectedSquadIds.length > 0 &&
        sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN) {
      setSelectedSquadIds([]);
    }
  }, [hasNoTeamPlayers, selectedSquadIds.length, setSelectedSquadIds, sessionDetectionResult, isResumedMatch]);

  // Reset resume processing flags on NEW_SIGN_IN to ensure each sign-in can process resume data independently
  React.useEffect(() => {
    if (sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN) {
      // Reset flags to allow new resume data to be processed
      resumeDataProcessedRef.current = false;
      resumeDataAppliedRef.current = false;
      isProcessingResumeDataRef.current = false;

      // Clear any pending timeout on NEW_SIGN_IN
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [sessionDetectionResult]);

  // Add "already processed" guard flag to prevent infinite loops
  const [newSignInProcessed, setNewSignInProcessed] = useState(false);

  // Reset processing flag when session changes (to handle new sign-ins)
  React.useEffect(() => {
    if (sessionDetectionResult?.type !== DETECTION_TYPES.NEW_SIGN_IN) {
      setNewSignInProcessed(false);
    }
  }, [sessionDetectionResult?.type]);

  // Smart NEW_SIGN_IN state clearing - only clear if no active configuration is in progress
  React.useEffect(() => {
    if (sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN &&
        !hasActiveConfiguration &&
        !isResumedMatch &&
        !isProcessingResumeDataRef.current &&
        !newSignInProcessed &&
        clearStoredState) {

      console.log('🔄 NEW_SIGN_IN detected with no active configuration - clearing previous user data');

      // Mark as processed to prevent infinite loops
      setNewSignInProcessed(true);

      // Clear stored state and configuration data
      clearStoredState();

      // Explicitly clear configuration-specific state that might persist
      setOpponentTeam('');
      setPeriodGoalieIds({});
      setCaptain(null);

      // Note: selectedSquadIds will be cleared by the existing effect below when team has no players
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDetectionResult, hasActiveConfiguration, isResumedMatch, newSignInProcessed, clearStoredState]);

  // Ensure allPlayers is updated with team data when authenticated
  // This is necessary for selectedSquadPlayers to work correctly with team data
  React.useEffect(() => {
    if (isAuthenticated && currentTeam && teamPlayers.length > 0) {
      const transformedTeamPlayers = teamPlayers.map(player => ({
        id: player.id,
        name: player.name,
        jerseyNumber: player.jersey_number,
        // Initialize player stats if not present (required for game logic)
        stats: {
          timeOnFieldSeconds: 0,
          timeAsAttackerSeconds: 0,
          timeAsDefenderSeconds: 0,
          timeAsGoalieSeconds: 0,
          timeAsMidfielderSeconds: 0,
          currentStatus: 'substitute',
          currentPosition: null,
          currentRole: null,
          isInactive: false,
          lastStintStartTimeEpoch: null
        }
      }));
      
      // Only update allPlayers if the data has actually changed
      if (JSON.stringify(allPlayers.map(p => ({ id: p.id, name: p.name }))) !== 
          JSON.stringify(transformedTeamPlayers.map(p => ({ id: p.id, name: p.name })))) {
        setAllPlayers(transformedTeamPlayers);
      }
    }
  }, [isAuthenticated, currentTeam, teamPlayers, allPlayers, setAllPlayers]);

  // Handle resume data from pending match
  React.useEffect(() => {
    
    // Guard: Skip if team sync is currently in progress (avoid interference)
    if (playerSyncStatus.loading) {
      return;
    }
    
    
    // Process resume data from pending match modal selection (only apply once)
    if (resumeData && !isProcessingResumeDataRef.current && !resumeDataAppliedRef.current) {
      // Mark as processing to prevent concurrent execution
      isProcessingResumeDataRef.current = true;
      
      // Set timeout protection to auto-reset stuck processing state
      processingTimeoutRef.current = setTimeout(() => {
        if (isProcessingResumeDataRef.current) {
          console.warn('⚠️ Resume processing timeout - auto-resetting stuck state after 10 seconds');
          isProcessingResumeDataRef.current = false;
          processingTimeoutRef.current = null;
        }
      }, 10000); // 10-second timeout

      try {
        // CRITICAL: Set team config atomically with formation to prevent state timing issues
        // This prevents formation compatibility checks from overriding the restored config
        if (resumeData.teamConfig) {
          console.log('🔄 RESUME: Restoring team config:', {
            substitutionType: resumeData.teamConfig.substitutionType,
            pairRoleRotation: resumeData.teamConfig.pairRoleRotation,
            fullConfig: resumeData.teamConfig
          });
          updateTeamConfig(resumeData.teamConfig);

          // Separately sync the formation UI state without triggering compatibility logic
          if (resumeData.formation || resumeData.teamConfig.formation) {
            const formationToSet = resumeData.formation || resumeData.teamConfig.formation;
            console.log('🔄 RESUME: Syncing formation UI state:', formationToSet);
            setSelectedFormation(formationToSet);
          }
        }

        // Pre-populate match configuration
        if (resumeData.periods) {
          setNumPeriods(resumeData.periods);
        }

        if (resumeData.periodDurationMinutes) {
          setPeriodDurationMinutes(resumeData.periodDurationMinutes);
        }

        if (resumeData.opponentTeam !== undefined) {
          setOpponentTeam(resumeData.opponentTeam);
        }

        if (resumeData.matchType) {
          setMatchType(resumeData.matchType);
        }

        if (resumeData.venueType) {
          setVenueType(resumeData.venueType);
        }

        if (resumeData.captainId) {
          setCaptain(resumeData.captainId);
        }

        // CRITICAL: Set squad selection LAST to prevent auto-config from overriding team config
        if (resumeData.squadSelection) {
          console.log('🔄 RESUME: Restoring squad selection (final step):', resumeData.squadSelection);
          setSelectedSquadIds(resumeData.squadSelection);
        }
        
        if (resumeData.periodGoalies) {
          setPeriodGoalieIds(resumeData.periodGoalies);
        }

        // CRITICAL: Restore formation data with position assignments
        if (resumeData.formationData) {
          console.log('🔄 RESUME: Restoring formation data with position assignments:', resumeData.formationData);
          setFormation(resumeData.formationData);
        }

        // Mark resume data as processed and applied
        resumeDataProcessedRef.current = true;
        resumeDataAppliedRef.current = true;
        isProcessingResumeDataRef.current = false;

        // Set flags for resumed match state
        setIsResumedMatch(true);
        setHasActiveConfiguration(true);

        // Clear the timeout since processing completed successfully
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }

        // DON'T clear resumeData - keep it for navigation persistence
        // setResumeData(null); // Removed - preserve resume data until new match starts
      } catch (error) {
        // Error handling: Reset refs and log the error
        console.error('❌ Resume data processing failed:', error);
        
        // Reset refs to prevent stuck states
        resumeDataProcessedRef.current = false;
        resumeDataAppliedRef.current = false;
        isProcessingResumeDataRef.current = false;

        // Clear the timeout since processing failed
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }

        // Don't clear resumeData on error - let user retry or manually clear
        // setResumeData(null); // Removed - preserve resume data for retry
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeData, setSelectedSquadIds, setNumPeriods, setPeriodDurationMinutes, 
      setOpponentTeam, setMatchType, setCaptain, updateTeamConfig, updateFormationSelection, 
      setPeriodGoalieIds]);

  // Reset the processing flag when resume data is cleared (for cleanup)
  // Note: alreadyProcessed flag is kept for debugging but no longer blocks processing
  React.useEffect(() => {
    if (!resumeData) {
      // Only reset processing flag - alreadyProcessed is kept for debugging
      isProcessingResumeDataRef.current = false;
      
      // Clear any pending timeout when resume data is cleared
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [resumeData]);
  

  const togglePlayerSelection = (playerId) => {
    setSelectedSquadIds(prev => {
      const newIds = prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId];

      // Mark as active configuration when squad selection changes
      if (newIds.length > 0) {
        setHasActiveConfiguration(true);
      }

      // Auto-create team configuration based on squad size
      // GUARD: Skip auto-configuration during resume data processing to prevent override
      if (newIds.length >= 5 && newIds.length <= 15 && !isProcessingResumeDataRef.current) {
        const formatConfig = FORMAT_CONFIGS[currentFormat] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];
        const defaultSubstitutionType = formatConfig.getDefaultSubstitutionType
          ? formatConfig.getDefaultSubstitutionType(newIds.length)
          : SUBSTITUTION_TYPES.INDIVIDUAL;
        console.log('⚡ AUTO-CONFIG: Squad selection changed, triggering createTeamConfigFromSquadSize:', {
          squadSize: newIds.length,
          defaultSubstitutionType,
          currentTeamConfig: teamConfig
        });
        createTeamConfigFromSquadSize(newIds.length, defaultSubstitutionType, currentFormat);
      } else if (isProcessingResumeDataRef.current) {
        console.log('🛡️ AUTO-CONFIG: Skipped during resume processing to prevent override');
      }

      // Clear captain if the captain is being deselected
      if (captainId && !newIds.includes(captainId)) {
        setCaptain(null);
      }

      return newIds;
    });
  };

  const handleGoalieChange = (period, playerId) => {
    // Mark as active configuration when goalie assignments change
    setHasActiveConfiguration(true);

    setPeriodGoalieIds(prev => {
      const newGoalieIds = { ...prev, [period]: playerId };
      if (period === 1) {
        for (let i = 2; i <= numPeriods; i++) {
          if (prev[i] === prev[1] || !prev[i]) {
            newGoalieIds[i] = playerId;
          }
        }
      }
      return newGoalieIds;
    });
  };

  const handleCaptainChange = (playerId) => {
    // Empty string means no captain selected
    const captainId = playerId === "" ? null : playerId;

    // Mark as active configuration when captain changes (but allow clearing captain)
    if (captainId) {
      setHasActiveConfiguration(true);
    }

    setCaptain(captainId);
  };

  const handleOpponentTeamChange = (value) => {
    const sanitizedValue = sanitizeNameInput(value);

    // Mark as active configuration when opponent name is set (non-empty)
    if (sanitizedValue.trim()) {
      setHasActiveConfiguration(true);
    }

    setOpponentTeam(sanitizedValue);
  };

  const handleMatchTypeChange = (value) => {
    setMatchType(value);
    setHasActiveConfiguration(true);
  };

  const handleVenueTypeChange = (value) => {
    setVenueType(value);
    setHasActiveConfiguration(true);
  };

  const handleFormatChange = React.useCallback((newFormat) => {
    if (!teamConfig) return;

    const formatConfig = FORMAT_CONFIGS[newFormat] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];
    const availableFormations = getValidFormations(newFormat, selectedSquadIds.length);
    const fallbackFormation = formatConfig.defaultFormation || FORMATIONS.FORMATION_2_2;
    const nextFormation = availableFormations.includes(selectedFormation)
      ? selectedFormation
      : fallbackFormation;

    const squadSize = teamConfig.squadSize || selectedSquadIds.length || (formatConfig.fieldPlayers + 1);
    const allowedSubTypes = formatConfig.allowedSubstitutionTypes || [SUBSTITUTION_TYPES.INDIVIDUAL];
    const nextSubstitutionType = allowedSubTypes.includes(teamConfig.substitutionType)
      ? teamConfig.substitutionType
      : (formatConfig.getDefaultSubstitutionType
        ? formatConfig.getDefaultSubstitutionType(squadSize)
        : SUBSTITUTION_TYPES.INDIVIDUAL);

    const nextPairRotation = nextSubstitutionType === SUBSTITUTION_TYPES.PAIRS
      ? teamConfig.pairRoleRotation
      : null;

    const newTeamConfig = createTeamConfig(
      newFormat,
      squadSize,
      nextFormation,
      nextSubstitutionType,
      nextPairRotation
    );

    setSelectedFormation(nextFormation);
    updateTeamConfig(newTeamConfig);
    const initialTemplate = getInitialFormationTemplate(newTeamConfig, formation?.goalie || null);
    if (initialTemplate && typeof setFormation === 'function') {
      setFormation(initialTemplate);
    }
    setHasActiveConfiguration(true);
  }, [teamConfig, selectedSquadIds.length, selectedFormation, formation, setFormation, setSelectedFormation, updateTeamConfig, setHasActiveConfiguration]);

  const randomizeConfiguration = () => {
    // Clear existing selections
    setSelectedSquadIds([]);
    setPeriodGoalieIds({});
    setCaptain(null);
    
    // Randomly select 7 players from roster
    const randomPlayers = getRandomPlayers(playersToShow, 7);
    const randomPlayerIds = randomPlayers.map(p => p.id);
    setSelectedSquadIds(randomPlayerIds);
    
    // Always select 2-2 formation to avoid debug mode bug with 1-2-1
    const randomFormation = FORMATIONS.FORMATION_2_2;
    handleFormatChange(FORMATS.FORMAT_5V5);
    updateFormationSelection(randomFormation);

    // Create team config for 7 players with pairs substitution
    createTeamConfigFromSquadSize(7, SUBSTITUTION_TYPES.PAIRS, FORMATS.FORMAT_5V5);
    
    // Randomize goalie assignments (use current numPeriods setting)
    const goalieAssignments = randomizeGoalieAssignments(randomPlayers, numPeriods);
    setPeriodGoalieIds(goalieAssignments);
    
    // Set a random opponent name
    const opponentNames = ['Lions FC', 'Eagles United', 'Sharks', 'Thunder', 'Storm', 'Wildcats'];
    const randomOpponent = opponentNames[Math.floor(Math.random() * opponentNames.length)];
    setOpponentTeam(randomOpponent);
  };

  const handleMigrateData = async () => {
    setSyncStatus({ loading: true, message: 'Migrating local data to cloud...', error: null });

    try {
      const result = await dataSyncManager.migrateLocalDataToCloud();

      if (result.success) {
        setSyncStatus({
          loading: false,
          message: result.message,
          error: null
        });
        setShowMigration(false);

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSyncStatus({ loading: false, message: '', error: null });
        }, 5000);
      } else {
        setSyncStatus({
          loading: false,
          message: '',
          error: result.error || 'Migration failed'
        });
      }
    } catch (error) {
      setSyncStatus({
        loading: false,
        message: '',
        error: 'Migration failed: ' + error.message
      });
    }
  };

  const handleDismissMigration = () => {
    setShowMigration(false);
  };

  // Direct pending match modal handlers (no navigation complexity)
  const handleResumePendingMatch = React.useCallback(async (matchId) => {
    const selectedMatch = pendingMatches.find(match => match.id === matchId);
    
    if (!selectedMatch?.initial_config) {
      console.error('❌ MATCH SELECTION ERROR: No match found or missing initial_config');
      return;
    }

    setPendingMatchLoading(true);
    try {
      // Create resume data for direct processing
      const resumeDataForConfig = createResumeDataForConfiguration(selectedMatch.initial_config);
      
      if (resumeDataForConfig) {
        // Use resume-specific closure to avoid clearing stored state
        handleResumeMatchModalClose();
        
        // Set resume data directly - no navigation needed
        setResumeData(resumeDataForConfig);
        
        // CRITICAL: Set currentMatchId to the resumed match
        setCurrentMatchId(matchId);
        setMatchCreated(true);
        console.log('✅ Resume match: Set currentMatchId to', matchId, 'and matchCreated to true');
      } else {
        console.error('❌ Failed to create resume data from pending match');
        handleResumeMatchModalClose();
      }
    } catch (error) {
      console.error('❌ Error resuming pending match:', error);
      handleResumeMatchModalClose();
    } finally {
      setPendingMatchLoading(false);
    }
  }, [pendingMatches, handleResumeMatchModalClose, setCurrentMatchId, setMatchCreated]);

  const handleDiscardPendingMatch = React.useCallback(async (matchId) => {
    if (!matchId) return;

    setPendingMatchLoading(true);
    try {
      await discardPendingMatch(matchId);
      
      // Remove the discarded match from the array
      setPendingMatches(prev => prev.filter(match => match.id !== matchId));
      
      // If no matches remain, close the modal using consistent closure logic
      if (pendingMatches.length <= 1) {
        handleClosePendingMatchModal();
      }
    } catch (error) {
      console.error('❌ Error discarding pending match:', error);
      handleClosePendingMatchModal();
    } finally {
      setPendingMatchLoading(false);
    }
  }, [pendingMatches, handleClosePendingMatchModal]);

  const handleSaveConfigClick = async () => {
    if (!handleSaveConfiguration) {
      console.warn('handleSaveConfiguration is not provided');
      return;
    }

    setSaveConfigStatus({ loading: true, message: 'Saving configuration...', error: null });

    try {
      const result = await handleSaveConfiguration();
      
      if (result.success) {
        setSaveConfigStatus({
          loading: false,
          message: `✅ ${result.message || 'Configuration saved successfully'}`,
          error: null
        });
        
        // Scroll to top to show success banner
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveConfigStatus(prev => ({ ...prev, message: '' }));
        }, 3000);
      } else {
        setSaveConfigStatus({
          loading: false,
          message: '',
          error: result.error || 'Failed to save configuration'
        });
      }
    } catch (error) {
      console.error('Save configuration error:', error);
      setSaveConfigStatus({
        loading: false,
        message: '',
        error: 'Failed to save configuration: ' + error.message
      });
    }
  };

  // Show team management for authenticated users who need to set up teams
  // If user has no clubs at all, they need to create/join a club first
  // If user has clubs but no teams, they need to create/join a team
  if (isAuthenticated && (!hasClubs || (hasClubs && !hasTeams) || !currentTeam)) {
    return (
      <div className="space-y-4">
        <TeamManagement setView={setView} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAuthenticated && currentTeam && (
        <div className="p-3 bg-sky-600/20 border border-sky-500 rounded-lg">
          <div className="text-sky-200 font-medium">Team: {currentTeam.club?.name} {currentTeam.name}</div>
          {playerSyncStatus.loading && (
            <div className="text-sky-300 text-sm mt-1">
              🔄 {playerSyncStatus.message}
            </div>
          )}
          {!playerSyncStatus.loading && playerSyncStatus.message && (
            <div className="text-sky-300 text-sm mt-1">
              {playerSyncStatus.message}
            </div>
          )}
        </div>
      )}
      
      {/* Pending Match Error Display */}
      {pendingMatchError && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <div className="text-red-300 font-medium text-sm">Failed to Check Pending Matches</div>
              <div className="text-red-200 text-sm mt-1">
                {pendingMatchError.message}
              </div>
              {process.env.NODE_ENV === 'development' && pendingMatchError.detail && (
                <div className="text-red-400 text-xs mt-1 font-mono">
                  {pendingMatchError.detail}
                </div>
              )}
              {pendingMatchError.canRetry && (
                <div className="mt-2">
                  <Button
                    onClick={retryLoadPendingMatches}
                    variant="outline"
                    size="sm"
                    disabled={pendingMatchLoading}
                    className="text-red-300 border-red-500/50 hover:bg-red-500/20"
                  >
                    {pendingMatchLoading ? 'Retrying...' : 'Try Again'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cloud Data Sync Section */}
      {isAuthenticated ? (
        <div className="space-y-3">
          {/* Data Migration Alert */}
          {showMigration && (
            <div className="p-4 bg-emerald-900/30 border border-emerald-600/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-300 text-sm">Migrate Local Data</h3>
                  <p className="text-emerald-200 text-sm mt-1">
                    We found match history saved locally. Would you like to sync it to your cloud account?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={handleMigrateData}
                      variant="primary"
                      size="sm"
                      disabled={syncStatus.loading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {syncStatus.loading ? 'Migrating...' : 'Migrate Data'}
                    </Button>
                    <Button
                      onClick={handleDismissMigration}
                      variant="secondary"
                      size="sm"
                      disabled={syncStatus.loading}
                    >
                      Later
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status Messages */}
          {syncStatus.message && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-600 rounded-lg">
              <p className="text-emerald-200 text-sm">✓ {syncStatus.message}</p>
            </div>
          )}

          {syncStatus.error && (
            <div className="p-3 bg-rose-900/20 border border-rose-600 rounded-lg">
              <p className="text-rose-200 text-sm">❌ {syncStatus.error}</p>
            </div>
          )}

          {/* Save Configuration Status Messages */}
          {saveConfigStatus.message && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-600 rounded-lg">
              <p className="text-emerald-200 text-sm">{saveConfigStatus.message}</p>
            </div>
          )}

          {saveConfigStatus.error && (
            <div className="p-3 bg-rose-900/20 border border-rose-600 rounded-lg">
              <p className="text-rose-200 text-sm">❌ {saveConfigStatus.error}</p>
            </div>
          )}
        </div>
      ) : (
        /* Cloud Sync Features for Anonymous Users */
        <FeatureGate
          feature="cloud synchronization"
          description="Save your team, configurations and match data. Access your data from any device and unlock season statistics."
          variant="inline"
          authModal={authModal}
        >
          <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg opacity-50">
            <div className="flex items-center space-x-3">
              <Cloud className="w-8 h-8 text-slate-400" />
              <div>
                <div className="text-slate-300 font-medium">Cloud Sync Available</div>
                <div className="text-slate-400 text-sm">Keep your data safe across devices</div>
              </div>
            </div>
          </div>
        </FeatureGate>
      )}

      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Settings className="mr-2 h-6 w-6" />Game & Squad Configuration
      </h2>

      {/* Squad Selection */}
      <div className="p-3 bg-slate-700 rounded-md">
        <h3 className="text-base font-medium text-sky-200 mb-2">
          {hasNoTeamPlayers 
            ? "Add Players to Your Team" 
            : `Select Squad (5-15 Players) - Selected: ${selectedSquadIds.length}`
          }
        </h3>
        {hasNoTeamPlayers ? (
          <div className="text-center py-8">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-lg font-medium text-slate-300 mb-2">No Players Added Yet</p>
            <p className="text-sm text-slate-400 mb-4">
              Your team roster is empty. Add players to start setting up your game.
            </p>
            <div className="flex justify-center">
              <Button
                onClick={() => setView(VIEWS.TEAM_MANAGEMENT)}
                variant="primary"
                Icon={UserPlus}
              >
                Add Players
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {playersToShow.map(player => (
              <label key={player.id} className={`flex items-center space-x-2 p-1.5 rounded-md cursor-pointer transition-all ${selectedSquadIds.includes(player.id) ? 'bg-sky-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
                <input
                  type="checkbox"
                  checked={selectedSquadIds.includes(player.id)}
                  onChange={() => togglePlayerSelection(player.id)}
                  className="form-checkbox h-5 w-5 text-sky-500 bg-slate-800 border-slate-500 rounded focus:ring-sky-400"
                  disabled={selectedSquadIds.length >= 15 && !selectedSquadIds.includes(player.id)}
                />
                <span>{formatPlayerName(player)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Match Details */}
      <div className="p-3 bg-slate-700 rounded-md space-y-4">
        <div>
          <label htmlFor="opponentTeam" className="block text-sm font-medium text-sky-200 mb-1">Opponent Team Name</label>
          <Input
            id="opponentTeam"
            value={opponentTeam}
            onChange={e => handleOpponentTeamChange(e.target.value)}
            placeholder="Enter opponent team name (optional)"
            maxLength={50}
          />
        </div>

        <div>
          <label htmlFor="matchType" className="block text-sm font-medium text-sky-200 mb-1">Match Type</label>
          <Select
            id="matchType"
            value={matchType}
            onChange={handleMatchTypeChange}
            options={MATCH_TYPE_OPTIONS.map(option => ({
              value: option.value,
              label: option.label
            }))}
          />
        </div>

        <div>
          <label htmlFor="venueType" className="block text-sm font-medium text-sky-200 mb-1">Venue</label>
          <Select
            id="venueType"
            value={venueType}
            onChange={handleVenueTypeChange}
            options={VENUE_TYPE_OPTIONS.map(option => ({
              value: option.value,
              label: option.label
            }))}
          />
        </div>
      </div>

      {/* Game Settings */}
      <div className="p-3 bg-slate-700 rounded-md grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="numPeriods" className="block text-sm font-medium text-sky-200 mb-1">Number of Periods</label>
          <Select value={numPeriods} onChange={value => setNumPeriods(Number(value))} options={PERIOD_OPTIONS} id="numPeriods" />
        </div>
        <div>
          <label htmlFor="periodDuration" className="block text-sm font-medium text-sky-200 mb-1">Period Duration (minutes)</label>
          <Select value={periodDurationMinutes} onChange={value => setPeriodDurationMinutes(Number(value))} options={DURATION_OPTIONS} id="periodDuration" />
        </div>
        <div>
          <label htmlFor="alertMinutes" className="block text-sm font-medium text-sky-200 mb-1">Substitution Alert</label>
          <Select value={alertMinutes} onChange={value => setAlertMinutes(Number(value))} options={ALERT_OPTIONS} id="alertMinutes" />
        </div>
      </div>

      <div className="p-3 bg-slate-700 rounded-md">
        <h3 className="text-base font-medium text-sky-200 mb-2 flex items-center">
          <Layers className="mr-2 h-4 w-4" />
          Match Format & Formation
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="matchFormat" className="block text-sm font-medium text-sky-200 mb-1">Match Format</label>
            <Select
              id="matchFormat"
              value={currentFormat}
              onChange={value => handleFormatChange(value)}
              options={Object.values(FORMATS).map(format => ({
                value: format,
                label: FORMAT_CONFIGS[format]?.label || format
              }))}
            />
          </div>

          {selectedSquadIds.length >= 5 && selectedSquadIds.length <= 15 ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="formation" className="block text-sm font-medium text-sky-200 mb-1">
                  Tactical Formation
                </label>
                <Select
                  id="formation"
                  value={selectedFormation}
                  onChange={value => handleFormationChange(value)}
                  options={getValidFormations(currentFormat, selectedSquadIds.length).map(formation => ({
                    value: formation,
                    label: FORMATION_DEFINITIONS[formation].label
                  }))}
                />
              </div>

              <FormationPreview formation={selectedFormation} className="mt-3" />
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Add between 5 and 15 players to configure a tactical formation.
            </p>
          )}
        </div>
      </div>

      {/* Substitution Mode Selection - only when format supports pairs */}
      {teamConfig?.format === FORMATS.FORMAT_5V5 && selectedSquadIds.length === 7 && selectedFormation === FORMATIONS.FORMATION_2_2 && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">Substitution Mode</h3>
          <div className="space-y-3">
            {/* Individual Option */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="substitutionMode"
                value={SUBSTITUTION_TYPES.INDIVIDUAL}
                checked={teamConfig?.substitutionType === SUBSTITUTION_TYPES.INDIVIDUAL}
                onChange={e => handleSubstitutionModeChange(e.target.value)}
                className="form-radio h-4 w-4 text-sky-500 bg-slate-800 border-slate-500 focus:ring-sky-400"
              />
              <div>
                <span className="text-sky-100 font-medium">Individual</span>
                <p className="text-xs text-slate-400">Individual positions with 2 substitutes. Dual next/next-next visual indicators.</p>
              </div>
            </label>

            {/* Pairs Option */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="substitutionMode"
                  value={SUBSTITUTION_TYPES.PAIRS}
                  checked={teamConfig?.substitutionType === SUBSTITUTION_TYPES.PAIRS}
                  onChange={e => handleSubstitutionModeChange(e.target.value)}
                  className="form-radio h-4 w-4 text-sky-500 bg-slate-800 border-slate-500 focus:ring-sky-400"
                />
                <div>
                  <span className="text-sky-100 font-medium">Pairs</span>
                  <p className="text-xs text-slate-400">Players organized in defender-attacker pairs. Substitutions happen at pair level.</p>
                </div>
              </label>

              {/* Pair Role Rotation Sub-options - Only show when Pairs is selected */}
              {teamConfig?.substitutionType === SUBSTITUTION_TYPES.PAIRS && (
                <div className="ml-6 mt-3 space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-sky-100">Role Rotation:</span>
                    <button
                      type="button"
                      onClick={() => setIsPairRoleHelpModalOpen(true)}
                      className="text-slate-400 hover:text-sky-300 transition-colors"
                      title="Learn about pair role rotation options"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </div>
                  {Object.entries(PAIR_ROLE_ROTATION_DEFINITIONS).map(([value, definition]) => (
                    <label key={value} className="flex items-start space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pairRoleRotation"
                        value={value}
                        checked={teamConfig?.pairRoleRotation === value}
                        onChange={e => handlePairRoleRotationChange(e.target.value)}
                        className="form-radio h-4 w-4 text-sky-500 bg-slate-800 border-slate-500 focus:ring-sky-400 mt-0.5"
                      />
                      <div>
                        <span className="text-sky-50 text-sm font-medium">{definition.label}</span>
                        <p className="text-xs text-slate-300">{definition.shortDescription}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Goalie Assignment */}
      {(selectedSquadIds.length >= 5 && selectedSquadIds.length <= 15) && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">Assign Goalies</h3>
          <div className="space-y-2">
            {Array.from({ length: numPeriods }, (_, i) => i + 1).map(period => (
              <div key={period}>
                <label htmlFor={`goalie_p${period}`} className="block text-sm font-medium text-sky-200 mb-1">Period {period} Goalie</label>
                <Select
                  id={`goalie_p${period}`}
                  value={periodGoalieIds[period] || ""}
                  onChange={value => handleGoalieChange(period, value)}
                  options={selectedSquadPlayers.map(p => ({ value: p.id, label: formatPlayerName(p) }))}
                  placeholder="Select Goalie"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Captain Assignment */}
      {selectedSquadIds.length >= 5 && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">Assign Captain</h3>
          <div>
            <label htmlFor="captain" className="block text-sm font-medium text-sky-200 mb-1">Team Captain</label>
            <Select
              id="captain"
              value={captainId || ""}
              onChange={value => handleCaptainChange(value)}
              options={[
                { value: "", label: "No Captain" },
                ...selectedSquadPlayers.map(p => ({ value: p.id, label: formatPlayerName(p) }))
              ]}
            />
            <p className="text-xs text-slate-400 mt-1">Optional - select a team captain for this game</p>
          </div>
        </div>
      )}

      {/* Save Configuration Button - Only show for authenticated users with team context */}
      {isAuthenticated && currentTeam && handleSaveConfiguration && (
        <Button 
          onClick={handleSaveConfigClick}
          disabled={saveConfigStatus.loading || (selectedSquadIds.length < 5 || selectedSquadIds.length > 10) || !Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean)}
          variant="secondary"
          Icon={Save}
        >
          {saveConfigStatus.loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      )}

      <Button 
        onClick={handleStartPeriodSetup} 
        disabled={(selectedSquadIds.length < 5 || selectedSquadIds.length > 10) || !Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean)} 
        Icon={Play}
      >
        Proceed to Period Setup
      </Button>

      {/* Debug Mode Randomize Button */}
      {debugMode && (
        <Button 
          onClick={randomizeConfiguration} 
          variant="warning"
          Icon={Shuffle}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          🎲 Randomize Configuration (Debug)
        </Button>
      )}

      <FeatureVoteModal
        isOpen={isVoteModalOpen}
        onClose={() => {
          setIsVoteModalOpen(false);
          setFormationToVoteFor(null);
          clearVoteMessages();
        }}
        onConfirm={handleVoteConfirm}
        featureName={formationToVoteFor}
        loading={voteLoading}
        error={voteError}
        successMessage={voteSuccessMessage}
        infoMessage={voteInfoMessage}
        isAuthenticated={isVoteAuthenticated}
        authModal={authModal}
      >
        <p>Only the 2-2 and 1-2-1 formations are currently implemented. By voting, you help us prioritize which formations to build next. Only one vote per user per formation will be counted.</p>
      </FeatureVoteModal>

      <PairRoleRotationHelpModal
        isOpen={isPairRoleHelpModalOpen}
        onClose={() => setIsPairRoleHelpModalOpen(false)}
      />
      
      {/* Direct Pending Match Resume Modal (no navigation complexity) */}
      <PendingMatchResumeModal
        isOpen={showPendingMatchModal}
        onResume={handleResumePendingMatch}
        onDiscard={handleDiscardPendingMatch}
        onClose={handleClosePendingMatchModal}
        pendingMatches={pendingMatches}
        isLoading={pendingMatchLoading}
      />
    </div>
  );
}
