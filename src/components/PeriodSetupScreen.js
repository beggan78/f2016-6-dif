import React from 'react';
import { Users, Play, Edit3 } from 'lucide-react';
import { Select, Button } from './UI';

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
  numPeriods 
}) {
  const goalieForPeriod = allPlayers.find(p => p.id === periodFormation.goalie);

  const handlePlayerAssignment = (pairKey, role, playerId) => {
    // Ensure player is not already assigned elsewhere in this period's outfield formation
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

  const getAvailableForSelect = (currentPairKey, currentRole) => {
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

  const isFormationComplete = () => {
    const outfielders = [
      periodFormation.leftPair.defender, periodFormation.leftPair.attacker,
      periodFormation.rightPair.defender, periodFormation.rightPair.attacker,
      periodFormation.subPair.defender, periodFormation.subPair.attacker
    ].filter(Boolean);
    return periodFormation.goalie && outfielders.length === 6 && new Set(outfielders).size === 6;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-sky-300 flex items-center">
        <Users className="mr-2 h-6 w-6" />Period {currentPeriodNumber} Team Selection
      </h2>

      <div className="p-4 bg-slate-700 rounded-md">
        <h3 className="text-lg font-medium text-sky-200 mb-2">Goalie for Period {currentPeriodNumber}</h3>
        {goalieForPeriod ? (
          <div className="flex items-center justify-between p-2 bg-sky-600 rounded-md">
            <span className="text-white">{goalieForPeriod.name}</span>
            <Button onClick={() => handleGoalieChangeForCurrentPeriod(null)} size="sm" variant="secondary" Icon={Edit3}>Change</Button>
          </div>
        ) : (
          <Select
            value={periodFormation.goalie || ""}
            onChange={e => handleGoalieChangeForCurrentPeriod(e.target.value)}
            options={selectedSquadPlayers.map(p => ({ value: p.id, label: p.name }))}
            placeholder="Select Goalie for this Period"
          />
        )}
      </div>

      {periodFormation.goalie && (
        <>
          <PairSelectionCard
            title="Left Pair (On Field)"
            pairKey="leftPair"
            pair={periodFormation.leftPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            allPlayers={allPlayers}
          />
          <PairSelectionCard
            title="Right Pair (On Field)"
            pairKey="rightPair"
            pair={periodFormation.rightPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            allPlayers={allPlayers}
          />
          <PairSelectionCard
            title="Substitute Pair"
            pairKey="subPair"
            pair={periodFormation.subPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            allPlayers={allPlayers}
          />
        </>
      )}

      <Button onClick={handleStartGame} disabled={!isFormationComplete()} Icon={Play}>
        Start Period {currentPeriodNumber}
      </Button>
    </div>
  );
}

export function PairSelectionCard({ title, pairKey, pair, onPlayerAssign, getAvailableOptions, allPlayers }) {
  const defenderOptions = getAvailableOptions(pairKey, 'defender');
  const attackerOptions = getAvailableOptions(pairKey, 'attacker');

  return (
    <div className="p-4 bg-slate-700 rounded-md space-y-3">
      <h3 className="text-lg font-medium text-sky-200">{title}</h3>
      <div>
        <label className="block text-sm font-medium text-sky-200 mb-1">Defender</label>
        <Select
          value={pair.defender || ""}
          onChange={e => onPlayerAssign(pairKey, 'defender', e.target.value)}
          options={defenderOptions.map(p => ({ value: p.id, label: p.name }))}
          placeholder="Select Defender"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-sky-200 mb-1">Attacker</label>
        <Select
          value={pair.attacker || ""}
          onChange={e => onPlayerAssign(pairKey, 'attacker', e.target.value)}
          options={attackerOptions.map(p => ({ value: p.id, label: p.name }))}
          placeholder="Select Attacker"
        />
      </div>
    </div>
  );
}