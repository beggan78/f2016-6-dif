import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, Play, ArrowLeft, Shuffle, Save } from 'lucide-react';
import { Select, Button, ConfirmationModal } from '../shared/UI';
import { getPlayerLabel } from '../../utils/formatUtils';
import { getPlayerDisplayName as getPlayerDisplayNameUtil, getPlayerDisplayNameById as getPlayerDisplayNameByIdUtil } from '../../utils/playerUtils';
import { randomizeFormationPositions } from '../../utils/debugUtils';
import { getOutfieldPositions, getModeDefinition } from '../../constants/gameModes';
import { useTeam } from '../../contexts/TeamContext';
import { getPlayerStats } from '../../services/matchStateManager';


// Position configuration map for individual modes
const POSITION_CONFIG = {
  // 2-2 Formation positions
  leftDefender: { title: 'Left Defender', position: 'leftDefender' },
  rightDefender: { title: 'Right Defender', position: 'rightDefender' },
  leftAttacker: { title: 'Left Attacker', position: 'leftAttacker' },
  rightAttacker: { title: 'Right Attacker', position: 'rightAttacker' },
  
  // 1-2-1 Formation positions
  defender: { title: 'Defender', position: 'defender' },
  left: { title: 'Left Mid', position: 'left' },
  right: { title: 'Right Mid', position: 'right' },
  attacker: { title: 'Attacker', position: 'attacker' },

  // 7v7 Formation positions
  leftMidfielder: { title: 'Left Midfielder', position: 'leftMidfielder' },
  rightMidfielder: { title: 'Right Midfielder', position: 'rightMidfielder' },
  centerMidfielder: { title: 'Center Midfielder', position: 'centerMidfielder' },
  
  // Substitute positions
  substitute_1: { title: 'Substitute', position: 'substitute_1' },
  substitute_2: { title: 'Substitute', position: 'substitute_2' },
  substitute_3: { title: 'Substitute', position: 'substitute_3' },
  substitute_4: { title: 'Substitute', position: 'substitute_4' },
  substitute_5: { title: 'Substitute', position: 'substitute_5' }
};

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
    return { title: 'Substitute', position: positionKey };
  }

  return { title: humanizePositionKey(positionKey), position: positionKey };
};

// Dynamic component for rendering individual position cards
function IndividualPositionCards({ teamConfig, formation, onPlayerAssign, getAvailableOptions, currentPeriodNumber }) {
  const modeDefinition = getModeDefinition(teamConfig);
  if (!modeDefinition) {
    return null;
  }

  const { fieldPositions, substitutePositions } = modeDefinition;
  const allPositions = [...fieldPositions, ...substitutePositions];

  return (
    <>
      {allPositions.map(position => {
        const config = getPositionConfig(position);

        return (
          <IndividualPositionCard
            key={position}
            title={config.title}
            position={config.position}
            playerId={formation[position]}
            onPlayerAssign={onPlayerAssign}
            getAvailableOptions={getAvailableOptions}
            currentPeriodNumber={currentPeriodNumber}
          />
        );
      })}
    </>
  );
}

