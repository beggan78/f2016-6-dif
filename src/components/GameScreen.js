import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, RotateCcw, Square, Clock } from 'lucide-react';
import { Button, SubstitutionModal } from './UI';

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
  selectedSquadPlayers,
  setNextPhysicalPairToSubOut,
  setNextPlayerToSubOut
}) {
  const teamSize = selectedSquadPlayers?.length || 7;
  const getPlayerName = (id) => allPlayers.find(p => p.id === id)?.name || 'N/A';
  
  // State for substitution confirmation modal
  const [confirmationModal, setConfirmationModal] = React.useState({
    isOpen: false,
    type: null, // 'pair' or 'player'
    target: null, // pairKey or position
    playerName: ''
  });
  
  // State to track if we should substitute immediately after setting next sub
  const [shouldSubstituteNow, setShouldSubstituteNow] = React.useState(false);
  
  // Effect to trigger substitution after state update
  React.useEffect(() => {
    if (shouldSubstituteNow) {
      handleSubstitution();
      setShouldSubstituteNow(false);
    }
  }, [shouldSubstituteNow, nextPhysicalPairToSubOut, nextPlayerToSubOut, handleSubstitution]);

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
    if (['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'].includes(position)) {
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
  
  const leftDefenderEvents = useLongPressAndDoubleClick(() => handlePlayerLongPress('leftDefender'));
  const rightDefenderEvents = useLongPressAndDoubleClick(() => handlePlayerLongPress('rightDefender'));
  const leftAttackerEvents = useLongPressAndDoubleClick(() => handlePlayerLongPress('leftAttacker'));
  const rightAttackerEvents = useLongPressAndDoubleClick(() => handlePlayerLongPress('rightAttacker'));

  const renderPair = (pairKey, pairName) => {
    const pairData = periodFormation[pairKey];
    if (!pairData) return null;
    const isNextOff = pairKey === nextPhysicalPairToSubOut && pairKey !== 'subPair';
    const isNextOn = pairKey === 'subPair';
    const canBeSelected = pairKey === 'leftPair' || pairKey === 'rightPair';

    let bgColor = 'bg-slate-700'; // Default for subs or if logic is off
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';

    if (pairKey === 'leftPair' || pairKey === 'rightPair') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn) {
      borderColor = 'border-emerald-500';
    }

    let longPressEvents = {};
    if (pairKey === 'leftPair') longPressEvents = leftPairEvents;
    else if (pairKey === 'rightPair') longPressEvents = rightPairEvents;

    return (
      <div 
        className={`p-3 rounded-lg shadow-md transition-all border-2 ${borderColor} ${bgColor} ${textColor} ${canBeSelected ? 'cursor-pointer select-none' : ''}`}
        {...longPressEvents}
      >
        <h3 className="text-base font-semibold mb-1.5 flex items-center justify-between">
          {pairName}
          <div>
            {isNextOff && <ArrowDownCircle className="h-6 w-6 text-rose-400 inline-block" />}
            {isNextOn && <ArrowUpCircle className="h-6 w-6 text-emerald-400 inline-block" />}
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

  const renderIndividualPosition = (position, positionName, icon) => {
    const playerId = periodFormation[position];
    if (!playerId) return null;
    
    const isNextOff = teamSize === 6 ? playerId === nextPlayerIdToSubOut : position === nextPlayerToSubOut;
    const isNextOn = position === 'substitute';
    const canBeSelected = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'].includes(position);

    let bgColor = 'bg-slate-700'; // Default for substitute
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';

    if (position !== 'substitute') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn) {
      borderColor = 'border-emerald-500';
    }

    let longPressEvents = {};
    if (position === 'leftDefender') longPressEvents = leftDefenderEvents;
    else if (position === 'rightDefender') longPressEvents = rightDefenderEvents;
    else if (position === 'leftAttacker') longPressEvents = leftAttackerEvents;
    else if (position === 'rightAttacker') longPressEvents = rightAttackerEvents;

    return (
      <div 
        className={`p-3 rounded-lg shadow-md transition-all border-2 ${borderColor} ${bgColor} ${textColor} ${canBeSelected ? 'cursor-pointer select-none' : ''}`}
        {...longPressEvents}
      >
        <h3 className="text-base font-semibold mb-1.5 flex items-center justify-between">
          {positionName}
          <div>
            {isNextOff && <ArrowDownCircle className="h-6 w-6 text-rose-400 inline-block" />}
            {isNextOn && <ArrowUpCircle className="h-6 w-6 text-emerald-400 inline-block" />}
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
      <h2 className="text-xl font-semibold text-sky-300 text-center">Period {currentPeriodNumber} In Progress</h2>

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
          <p className="text-3xl font-mono text-emerald-400">{formatTime(subTimerSeconds)}</p>
        </div>
      </div>


      {/* Field & Subs Visualization */}
      <div className="p-2 bg-slate-700 rounded-lg">
        <p className="text-center my-1 text-sky-200">Goalie: <span className="font-semibold">{getPlayerName(periodFormation.goalie)}</span></p>
      </div>
      
      {teamSize === 7 && (
        <div className="space-y-3">
          {renderPair('leftPair', 'Left')}
          {renderPair('rightPair', 'Right')}
          {renderPair('subPair', 'Substitutes')}
        </div>
      )}

      {teamSize === 6 && (
        <div className="space-y-3">
          {renderIndividualPosition('leftDefender', 'Left Defender', <Shield className="inline h-4 w-4 mr-1" />)}
          {renderIndividualPosition('rightDefender', 'Right Defender', <Shield className="inline h-4 w-4 mr-1" />)}
          {renderIndividualPosition('leftAttacker', 'Left Attacker', <Sword className="inline h-4 w-4 mr-1" />)}
          {renderIndividualPosition('rightAttacker', 'Right Attacker', <Sword className="inline h-4 w-4 mr-1" />)}
          {renderIndividualPosition('substitute', 'Substitute', <RotateCcw className="inline h-4 w-4 mr-1" />)}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Button onClick={handleSubstitution} Icon={RotateCcw} className="flex-1">
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