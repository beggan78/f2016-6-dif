import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, RotateCcw, Square, Clock } from 'lucide-react';
import { Button, SubstitutionModal } from './UI';
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
  alertMinutes
}) {
  const getPlayerName = (id) => allPlayers.find(p => p.id === id)?.name || 'N/A';
  
  // Determine which formation mode we're using
  const isPairsMode = formationType === FORMATION_TYPES.PAIRS_7;
  const isIndividual6Mode = formationType === FORMATION_TYPES.INDIVIDUAL_6;
  const isIndividual7Mode = formationType === FORMATION_TYPES.INDIVIDUAL_7;
  
  // State for substitution confirmation modal
  const [confirmationModal, setConfirmationModal] = React.useState({
    isOpen: false,
    type: null, // 'pair' or 'player'
    target: null, // pairKey or position
    playerName: ''
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
  
  // Calculate positions for box switching animation
  const calculateAnimationDistances = React.useCallback(() => {
    let nextOffIndex = -1;
    let subIndex = -1;
    
    if (isPairsMode) {
      // For 7-player pairs mode, find indices of next off pair and sub pair
      const pairs = ['leftPair', 'rightPair', 'subPair'];
      nextOffIndex = pairs.indexOf(nextPhysicalPairToSubOut);
      subIndex = pairs.indexOf('subPair');
    } else if (isIndividual6Mode) {
      // For 6-player mode, find indices of next off position and substitute
      const positions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'];
      nextOffIndex = positions.findIndex(pos => periodFormation[pos] === nextPlayerIdToSubOut);
      subIndex = positions.indexOf('substitute');
    } else if (isIndividual7Mode) {
      // For 7-player individual mode, find indices of next off position and substitute
      const positions = ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'];
      nextOffIndex = positions.findIndex(pos => periodFormation[pos] === nextPlayerIdToSubOut);
      subIndex = positions.indexOf('substitute7_1'); // First substitute is the one coming in
    }
    
    if (nextOffIndex !== -1 && subIndex !== -1) {
      // Calculate distance between boxes with mode-specific measurements
      // p-3 = 24px padding (12px top + 12px bottom)
      // border-2 = 4px border (2px top + 2px bottom) 
      // space-y-3 = 12px gap between boxes
      
      let contentHeight;
      if (isPairsMode) {
        // 7-player pairs: Header ~24px + space-y-1 with 2 player rows ~50px + optional text ~16px = 90px
        contentHeight = 90;
      } else {
        // 6-player or 7-player individual: Header ~24px + 1 player row ~24px + optional text ~16px = 64px  
        contentHeight = 64;
      }
      
      // Total box height: 24px padding + 4px border + content
      const boxHeight = 24 + 4 + contentHeight + 12; // +12 for gap
      const distanceBetween = Math.abs(subIndex - nextOffIndex) * boxHeight;
      
      return {
        nextOffToSub: subIndex > nextOffIndex ? distanceBetween : -distanceBetween,
        subToNextOff: nextOffIndex > subIndex ? distanceBetween : -distanceBetween
      };
    }
    
    return { nextOffToSub: 0, subToNextOff: 0 };
  }, [isPairsMode, isIndividual6Mode, isIndividual7Mode, nextPhysicalPairToSubOut, nextPlayerIdToSubOut, periodFormation]);

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
    
    // Calculate animation distances
    const distances = calculateAnimationDistances();
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
  }, [handleSubstitution, periodFormation, isPairsMode, isIndividual6Mode, isIndividual7Mode, calculateAnimationDistances]);

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
      setConfirmationModal({
        isOpen: true,
        type: 'pair',
        target: pairKey,
        playerName: `${defenderName} & ${attackerName}`
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
      setConfirmationModal({
        isOpen: true,
        type: 'player',
        target: position,
        playerName: playerName
      });
    }
  };

  // Handle substitution modal actions
  const handleSetNextSubstitution = () => {
    if (confirmationModal.type === 'pair') {
      setNextPhysicalPairToSubOut(confirmationModal.target);
    } else if (confirmationModal.type === 'player') {
      setNextPlayerToSubOut(confirmationModal.target);
    }
    setConfirmationModal({ isOpen: false, type: null, target: null, playerName: '' });
  };

  const handleSubstituteNow = () => {
    // First set as next substitution
    if (confirmationModal.type === 'pair') {
      setNextPhysicalPairToSubOut(confirmationModal.target);
    } else if (confirmationModal.type === 'player') {
      setNextPlayerToSubOut(confirmationModal.target);
    }
    // Set flag to trigger substitution after state update
    setShouldSubstituteNow(true);
    setConfirmationModal({ isOpen: false, type: null, target: null, playerName: '' });
  };

  const handleCancelSubstitution = () => {
    setConfirmationModal({ isOpen: false, type: null, target: null, playerName: '' });
  };

  // Hook for handling long press and double click
  const useLongPressAndDoubleClick = (callback, ms = 1000) => {
    const [startLongPress, setStartLongPress] = React.useState(false);
    const callbackRef = React.useRef(callback);

    // Update callback ref when callback changes
    React.useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    React.useEffect(() => {
      let timerId;
      if (startLongPress) {
        timerId = setTimeout(() => {
          callbackRef.current();
        }, ms);
      } else {
        clearTimeout(timerId);
      }

      return () => {
        clearTimeout(timerId);
      };
    }, [ms, startLongPress]);

    return {
      onMouseDown: () => setStartLongPress(true),
      onMouseUp: () => setStartLongPress(false),
      onMouseLeave: () => setStartLongPress(false),
      onTouchStart: () => setStartLongPress(true),
      onTouchEnd: () => setStartLongPress(false),
    };
  };

  // Create long press and double click handlers for each pair and individual position
  const leftPairEvents = useLongPressAndDoubleClick(() => handlePairLongPress('leftPair'));
  const rightPairEvents = useLongPressAndDoubleClick(() => handlePairLongPress('rightPair'));
  
  // 6-player individual mode events
  const leftDefenderEvents = useLongPressAndDoubleClick(() => handlePlayerLongPress('leftDefender'));
  const rightDefenderEvents = useLongPressAndDoubleClick(() => handlePlayerLongPress('rightDefender'));
  const leftAttackerEvents = useLongPressAndDoubleClick(() => handlePlayerLongPress('leftAttacker'));
  const rightAttackerEvents = useLongPressAndDoubleClick(() => handlePlayerLongPress('rightAttacker'));
  
  // 7-player individual mode events
  const leftDefender7Events = useLongPressAndDoubleClick(() => handlePlayerLongPress('leftDefender7'));
  const rightDefender7Events = useLongPressAndDoubleClick(() => handlePlayerLongPress('rightDefender7'));
  const leftAttacker7Events = useLongPressAndDoubleClick(() => handlePlayerLongPress('leftAttacker7'));
  const rightAttacker7Events = useLongPressAndDoubleClick(() => handlePlayerLongPress('rightAttacker7'));

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
        className={`p-3 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-base font-semibold mb-1.5 flex items-center justify-between">
          {pairName}
          <div>
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-6 w-6 text-rose-400 inline-block" />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-6 w-6 text-emerald-400 inline-block" />}
          </div>
        </h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div><Shield className="inline h-4 w-4 mr-1" /> D: {getPlayerName(pairData.defender)}</div>
            {pairData.defender && (() => {
              const stats = getPlayerTimeStats(pairData.defender);
              return (
                <div className="text-right text-sm">
                  <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                  <span className="ml-6"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center justify-between">
            <div><Sword className="inline h-4 w-4 mr-1" /> A: {getPlayerName(pairData.attacker)}</div>
            {pairData.attacker && (() => {
              const stats = getPlayerTimeStats(pairData.attacker);
              return (
                <div className="text-right text-sm">
                  <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                  <span className="ml-6"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
                </div>
              );
            })()}
          </div>
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-1">Hold to set as next sub</p>
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
        className={`p-3 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-base font-semibold mb-1.5 flex items-center justify-between">
          {positionName}
          <div>
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-6 w-6 text-rose-400 inline-block" />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-6 w-6 text-emerald-400 inline-block" />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerName(playerId)}</div>
          {playerId && (() => {
            const stats = getPlayerTimeStats(playerId);
            return (
              <div className="text-right text-sm">
                <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                <span className="ml-3"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
              </div>
            );
          })()}
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-1">Hold to set as next sub</p>
        )}
      </div>
    );
  };

  // Special render function for 7-player individual mode with dual substitution indicators
  const renderIndividual7Position = (position, positionName, icon, renderIndex, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut) => {
    const playerId = periodFormation[position];
    if (!playerId) return null;
    
    const isNextOff = playerId === nextPlayerIdToSubOut;
    const isNextNextOff = playerId === nextNextPlayerIdToSubOut;
    const isNextOn = position === 'substitute7_1';
    const isNextNextOn = position === 'substitute7_2';
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

    let bgColor = 'bg-slate-700'; // Default for substitute
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (!position.includes('substitute')) { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    // Visual indicators for next and next-next
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

    // Add glow effect for recently substituted players
    if (isRecentlySubstituted) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    let longPressEvents = {};
    if (position === 'leftDefender7') longPressEvents = leftDefender7Events;
    else if (position === 'rightDefender7') longPressEvents = rightDefender7Events;
    else if (position === 'leftAttacker7') longPressEvents = leftAttacker7Events;
    else if (position === 'rightAttacker7') longPressEvents = rightAttacker7Events;

    return (
      <div 
        className={`p-3 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-base font-semibold mb-1.5 flex items-center justify-between">
          {positionName}
          <div className="flex space-x-1">
            {/* Primary indicators (full opacity) */}
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-6 w-6 text-rose-400 inline-block" />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-6 w-6 text-emerald-400 inline-block" />}
            {/* Secondary indicators (very dimmed) */}
            {isNextNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-4 w-4 text-rose-200 opacity-40 inline-block" />}
            {isNextNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-4 w-4 text-emerald-200 opacity-40 inline-block" />}
          </div>
        </h3>
        <div className="flex items-center justify-between">
          <div>{icon} {getPlayerName(playerId)}</div>
          {playerId && (() => {
            const stats = getPlayerTimeStats(playerId);
            return (
              <div className="text-right text-sm">
                <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                <span className="ml-3"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
              </div>
            );
          })()}
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-1">Hold to set as next sub</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-300 text-center">Period {currentPeriodNumber}</h2>

      {/* Timers */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-slate-700 rounded-lg">
          <p className="text-sm text-sky-200 mb-1">Match Clock</p>
          <p className={`text-3xl font-mono ${matchTimerSeconds < 0 ? 'text-red-400' : 'text-sky-400'}`}>
            {matchTimerSeconds < 0 ? '+' : ''}{formatTime(Math.abs(matchTimerSeconds))}
          </p>
        </div>
        <div className="p-3 bg-slate-700 rounded-lg">
          <p className="text-sm text-sky-200 mb-1">Substitution Timer</p>
          <p className={`text-3xl font-mono ${alertMinutes > 0 && subTimerSeconds >= alertMinutes * 60 ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatTime(subTimerSeconds)}
          </p>
        </div>
      </div>


      {/* Field & Subs Visualization */}
      <div className="p-2 bg-slate-700 rounded-lg">
        <p className="text-center my-1 text-sky-200">Goalie: <span className="font-semibold">{getPlayerName(periodFormation.goalie)}</span></p>
      </div>
      
      {isPairsMode && (
        <div className="space-y-3">
          {renderPair('leftPair', 'Left', 0)}
          {renderPair('rightPair', 'Right', 1)}
          {renderPair('subPair', 'Substitutes', 2)}
        </div>
      )}

      {isIndividual6Mode && (
        <div className="space-y-3">
          {renderIndividualPosition('leftDefender', 'Left Defender', <Shield className="inline h-4 w-4 mr-1" />, 0)}
          {renderIndividualPosition('rightDefender', 'Right Defender', <Shield className="inline h-4 w-4 mr-1" />, 1)}
          {renderIndividualPosition('leftAttacker', 'Left Attacker', <Sword className="inline h-4 w-4 mr-1" />, 2)}
          {renderIndividualPosition('rightAttacker', 'Right Attacker', <Sword className="inline h-4 w-4 mr-1" />, 3)}
          {renderIndividualPosition('substitute', 'Substitute', <RotateCcw className="inline h-4 w-4 mr-1" />, 4)}
        </div>
      )}

      {isIndividual7Mode && (
        <div className="space-y-3">
          {renderIndividual7Position('leftDefender7', 'Left Defender', <Shield className="inline h-4 w-4 mr-1" />, 0, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('rightDefender7', 'Right Defender', <Shield className="inline h-4 w-4 mr-1" />, 1, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('leftAttacker7', 'Left Attacker', <Sword className="inline h-4 w-4 mr-1" />, 2, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('rightAttacker7', 'Right Attacker', <Sword className="inline h-4 w-4 mr-1" />, 3, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('substitute7_1', 'Substitute (Next)', <RotateCcw className="inline h-4 w-4 mr-1" />, 4, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
          {renderIndividual7Position('substitute7_2', 'Substitute (Next-Next)', <RotateCcw className="inline h-4 w-4 mr-1" />, 5, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut)}
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

      {/* Substitution Options Modal */}
      <SubstitutionModal
        isOpen={confirmationModal.isOpen}
        onSetNext={handleSetNextSubstitution}
        onSubNow={handleSubstituteNow}
        onCancel={handleCancelSubstitution}
        playerName={confirmationModal.playerName}
      />
    </div>
  );
}