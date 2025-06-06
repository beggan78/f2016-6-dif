import React, { useEffect } from 'react';
import { Users, Play, Edit3, ArrowLeft } from 'lucide-react';
import { Select, Button } from './UI';
import { formatTime } from '../utils/timeCalculations';
import { FORMATION_TYPES } from '../utils/gameLogic';

export function PeriodSetupScreen({ 
  currentPeriodNumber, 
  periodFormation, 
  setPeriodFormation, 
  availableForPairing, 
  allPlayers, 
  handleStartGame, 
  gameLog, 
  selectedSquadPlayers, 
  periodGoalieIds, 
  setPeriodGoalieIds, 
  numPeriods,
  formationType,
  setView 
}) {
  // Determine formation mode
  const isPairsMode = formationType === FORMATION_TYPES.PAIRS_7;
  const isIndividual6Mode = formationType === FORMATION_TYPES.INDIVIDUAL_6;
  const isIndividual7Mode = formationType === FORMATION_TYPES.INDIVIDUAL_7;
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goalieForPeriod = allPlayers.find(p => p.id === periodFormation.goalie);

  const formatTimeDifference = (diffSeconds) => {
    const sign = diffSeconds >= 0 ? '+' : '-';
    const absSeconds = Math.abs(diffSeconds);
    return sign + formatTime(absSeconds);
  };

  const getPlayerLabel = (player) => {
    // Only show accumulated time for periods 2 and 3
    if (currentPeriodNumber > 1) {
      const outfieldTime = formatTime(player.stats.timeOnFieldSeconds);
      const attackDefenderDiff = player.stats.timeAsAttackerSeconds - player.stats.timeAsDefenderSeconds;
      const diffFormatted = formatTimeDifference(attackDefenderDiff);
      
      return `${player.name}  ⏱️ ${outfieldTime}  ⚔️ ${diffFormatted}`;
    }
    return player.name;
  };

  const handlePlayerAssignment = (pairKey, role, playerId) => {
    // If formation is complete, allow player switching
    if (isFormationComplete() && playerId) {
      // Find where the selected player is currently assigned
      let currentPlayerPosition = null;
      ['leftPair', 'rightPair', 'subPair'].forEach(pk => {
        if (periodFormation[pk]?.defender === playerId) {
          currentPlayerPosition = { pairKey: pk, role: 'defender' };
        } else if (periodFormation[pk]?.attacker === playerId) {
          currentPlayerPosition = { pairKey: pk, role: 'attacker' };
        }
      });

      if (currentPlayerPosition) {
        // Get the player currently in the target position
        const currentPlayerInTargetPosition = periodFormation[pairKey]?.[role];
        
        // Swap the players
        setPeriodFormation(prev => ({
          ...prev,
          [pairKey]: { ...prev[pairKey], [role]: playerId },
          [currentPlayerPosition.pairKey]: { 
            ...prev[currentPlayerPosition.pairKey], 
            [currentPlayerPosition.role]: currentPlayerInTargetPosition 
          }
        }));
        return;
      }
    }

    // Original logic for incomplete formation
    const otherAssignments = [];
    ['leftPair', 'rightPair', 'subPair'].forEach(pk => {
      if (pk !== pairKey) {
        if (periodFormation[pk]?.defender) otherAssignments.push(periodFormation[pk].defender);
        if (periodFormation[pk]?.attacker) otherAssignments.push(periodFormation[pk].attacker);
      } else { // current pair, different role
        if (role === 'defender' && periodFormation[pk]?.attacker) otherAssignments.push(periodFormation[pk].attacker);
        if (role === 'attacker' && periodFormation[pk]?.defender) otherAssignments.push(periodFormation[pk].defender);
      }
    });

    if (playerId && otherAssignments.includes(playerId)) {
      alert(`${allPlayers.find(p=>p.id === playerId)?.name || 'Player'} is already assigned. Choose a different player.`);
      return; // Don't update if player is already assigned
    }

    setPeriodFormation(prev => ({
      ...prev,
      [pairKey]: { ...prev[pairKey], [role]: playerId }
    }));
  };

  const handleIndividualPlayerAssignment = (position, playerId) => {
    // If formation is complete, allow player switching
    if (isFormationComplete() && playerId) {
      // Find where the selected player is currently assigned
      let currentPlayerPosition = null;
      ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'].forEach(pos => {
        if (periodFormation[pos] === playerId) {
          currentPlayerPosition = pos;
        }
      });

      if (currentPlayerPosition) {
        // Get the player currently in the target position
        const currentPlayerInTargetPosition = periodFormation[position];
        
        // Swap the players
        setPeriodFormation(prev => ({
          ...prev,
          [position]: playerId,
          [currentPlayerPosition]: currentPlayerInTargetPosition
        }));
        return;
      }
    }

    // Original logic for incomplete formation
    const otherAssignments = [];
    ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'].forEach(pos => {
      if (pos !== position && periodFormation[pos]) {
        otherAssignments.push(periodFormation[pos]);
      }
    });

    if (playerId && otherAssignments.includes(playerId)) {
      alert(`${allPlayers.find(p=>p.id === playerId)?.name || 'Player'} is already assigned. Choose a different player.`);
      return;
    }

    setPeriodFormation(prev => ({
      ...prev,
      [position]: playerId
    }));
  };

  const handleIndividual7PlayerAssignment = (position, playerId) => {
    // If formation is complete, allow player switching
    if (isFormationComplete() && playerId) {
      // Find where the selected player is currently assigned
      let currentPlayerPosition = null;
      ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'].forEach(pos => {
        if (periodFormation[pos] === playerId) {
          currentPlayerPosition = pos;
        }
      });

      if (currentPlayerPosition) {
        // Get the player currently in the target position
        const currentPlayerInTargetPosition = periodFormation[position];
        
        // Swap the players
        setPeriodFormation(prev => ({
          ...prev,
          [position]: playerId,
          [currentPlayerPosition]: currentPlayerInTargetPosition
        }));
        return;
      }
    }

    // Original logic for incomplete formation
    const otherAssignments = [];
    ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'].forEach(pos => {
      if (pos !== position && periodFormation[pos]) {
        otherAssignments.push(periodFormation[pos]);
      }
    });

    if (playerId && otherAssignments.includes(playerId)) {
      alert(`${allPlayers.find(p=>p.id === playerId)?.name || 'Player'} is already assigned. Choose a different player.`);
      return;
    }

    setPeriodFormation(prev => ({
      ...prev,
      [position]: playerId
    }));
  };

  const getAvailableForSelect = (currentPairKey, currentRole) => {
    // If formation is complete, show all players except goalie
    if (isFormationComplete()) {
      return availableForPairing;
    }

    // Original logic for incomplete formation
    const assignedElsewhereIds = new Set();
    ['leftPair', 'rightPair', 'subPair'].forEach(pk => {
      const pair = periodFormation[pk];
      if (pair) {
        if (pk !== currentPairKey || (pk === currentPairKey && currentRole !== 'defender')) {
          if (pair.defender) assignedElsewhereIds.add(pair.defender);
        }
        if (pk !== currentPairKey || (pk === currentPairKey && currentRole !== 'attacker')) {
          if (pair.attacker) assignedElsewhereIds.add(pair.attacker);
        }
      }
    });
    return availableForPairing.filter(p => !assignedElsewhereIds.has(p.id));
  };

  const handleGoalieChangeForCurrentPeriod = (playerId) => {
    setPeriodGoalieIds(prev => ({ ...prev, [currentPeriodNumber]: playerId }));
    // Also update the periodFormation.goalie immediately
    setPeriodFormation(prev => ({
      ...prev,
      goalie: playerId,
      // Potentially clear pairs if new goalie was in one, or let user resolve
      // For simplicity, just update goalie. User must re-evaluate pairs.
    }));
  };

  const getAvailableForIndividualSelect = (currentPosition) => {
    // If formation is complete, show all players except goalie
    if (isFormationComplete()) {
      return availableForPairing;
    }

    // Original logic for incomplete formation
    const assignedElsewhereIds = new Set();
    ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute'].forEach(pos => {
      if (pos !== currentPosition && periodFormation[pos]) {
        assignedElsewhereIds.add(periodFormation[pos]);
      }
    });
    return availableForPairing.filter(p => !assignedElsewhereIds.has(p.id));
  };

  const getAvailableForIndividual7Select = (currentPosition) => {
    // If formation is complete, show all players except goalie
    if (isFormationComplete()) {
      return availableForPairing;
    }

    // Original logic for incomplete formation
    const assignedElsewhereIds = new Set();
    ['leftDefender7', 'rightDefender7', 'leftAttacker7', 'rightAttacker7', 'substitute7_1', 'substitute7_2'].forEach(pos => {
      if (pos !== currentPosition && periodFormation[pos]) {
        assignedElsewhereIds.add(periodFormation[pos]);
      }
    });
    return availableForPairing.filter(p => !assignedElsewhereIds.has(p.id));
  };

  const isFormationComplete = () => {
    if (isPairsMode) {
      const outfielders = [
        periodFormation.leftPair.defender, periodFormation.leftPair.attacker,
        periodFormation.rightPair.defender, periodFormation.rightPair.attacker,
        periodFormation.subPair.defender, periodFormation.subPair.attacker
      ].filter(Boolean);
      return periodFormation.goalie && outfielders.length === 6 && new Set(outfielders).size === 6;
    } else if (isIndividual6Mode) {
      const outfielders = [
        periodFormation.leftDefender, periodFormation.rightDefender,
        periodFormation.leftAttacker, periodFormation.rightAttacker,
        periodFormation.substitute
      ].filter(Boolean);
      return periodFormation.goalie && outfielders.length === 5 && new Set(outfielders).size === 5;
    } else if (isIndividual7Mode) {
      const outfielders = [
        periodFormation.leftDefender7, periodFormation.rightDefender7,
        periodFormation.leftAttacker7, periodFormation.rightAttacker7,
        periodFormation.substitute7_1, periodFormation.substitute7_2
      ].filter(Boolean);
      return periodFormation.goalie && outfielders.length === 6 && new Set(outfielders).size === 6;
    }
    return false;
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Users className="mr-2 h-6 w-6" />Period {currentPeriodNumber} Team Selection
      </h2>

      <div className="p-2 bg-slate-700 rounded-md">
        <h3 className="text-sm font-medium text-sky-200 mb-1">Goalie for Period {currentPeriodNumber}</h3>
        {goalieForPeriod ? (
          <div className="flex items-center justify-between p-1 bg-sky-600 rounded-md">
            <span className="text-white">{goalieForPeriod.name}</span>
            <Button onClick={() => handleGoalieChangeForCurrentPeriod(null)} size="sm" variant="secondary" Icon={Edit3}>Change</Button>
          </div>
        ) : (
          <Select
            value={periodFormation.goalie || ""}
            onChange={e => handleGoalieChangeForCurrentPeriod(e.target.value)}
            options={selectedSquadPlayers.map(p => ({ value: p.id, label: getPlayerLabel(p) }))}
            placeholder="Select Goalie for this Period"
          />
        )}
      </div>

      {periodFormation.goalie && isPairsMode && (
        <>
          <PairSelectionCard
            title="Left"
            pairKey="leftPair"
            pair={periodFormation.leftPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            getPlayerLabel={getPlayerLabel}
          />
          <PairSelectionCard
            title="Right"
            pairKey="rightPair"
            pair={periodFormation.rightPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            getPlayerLabel={getPlayerLabel}
          />
          <PairSelectionCard
            title="Substitutes"
            pairKey="subPair"
            pair={periodFormation.subPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            getPlayerLabel={getPlayerLabel}
          />
        </>
      )}

      {periodFormation.goalie && isIndividual6Mode && (
        <>
          <IndividualPositionCard
            title="Left Defender"
            position="leftDefender"
            playerId={periodFormation.leftDefender}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Right Defender"
            position="rightDefender"
            playerId={periodFormation.rightDefender}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Left Attacker"
            position="leftAttacker"
            playerId={periodFormation.leftAttacker}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Right Attacker"
            position="rightAttacker"
            playerId={periodFormation.rightAttacker}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Substitute"
            position="substitute"
            playerId={periodFormation.substitute}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            getPlayerLabel={getPlayerLabel}
          />
        </>
      )}

      {periodFormation.goalie && isIndividual7Mode && (
        <>
          <IndividualPositionCard
            title="Left Defender"
            position="leftDefender7"
            playerId={periodFormation.leftDefender7}
            onPlayerAssign={handleIndividual7PlayerAssignment}
            getAvailableOptions={getAvailableForIndividual7Select}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Right Defender"
            position="rightDefender7"
            playerId={periodFormation.rightDefender7}
            onPlayerAssign={handleIndividual7PlayerAssignment}
            getAvailableOptions={getAvailableForIndividual7Select}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Left Attacker"
            position="leftAttacker7"
            playerId={periodFormation.leftAttacker7}
            onPlayerAssign={handleIndividual7PlayerAssignment}
            getAvailableOptions={getAvailableForIndividual7Select}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Right Attacker"
            position="rightAttacker7"
            playerId={periodFormation.rightAttacker7}
            onPlayerAssign={handleIndividual7PlayerAssignment}
            getAvailableOptions={getAvailableForIndividual7Select}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Substitute (Next)"
            position="substitute7_1"
            playerId={periodFormation.substitute7_1}
            onPlayerAssign={handleIndividual7PlayerAssignment}
            getAvailableOptions={getAvailableForIndividual7Select}
            getPlayerLabel={getPlayerLabel}
          />
          <IndividualPositionCard
            title="Substitute (Next-Next)"
            position="substitute7_2"
            playerId={periodFormation.substitute7_2}
            onPlayerAssign={handleIndividual7PlayerAssignment}
            getAvailableOptions={getAvailableForIndividual7Select}
            getPlayerLabel={getPlayerLabel}
          />
        </>
      )}

      <Button onClick={handleStartGame} disabled={!isFormationComplete()} Icon={Play}>
        Start Period {currentPeriodNumber}
      </Button>
      
      <Button onClick={() => setView('config')} Icon={ArrowLeft}>
        Back to Configuration
      </Button>
    </div>
  );
}

export function PairSelectionCard({ title, pairKey, pair, onPlayerAssign, getAvailableOptions, getPlayerLabel }) {
  const defenderOptions = getAvailableOptions(pairKey, 'defender');
  const attackerOptions = getAvailableOptions(pairKey, 'attacker');

  // Use same colors as GameScreen: sky for on-field, slate for substitutes
  const isSubstitute = pairKey === 'subPair';
  const bgColor = isSubstitute ? 'bg-slate-700' : 'bg-sky-700';
  const headerColor = isSubstitute ? 'text-slate-200' : 'text-sky-200';

  return (
    <div className={`p-2 ${bgColor} rounded-md space-y-1.5`}>
      <h3 className={`text-sm font-medium ${headerColor}`}>{title}</h3>
      <div>
        <label className={`block text-xs font-medium ${headerColor} mb-0.5`}>Defender</label>
        <Select
          value={pair.defender || ""}
          onChange={e => onPlayerAssign(pairKey, 'defender', e.target.value)}
          options={defenderOptions.map(p => ({ value: p.id, label: getPlayerLabel(p) }))}
          placeholder="Select Defender"
        />
      </div>
      <div>
        <label className={`block text-xs font-medium ${headerColor} mb-0.5`}>Attacker</label>
        <Select
          value={pair.attacker || ""}
          onChange={e => onPlayerAssign(pairKey, 'attacker', e.target.value)}
          options={attackerOptions.map(p => ({ value: p.id, label: getPlayerLabel(p) }))}
          placeholder="Select Attacker"
        />
      </div>
    </div>
  );
}

export function IndividualPositionCard({ title, position, playerId, onPlayerAssign, getAvailableOptions, getPlayerLabel }) {
  const availableOptions = getAvailableOptions(position);

  // Use same colors as GameScreen: sky for on-field, slate for substitutes
  const isSubstitute = position === 'substitute' || position === 'substitute7_1' || position === 'substitute7_2';
  const bgColor = isSubstitute ? 'bg-slate-700' : 'bg-sky-700';
  const headerColor = isSubstitute ? 'text-slate-200' : 'text-sky-200';

  return (
    <div className={`p-2 ${bgColor} rounded-md`}>
      <h3 className={`text-sm font-medium ${headerColor} mb-1.5`}>{title}</h3>
      <Select
        value={playerId || ""}
        onChange={e => onPlayerAssign(position, e.target.value)}
        options={availableOptions.map(p => ({ value: p.id, label: getPlayerLabel(p) }))}
        placeholder={`Select ${title}`}
      />
    </div>
  );
}