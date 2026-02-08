import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, Play, ArrowLeft, Shuffle, Save } from 'lucide-react';
import { Select, Button, ConfirmationModal } from '../shared/UI';
import { getPlayerLabel } from '../../utils/formatUtils';
import { scrollToTopSmooth } from '../../utils/scrollUtils';
import { getPlayerDisplayName as getPlayerDisplayNameUtil, getPlayerDisplayNameById as getPlayerDisplayNameByIdUtil } from '../../utils/playerUtils';
import { randomizeFormationPositions } from '../../utils/debugUtils';
import { getOutfieldPositions, getModeDefinition } from '../../constants/gameModes';
import { TEAM_CONFIG } from '../../constants/teamConstants';
import { POSITION_CONFIG } from '../../constants/positionConfig';
import { useTeam } from '../../contexts/TeamContext';
import { calculatePositionRecommendations } from '../../game/logic/positionRecommendations';
import { PositionRecommendationCard } from './PositionRecommendationCard';
import { usePlayerRecommendationData } from '../../hooks/usePlayerRecommendationData';
import { groupFieldPositionsByRole } from '../../utils/positionDisplayOrder';
import { PLAYER_ROLES } from '../../constants/playerConstants';
import { useTranslation } from 'react-i18next';

const humanizePositionKey = (positionKey) => {
  return positionKey
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
};

const getPositionConfig = (positionKey) => {
  const presetConfig = POSITION_CONFIG[positionKey];
  if (presetConfig) {
    return presetConfig;
  }

  if (positionKey.startsWith('substitute_')) {
    // Note: useTranslation not available in helper function - component handles translation
    return { title: 'Substitute', position: positionKey };
  }

  return { title: humanizePositionKey(positionKey), position: positionKey };
};

/**
 * Translate a position key to a localized display name
 * Falls back to the config title if no translation key exists
 */
function getTranslatedPositionTitle(position, config, t) {
  // Use a normalized key: strip numeric suffixes from substitute positions
  const normalizedKey = position.startsWith('substitute_') ? 'substitute' : position;
  const translationKey = `periodSetup.positions.${normalizedKey}`;
  const translated = t(translationKey, { defaultValue: '' });
  return translated || config.title;
}

const ROLE_GROUP_KEYS = {
  [PLAYER_ROLES.ATTACKER]: 'offence',
  [PLAYER_ROLES.MIDFIELDER]: 'midfield',
  [PLAYER_ROLES.DEFENDER]: 'defence'
};

