import React, { useEffect } from 'react';
import { Users, Play, ArrowLeft, Shuffle } from 'lucide-react';
import { Select, Button } from '../shared/UI';
import { TEAM_MODES } from '../../constants/playerConstants';
import { getPlayerLabel } from '../../utils/formatUtils';
import { randomizeFormationPositions } from '../../utils/debugUtils';
import { getOutfieldPositions, isIndividual6Mode, isIndividual7Mode, isIndividual8Mode } from '../../constants/gameModes';

export function PeriodSetupScreen({ 
  currentPeriodNumber, 
  formation,
  setFormation,
  availableForPairing, 
  allPlayers, 
  handleStartGame, 
  gameLog, 
  selectedSquadPlayers, 
  periodGoalieIds, 
  setPeriodGoalieIds, 
  numPeriods,
  teamMode,
  setView,
  homeScore,
  awayScore,
  opponentTeamName,
  rotationQueue,
  setRotationQueue,
  debugMode = false
}) {
  // Determine formation mode
  const isPairsMode = teamMode === TEAM_MODES.PAIRS_7;
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  const handlePlayerAssignment = (pairKey, role, playerId) => {
    // If formation is complete, allow player switching
    if (isFormationComplete() && playerId) {
      // Find where the selected player is currently assigned
      let currentPlayerPosition = null;
      ['leftPair', 'rightPair', 'subPair'].forEach(pk => {
        if (formation[pk]?.defender === playerId) {
          currentPlayerPosition = { pairKey: pk, role: 'defender' };
        } else if (formation[pk]?.attacker === playerId) {
          currentPlayerPosition = { pairKey: pk, role: 'attacker' };
        }
      });

      if (currentPlayerPosition) {
        // Get the player currently in the target position
        const currentPlayerInTargetPosition = formation[pairKey]?.[role];
        
        // Swap the players
        setFormation(prev => ({
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
        if (formation[pk]?.defender) otherAssignments.push(formation[pk].defender);
        if (formation[pk]?.attacker) otherAssignments.push(formation[pk].attacker);
      } else { // current pair, different role
        if (role === 'defender' && formation[pk]?.attacker) otherAssignments.push(formation[pk].attacker);
        if (role === 'attacker' && formation[pk]?.defender) otherAssignments.push(formation[pk].defender);
      }
    });

    if (playerId && otherAssignments.includes(playerId)) {
      alert(`${allPlayers.find(p=>p.id === playerId)?.name || 'Player'} is already assigned. Choose a different player.`);
      return; // Don't update if player is already assigned
    }

    setFormation(prev => ({
      ...prev,
      [pairKey]: { ...prev[pairKey], [role]: playerId }
    }));
  };

  const handleIndividualPlayerAssignment = (position, playerId) => {
    // If formation is complete, allow player switching
    if (isFormationComplete() && playerId) {
      // Find where the selected player is currently assigned
      let currentPlayerPosition = null;
      getOutfieldPositions(teamMode).forEach(pos => {
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
    getOutfieldPositions(teamMode).forEach(pos => {
      if (pos !== position && formation[pos]) {
        otherAssignments.push(formation[pos]);
      }
    });

    if (playerId && otherAssignments.includes(playerId)) {
      alert(`${allPlayers.find(p=>p.id === playerId)?.name || 'Player'} is already assigned. Choose a different player.`);
      return;
    }

    setFormation(prev => ({
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
      const pair = formation[pk];
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
    const formerGoalieId = formation.goalie;
    
    // Add automatic position swapping when formation is complete (like other position handlers)
    if (isFormationComplete() && playerId && formerGoalieId) {
      
      // Find where the new goalie is currently assigned
      let newGoalieCurrentPosition = null;
      
      if (isPairsMode) {
        // Search pairs mode positions
        ['leftPair', 'rightPair', 'subPair'].forEach(pairKey => {
          if (formation[pairKey]?.defender === playerId) {
            newGoalieCurrentPosition = { pairKey, role: 'defender' };
          } else if (formation[pairKey]?.attacker === playerId) {
            newGoalieCurrentPosition = { pairKey, role: 'attacker' };
          }
        });
      } else {
        // Search individual mode positions (supports both 6 and 7 player modes)
        getOutfieldPositions(teamMode).forEach(position => {
          if (formation[position] === playerId) {
            newGoalieCurrentPosition = { position };
          }
        });
      }
      
      if (newGoalieCurrentPosition) {
        
        // Perform the position swap
        if (isPairsMode) {
          // Pairs mode: update nested object structure
          setFormation(prev => ({
            ...prev,
            goalie: playerId,
            [newGoalieCurrentPosition.pairKey]: {
              ...prev[newGoalieCurrentPosition.pairKey],
              [newGoalieCurrentPosition.role]: formerGoalieId
            }
          }));
        } else {
          // Individual modes: update flat structure
          setFormation(prev => ({
            ...prev,
            goalie: playerId,
            [newGoalieCurrentPosition.position]: formerGoalieId
          }));
        }
        
        // Still update goalie IDs for period tracking
        setPeriodGoalieIds(prev => ({ ...prev, [currentPeriodNumber]: playerId }));
        
        // Continue with existing rotation queue logic below
      }
    }
    
    // If no swapping occurred, use original logic
    let swapOccurred = false;
    if (isFormationComplete() && playerId && formerGoalieId) {
      // Check if we found the new goalie in a field position
      if (isPairsMode) {
        swapOccurred = ['leftPair', 'rightPair', 'subPair'].some(pk => 
          formation[pk]?.defender === playerId || formation[pk]?.attacker === playerId);
      } else {
        // Check individual mode positions (supports both 6 and 7 player modes)
        swapOccurred = getOutfieldPositions(teamMode).some(pos =>
          formation[pos] === playerId);
      }
    }
    
    if (!swapOccurred) {
      
      setPeriodGoalieIds(prev => ({ ...prev, [currentPeriodNumber]: playerId }));
      // Also update the formation.goalie immediately
      setFormation(prev => ({
        ...prev,
        goalie: playerId,
        // Potentially clear pairs if new goalie was in one, or let user resolve
        // For simplicity, just update goalie. User must re-evaluate pairs.
      }));
    }

    // Update rotation queue if it exists and we're in individual modes (periods 2+)
    if (rotationQueue && rotationQueue.length > 0 && teamMode !== TEAM_MODES.PAIRS_7) {
      const newGoalieIndex = rotationQueue.findIndex(id => id === playerId);
      
      if (newGoalieIndex !== -1) {
        // New goalie is in the rotation queue
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
    getOutfieldPositions(teamMode).forEach(pos => {
      if (pos !== currentPosition && formation[pos]) {
        assignedElsewhereIds.add(formation[pos]);
      }
    });
    return availableForPairing.filter(p => !assignedElsewhereIds.has(p.id));
  };

  const isFormationComplete = () => {
    if (isPairsMode) {
      const outfielders = [
        formation.leftPair.defender, formation.leftPair.attacker,
        formation.rightPair.defender, formation.rightPair.attacker,
        formation.subPair.defender, formation.subPair.attacker
      ].filter(Boolean);
      return formation.goalie && outfielders.length === 6 && new Set(outfielders).size === 6;
    } else {
      // Individual modes (6 or 7 players) - use configuration-driven validation
      const outfieldPositions = getOutfieldPositions(teamMode);
      const outfielders = outfieldPositions.map(pos => formation[pos]).filter(Boolean);
      const expectedCount = outfieldPositions.length;
      return formation.goalie && outfielders.length === expectedCount && new Set(outfielders).size === expectedCount;
    }
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

    // Generate random formation based on team mode
    const randomFormation = randomizeFormationPositions(availablePlayers, teamMode);
    
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
            <div className="text-2xl font-bold text-sky-400">{homeScore}</div>
            <div className="text-xs text-slate-300 font-semibold">Djurgården</div>
          </div>
          <div className="text-xl font-mono font-bold text-slate-400">-</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-400">{awayScore}</div>
            <div className="text-xs text-slate-300 font-semibold">{opponentTeamName || 'Opponent'}</div>
          </div>
        </div>
      </div>

      <div className="p-2 bg-slate-700 rounded-md">
        <h3 className="text-sm font-medium text-sky-200 mb-1">Goalie for Period {currentPeriodNumber}</h3>
        <Select
          value={formation.goalie || ""}
          onChange={e => handleGoalieChangeForCurrentPeriod(e.target.value)}
          options={selectedSquadPlayers.map(p => ({ value: p.id, label: getPlayerLabel(p, currentPeriodNumber) }))}
          placeholder="Select Goalie for this Period"
        />
      </div>

      {formation.goalie && isPairsMode && (
        <>
          <PairSelectionCard
            title="Left"
            pairKey="leftPair"
            pair={formation.leftPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <PairSelectionCard
            title="Right"
            pairKey="rightPair"
            pair={formation.rightPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <PairSelectionCard
            title="Substitutes"
            pairKey="subPair"
            pair={formation.subPair}
            onPlayerAssign={handlePlayerAssignment}
            getAvailableOptions={getAvailableForSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
        </>
      )}

      {formation.goalie && isIndividual6Mode(teamMode) && (
        <>
          <IndividualPositionCard
            title="Left Defender"
            position="leftDefender"
            playerId={formation.leftDefender}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Right Defender"
            position="rightDefender"
            playerId={formation.rightDefender}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Left Attacker"
            position="leftAttacker"
            playerId={formation.leftAttacker}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Right Attacker"
            position="rightAttacker"
            playerId={formation.rightAttacker}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Substitute"
            position="substitute_1"
            playerId={formation.substitute_1}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
        </>
      )}

      {formation.goalie && isIndividual7Mode(teamMode) && (
        <>
          <IndividualPositionCard
            title="Left Defender"
            position="leftDefender"
            playerId={formation.leftDefender}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Right Defender"
            position="rightDefender"
            playerId={formation.rightDefender}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Left Attacker"
            position="leftAttacker"
            playerId={formation.leftAttacker}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Right Attacker"
            position="rightAttacker"
            playerId={formation.rightAttacker}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Substitute" // Please never change this title! But yes, it is the NEXT to sub in
            position="substitute_1"
            playerId={formation.substitute_1}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Substitute"  // Please never change this title! But yes, it is the NEXT-NEXT to sub in
            position="substitute_2"
            playerId={formation.substitute_2}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
        </>
      )}

      {formation.goalie && isIndividual8Mode(teamMode) && (
        <>
          <IndividualPositionCard
            title="Left Defender"
            position="leftDefender"
            playerId={formation.leftDefender}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Right Defender"
            position="rightDefender"
            playerId={formation.rightDefender}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Left Attacker"
            position="leftAttacker"
            playerId={formation.leftAttacker}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Right Attacker"
            position="rightAttacker"
            playerId={formation.rightAttacker}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Substitute" // Next to substitute in
            position="substitute_1"
            playerId={formation.substitute_1}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Substitute" // Second to substitute in
            position="substitute_2"
            playerId={formation.substitute_2}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
          <IndividualPositionCard
            title="Substitute" // Third to substitute in
            position="substitute_3"
            playerId={formation.substitute_3}
            onPlayerAssign={handleIndividualPlayerAssignment}
            getAvailableOptions={getAvailableForIndividualSelect}
            currentPeriodNumber={currentPeriodNumber}
          />
        </>
      )}

      <Button onClick={handleStartGame} disabled={!isFormationComplete()} Icon={Play}>
        Start Period {currentPeriodNumber}
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
    </div>
  );
}

export function PairSelectionCard({ title, pairKey, pair, onPlayerAssign, getAvailableOptions, currentPeriodNumber }) {
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
          options={defenderOptions.map(p => ({ value: p.id, label: getPlayerLabel(p, currentPeriodNumber) }))}
          placeholder="Select Defender"
        />
      </div>
      <div>
        <label className={`block text-xs font-medium ${headerColor} mb-0.5`}>Attacker</label>
        <Select
          value={pair.attacker || ""}
          onChange={e => onPlayerAssign(pairKey, 'attacker', e.target.value)}
          options={attackerOptions.map(p => ({ value: p.id, label: getPlayerLabel(p, currentPeriodNumber) }))}
          placeholder="Select Attacker"
        />
      </div>
    </div>
  );
}

export function IndividualPositionCard({ title, position, playerId, onPlayerAssign, getAvailableOptions, currentPeriodNumber }) {
  const availableOptions = getAvailableOptions(position);

  // Use same colors as GameScreen: sky for on-field, slate for substitutes
  const isSubstitute = position === 'substitute_1' || position === 'substitute_2' || position === 'substitute_3';
  const bgColor = isSubstitute ? 'bg-slate-700' : 'bg-sky-700';
  const headerColor = isSubstitute ? 'text-slate-200' : 'text-sky-200';

  return (
    <div className={`p-2 ${bgColor} rounded-md`}>
      <h3 className={`text-sm font-medium ${headerColor} mb-1.5`}>{title}</h3>
      <Select
        value={playerId || ""}
        onChange={e => onPlayerAssign(position, e.target.value)}
        options={availableOptions.map(p => ({ value: p.id, label: getPlayerLabel(p, currentPeriodNumber) }))}
        placeholder={`Select ${title}`}
      />
    </div>
  );
}