export function PeriodSetupScreen({
  currentPeriodNumber,
  formation,
  setFormation,
  availableForPairing,
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
  setView,
  ownScore,
  opponentScore,
  opponentTeam,
  rotationQueue,
  setRotationQueue,
  preparePeriodWithGameLog,
  handleSavePeriodConfiguration,
  matchState,
  debugMode = false,
  resumeFormationData = null
}) {
  const { currentTeam } = useTeam();
  const [recommendationHandled, setRecommendationHandled] = useState(false);
  const [subRecommendationPercentages, setSubRecommendationPercentages] = useState({});
  const [subRecommendationLoading, setSubRecommendationLoading] = useState(false);
  const [subRecommendationError, setSubRecommendationError] = useState(null);
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
        percentStartedAsSub: typeof subRecommendationPercentages[player.id] === 'number'
          ? subRecommendationPercentages[player.id]
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
    subRecommendationPercentages,
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
  const shouldShowRecommendations = currentPeriodNumber === 1 && openSubstituteSlotCount > 0 && !recommendationHandled;
  
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
    role: '', // For pairs mode
    originalValue: '', // To restore dropdown if cancelled
    // For indirect swaps
    swapDetails: null, // Contains swap information for indirect scenarios
    // For recommendation re-run
    newGoalieId: null,
    formerGoalieId: null
  });
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const recommendationDependenciesRef = useRef({
    teamId: null,
    period: null,
    signature: null,
    openSlotCount: null
  });

  useEffect(() => {
    let isActive = true;

    const teamId = currentTeam?.id || '';
    const period = currentPeriodNumber;
    const signature = Array.isArray(selectedSquadPlayers)
      ? selectedSquadPlayers
          .map(player => player?.id)
          .filter(Boolean)
          .sort()
          .join('|')
      : '';

    const depsChanged =
      recommendationDependenciesRef.current.teamId !== teamId ||
      recommendationDependenciesRef.current.period !== period ||
      recommendationDependenciesRef.current.signature !== signature;
    const openSlotCountChanged =
      recommendationDependenciesRef.current.openSlotCount !== openSubstituteSlotCount;

    if (depsChanged || openSlotCountChanged) {
      recommendationDependenciesRef.current = {
        teamId,
        period,
        signature,
        openSlotCount: openSubstituteSlotCount
      };
      if (openSubstituteSlotCount > 0 && recommendationHandled) {
        setRecommendationHandled(false);
      }
    }

    if (
      period !== 1 ||
      !teamId ||
      !Array.isArray(selectedSquadPlayers) ||
      selectedSquadPlayers.length === 0
    ) {
      setSubRecommendationPercentages({});
      setSubRecommendationError(null);
      setSubRecommendationLoading(false);
      return () => {
        isActive = false;
      };
    }

    if (openSubstituteSlotCount === 0) {
      setSubRecommendationPercentages({});
      setSubRecommendationError(null);
      setSubRecommendationLoading(false);
      return () => {
        isActive = false;
      };
    }

    if (!depsChanged && recommendationHandled) {
      return () => {
        isActive = false;
      };
    }

    const loadSubstituteRecommendations = async () => {
      setSubRecommendationLoading(true);
      setSubRecommendationError(null);

      try {
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 6);

        const response = await getPlayerStats(teamId, startDate, endDate);

        if (!isActive) {
          return;
        }

        if (!response?.success) {
          setSubRecommendationPercentages({});
          setSubRecommendationError(response?.error || 'Failed to load substitute recommendations');
          return;
        }

        const percentageMap = {};
        (response.players || []).forEach(playerStat => {
          if (!playerStat?.id) {
            return;
          }

          const percentageValue = typeof playerStat.percentStartedAsSubstitute === 'number'
            ? playerStat.percentStartedAsSubstitute
            : 0;

          percentageMap[playerStat.id] = percentageValue;
        });

        setSubRecommendationPercentages(percentageMap);
        setSubRecommendationError(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSubRecommendationPercentages({});
        setSubRecommendationError(error.message || 'Failed to load substitute recommendations');
      } finally {
        if (isActive) {
          setSubRecommendationLoading(false);
        }
      }
    };

    loadSubstituteRecommendations();

    return () => {
      isActive = false;
    };
  }, [currentPeriodNumber, currentTeam?.id, selectedSquadPlayers, recommendationHandled, openSubstituteSlotCount]);

  const handleDismissSubRecommendations = useCallback(() => {
    setRecommendationHandled(true);
  }, []);

  const handleAcceptSubRecommendations = useCallback(() => {
    if (displayedSubstituteRecommendations.length === 0) {
      setRecommendationHandled(true);
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

    setRecommendationHandled(true);
  }, [displayedSubstituteRecommendations, modeDefinition, setFormation]);

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
      alert(`${duplicatePlayerName} is already assigned. Choose a different player.`);
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
      return availableForPairing;
    }

    // Original logic for incomplete formation - works for both 6 and 7 player modes
    const assignedElsewhereIds = new Set();
    getOutfieldPositions(teamConfig).forEach(pos => {
      if (pos !== currentPosition && formation[pos]) {
        assignedElsewhereIds.add(formation[pos]);
      }
    });
    return availableForPairing.filter(p => !assignedElsewhereIds.has(p.id));
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
      alert('Please select a goalie first before randomizing the formation.');
      return;
    }

    // Get players available for positioning (excluding goalie)
    const availablePlayers = availableForPairing;
    
    if (availablePlayers.length === 0) {
      alert('No players available for positioning.');
      return;
    }

    // Generate random formation based on team config (includes formation info)
    const randomFormation = randomizeFormationPositions(availablePlayers, teamConfig);
    
    // Validate that we got a valid formation
    const formationKeys = Object.keys(randomFormation);
    if (formationKeys.length === 0) {
      alert('Failed to generate random formation.');
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

    setSavePeriodConfigStatus({ loading: true, message: 'Saving period configuration...', error: null });

    try {
      const result = await handleSavePeriodConfiguration();
      
      if (result.success) {
        setSavePeriodConfigStatus({
          loading: false,
          message: `✅ ${result.message || 'Period configuration saved successfully'}`,
          error: null
        });
        
        // Scroll to top to show success banner
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSavePeriodConfigStatus(prev => ({ ...prev, message: '' }));
        }, 3000);
      } else {
        setSavePeriodConfigStatus({
          loading: false,
          message: '',
          error: result.error || 'Failed to save period configuration'
        });
      }
    } catch (error) {
      console.error('Save period configuration error:', error);
      setSavePeriodConfigStatus({
        loading: false,
        message: '',
        error: 'Failed to save period configuration: ' + error.message
      });
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Users className="mr-2 h-6 w-6" />Period {currentPeriodNumber} Team Selection
      </h2>
      
      {/* Current Score Display */}
      <div className="p-2 bg-slate-700 rounded-lg text-center">
        <h3 className="text-sm font-medium text-sky-200 mb-2">Current Score</h3>
        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-sky-400">{ownScore}</div>
            <div className="text-xs text-slate-300 font-semibold">Djurgården</div>
          </div>
          <div className="text-xl font-mono font-bold text-slate-400">-</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-400">{opponentScore}</div>
            <div className="text-xs text-slate-300 font-semibold">{opponentTeam || 'Opponent'}</div>
          </div>
        </div>
      </div>

      {shouldShowRecommendations && (
        <div
          data-testid="substitute-recommendations"
          className="p-2 bg-slate-700 rounded-lg space-y-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-sky-200">Recommended Substitutes</h3>
            <span className="text-xs text-slate-300">Last 6 months</span>
          </div>
          {subRecommendationLoading ? (
            <p className="text-xs text-slate-300">Loading substitute recommendations...</p>
          ) : subRecommendationError ? (
            <p className="text-xs text-rose-300">Unable to load substitute recommendations right now.</p>
          ) : displayedSubstituteRecommendations.length > 0 ? (
            <>
              <p className="text-xs text-slate-300">
                Players who have rarely started as substitutes recently. Consider giving them a substitute start.
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
            <p className="text-xs text-slate-300">No eligible substitutes to recommend.</p>
          )}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <Button
              variant="secondary"
              onClick={handleDismissSubRecommendations}
            >
              Dismiss
            </Button>
            <Button
              variant="accent"
              onClick={handleAcceptSubRecommendations}
              disabled={subRecommendationLoading || displayedSubstituteRecommendations.length === 0}
            >
              Accept
            </Button>
          </div>
        </div>
      )}

      {/* Save Period Configuration Status Messages */}
      {savePeriodConfigStatus.message && (
        <div className="p-3 bg-emerald-900/20 border border-emerald-600 rounded-lg">
          <p className="text-emerald-200 text-sm">{savePeriodConfigStatus.message}</p>
        </div>
      )}

      {savePeriodConfigStatus.error && (
        <div className="p-3 bg-rose-900/20 border border-rose-600 rounded-lg">
          <p className="text-rose-200 text-sm">❌ {savePeriodConfigStatus.error}</p>
        </div>
      )}

      {/* Enhanced goalie section with inactive player detection */}
      {(() => {
        const isGoalieInactive = formation.goalie && isPlayerInactive(formation.goalie);
        const sectionBgColor = isGoalieInactive ? 'bg-amber-700 border border-amber-500' : 'bg-slate-700';
        const headerColor = isGoalieInactive ? 'text-amber-200' : 'text-sky-200';
        const warningText = isGoalieInactive ? ' (Inactive - needs activation)' : '';
        
        return (
          <div className={`p-2 ${sectionBgColor} rounded-md`}>
            <h3 className={`text-sm font-medium ${headerColor} mb-1`}>
              Goalie for Period {currentPeriodNumber}{warningText}
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
              placeholder="Select Goalie for this Period"
            />
          </div>
        );
      })()}

      {formation.goalie && teamConfig?.substitutionType === 'individual' && (
        <IndividualPositionCards
          teamConfig={teamConfig}
          formation={formation}
          onPlayerAssign={handleIndividualPlayerAssignment}
          getAvailableOptions={getAvailableForIndividualSelect}
          currentPeriodNumber={currentPeriodNumber}
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
          {savePeriodConfigStatus.loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      )}

      <Button onClick={handleStartGame} disabled={!isFormationComplete()} Icon={Play}>
        Enter Game
      </Button>

      {/* Debug Mode Randomize Formation Button - Only for first period */}
      {debugMode && currentPeriodNumber === 1 && (
        <Button 
          onClick={randomizeFormation} 
          variant="accent"
          Icon={Shuffle}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          🎲 Randomize Formation (Debug)
        </Button>
      )}
      
      {currentPeriodNumber === 1 && (
        <Button onClick={() => setView('config')} Icon={ArrowLeft}>
          Back to Configuration
        </Button>
      )}

      {/* Confirmation Modal for Inactive Player Selection */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onConfirm={activatePlayerAndAssign}
        onCancel={cancelInactivePlayerAssignment}
        title={
          confirmationModal.type === 'inactive-goalie' ? 'Inactive Goalie Detected' :
          confirmationModal.type === 'recommendation-rerun' ? 'Re-run Formation Recommendations?' :
          'Activate Player'
        }
        message={
          confirmationModal.type === 'inactive-goalie'
            ? `${confirmationModal.playerName} is currently inactive but selected as goalie for next period. Do you want to continue with ${confirmationModal.playerName} as goalie?`
            : confirmationModal.type === 'recommendation-rerun'
            ? `You've changed the goalie from ${getPlayerDisplayNameByIdUtil(allPlayers, confirmationModal.formerGoalieId) || 'Unknown'} to ${confirmationModal.playerName}. Would you like to re-run the formation recommendations with the new goalie?`
            : `Put ${confirmationModal.playerName} back into rotation?`
        }
        confirmText={
          confirmationModal.type === 'inactive-goalie' ? 'Activate & Continue' :
          confirmationModal.type === 'recommendation-rerun' ? 'Yes, Re-run Recommendations' :
          'Activate'
        }
        cancelText={
          confirmationModal.type === 'inactive-goalie' ? 'Choose Different Goalie' :
          confirmationModal.type === 'recommendation-rerun' ? 'No, Keep Current Formation' :
          'Cancel'
        }
        variant="accent"
      />
    </div>
  );
}

export function IndividualPositionCard({ title, position, playerId, onPlayerAssign, getAvailableOptions, currentPeriodNumber }) {
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
        placeholder={`Select ${title}`}
      />
    </div>
  );
}