function GroupedPositionCards({ fieldGroups, substitutePositions, formation, onPlayerAssign, getAvailableOptions, currentPeriodNumber, t }) {
  return (
    <>
      {fieldGroups.map(({ role, positions }) => {
        const groupKey = ROLE_GROUP_KEYS[role];
        const groupLabel = t(`periodSetup.roleGroups.${groupKey}`);

        return (
          <div key={role} className="p-2 bg-sky-700 rounded-md space-y-1.5">
            <h3 className="text-sm font-medium text-sky-200">{groupLabel}</h3>
            {positions.map(position => {
              const config = getPositionConfig(position);
              const displayTitle = getTranslatedPositionTitle(position, config, t);
              const availableOptions = getAvailableOptions(config.position);

              return (
                <div key={position} className="flex items-center gap-2">
                  <span className="text-xs text-sky-300 w-16 shrink-0">{displayTitle}</span>
                  <div className="flex-1">
                    <Select
                      value={formation[position] || ""}
                      onChange={value => onPlayerAssign(config.position, value)}
                      options={availableOptions.map(p => ({ value: p.id, label: getPlayerLabel(p, currentPeriodNumber) }))}
                      placeholder={t('periodSetup.fallbacks.selectPosition', { title: displayTitle })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {substitutePositions.length > 0 && (
        <div className="p-2 bg-slate-700 rounded-md space-y-1.5">
          <h3 className="text-sm font-medium text-slate-200">{t('periodSetup.roleGroups.substitutes')}</h3>
          {substitutePositions.map(position => {
            const config = getPositionConfig(position);
            const displayTitle = getTranslatedPositionTitle(position, config, t);
            const availableOptions = getAvailableOptions(config.position);

            return (
              <div key={position}>
                <Select
                  value={formation[position] || ""}
                  onChange={value => onPlayerAssign(config.position, value)}
                  options={availableOptions.map(p => ({ value: p.id, label: getPlayerLabel(p, currentPeriodNumber) }))}
                  placeholder={t('periodSetup.fallbacks.selectPosition', { title: displayTitle })}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function PeriodSetupScreen({
  currentPeriodNumber,
  formation,
  setFormation,
  availableForAssignment,
  allPlayers,
  setAllPlayers,
  handleStartGame,
  gameLog,
  selectedSquadPlayers,
  periodGoalieIds,
  setPeriodGoalieIds,
  numPeriods,
  teamConfig,
  selectedFormation,
  onNavigateBack,
  pushNavigationState,
  removeFromNavigationStack,
  ownScore,
  opponentScore,
  opponentTeam,
  ownTeamName = TEAM_CONFIG.OWN_TEAM_NAME,
  rotationQueue,
  setRotationQueue,
  preparePeriodWithGameLog,
  handleSavePeriodConfiguration,
  matchState,
  debugMode = false,
  resumeFormationData = null
}) {
  const { currentTeam, loadTeamPreferences } = useTeam();
  const { t } = useTranslation('configuration');

  // Unified recommendation state
  const [recommendationState, setRecommendationState] = useState({
    // Substitute recommendations
    subHandled: false,
    subPercentages: {},
    subError: null,

    // Position recommendations
    positionHandled: false,
    positionData: null,
    positionError: null
  });

  // Use custom hook for data fetching (eliminates duplicate getPlayerStats calls)
  const { playerStats, loading: statsLoading, error: statsError } = usePlayerRecommendationData(
    currentTeam?.id,
    currentPeriodNumber,
    selectedSquadPlayers
  );
  const modeDefinition = useMemo(() => getModeDefinition(teamConfig), [teamConfig]);
  const openSubstituteSlotCount = useMemo(() => {
    if (!teamConfig) return 0;

    if (!modeDefinition) {
      return 0;
    }

    const substitutePositions = modeDefinition.substitutePositions || [];
    return substitutePositions.reduce((count, position) => {
      return !formation?.[position] ? count + 1 : count;
    }, 0);
  }, [teamConfig, formation, modeDefinition]);
  const substituteRecommendations = useMemo(() => {
    if (currentPeriodNumber !== 1) return [];
    if (!Array.isArray(selectedSquadPlayers)) return [];
    const goalieId = formation?.goalie;
    const substitutePositions = modeDefinition?.substitutePositions || [];

    return [...selectedSquadPlayers]
      .filter(player => {
        if (!player?.id || player.id === goalieId) {
          return false;
        }

        return !substitutePositions.some(position => formation?.[position] === player.id);
      })
      .map(player => ({
        id: player.id,
        displayName: player.displayName,
        percentStartedAsSub: typeof recommendationState.subPercentages[player.id] === 'number'
          ? recommendationState.subPercentages[player.id]
          : 0
      }))
      .sort((a, b) => {
        if (a.percentStartedAsSub === b.percentStartedAsSub) {
          const aName = a.displayName || '';
          const bName = b.displayName || '';
          return aName.localeCompare(bName);
        }
        return a.percentStartedAsSub - b.percentStartedAsSub;
      });
  }, [
    currentPeriodNumber,
    selectedSquadPlayers,
    formation,
    recommendationState.subPercentages,
    modeDefinition
  ]);
  const displayedSubstituteRecommendations = useMemo(() => {
    if (openSubstituteSlotCount <= 0) return [];
    return substituteRecommendations.slice(0, openSubstituteSlotCount);
  }, [substituteRecommendations, openSubstituteSlotCount]);
  const formatSubstitutePercentage = (value) => {
    const numericValue = Number.isFinite(value) ? value : 0;
    return `${numericValue.toFixed(1)}%`;
  };
  const shouldShowRecommendations = currentPeriodNumber === 1 && openSubstituteSlotCount > 0 && !recommendationState.subHandled;

  const shouldShowPositionRecommendations = useMemo(() => {
    // Check if formation is complete (inline to avoid dependency issues)
    const outfieldPositions = getOutfieldPositions(teamConfig);
    const outfielders = outfieldPositions.map(pos => formation[pos]).filter(Boolean);
    const expectedCount = outfieldPositions.length;
    const isComplete = formation.goalie && outfielders.length === expectedCount && new Set(outfielders).size === expectedCount;

    const conditions = {
      isPeriod1: currentPeriodNumber === 1,
      subHandled: recommendationState.subHandled,
      notYetHandled: !recommendationState.positionHandled,
      hasRecommendations: !!recommendationState.positionData,
      formationIncomplete: !isComplete
    };

    const shouldShow = conditions.isPeriod1 &&
                       conditions.subHandled &&
                       conditions.notYetHandled &&
                       conditions.hasRecommendations &&
                       conditions.formationIncomplete;

    return shouldShow;
  }, [
    currentPeriodNumber,
    recommendationState.subHandled,
    recommendationState.positionHandled,
    recommendationState.positionData,
    formation,
    teamConfig
  ]);

  const fieldGroups = useMemo(() => {
    return groupFieldPositionsByRole(modeDefinition?.fieldPositions || []);
  }, [modeDefinition]);

  const substitutePositions = modeDefinition?.substitutePositions || [];
  
  // Flag to track when we're replacing an inactive goalie (vs active goalie)
  const [isReplacingInactiveGoalie, setIsReplacingInactiveGoalie] = useState(false);
  
  // Save period configuration status
  const [savePeriodConfigStatus, setSavePeriodConfigStatus] = useState({ loading: false, message: '', error: null });
  
  // Confirmation modal state for inactive player selection
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    type: 'direct', // 'direct', 'indirect', 'inactive-goalie', 'recommendation-rerun'
    playerName: '',
    playerId: '',
    position: '',
    role: '',
    originalValue: '', // To restore dropdown if cancelled
    // For indirect swaps
    swapDetails: null, // Contains swap information for indirect scenarios
    // For recommendation re-run
    newGoalieId: null,
    formerGoalieId: null
  });
  
  useEffect(() => {
    scrollToTopSmooth();
  }, []);

  // Browser back integration
  useEffect(() => {
    if (pushNavigationState) {
      pushNavigationState(() => {
        // Close any open confirmation modals
        setConfirmationModal({
          isOpen: false,
          type: 'direct',
          playerName: '',
          playerId: '',
          position: '',
          role: '',
          originalValue: '',
          swapDetails: null
        });

        // Navigate back
        onNavigateBack();
      });
    }

    return () => {
      if (removeFromNavigationStack) {
        removeFromNavigationStack();
      }
    };
  }, [pushNavigationState, removeFromNavigationStack, onNavigateBack]);

  const recommendationDependenciesRef = useRef({
    teamId: null,
    period: null,
    signature: null,
    openSlotCount: null
  });
  const recommendationInputsRef = useRef({
    statsSignature: null,
    formationSignature: null
  });

  // Unified recommendation calculation effect
  // Uses playerStats from custom hook (eliminating duplicate API calls)
  useEffect(() => {
    // Only run for Period 1 with a valid team
    if (currentPeriodNumber !== 1 || !currentTeam?.id) {
      return;
    }

    // Reset recommendations when formation/squad changes
    const teamId = currentTeam.id;
    const signature = Array.isArray(selectedSquadPlayers)
      ? selectedSquadPlayers
          .map(player => player?.id)
          .filter(Boolean)
          .sort()
          .join('|')
      : '';

    const depsChanged =
      recommendationDependenciesRef.current.teamId !== teamId ||
      recommendationDependenciesRef.current.period !== currentPeriodNumber ||
      recommendationDependenciesRef.current.signature !== signature;

    if (depsChanged) {
      recommendationDependenciesRef.current = {
        teamId,
        period: currentPeriodNumber,
        signature
      };
      recommendationInputsRef.current = {
        statsSignature: null,
        formationSignature: null
      };

      // Reset both recommendation states when dependencies change
      setRecommendationState({
        subHandled: false,
        subPercentages: {},
        subError: null,
        positionHandled: false,
        positionData: null,
        positionError: null
      });
    }

    if (statsError) {
      setRecommendationState(prev => ({
        ...prev,
        subPercentages: {},
        subError: statsError,
        positionData: null,
        positionError: statsError
      }));
      return;
    }

    if (!playerStats) {
      return;
    }

    const statsSignature = Array.isArray(playerStats)
      ? [...playerStats]
          .filter(playerStat => playerStat?.id)
          .map(playerStat => `${playerStat.id}:${Number.isFinite(playerStat.percentStartedAsSubstitute) ? playerStat.percentStartedAsSubstitute : 0}`)
          .sort()
          .join('|')
      : '';
    const formationSignature = formation
      ? Object.keys(formation)
          .sort()
          .map(key => `${key}:${formation[key] || ''}`)
          .join('|')
      : '';
    const inputsChanged =
      recommendationInputsRef.current.statsSignature !== statsSignature ||
      recommendationInputsRef.current.formationSignature !== formationSignature;

    if (!inputsChanged) {
      return;
    }

    recommendationInputsRef.current = {
      statsSignature,
      formationSignature
    };

    let isActive = true;

    const calculateRecommendations = async () => {
      try {
        // 1. Calculate substitute recommendations from playerStats
        const subPercentageMap = {};
        playerStats.forEach(playerStat => {
          if (playerStat?.id) {
            subPercentageMap[playerStat.id] =
              typeof playerStat.percentStartedAsSubstitute === 'number'
                ? playerStat.percentStartedAsSubstitute
                : 0;
          }
        });

        if (!isActive) return;

        setRecommendationState(prev => ({
          ...prev,
          subPercentages: subPercentageMap,
          subError: null
        }));

        // 2. Calculate position recommendations (if alternateRoles enabled)
        const teamPreferences = await loadTeamPreferences(currentTeam.id);

        if (!isActive) return;

        let positionRecsData = null;
        if (teamPreferences?.alternateRoles !== false) {
          // Filter to only selected squad players
          const squadPlayerIds = new Set(
            selectedSquadPlayers.map(p => p.id).filter(Boolean)
          );
          const squadPlayerStats = playerStats.filter(p => squadPlayerIds.has(p.id));

          // Get currently assigned substitute IDs
          const assignedSubstituteIds = modeDefinition?.substitutePositions
            ?.map(pos => formation?.[pos])
            ?.filter(Boolean) || [];

          // Calculate position recommendations
          positionRecsData = calculatePositionRecommendations(
            squadPlayerStats,
            formation,
            teamConfig,
            formation?.goalie,
            assignedSubstituteIds
          );
        }

        if (!isActive) return;

        // Update state with BOTH recommendation types
        setRecommendationState(prev => ({
          ...prev,
          subPercentages: subPercentageMap,
          subError: null,
          positionData: positionRecsData,
          positionError: null
        }));

      } catch (error) {
        if (!isActive) return;

        setRecommendationState(prev => ({
          ...prev,
          subPercentages: {},
          subError: error.message || t('periodSetup.substituteRecommendations.error'),
          positionData: null,
          positionError: error.message || t('positionRecommendations.error')
        }));
      }
    };

    calculateRecommendations();

    return () => {
      isActive = false;
    };
  }, [
    currentPeriodNumber,
    playerStats,
    statsError,
    currentTeam?.id,
    selectedSquadPlayers,
    formation,
    teamConfig,
    modeDefinition,
    loadTeamPreferences,
    t
  ]);

  const handleDismissSubRecommendations = useCallback(() => {
    setRecommendationState(prev => ({ ...prev, subHandled: true }));
  }, []);

  const handleAcceptSubRecommendations = useCallback(() => {
    if (displayedSubstituteRecommendations.length === 0) {
      setRecommendationState(prev => ({ ...prev, subHandled: true }));
      return;
    }

    if (modeDefinition) {
      setFormation(prev => {
        const substitutePositions = (modeDefinition.substitutePositions || []).filter(position => !prev[position]);
        if (substitutePositions.length === 0) {
          return prev;
        }

        const playersToAssign = displayedSubstituteRecommendations.slice(0, substitutePositions.length);
        const recommendedIds = new Set(playersToAssign.map(player => player.id));
        const updatedFormation = { ...prev };
        const fieldPositions = modeDefinition.fieldPositions || [];

        fieldPositions.forEach(position => {
          if (recommendedIds.has(updatedFormation[position])) {
            updatedFormation[position] = null;
          }
        });

        substitutePositions.forEach((position, index) => {
          const recommendation = playersToAssign[index];
          if (recommendation) {
            updatedFormation[position] = recommendation.id;
          }
        });

        return updatedFormation;
      });
    }

    setRecommendationState(prev => ({ ...prev, subHandled: true }));
  }, [displayedSubstituteRecommendations, modeDefinition, setFormation]);

  const handleAcceptPositionRecommendations = useCallback(() => {
    if (!recommendationState.positionData?.recommendations) {
      setRecommendationState(prev => ({ ...prev, positionHandled: true }));
      return;
    }

    setFormation(prev => {
      const updated = { ...prev };

      // Apply all recommended position assignments
      Object.entries(recommendationState.positionData.recommendations).forEach(([position, data]) => {
        if (data?.playerId) {
          updated[position] = data.playerId;
        }
      });

      return updated;
    });

    setRecommendationState(prev => ({ ...prev, positionHandled: true }));
  }, [recommendationState.positionData, setFormation]);

  const handleDismissPositionRecommendations = useCallback(() => {
    setRecommendationState(prev => ({ ...prev, positionHandled: true }));
  }, []);

  // Handle resume formation data from pending match
  useEffect(() => {
    if (resumeFormationData) {
      setFormation(resumeFormationData);
    }
  }, [resumeFormationData, setFormation]);

  // Detect if pre-selected goalie is inactive (for periods 2+)
  useEffect(() => {
    if (formation.goalie && currentPeriodNumber > 1) {
      const goaliePlayer = allPlayers.find(p => p.id === formation.goalie);
      if (goaliePlayer?.stats?.isInactive && !isReplacingInactiveGoalie) {
        // Auto-trigger confirmation modal for inactive goalie (only if not already in replacement process)
        setConfirmationModal({
          isOpen: true,
          type: 'inactive-goalie',
          playerName: getPlayerDisplayNameUtil(goaliePlayer),
          playerId: goaliePlayer.id,
          position: 'goalie',
          role: '',
          originalValue: formation.goalie,
          swapDetails: null
        });
      }
    }
  }, [formation.goalie, allPlayers, currentPeriodNumber, isReplacingInactiveGoalie]);

  // Helper function to check if a player is inactive
  const isPlayerInactive = (playerId) => {
    const player = allPlayers.find(p => p.id === playerId);
    return player?.stats?.isInactive || false;
  };

  // Helper function to check if a position is a field position (not substitute)
  const isFieldPosition = (position, role = null) => {
    // Handle both 2-2 and 1-2-1 formation field positions
    return position === 'leftDefender' || position === 'rightDefender' ||
           position === 'leftAttacker' || position === 'rightAttacker' ||
           position === 'defender' || position === 'left' || position === 'right' || position === 'attacker' ||
           position === 'leftMidfielder' || position === 'rightMidfielder' || position === 'centerMidfielder';
  };

  // Helper function to find where a player is currently positioned
  const findPlayerCurrentPosition = (playerId) => {
    const positions = getOutfieldPositions(teamConfig);
    for (const position of positions) {
      if (formation[position] === playerId) {
        return { position };
      }
    }
    return null;
  };

  // Helper function to detect if a swap would place an inactive player in a field position
  const wouldPlaceInactivePlayerInFieldPosition = (selectedPlayerId, targetPosition, targetRole = null) => {
    // If target is a field position, this is direct selection (already handled)
    if (isFieldPosition(targetPosition, targetRole)) {
      return null;
    }

    // Find where the selected player currently is
    const currentPlayerPosition = findPlayerCurrentPosition(selectedPlayerId);
    if (!currentPlayerPosition || !isFieldPosition(currentPlayerPosition.position, currentPlayerPosition.role)) {
      return null; // Selected player is not in a field position
    }

    // Find who is currently in the target position (substitute position)
    const displacedPlayerId = formation[targetPosition];

    // Check if the displaced player is inactive
    if (displacedPlayerId && isPlayerInactive(displacedPlayerId)) {
      const displacedPlayer = allPlayers.find(p => p.id === displacedPlayerId);
      return {
        displacedPlayerId,
        displacedPlayerName: getPlayerDisplayNameUtil(displacedPlayer),
        selectedPlayerId,
        targetPosition,
        targetRole,
        fieldPosition: currentPlayerPosition.position,
        fieldRole: currentPlayerPosition.role
      };
    }

    return null;
  };

  // Helper function to show confirmation modal for inactive player (direct selection)
  const showInactivePlayerConfirmation = (playerName, playerId, position, role = '', originalValue = '') => {
    setConfirmationModal({
      isOpen: true,
      type: 'direct',
      playerName,
      playerId,
      position,
      role,
      originalValue,
      swapDetails: null
    });
  };

  // Helper function to show confirmation modal for indirect inactive player displacement
  const showIndirectInactivePlayerConfirmation = (swapInfo, originalValue = '') => {
    setConfirmationModal({
      isOpen: true,
      type: 'indirect',
      playerName: swapInfo.displacedPlayerName,
      playerId: swapInfo.displacedPlayerId, // The inactive player being displaced
      position: swapInfo.targetPosition,
      role: swapInfo.targetRole,
      originalValue,
      swapDetails: swapInfo
    });
  };

  // Helper function to activate player and complete assignment
  const activatePlayerAndAssign = () => {
    const { type, playerId, position, swapDetails } = confirmationModal;

    // Activate the player (for direct, indirect, and inactive-goalie scenarios)
    setAllPlayers(prevPlayers =>
      prevPlayers.map(player => {
        if (player.id === playerId) {
          return {
            ...player,
            stats: {
              ...player.stats,
              isInactive: false
            }
          };
        }
        return player;
      })
    );

    // Complete the assignment based on type
    if (type === 'direct') {
      // Direct assignment - assign the selected player to the position
      originalHandleIndividualPlayerAssignment(position, playerId);
    } else if (type === 'indirect' && swapDetails) {
      // Indirect assignment - execute the swap that caused the displacement
      originalHandleIndividualPlayerAssignment(position, swapDetails.selectedPlayerId);
    } else if (type === 'inactive-goalie') {
      // Inactive goalie - player is already activated above, formation.goalie is already set
      // No additional assignment needed - just keep the current goalie selection
    } else if (type === 'recommendation-rerun') {
      // Re-run recommendations with new goalie
      const { newGoalieId, formerGoalieId } = confirmationModal;

      // First perform the goalie change
      performGoalieChange(newGoalieId, formerGoalieId);

      // Then re-run recommendations with the new goalie
      if (preparePeriodWithGameLog && gameLog.length > 0) {
        // Update the period goalie IDs first so recommendations use the new goalie
        setPeriodGoalieIds(prev => {
          const updatedIds = { ...prev, [currentPeriodNumber]: newGoalieId };

          // Use setTimeout to ensure state update is applied before re-running recommendations
          setTimeout(() => {
            preparePeriodWithGameLog(currentPeriodNumber, gameLog, newGoalieId);
          }, 10);

          return updatedIds;
        });
      }
    }

    // Close the modal
    setConfirmationModal({
      isOpen: false,
      type: 'direct',
      playerName: '',
      playerId: '',
      position: '',
      role: '',
      originalValue: '',
      swapDetails: null
    });
  };

  // Helper function to cancel inactive player assignment
  const cancelInactivePlayerAssignment = () => {
    const { type, position, originalValue } = confirmationModal;

    if (type === 'inactive-goalie') {
      // For inactive goalie, clear the goalie selection and set flag for auto-recommendations
      setIsReplacingInactiveGoalie(true);
      setFormation(prev => ({
        ...prev,
        goalie: null
      }));
    } else if (type === 'recommendation-rerun') {
      // For recommendation re-run, just perform the goalie change without re-running recommendations
      const { newGoalieId, formerGoalieId } = confirmationModal;
      performGoalieChange(newGoalieId, formerGoalieId);
    } else {
      // For other types, restore the original dropdown value
      setFormation(prev => ({
        ...prev,
        [position]: originalValue
      }));
    }

    // Close the modal
    setConfirmationModal({
      isOpen: false,
      type: 'direct',
      playerName: '',
      playerId: '',
      position: '',
      role: '',
      originalValue: '',
      swapDetails: null
    });
  };

  // Store original individual handler for use in confirmation flow
  const originalHandleIndividualPlayerAssignment = (position, playerId) => {
    // If formation is complete, allow player switching
    if (isFormationComplete() && playerId) {
      // Find where the selected player is currently assigned
      let currentPlayerPosition = null;
      getOutfieldPositions(teamConfig).forEach(pos => {
        if (formation[pos] === playerId) {
          currentPlayerPosition = pos;
        }
      });

      if (currentPlayerPosition) {
        // Get the player currently in the target position
        const currentPlayerInTargetPosition = formation[position];
        
        // Swap the players
        setFormation(prev => ({
          ...prev,
          [position]: playerId,
          [currentPlayerPosition]: currentPlayerInTargetPosition
        }));
        return;
      }
    }

    // Original logic for incomplete formation
    const otherAssignments = [];
    getOutfieldPositions(teamConfig).forEach(pos => {
      if (pos !== position && formation[pos]) {
        otherAssignments.push(formation[pos]);
      }
    });

    if (playerId && otherAssignments.includes(playerId)) {
      const duplicatePlayerName = getPlayerDisplayNameByIdUtil(allPlayers, playerId);
      alert(t('periodSetup.alerts.alreadyAssigned', { playerName: duplicatePlayerName }));
      return;
    }

    setFormation(prev => ({
      ...prev,
      [position]: playerId
    }));
  };

  // New individual handler with inactive player check
  const handleIndividualPlayerAssignment = (position, playerId) => {
    // If no player selected, proceed normally
    if (!playerId) {
      return originalHandleIndividualPlayerAssignment(position, playerId);
    }

    // Check for direct inactive player selection for field position
    if (isPlayerInactive(playerId) && isFieldPosition(position)) {
      const player = allPlayers.find(p => p.id === playerId);
      const originalValue = formation[position] || '';
      
      // Show confirmation modal for direct selection
      showInactivePlayerConfirmation(
        getPlayerDisplayNameUtil(player),
        playerId,
        position,
        '', // No role for individual mode
        originalValue
      );
      return;
    }

    // Check for indirect inactive player displacement (when formation is complete)
    if (isFormationComplete() && playerId) {
      const swapInfo = wouldPlaceInactivePlayerInFieldPosition(playerId, position);
      if (swapInfo) {
        const originalValue = formation[position] || '';
        
        // Show confirmation modal for indirect displacement
        showIndirectInactivePlayerConfirmation(swapInfo, originalValue);
        return;
      }
    }

    // Proceed with normal assignment
    originalHandleIndividualPlayerAssignment(position, playerId);
  };


  const handleGoalieChangeForCurrentPeriod = (playerId) => {
    const formerGoalieId = formation.goalie;
    
    // If no change, do nothing
    if (playerId === formerGoalieId) return;
    
    // Check if we're replacing an inactive goalie - auto-run recommendations
    if (isReplacingInactiveGoalie && currentPeriodNumber > 1 && playerId && preparePeriodWithGameLog) {
      // Reset the replacement flag first
      setIsReplacingInactiveGoalie(false);
      
      // First update periodGoalieIds so preparePeriodWithGameLog uses the new goalie
      setPeriodGoalieIds(prev => ({ ...prev, [currentPeriodNumber]: playerId }));
      
      // Perform goalie change (formerGoalieId will be null since we cleared it)
      performGoalieChange(playerId, formerGoalieId);
      
      // Auto-run recommendations with new goalie
      setTimeout(() => {
        preparePeriodWithGameLog(currentPeriodNumber, gameLog, playerId);
      }, 10);
      return;
    }
    
    // For periods 2+ with existing recommendations and active goalie, ask about re-running recommendations
    if (currentPeriodNumber > 1 && playerId && formerGoalieId && preparePeriodWithGameLog) {
      setConfirmationModal({
        isOpen: true,
        type: 'recommendation-rerun',
        playerName: getPlayerDisplayNameByIdUtil(allPlayers, playerId),
        playerId: playerId,
        position: 'goalie',
        role: '',
        originalValue: formerGoalieId,
        swapDetails: null,
        newGoalieId: playerId,
        formerGoalieId: formerGoalieId
      });
      return;
    }
    
    // Perform the goalie change immediately (for period 1 or when no recommendations exist)
    performGoalieChange(playerId, formerGoalieId);
  };

  // Helper function to perform the actual goalie change with swapping
  const performGoalieChange = (newGoalieId, formerGoalieId) => {
    // Find where the new goalie is currently positioned
    let newGoalieCurrentPosition = null;

    // Search individual mode positions
    getOutfieldPositions(teamConfig).forEach(position => {
      if (formation[position] === newGoalieId) {
        newGoalieCurrentPosition = { position };
      }
    });

    // Perform the position swap or simple assignment
    if (newGoalieCurrentPosition && formerGoalieId) {
      // Swap positions between new goalie and former goalie
      setFormation(prev => ({
        ...prev,
        goalie: newGoalieId,
        [newGoalieCurrentPosition.position]: formerGoalieId
      }));
    } else {
      // Simple assignment (new goalie not in formation or no former goalie)
      setFormation(prev => ({
        ...prev,
        goalie: newGoalieId
      }));
    }

    // Update period goalie tracking
    setPeriodGoalieIds(prev => ({ ...prev, [currentPeriodNumber]: newGoalieId }));

    // Update rotation queue for individual modes
    if (rotationQueue && rotationQueue.length > 0) {
      const newGoalieIndex = rotationQueue.findIndex(id => id === newGoalieId);

      if (newGoalieIndex !== -1) {
        const updatedQueue = [...rotationQueue];

        if (formerGoalieId) {
          // Replace new goalie with former goalie at same position
          updatedQueue[newGoalieIndex] = formerGoalieId;
        } else {
          // No former goalie, just remove new goalie from queue
          updatedQueue.splice(newGoalieIndex, 1);
        }

        setRotationQueue(updatedQueue);
      } else if (formerGoalieId) {
        // New goalie is not in queue but we had a former goalie - add former goalie to end
        const updatedQueue = [...rotationQueue, formerGoalieId];
        setRotationQueue(updatedQueue);
      }
    }
  };

  const getAvailableForIndividualSelect = (currentPosition) => {
    // If formation is complete, show all players except goalie
    if (isFormationComplete()) {
      return availableForAssignment;
    }

    // Original logic for incomplete formation - works for both 6 and 7 player modes
    const assignedElsewhereIds = new Set();
    getOutfieldPositions(teamConfig).forEach(pos => {
      if (pos !== currentPosition && formation[pos]) {
        assignedElsewhereIds.add(formation[pos]);
      }
    });
    return availableForAssignment.filter(p => !assignedElsewhereIds.has(p.id));
  };

  const isFormationComplete = () => {
    // Individual modes (6 or 7 players) - use configuration-driven validation
    const outfieldPositions = getOutfieldPositions(teamConfig);
    const outfielders = outfieldPositions.map(pos => formation[pos]).filter(Boolean);
    const expectedCount = outfieldPositions.length;
    return formation.goalie && outfielders.length === expectedCount && new Set(outfielders).size === expectedCount;
  };

  const randomizeFormation = () => {
    if (!formation.goalie) {
      alert(t('periodSetup.alerts.selectGoalieFirst'));
      return;
    }

    // Get players available for positioning (excluding goalie)
    const availablePlayers = availableForAssignment;

    if (availablePlayers.length === 0) {
      alert(t('periodSetup.alerts.noPlayersAvailable'));
      return;
    }

    // Generate random formation based on team config (includes formation info)
    const randomFormation = randomizeFormationPositions(availablePlayers, teamConfig);

    // Validate that we got a valid formation
    const formationKeys = Object.keys(randomFormation);
    if (formationKeys.length === 0) {
      alert(t('periodSetup.alerts.randomizeFailed'));
      return;
    }
    
    // Update formation while preserving goalie
    const newFormation = {
      ...formation,  // Start with current formation
      ...randomFormation,  // Apply randomized positions
      goalie: formation.goalie  // Keep existing goalie
    };
    
    setFormation(newFormation);
  };

  const handleSavePeriodConfigClick = async () => {
    if (!handleSavePeriodConfiguration) {
      console.warn('handleSavePeriodConfiguration is not provided');
      return;
    }

    setSavePeriodConfigStatus({ loading: true, message: t('periodSetup.saveStatus.saving'), error: null });

    try {
      const result = await handleSavePeriodConfiguration();

      if (result.success) {
        setSavePeriodConfigStatus({
          loading: false,
          message: t('periodSetup.saveStatus.success', { message: result.message || t('periodSetup.saveStatus.defaultSuccess') }),
          error: null
        });

        // Scroll to top to show success banner
        scrollToTopSmooth();

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSavePeriodConfigStatus(prev => ({ ...prev, message: '' }));
        }, 3000);
      } else {
        setSavePeriodConfigStatus({
          loading: false,
          message: '',
          error: result.error || t('periodSetup.saveStatus.defaultError')
        });
      }
    } catch (error) {
      console.error('Save period configuration error:', error);
      setSavePeriodConfigStatus({
        loading: false,
        message: '',
        error: t('periodSetup.saveStatus.defaultError') + ': ' + error.message
      });
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Users className="mr-2 h-6 w-6" />{t('periodSetup.header.title', { period: currentPeriodNumber })}
      </h2>
      
      {/* Current Score Display */}
      <div className="p-2 bg-slate-700 rounded-lg text-center">
        <h3 className="text-sm font-medium text-sky-200 mb-2">{t('periodSetup.score.title')}</h3>
        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-sky-400">{ownScore}</div>
            <div className="text-xs text-slate-300 font-semibold">{ownTeamName}</div>
          </div>
          <div className="text-xl font-mono font-bold text-slate-400">-</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-400">{opponentScore}</div>
            <div className="text-xs text-slate-300 font-semibold">{opponentTeam || t('periodSetup.score.opponent')}</div>
          </div>
        </div>
      </div>

      {shouldShowRecommendations && (
        <div
          data-testid="substitute-recommendations"
          className="p-2 bg-slate-700 rounded-lg space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-sky-200">{t('periodSetup.substituteRecommendations.title')}</h3>
            <span className="text-xs text-slate-300">{t('periodSetup.substituteRecommendations.timeframe')}</span>
          </div>
          {statsLoading ? (
            <p className="text-xs text-slate-300">{t('periodSetup.substituteRecommendations.loading')}</p>
          ) : recommendationState.subError ? (
            <p className="text-xs text-rose-300">{t('periodSetup.substituteRecommendations.error')}</p>
          ) : displayedSubstituteRecommendations.length > 0 ? (
            <>
              <p className="text-xs text-slate-300">
                {t('periodSetup.substituteRecommendations.description')}
              </p>
              <ul className="space-y-1" data-testid="substitute-recommendations-list">
                {displayedSubstituteRecommendations.map(player => (
                  <li
                    key={player.id}
                    className="flex items-center justify-between rounded-md bg-slate-800/60 px-2 py-1 text-sm text-slate-100"
                  >
                    <span>{player.displayName}</span>
                    <span className="text-xs text-slate-300">
                      {formatSubstitutePercentage(player.percentStartedAsSub)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-slate-300">{t('periodSetup.substituteRecommendations.noEligible')}</p>
          )}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <Button
              variant="secondary"
              onClick={handleDismissSubRecommendations}
            >
              {t('periodSetup.substituteRecommendations.dismiss')}
            </Button>
            <Button
              variant="accent"
              onClick={handleAcceptSubRecommendations}
              disabled={statsLoading || displayedSubstituteRecommendations.length === 0}
            >
              {t('periodSetup.substituteRecommendations.accept')}
            </Button>
          </div>
        </div>
      )}

      {shouldShowPositionRecommendations && (
        <PositionRecommendationCard
          recommendations={recommendationState.positionData}
          onAccept={handleAcceptPositionRecommendations}
          onDismiss={handleDismissPositionRecommendations}
          allPlayers={allPlayers}
          loading={statsLoading}
          error={recommendationState.positionError}
        />
      )}

      {/* Save Period Configuration Status Messages */}
      {savePeriodConfigStatus.message && (
        <div className="p-3 bg-emerald-900/20 border border-emerald-600 rounded-lg">
          <p className="text-emerald-200 text-sm">{savePeriodConfigStatus.message}</p>
        </div>
      )}

      {savePeriodConfigStatus.error && (
        <div className="p-3 bg-rose-900/20 border border-rose-600 rounded-lg">
          <p className="text-rose-200 text-sm">{t('periodSetup.saveStatus.error', { message: savePeriodConfigStatus.error })}</p>
        </div>
      )}

      {formation.goalie && (
        <GroupedPositionCards
          fieldGroups={fieldGroups}
          substitutePositions={[]}
          formation={formation}
          onPlayerAssign={handleIndividualPlayerAssignment}
          getAvailableOptions={getAvailableForIndividualSelect}
          currentPeriodNumber={currentPeriodNumber}
          t={t}
        />
      )}

      {/* Enhanced goalie section with inactive player detection */}
      {(() => {
        const isGoalieInactive = formation.goalie && isPlayerInactive(formation.goalie);
        const sectionBgColor = isGoalieInactive ? 'bg-amber-700 border border-amber-500' : 'bg-emerald-700';
        const headerColor = isGoalieInactive ? 'text-amber-200' : 'text-emerald-100';

        return (
          <div className={`p-2 ${sectionBgColor} rounded-md`}>
            <h3 className={`text-sm font-medium ${headerColor} mb-1`}>
              {isGoalieInactive
                ? t('periodSetup.goalie.headerInactive', { period: currentPeriodNumber })
                : t('periodSetup.goalie.header', { period: currentPeriodNumber })
              }
            </h3>
            <Select
              value={formation.goalie || ""}
              onChange={value => handleGoalieChangeForCurrentPeriod(value)}
              options={[...selectedSquadPlayers].sort((a, b) => {
                const aInactive = a.stats?.isInactive || false;
                const bInactive = b.stats?.isInactive || false;
                if (aInactive && !bInactive) return 1;
                if (!aInactive && bInactive) return -1;
                return 0;
              }).map(p => ({ value: p.id, label: getPlayerLabel(p, currentPeriodNumber) }))}
              placeholder={t('periodSetup.goalie.placeholder')}
            />
          </div>
        );
      })()}

      {formation.goalie && (
        <GroupedPositionCards
          fieldGroups={[]}
          substitutePositions={substitutePositions}
          formation={formation}
          onPlayerAssign={handleIndividualPlayerAssignment}
          getAvailableOptions={getAvailableForIndividualSelect}
          currentPeriodNumber={currentPeriodNumber}
          t={t}
        />
      )}

      {/* Save Period Configuration Button - Only show when formation is complete and match hasn't started */}
      {handleSavePeriodConfiguration && matchState !== 'running' && currentPeriodNumber === 1 && (
        <Button
          onClick={handleSavePeriodConfigClick}
          disabled={savePeriodConfigStatus.loading || !isFormationComplete()}
          variant="secondary"
          Icon={Save}
        >
          {savePeriodConfigStatus.loading ? t('periodSetup.buttons.saving') : t('periodSetup.buttons.saveConfig')}
        </Button>
      )}

      <Button onClick={handleStartGame} disabled={!isFormationComplete()} Icon={Play}>
        {t('periodSetup.buttons.enterGame')}
      </Button>

      {/* Debug Mode Randomize Formation Button - Only for first period */}
      {debugMode && currentPeriodNumber === 1 && (
        <Button
          onClick={randomizeFormation}
          variant="accent"
          Icon={Shuffle}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {t('periodSetup.buttons.randomize')}
        </Button>
      )}

      {currentPeriodNumber === 1 && (
        <Button onClick={onNavigateBack} Icon={ArrowLeft}>
          {t('periodSetup.buttons.backToConfig')}
        </Button>
      )}

      {/* Confirmation Modal for Inactive Player Selection */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onConfirm={activatePlayerAndAssign}
        onCancel={cancelInactivePlayerAssignment}
        title={
          confirmationModal.type === 'inactive-goalie' ? t('periodSetup.modals.inactiveGoalie.title') :
          confirmationModal.type === 'recommendation-rerun' ? t('periodSetup.modals.recommendationRerun.title') :
          t('periodSetup.modals.activatePlayer.title')
        }
        message={
          confirmationModal.type === 'inactive-goalie'
            ? t('periodSetup.modals.inactiveGoalie.message', { playerName: confirmationModal.playerName })
            : confirmationModal.type === 'recommendation-rerun'
            ? t('periodSetup.modals.recommendationRerun.message', {
                formerGoalie: getPlayerDisplayNameByIdUtil(allPlayers, confirmationModal.formerGoalieId) || t('periodSetup.fallbacks.unknownPlayer'),
                newGoalie: confirmationModal.playerName
              })
            : t('periodSetup.modals.activatePlayer.message', { playerName: confirmationModal.playerName })
        }
        confirmText={
          confirmationModal.type === 'inactive-goalie' ? t('periodSetup.modals.inactiveGoalie.confirm') :
          confirmationModal.type === 'recommendation-rerun' ? t('periodSetup.modals.recommendationRerun.confirm') :
          t('periodSetup.modals.activatePlayer.confirm')
        }
        cancelText={
          confirmationModal.type === 'inactive-goalie' ? t('periodSetup.modals.inactiveGoalie.cancel') :
          confirmationModal.type === 'recommendation-rerun' ? t('periodSetup.modals.recommendationRerun.cancel') :
          t('periodSetup.modals.activatePlayer.cancel')
        }
        variant="accent"
      />
    </div>
  );
}

export function IndividualPositionCard({ title, position, playerId, onPlayerAssign, getAvailableOptions, currentPeriodNumber, t }) {
  const availableOptions = getAvailableOptions(position);

  // Use same colors as GameScreen: sky for on-field, slate for substitutes
  const isSubstitute = position.startsWith('substitute_');
  const bgColor = isSubstitute ? 'bg-slate-700' : 'bg-sky-700';
  const headerColor = isSubstitute ? 'text-slate-200' : 'text-sky-200';

  return (
    <div className={`p-2 ${bgColor} rounded-md`}>
      <h3 className={`text-sm font-medium ${headerColor} mb-1.5`}>{title}</h3>
      <Select
        value={playerId || ""}
        onChange={value => onPlayerAssign(position, value)}
        options={availableOptions.map(p => ({ value: p.id, label: getPlayerLabel(p, currentPeriodNumber) }))}
        placeholder={t('periodSetup.fallbacks.selectPosition', { title })}
      />
    </div>
  );
}
