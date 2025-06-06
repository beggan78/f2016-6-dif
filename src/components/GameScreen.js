import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, RotateCcw, Square, Clock } from 'lucide-react';
import { Button, OutfieldPlayerModal, PlayerInactiveModal } from './UI';
import { FORMATION_TYPES } from '../utils/gameLogic';

export function GameScreen({ 
  currentPeriodNumber, 
  periodFormation, 
  allPlayers, 
  matchTimerSeconds, 
  subTimerSeconds, 
  formatTime, 
  handleSubstitution, 
  handleEndPeriod, 
  nextPhysicalPairToSubOut,
  nextPlayerToSubOut,
  nextPlayerIdToSubOut,
  nextNextPlayerIdToSubOut,
  selectedSquadPlayers,
  setNextPhysicalPairToSubOut,
  setNextPlayerToSubOut,
  formationType,
  alertMinutes,
  togglePlayerInactive,
  switchPlayerPositions,
  getOutfieldPlayers
}) {
  const getPlayerName = React.useCallback((id) => allPlayers.find(p => p.id === id)?.name || 'N/A', [allPlayers]);
  
  // Determine which formation mode we're using
  const isPairsMode = formationType === FORMATION_TYPES.PAIRS_7;
  const isIndividual6Mode = formationType === FORMATION_TYPES.INDIVIDUAL_6;
  const isIndividual7Mode = formationType === FORMATION_TYPES.INDIVIDUAL_7;
  
  // State for outfield player modal
  const [outfieldPlayerModal, setOutfieldPlayerModal] = React.useState({
    isOpen: false,
    type: null, // 'pair' or 'player'
    target: null, // pairKey or position
    playerName: '',
    sourcePlayerId: null,
    availablePlayers: [],
    showPositionOptions: false
  });
  
  // State for player inactive modal (7-player individual mode only)
  const [inactiveModal, setInactiveModal] = React.useState({
    isOpen: false,
    playerId: null,
    playerName: '',
    isCurrentlyInactive: false
  });
  
  // State to track if we should substitute immediately after setting next sub
  const [shouldSubstituteNow, setShouldSubstituteNow] = React.useState(false);
  
  // State to track recently substituted players for visual effect
  const [recentlySubstitutedPlayers, setRecentlySubstitutedPlayers] = React.useState(new Set());
  
  // State to track if we should hide the "next off" indicator during glow effect
  const [hideNextOffIndicator, setHideNextOffIndicator] = React.useState(false);
  
  // State to track box switching animation
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [animationPhase, setAnimationPhase] = React.useState('idle'); // 'idle', 'switching', 'completing'
  const [animationDistances, setAnimationDistances] = React.useState({ nextOffToSub: 0, subToNextOff: 0 });
  
  // Animation system abstraction
  const createAnimationCalculator = React.useCallback(() => {
    // Updated measurements for compact design - let's be more generous to account for all spacing
    const MEASUREMENTS = {
      padding: 16, // p-2 = 8px top + 8px bottom = 16px total
      border: 4,   // border-2 = 2px top + 2px bottom = 4px total
      gap: 0,      // space-y-2 = 8px between elements
      contentHeight: {
        // Being more generous with content heights to account for line heights, margins, etc.
        pairs: 84,      // Was 76, increased to account for all text spacing
        individual: 76  // Was 68, increased to account for all text spacing
      }
    };

    const getBoxHeight = (mode) => {
      const contentHeight = mode === 'pairs' ? MEASUREMENTS.contentHeight.pairs : MEASUREMENTS.contentHeight.individual;
      // Total height = padding + border + content + gap to next element
      return MEASUREMENTS.padding + MEASUREMENTS.border + contentHeight + MEASUREMENTS.gap;
    };

    const getPositionIndex = (position, mode) => {
      const positionArrays = {
        pairs: ['leftPair', 'rightPair', 'subPair'],
        individual6: ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'],
        individual7: ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2']
      };
      
      const positions = positionArrays[mode] || [];
      return positions.indexOf(position);
    };

    const calculateDistance = (fromIndex, toIndex, mode) => {
      if (fromIndex === -1 || toIndex === -1) return 0;
      const boxHeight = getBoxHeight(mode);
      const distance = Math.abs(toIndex - fromIndex) * boxHeight;
      return toIndex > fromIndex ? distance : -distance;
    };

    return {
      // Expose helper methods
      getPositionIndex,
      calculateDistance,
      getBoxHeight,

      // Calculate substitution animation distances
      calculateSubstitutionDistances: () => {
        let nextOffIndex = -1;
        let subIndex = -1;
        let mode = 'individual';
        
        if (isPairsMode) {
          mode = 'pairs';
          nextOffIndex = getPositionIndex(nextPhysicalPairToSubOut, 'pairs');
          subIndex = getPositionIndex('subPair', 'pairs');
        } else if (isIndividual6Mode) {
          mode = 'individual';
          const positions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'];
          nextOffIndex = positions.findIndex(pos => periodFormation[pos] === nextPlayerIdToSubOut);
          subIndex = getPositionIndex('substitute', 'individual6');
        } else if (isIndividual7Mode) {
          mode = 'individual';
          const positions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
          nextOffIndex = positions.findIndex(pos => periodFormation[pos] === nextPlayerIdToSubOut);
          subIndex = getPositionIndex('substitute7_1', 'individual7');
        }
        
        return {
          nextOffToSub: calculateDistance(nextOffIndex, subIndex, mode),
          subToNextOff: calculateDistance(subIndex, nextOffIndex, mode)
        };
      },

      // Calculate position switch animation distances
      calculatePositionSwitchDistances: (player1Id, player2Id) => {
        const player1 = allPlayers.find(p => p.id === player1Id);
        const player2 = allPlayers.find(p => p.id === player2Id);
        
        if (!player1 || !player2) return { player1Distance: 0, player2Distance: 0 };
        
        const player1Position = player1.stats.currentPairKey;
        const player2Position = player2.stats.currentPairKey;
        
        let mode = 'individual';
        let modeKey = 'individual6';
        
        if (isPairsMode) {
          mode = 'pairs';
          modeKey = 'pairs';
        } else if (isIndividual7Mode) {
          modeKey = 'individual7';
        }
        
        const player1Index = getPositionIndex(player1Position, modeKey);
        const player2Index = getPositionIndex(player2Position, modeKey);
        
        return {
          player1Distance: calculateDistance(player1Index, player2Index, mode),
          player2Distance: calculateDistance(player2Index, player1Index, mode)
        };
      },

      // Calculate 7-player individual mode specific distances
      calculate7PlayerDistances: () => {
        const positions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
        const fieldPlayerIndex = positions.findIndex(pos => periodFormation[pos] === nextPlayerIdToSubOut);
        const sub1Index = getPositionIndex('substitute7_1', 'individual7');
        const sub2Index = getPositionIndex('substitute7_2', 'individual7');
        
        if (fieldPlayerIndex === -1) {
          return { fieldToSub2: 0, sub1ToField: 0, sub2ToSub1: 0, nextOffToSub: 0, subToNextOff: 0 };
        }
        
        const fieldToSub2 = calculateDistance(fieldPlayerIndex, sub2Index, 'individual');
        const sub1ToField = calculateDistance(sub1Index, fieldPlayerIndex, 'individual');
        const sub2ToSub1 = calculateDistance(sub2Index, sub1Index, 'individual');
        
        return {
          fieldToSub2,
          sub1ToField,
          sub2ToSub1,
          nextOffToSub: fieldToSub2,
          subToNextOff: sub1ToField
        };
      }
    };
  }, [isPairsMode, isIndividual6Mode, isIndividual7Mode, nextPhysicalPairToSubOut, nextPlayerIdToSubOut, periodFormation, allPlayers]);

  // Create calculator instance
  const animationCalculator = createAnimationCalculator();

  // Enhanced substitution handler with animation and highlighting
  const handleSubstitutionWithHighlight = React.useCallback(() => {
    let playersComingOnIds = [];
    
    if (isPairsMode) {
      // 7-player pairs logic - get players coming from sub pair
      const pairComingIn = periodFormation.subPair;
      playersComingOnIds = [pairComingIn?.defender, pairComingIn?.attacker].filter(Boolean);
    } else if (isIndividual6Mode) {
      // 6-player logic - get player coming from substitute position
      playersComingOnIds = [periodFormation.substitute].filter(Boolean);
    } else if (isIndividual7Mode) {
      // 7-player individual logic - get player coming from first substitute position
      playersComingOnIds = [periodFormation.substitute7_1].filter(Boolean);
    }
    
    // Calculate animation distances using the new abstraction
    let distances;
    if (isIndividual7Mode) {
      distances = animationCalculator.calculate7PlayerDistances();
    } else {
      distances = animationCalculator.calculateSubstitutionDistances();
    }
    setAnimationDistances(distances);
    
    // Start the animation sequence
    setIsAnimating(true);
    setAnimationPhase('switching');
    setHideNextOffIndicator(true);
    
    // After animation completes (1 second), perform substitution and start glow
    setTimeout(() => {
      // Perform the actual substitution
      handleSubstitution();
      
      // Set the players who are coming on field for highlighting
      setRecentlySubstitutedPlayers(new Set(playersComingOnIds));
      
      // End animation
      setIsAnimating(false);
      setAnimationPhase('completing');
      
      // After glow effect completes (1.5 more seconds), reset everything
      setTimeout(() => {
        setAnimationPhase('idle');
        setHideNextOffIndicator(false);
        setRecentlySubstitutedPlayers(new Set());
      }, 1500);
    }, 1000);
  }, [handleSubstitution, periodFormation, isPairsMode, isIndividual6Mode, isIndividual7Mode, animationCalculator]);

  // Enhanced position switch handler with animation
  const handlePositionSwitchWithAnimation = React.useCallback((player1Id, player2Id) => {
    // Calculate animation distances using the new abstraction
    const distances = animationCalculator.calculatePositionSwitchDistances(player1Id, player2Id);
    
    // Set up animation state with custom distances for the two players
    setAnimationDistances({
      positionSwitch: true,
      player1Id: player1Id,
      player2Id: player2Id,
      player1Distance: distances.player1Distance,
      player2Distance: distances.player2Distance,
      // Keep these for backwards compatibility
      nextOffToSub: 0,
      subToNextOff: 0
    });
    
    // Start the animation sequence
    setIsAnimating(true);
    setAnimationPhase('switching');
    setHideNextOffIndicator(true);
    
    // After animation completes (1 second), perform position switch and start glow
    setTimeout(() => {
      // Perform the actual position switch
      const success = switchPlayerPositions(player1Id, player2Id);
      if (success) {
        // Set both players for highlighting
        setRecentlySubstitutedPlayers(new Set([player1Id, player2Id]));
        
        const player1Name = getPlayerName(player1Id);
        const player2Name = getPlayerName(player2Id);
        console.log(`Successfully switched positions between ${player1Name} and ${player2Name}`);
      } else {
        console.warn('Position switch failed');
      }
      
      // End animation
      setIsAnimating(false);
      setAnimationPhase('completing');
      
      // After glow effect completes (1.5 more seconds), reset everything
      setTimeout(() => {
        setAnimationPhase('idle');
        setHideNextOffIndicator(false);
        setRecentlySubstitutedPlayers(new Set());
      }, 1500);
    }, 1000);
  }, [animationCalculator, switchPlayerPositions, getPlayerName]);

  // Effect to trigger substitution after state update
  React.useEffect(() => {
    if (shouldSubstituteNow) {
      handleSubstitutionWithHighlight();
      setShouldSubstituteNow(false);
    }
  }, [shouldSubstituteNow, nextPhysicalPairToSubOut, nextPlayerToSubOut, handleSubstitutionWithHighlight]);

  // Note: Timeout logic is now handled in handleSubstitutionWithHighlight

  // Calculate player time statistics
  const getPlayerTimeStats = (playerId) => {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return { totalOutfieldTime: 0, attackDefenderDiff: 0 };
    
    const stats = player.stats;
    const currentTime = Date.now();
    
    // Calculate current stint time if player is active
    let currentStintTime = 0;
    if (stats.lastStintStartTimeEpoch && stats.currentPeriodStatus === 'on_field') {
      currentStintTime = Math.round((currentTime - stats.lastStintStartTimeEpoch) / 1000);
    }
    
    // Total outfield time includes completed time plus current stint if on field
    const totalOutfieldTime = stats.timeOnFieldSeconds + currentStintTime;
    
    // Calculate attacker-defender difference with current stint
    let attackerTime = stats.timeAsAttackerSeconds;
    let defenderTime = stats.timeAsDefenderSeconds;
    
    if (stats.currentPeriodStatus === 'on_field' && stats.currentPeriodRole) {
      if (stats.currentPeriodRole === 'Attacker') {
        attackerTime += currentStintTime;
      } else if (stats.currentPeriodRole === 'Defender') {
        defenderTime += currentStintTime;
      }
    }
    
    const attackDefenderDiff = attackerTime - defenderTime;
    
    return { totalOutfieldTime, attackDefenderDiff };
  };

  const formatTimeDifference = (diffSeconds) => {
    const sign = diffSeconds >= 0 ? '+' : '-';
    const absSeconds = Math.abs(diffSeconds);
    return sign + formatTime(absSeconds);
  };

  // Click and hold logic for changing next substitution target
  const handlePairLongPress = (pairKey) => {
    if (pairKey === 'leftPair' || pairKey === 'rightPair') {
      const pairData = periodFormation[pairKey];
      const defenderName = getPlayerName(pairData?.defender);
      const attackerName = getPlayerName(pairData?.attacker);
      setOutfieldPlayerModal({
        isOpen: true,
        type: 'pair',
        target: pairKey,
        playerName: `${defenderName} & ${attackerName}`,
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      });
    }
  };

  const handlePlayerLongPress = (position) => {
    const validPositions = [
      'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', // 6-player mode
      'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7' // 7-player individual mode
    ];
    
    if (validPositions.includes(position)) {
      const playerId = periodFormation[position];
      const playerName = getPlayerName(playerId);
      setOutfieldPlayerModal({
        isOpen: true,
        type: 'player',
        target: position,
        playerName: playerName,
        sourcePlayerId: null,
        availablePlayers: [],
        showPositionOptions: false
      });
    }
  };

  const handleSubstituteLongPress = (position) => {
    // Only for 7-player individual mode substitute players
    if (!isIndividual7Mode || (position !== 'substitute7_1' && position !== 'substitute7_2')) return;
    
    const playerId = periodFormation[position];
    const playerName = getPlayerName(playerId);
    const player = allPlayers.find(p => p.id === playerId);
    const isCurrentlyInactive = player?.stats.isInactive || false;
    
    setInactiveModal({
      isOpen: true,
      playerId: playerId,
      playerName: playerName,
      isCurrentlyInactive: isCurrentlyInactive
    });
  };

  // Handle outfield player modal actions
  const handleSetNextSubstitution = () => {
    if (outfieldPlayerModal.type === 'pair') {
      setNextPhysicalPairToSubOut(outfieldPlayerModal.target);
    } else if (outfieldPlayerModal.type === 'player') {
      setNextPlayerToSubOut(outfieldPlayerModal.target);
    }
    setOutfieldPlayerModal({ 
      isOpen: false, 
      type: null, 
      target: null, 
      playerName: '', 
      sourcePlayerId: null, 
      availablePlayers: [], 
      showPositionOptions: false 
    });
  };

  const handleSubstituteNow = () => {
    // First set as next substitution
    if (outfieldPlayerModal.type === 'pair') {
      setNextPhysicalPairToSubOut(outfieldPlayerModal.target);
    } else if (outfieldPlayerModal.type === 'player') {
      setNextPlayerToSubOut(outfieldPlayerModal.target);
    }
    // Set flag to trigger substitution after state update
    setShouldSubstituteNow(true);
    setOutfieldPlayerModal({ 
      isOpen: false, 
      type: null, 
      target: null, 
      playerName: '', 
      sourcePlayerId: null, 
      availablePlayers: [], 
      showPositionOptions: false 
    });
  };

  const handleCancelOutfieldPlayerModal = () => {
    setOutfieldPlayerModal({ 
      isOpen: false, 
      type: null, 
      target: null, 
      playerName: '', 
      sourcePlayerId: null, 
      availablePlayers: [], 
      showPositionOptions: false 
    });
  };

  // Handle inactive modal actions
  const handleInactivatePlayer = () => {
    if (inactiveModal.playerId) {
      // Check if this would result in both substitutes being inactive
      const playerToInactivate = allPlayers.find(p => p.id === inactiveModal.playerId);
      if (playerToInactivate && !playerToInactivate.stats.isInactive) {
        const substitute7_1Id = periodFormation.substitute7_1;
        const substitute7_2Id = periodFormation.substitute7_2;
        const otherSubstituteId = inactiveModal.playerId === substitute7_1Id ? substitute7_2Id : substitute7_1Id;
        const otherSubstitute = allPlayers.find(p => p.id === otherSubstituteId);
        
        if (otherSubstitute?.stats.isInactive) {
          alert('Cannot inactivate this player as it would result in both substitutes being inactive.');
          setInactiveModal({ isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false });
          return;
        }
      }
      
      // Check if this will trigger an animation (substitute7_1 being inactivated)
      const willTriggerAnimation = playerToInactivate && !playerToInactivate.stats.isInactive && playerToInactivate.stats.currentPairKey === 'substitute7_1';
      
      if (willTriggerAnimation) {
        // For inactivation of substitute7_1, start animation first, then perform state change
        const sub1Index = animationCalculator.getPositionIndex('substitute7_1', 'individual7');
        const sub2Index = animationCalculator.getPositionIndex('substitute7_2', 'individual7');
        const distanceBetween = animationCalculator.calculateDistance(sub1Index, sub2Index, 'individual');
        
        setAnimationDistances({ 
          fieldToSub2: distanceBetween,  // substitute7_1 moves down to substitute7_2
          sub1ToField: 0,  // Not used in inactivation
          sub2ToSub1: -distanceBetween,  // substitute7_2 moves up to substitute7_1
          nextOffToSub: distanceBetween,  // For backwards compatibility
          subToNextOff: -distanceBetween  // For backwards compatibility
        });
        
        // Start the animation sequence
        setIsAnimating(true);
        setAnimationPhase('switching');
        setHideNextOffIndicator(true);
        
        // After animation completes (1 second), perform state change
        setTimeout(() => {
          // Perform the actual state change
          togglePlayerInactive(inactiveModal.playerId);
          
          // End animation
          setIsAnimating(false);
          setAnimationPhase('idle');
          setHideNextOffIndicator(false);
        }, 1000);
      } else {
        // No animation needed, perform state change immediately
        togglePlayerInactive(inactiveModal.playerId);
      }
    }
    setInactiveModal({ isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false });
  };

  const handleActivatePlayer = () => {
    if (inactiveModal.playerId) {
      // Check if this will trigger an animation (substitute7_2 being reactivated)
      const playerToActivate = allPlayers.find(p => p.id === inactiveModal.playerId);
      const willTriggerAnimation = playerToActivate && playerToActivate.stats.isInactive && playerToActivate.stats.currentPairKey === 'substitute7_2';
      
      if (willTriggerAnimation) {
        // For reactivation of substitute7_2, start animation first, then perform state change
        const sub1Index = animationCalculator.getPositionIndex('substitute7_1', 'individual7');
        const sub2Index = animationCalculator.getPositionIndex('substitute7_2', 'individual7');
        const distanceBetween = animationCalculator.calculateDistance(sub1Index, sub2Index, 'individual');
        
        setAnimationDistances({ 
          fieldToSub2: distanceBetween,  // substitute7_1 moves down to substitute7_2
          sub1ToField: 0,  // Not used in reactivation
          sub2ToSub1: -distanceBetween,  // substitute7_2 moves up to substitute7_1
          nextOffToSub: distanceBetween,  // For backwards compatibility
          subToNextOff: -distanceBetween  // For backwards compatibility
        });
        
        // Start the animation sequence
        setIsAnimating(true);
        setAnimationPhase('switching');
        setHideNextOffIndicator(true);
        
        // After animation completes (1 second), perform state change
        setTimeout(() => {
          // Perform the actual state change
          togglePlayerInactive(inactiveModal.playerId);
          
          // End animation
          setIsAnimating(false);
          setAnimationPhase('idle');
          setHideNextOffIndicator(false);
        }, 1000);
      } else {
        // No animation needed, perform state change immediately
        togglePlayerInactive(inactiveModal.playerId);
      }
    }
    setInactiveModal({ isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false });
  };

  const handleCancelInactive = () => {
    setInactiveModal({ isOpen: false, playerId: null, playerName: '', isCurrentlyInactive: false });
  };

  // Handle position change actions
  const handleChangePosition = (action) => {
    if (action === 'show-options') {
      // Show the position selection options
      if (outfieldPlayerModal.target && outfieldPlayerModal.type === 'player') {
        const sourcePlayerId = periodFormation[outfieldPlayerModal.target];
        
        if (sourcePlayerId) {
          // Get only field players (exclude substitutes) except the source player
          const availablePlayers = getOutfieldPlayers().filter(p => {
            if (p.id === sourcePlayerId) return false;
            
            // Only include players currently on the field (not substitutes)
            const player = allPlayers.find(pl => pl.id === p.id);
            if (!player) return false;
            
            const currentPairKey = player.stats.currentPairKey;
            
            // Exclude substitutes based on formation type
            if (formationType === FORMATION_TYPES.PAIRS_7) {
              return currentPairKey !== 'subPair';
            } else if (formationType === FORMATION_TYPES.INDIVIDUAL_6) {
              return currentPairKey !== 'substitute';
            } else if (formationType === FORMATION_TYPES.INDIVIDUAL_7) {
              return currentPairKey !== 'substitute7_1' && currentPairKey !== 'substitute7_2';
            }
            
            return true;
          });
          
          setOutfieldPlayerModal(prev => ({
            ...prev,
            sourcePlayerId: sourcePlayerId,
            availablePlayers: availablePlayers,
            showPositionOptions: true
          }));
        }
      } else if (outfieldPlayerModal.type === 'pair') {
        // For pairs formation, position change is not supported
        alert('Position change is not supported for pairs mode. Please use individual mode.');
        handleCancelOutfieldPlayerModal();
      }
    } else if (action === null) {
      // Go back to main options
      setOutfieldPlayerModal(prev => ({
        ...prev,
        showPositionOptions: false,
        availablePlayers: [],
        sourcePlayerId: null
      }));
    } else {
      // action is a player ID - perform the animated position switch
      const targetPlayerId = action;
      if (outfieldPlayerModal.sourcePlayerId && targetPlayerId) {
        // Close the modal first
        handleCancelOutfieldPlayerModal();
        
        // Perform the animated position switch
        handlePositionSwitchWithAnimation(outfieldPlayerModal.sourcePlayerId, targetPlayerId);
      } else {
        // Close the modal if something went wrong
        handleCancelOutfieldPlayerModal();
      }
    }
  };

  // Hook for handling long press with scroll detection
  const useLongPressWithScrollDetection = (callback, ms = 1000) => {
    const [startLongPress, setStartLongPress] = React.useState(false);
    const callbackRef = React.useRef(callback);
    const initialTouchPos = React.useRef({ x: 0, y: 0 });
    const hasScrolled = React.useRef(false);
    const timerId = React.useRef(null);

    // Update callback ref when callback changes
    React.useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    const startPress = (clientX, clientY) => {
      initialTouchPos.current = { x: clientX, y: clientY };
      hasScrolled.current = false;
      setStartLongPress(true);
      
      timerId.current = setTimeout(() => {
        if (!hasScrolled.current) {
          callbackRef.current();
        }
      }, ms);
    };

    const endPress = () => {
      setStartLongPress(false);
      if (timerId.current) {
        clearTimeout(timerId.current);
        timerId.current = null;
      }
    };

    const handleMove = React.useCallback((clientX, clientY) => {
      if (startLongPress) {
        const moveThreshold = 10; // pixels
        const deltaX = Math.abs(clientX - initialTouchPos.current.x);
        const deltaY = Math.abs(clientY - initialTouchPos.current.y);
        
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
          hasScrolled.current = true;
          endPress();
        }
      }
    }, [startLongPress]);

    const handleTouchMove = React.useCallback((e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    }, [handleMove]);

    const handleMouseMove = React.useCallback((e) => {
      handleMove(e.clientX, e.clientY);
    }, [handleMove]);

    React.useEffect(() => {
      if (startLongPress) {
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('mousemove', handleMouseMove);
        
        return () => {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('mousemove', handleMouseMove);
        };
      }
    }, [startLongPress, handleTouchMove, handleMouseMove]);

    React.useEffect(() => {
      return () => {
        if (timerId.current) {
          clearTimeout(timerId.current);
        }
      };
    }, []);

    return {
      onMouseDown: (e) => startPress(e.clientX, e.clientY),
      onMouseUp: endPress,
      onMouseLeave: endPress,
      onTouchStart: (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          startPress(touch.clientX, touch.clientY);
        }
      },
      onTouchEnd: endPress,
    };
  };

  // Create long press handlers for each pair and individual position
  const leftPairEvents = useLongPressWithScrollDetection(() => handlePairLongPress('leftPair'));
  const rightPairEvents = useLongPressWithScrollDetection(() => handlePairLongPress('rightPair'));
  
  // 6-player individual mode events
  const leftDefenderEvents = useLongPressWithScrollDetection(() => handlePlayerLongPress('leftDefender'));
  const rightDefenderEvents = useLongPressWithScrollDetection(() => handlePlayerLongPress('rightDefender'));
  const leftAttackerEvents = useLongPressWithScrollDetection(() => handlePlayerLongPress('leftAttacker'));
  const rightAttackerEvents = useLongPressWithScrollDetection(() => handlePlayerLongPress('rightAttacker'));
  
  // 7-player individual mode events
  const leftDefender7Events = useLongPressWithScrollDetection(() => handlePlayerLongPress('leftDefender7'));
  const rightDefender7Events = useLongPressWithScrollDetection(() => handlePlayerLongPress('rightDefender7'));
  const leftAttacker7Events = useLongPressWithScrollDetection(() => handlePlayerLongPress('leftAttacker7'));
  const rightAttacker7Events = useLongPressWithScrollDetection(() => handlePlayerLongPress('rightAttacker7'));
  
  // 7-player individual mode substitute events
  const substitute7_1Events = useLongPressWithScrollDetection(() => handleSubstituteLongPress('substitute7_1'));
  const substitute7_2Events = useLongPressWithScrollDetection(() => handleSubstituteLongPress('substitute7_2'));

  const renderPair = (pairKey, pairName, renderIndex) => {
    const pairData = periodFormation[pairKey];
    if (!pairData) return null;
    const isNextOff = pairKey === nextPhysicalPairToSubOut && pairKey !== 'subPair';
    const isNextOn = pairKey === 'subPair';
    const canBeSelected = pairKey === 'leftPair' || pairKey === 'rightPair';

    // Check if any player in this pair was recently substituted
    const hasRecentlySubstitutedPlayer = (pairData.defender && recentlySubstitutedPlayers.has(pairData.defender)) ||
                                        (pairData.attacker && recentlySubstitutedPlayers.has(pairData.attacker));

    // Animation logic for switching positions
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    if (isAnimating && animationPhase === 'switching') {
      // Check if this is a position switch animation
      if (animationDistances.positionSwitch) {
        const pairDefenderId = pairData.defender;
        const pairAttackerId = pairData.attacker;
        
        if (pairDefenderId === animationDistances.player1Id) {
          animationClass = animationDistances.player1Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationDistances.player1Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.player1Distance}px`
          };
        } else if (pairAttackerId === animationDistances.player1Id) {
          animationClass = animationDistances.player1Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationDistances.player1Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.player1Distance}px`
          };
        } else if (pairDefenderId === animationDistances.player2Id) {
          animationClass = animationDistances.player2Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationDistances.player2Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.player2Distance}px`
          };
        } else if (pairAttackerId === animationDistances.player2Id) {
          animationClass = animationDistances.player2Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationDistances.player2Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.player2Distance}px`
          };
        }
      } else {
        // Normal substitution animation
        if (isNextOff) {
          animationClass = 'animate-dynamic-down';
          zIndexClass = 'z-10'; // Lower z-index when going down
          styleProps = {
            '--move-distance': `${animationDistances.nextOffToSub}px`
          };
        } else if (isNextOn) {
          animationClass = 'animate-dynamic-up';
          zIndexClass = 'z-20'; // Higher z-index when coming up
          styleProps = {
            '--move-distance': `${animationDistances.subToNextOff}px`
          };
        }
      }
    }

    let bgColor = 'bg-slate-700'; // Default for subs or if logic is off
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (pairKey === 'leftPair' || pairKey === 'rightPair') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff && !hideNextOffIndicator) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn && !hideNextOffIndicator) {
      borderColor = 'border-emerald-500';
    }

    // Add glow effect for recently substituted players
    if (hasRecentlySubstitutedPlayer) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    let longPressEvents = {};
    if (pairKey === 'leftPair') longPressEvents = leftPairEvents;
    else if (pairKey === 'rightPair') longPressEvents = rightPairEvents;

    return (
      <div 
        className={`p-2 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {pairName}
          <div>
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-5 w-5 text-rose-400 inline-block" />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-5 w-5 text-emerald-400 inline-block" />}
          </div>
        </h3>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <div><Shield className="inline h-3 w-3 mr-1" /> D: {getPlayerName(pairData.defender)}</div>
            {pairData.defender && (() => {
              const stats = getPlayerTimeStats(pairData.defender);
              return (
                <div className="text-right text-xs">
                  <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                  <span className="ml-4"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center justify-between">
            <div><Sword className="inline h-3 w-3 mr-1" /> A: {getPlayerName(pairData.attacker)}</div>
            {pairData.attacker && (() => {
              const stats = getPlayerTimeStats(pairData.attacker);
              return (
                <div className="text-right text-xs">
                  <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                  <span className="ml-4"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
                </div>
              );
            })()}
          </div>
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-0.5">Hold for options</p>
        )}
      </div>
    );
  };

  const renderIndividualPosition = (position, positionName, icon, renderIndex) => {
    const playerId = periodFormation[position];
    if (!playerId) return null;
    
    const isNextOff = playerId === nextPlayerIdToSubOut;
    const isNextOn = position === 'substitute' || position === 'substitute7_1';
    const canBeSelected = [
      'leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', // 6-player mode
      'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7' // 7-player individual mode
    ].includes(position);

    // Check if this player was recently substituted
    const isRecentlySubstituted = recentlySubstitutedPlayers.has(playerId);

    // Animation logic for switching positions
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    if (isAnimating && animationPhase === 'switching') {
      // Check if this is a position switch animation
      if (animationDistances.positionSwitch) {
        if (playerId === animationDistances.player1Id) {
          animationClass = animationDistances.player1Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationDistances.player1Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.player1Distance}px`
          };
        } else if (playerId === animationDistances.player2Id) {
          animationClass = animationDistances.player2Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationDistances.player2Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.player2Distance}px`
          };
        }
      } else {
        // Normal substitution animation
        if (isNextOff) {
          animationClass = 'animate-dynamic-down';
          zIndexClass = 'z-10'; // Lower z-index when going down
          styleProps = {
            '--move-distance': `${animationDistances.nextOffToSub}px`
          };
        } else if (isNextOn) {
          animationClass = 'animate-dynamic-up';
          zIndexClass = 'z-20'; // Higher z-index when coming up
          styleProps = {
            '--move-distance': `${animationDistances.subToNextOff}px`
          };
        }
      }
    }

    let bgColor = 'bg-slate-700'; // Default for substitute
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (position !== 'substitute') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff && !hideNextOffIndicator) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn && !hideNextOffIndicator) {
      borderColor = 'border-emerald-500';
    }

    // Add glow effect for recently substituted players
    if (isRecentlySubstituted) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    let longPressEvents = {};
    if (position === 'leftDefender') longPressEvents = leftDefenderEvents;
    else if (position === 'rightDefender') longPressEvents = rightDefenderEvents;
    else if (position === 'leftAttacker') longPressEvents = leftAttackerEvents;
    else if (position === 'rightAttacker') longPressEvents = rightAttackerEvents;
    else if (position === 'leftDefender7') longPressEvents = leftDefender7Events;
    else if (position === 'rightDefender7') longPressEvents = rightDefender7Events;
    else if (position === 'leftAttacker7') longPressEvents = leftAttacker7Events;
    else if (position === 'rightAttacker7') longPressEvents = rightAttacker7Events;

    return (
      <div 
        className={`p-2 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {positionName}
          <div>
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-5 w-5 text-rose-400 inline-block" />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-5 w-5 text-emerald-400 inline-block" />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerName(playerId)}</div>
          {playerId && (() => {
            const stats = getPlayerTimeStats(playerId);
            return (
              <div className="text-right text-xs">
                <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                <span className="ml-3"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
              </div>
            );
          })()}
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-0.5">Hold for options</p>
        )}
      </div>
    );
  };

  // Special render function for 7-player individual mode with dual substitution indicators
  const renderIndividual7Position = (position, positionName, icon, renderIndex, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut) => {
    const playerId = periodFormation[position];
    if (!playerId) return null;
    
    const player = allPlayers.find(p => p.id === playerId);
    const isInactive = player?.stats.isInactive || false;
    const isSubstitute = position.includes('substitute');
    
    const isNextOff = playerId === nextPlayerIdToSubOut && !position.includes('substitute');
    const isNextNextOff = playerId === nextNextPlayerIdToSubOut && !position.includes('substitute');
    const isNextOn = position === 'substitute7_1' && !isInactive;
    const isNextNextOn = position === 'substitute7_2' && !isInactive;
    const canBeSelected = [
      'leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7'
    ].includes(position);

    // Check if this player was recently substituted
    const isRecentlySubstituted = recentlySubstitutedPlayers.has(playerId);

    // Animation logic for switching positions
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    if (isAnimating && animationPhase === 'switching') {
      // Check if this is a position switch animation
      if (animationDistances.positionSwitch) {
        if (playerId === animationDistances.player1Id) {
          animationClass = animationDistances.player1Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationDistances.player1Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.player1Distance}px`
          };
        } else if (playerId === animationDistances.player2Id) {
          animationClass = animationDistances.player2Distance > 0 ? 'animate-dynamic-down' : 'animate-dynamic-up';
          zIndexClass = animationDistances.player2Distance > 0 ? 'z-10' : 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.player2Distance}px`
          };
        }
      } else if (isIndividual7Mode) {
        // Check if this is a reactivation/inactivation animation (only substitute positions move)
        const isSubstituteSwapAnimation = animationDistances.sub1ToField === 0;
        
        if (isSubstituteSwapAnimation) {
          // Reactivation or inactivation animation: only substitute positions swap
          // For inactivation: the player being inactivated moves, but becomes inactive after animation
          // For reactivation: only active players move
          if (position === 'substitute7_1') {
            // substitute7_1 moves down to substitute7_2 position
            // This happens during both inactivation (player becomes inactive) and reactivation (active player moves down)
            animationClass = 'animate-dynamic-down';
            zIndexClass = 'z-10';
            styleProps = {
              '--move-distance': `${animationDistances.fieldToSub2}px`
            };
          } else if (position === 'substitute7_2' && (!isInactive || (isInactive && animationDistances.sub2ToSub1 !== 0))) {
            // substitute7_2 moves up to substitute7_1 position
            // Normal case: only if not inactive
            // Special case: if inactive but sub2ToSub1 distance is set, this is a reactivation animation where the inactive player should move
            animationClass = 'animate-dynamic-up';
            zIndexClass = 'z-20';
            styleProps = {
              '--move-distance': `${animationDistances.sub2ToSub1}px`
            };
          }
          // If player is inactive, they get no animation (stay completely still)
        } else {
          // Normal substitution animation
          // CRITICAL: Inactive players never move during animations
          
          // Check if substitute7_2 is inactive to determine where field player should go
          const substitute7_2Player = allPlayers.find(p => p.id === periodFormation.substitute7_2);
          const isSubstitute7_2Inactive = substitute7_2Player?.stats.isInactive || false;
          
          if (isNextOff && !isInactive) {
            // Field player going off - destination depends on whether substitute7_2 is inactive
            animationClass = 'animate-dynamic-down';
            zIndexClass = 'z-10';
            if (isSubstitute7_2Inactive) {
              // If substitute7_2 is inactive, field player goes to substitute7_1 position
              // Use negative sub1ToField distance (field to sub1 instead of sub1 to field)
              styleProps = {
                '--move-distance': `${-animationDistances.sub1ToField}px`
              };
            } else {
              // Normal case: field player goes to substitute7_2 position
              styleProps = {
                '--move-distance': `${animationDistances.fieldToSub2}px`
              };
            }
          } else if (position === 'substitute7_1' && !isInactive) {
            // substitute7_1 moves up to field position (only if not inactive)
            animationClass = 'animate-dynamic-up';
            zIndexClass = 'z-20';
            styleProps = {
              '--move-distance': `${animationDistances.sub1ToField}px`
            };
          } else if (position === 'substitute7_2' && !isInactive) {
            // substitute7_2 moves up to substitute7_1 position (only if not inactive)
            animationClass = 'animate-dynamic-up';
            zIndexClass = 'z-15';
            styleProps = {
              '--move-distance': `${animationDistances.sub2ToSub1}px`
            };
          }
          // If player is inactive, they get no animation (stay completely still)
        }
      } else {
        // Original logic for other modes
        if (isNextOff) {
          animationClass = 'animate-dynamic-down';
          zIndexClass = 'z-10';
          styleProps = {
            '--move-distance': `${animationDistances.nextOffToSub}px`
          };
        } else if (isNextOn) {
          animationClass = 'animate-dynamic-up';
          zIndexClass = 'z-20';
          styleProps = {
            '--move-distance': `${animationDistances.subToNextOff}px`
          };
        }
      }
    }

    let bgColor = 'bg-slate-700'; // Default for substitute
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (!position.includes('substitute')) { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    // Visual styling for inactive players
    if (isInactive) {
      bgColor = 'bg-slate-800'; // Darker background for inactive
      textColor = 'text-slate-500'; // Dimmed text for inactive
      borderColor = 'border-slate-600'; // Subtle border for inactive
    } else {
      // Visual indicators for next and next-next (only for active players)
      if (isNextOff && !hideNextOffIndicator) {
        borderColor = 'border-rose-500';
      } else if (isNextNextOff && !hideNextOffIndicator) {
        borderColor = 'border-rose-200'; // More dimmed red for next-next off
      }
      
      if (isNextOn && !hideNextOffIndicator) {
        borderColor = 'border-emerald-500';
      } else if (isNextNextOn && !hideNextOffIndicator) {
        borderColor = 'border-emerald-200'; // More dimmed green for next-next on
      }
    }

    // Add glow effect for recently substituted players
    if (isRecentlySubstituted && !isInactive) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    let longPressEvents = {};
    if (position === 'leftDefender7') longPressEvents = leftDefender7Events;
    else if (position === 'rightDefender7') longPressEvents = rightDefender7Events;
    else if (position === 'leftAttacker7') longPressEvents = leftAttacker7Events;
    else if (position === 'rightAttacker7') longPressEvents = rightAttacker7Events;
    else if (position === 'substitute7_1') longPressEvents = substitute7_1Events;
    else if (position === 'substitute7_2') longPressEvents = substitute7_2Events;

    return (
      <div 
        className={`p-2 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected || isSubstitute ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {positionName} {isInactive && <span className="text-xs text-slate-600">(Inactive)</span>}
          <div className="flex space-x-1">
            {/* Primary indicators (full opacity) - only show for active players */}
            {!isInactive && isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-5 w-5 text-rose-400 inline-block" />}
            {!isInactive && isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-5 w-5 text-emerald-400 inline-block" />}
            {/* Secondary indicators (very dimmed) - only show for active players */}
            {!isInactive && isNextNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-4 w-4 text-rose-200 opacity-40 inline-block" />}
            {!isInactive && isNextNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-4 w-4 text-emerald-200 opacity-40 inline-block" />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerName(playerId)}</div>
          {playerId && (() => {
            const stats = getPlayerTimeStats(playerId);
            return (
              <div className="text-right text-xs">
                <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                <span className="ml-3"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
              </div>
            );
          })()}
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-0.5">Hold for options</p>
        )}
        {isSubstitute && (
          <p className="text-xs text-slate-400 mt-0.5">Hold to {isInactive ? 'activate' : 'inactivate'}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-300 text-center">Period {currentPeriodNumber}</h2>

      {/* Timers */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-2 bg-slate-700 rounded-lg">
          <p className="text-xs text-sky-200 mb-0.5">Match Clock</p>
          <p className={`text-2xl font-mono ${matchTimerSeconds < 0 ? 'text-red-400' : 'text-sky-400'}`}>
            {matchTimerSeconds < 0 ? '+' : ''}{formatTime(Math.abs(matchTimerSeconds))}
          </p>
        </div>
        <div className="p-2 bg-slate-700 rounded-lg">
          <p className="text-xs text-sky-200 mb-0.5">Substitution Timer</p>
          <p className={`text-2xl font-mono ${alertMinutes > 0 && subTimerSeconds >= alertMinutes * 60 ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatTime(subTimerSeconds)}
          </p>
        </div>
      </div>


      {/* Field & Subs Visualization */}
      <div className="p-2 bg-slate-700 rounded-lg">
        <p className="text-center my-1 text-sky-200">Goalie: <span className="font-semibold">{getPlayerName(periodFormation.goalie)}</span></p>
      </div>
      
      {isPairsMode && (
        <div className="space-y-2">
          {renderPair('leftPair', 'Left', 0)}
          {renderPair('rightPair', 'Right', 1)}
          {renderPair('subPair', 'Substitutes', 2)}
        </div>
      )}

      {isIndividual6Mode && (
        <div className="space-y-2">
          {renderIndividualPosition('leftDefender', 'Left Defender', <Shield className="inline h-3 w-3 mr-1" />, 0)}
          {renderIndividualPosition('rightDefender', 'Right Defender', <Shield className="inline h-3 w-3 mr-1" />, 1)}
          {renderIndividualPosition('leftAttacker', 'Left Attacker', <Sword className="inline h-3 w-3 mr-1" />, 2)}
          {renderIndividualPosition('rightAttacker', 'Right Attacker', <Sword className="inline h-3 w-3 mr-1" />, 3)}
          {renderIndividualPosition('substitute', 'Substitute', <RotateCcw className="inline h-3 w-3 mr-1" />, 4)}
        </div>
      )}

      {isIndividual7Mode && (
        <div className="space-y-2">
          {renderIndividual7Position('leftDefender7', 'Left Defender', <Shield className="inline h-3 w-3 mr-1" />, 0, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('rightDefender7', 'Right Defender', <Shield className="inline h-3 w-3 mr-1" />, 1, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('leftAttacker7', 'Left Attacker', <Sword className="inline h-3 w-3 mr-1" />, 2, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('rightAttacker7', 'Right Attacker', <Sword className="inline h-3 w-3 mr-1" />, 3, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('substitute7_1', (() => {
            const player = allPlayers.find(p => p.id === periodFormation.substitute7_1);
            return player?.stats.isInactive ? 'Inactive' : 'Substitute';
          })(), <RotateCcw className="inline h-3 w-3 mr-1" />, 4, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('substitute7_2', (() => {
            const player = allPlayers.find(p => p.id === periodFormation.substitute7_2);
            return player?.stats.isInactive ? 'Inactive' : 'Substitute';
          })(), <RotateCcw className="inline h-3 w-3 mr-1" />, 5, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Button onClick={handleSubstitutionWithHighlight} Icon={RotateCcw} className="flex-1">
          SUB NOW
        </Button>
        <Button onClick={handleEndPeriod} Icon={Square} variant="danger" className="flex-1">
          End Period
        </Button>
      </div>

      {/* Outfield Player Options Modal */}
      <OutfieldPlayerModal
        isOpen={outfieldPlayerModal.isOpen}
        onSetNext={handleSetNextSubstitution}
        onSubNow={handleSubstituteNow}
        onCancel={handleCancelOutfieldPlayerModal}
        onChangePosition={!isPairsMode ? handleChangePosition : null}
        playerName={outfieldPlayerModal.playerName}
        availablePlayers={outfieldPlayerModal.availablePlayers}
        showPositionChange={!isPairsMode && outfieldPlayerModal.type === 'player'}
        showPositionOptions={outfieldPlayerModal.showPositionOptions}
      />

      {/* Player Inactive Modal */}
      <PlayerInactiveModal
        isOpen={inactiveModal.isOpen}
        onInactivate={handleInactivatePlayer}
        onActivate={handleActivatePlayer}
        onCancel={handleCancelInactive}
        playerName={inactiveModal.playerName}
        isCurrentlyInactive={inactiveModal.isCurrentlyInactive}
      />
    </div>
  );
}