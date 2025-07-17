    import React from 'react';
import { Settings, Play, Shuffle } from 'lucide-react';
import { Select, Button, Input } from '../shared/UI';
import { TEAM_MODES } from '../../constants/playerConstants';
import { PERIOD_OPTIONS, DURATION_OPTIONS, ALERT_OPTIONS } from '../../constants/gameConfig';
import { sanitizeNameInput } from '../../utils/inputSanitization';
import { getRandomPlayers, randomizeGoalieAssignments } from '../../utils/debugUtils';
import { formatPlayerName } from '../../utils/formatUtils';

export function ConfigurationScreen({ 
  allPlayers, 
  selectedSquadIds, 
  setSelectedSquadIds, 
  numPeriods, 
  setNumPeriods, 
  periodDurationMinutes, 
  setPeriodDurationMinutes, 
  periodGoalieIds, 
  setPeriodGoalieIds, 
  teamMode,
  setTeamMode,
  alertMinutes,
  setAlertMinutes,
  handleStartPeriodSetup, 
  selectedSquadPlayers,
  opponentTeamName,
  setOpponentTeamName,
  captainId,
  setCaptain,
  debugMode = false
}) {
  const togglePlayerSelection = (playerId) => {
    setSelectedSquadIds(prev => {
      const newIds = prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId];
      
      // Auto-set team mode based on squad size
      if (newIds.length === 5) {
        setTeamMode(TEAM_MODES.INDIVIDUAL_5);
      } else if (newIds.length === 6) {
        setTeamMode(TEAM_MODES.INDIVIDUAL_6);
      } else if (newIds.length === 7 && teamMode === TEAM_MODES.INDIVIDUAL_6) {
        setTeamMode(TEAM_MODES.PAIRS_7); // Default to pairs for 7-player
      } else if (newIds.length === 8) {
        setTeamMode(TEAM_MODES.INDIVIDUAL_8); // Auto-set 8-player individual mode
      }
      
      // Clear captain if the captain is being deselected
      if (captainId && !newIds.includes(captainId)) {
        setCaptain(null);
      }
      
      return newIds;
    });
  };

  const handleGoalieChange = (period, playerId) => {
    setPeriodGoalieIds(prev => ({ ...prev, [period]: playerId }));
  };

  const handleCaptainChange = (playerId) => {
    // Empty string means no captain selected
    const captainId = playerId === "" ? null : playerId;
    
    console.log('[DEBUG] ConfigurationScreen.handleCaptainChange:', {
      selectedValue: playerId,
      captainId: captainId,
      selectedSquadPlayers: selectedSquadPlayers.map(p => ({ id: p.id, name: p.name }))
    });
    
    setCaptain(captainId);
  };

  const randomizeConfiguration = () => {
    // Clear existing selections
    setSelectedSquadIds([]);
    setPeriodGoalieIds({});
    setCaptain(null);
    
    // Randomly select 7 players from roster
    const randomPlayers = getRandomPlayers(allPlayers, 7);
    const randomPlayerIds = randomPlayers.map(p => p.id);
    setSelectedSquadIds(randomPlayerIds);
    
    // Set team mode to PAIRS_7 (default for 7 players)
    setTeamMode(TEAM_MODES.PAIRS_7);
    
    // Randomize goalie assignments (use current numPeriods setting)
    const goalieAssignments = randomizeGoalieAssignments(randomPlayers, numPeriods);
    setPeriodGoalieIds(goalieAssignments);
    
    // Set a random opponent name
    const opponentNames = ['Lions FC', 'Eagles United', 'Sharks', 'Thunder', 'Storm', 'Wildcats'];
    const randomOpponent = opponentNames[Math.floor(Math.random() * opponentNames.length)];
    setOpponentTeamName(randomOpponent);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Settings className="mr-2 h-6 w-6" />Game & Squad Configuration
      </h2>

      {/* Squad Selection */}
      <div className="p-3 bg-slate-700 rounded-md">
        <h3 className="text-base font-medium text-sky-200 mb-2">Select Squad ({selectedSquadIds.length}/6-8 Players)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allPlayers.map(player => (
            <label key={player.id} className={`flex items-center space-x-2 p-1.5 rounded-md cursor-pointer transition-all ${selectedSquadIds.includes(player.id) ? 'bg-sky-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
              <input
                type="checkbox"
                checked={selectedSquadIds.includes(player.id)}
                onChange={() => togglePlayerSelection(player.id)}
                className="form-checkbox h-5 w-5 text-sky-500 bg-slate-800 border-slate-500 rounded focus:ring-sky-400"
                disabled={selectedSquadIds.length >= 8 && !selectedSquadIds.includes(player.id)}
              />
              <span>{formatPlayerName(player)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Opponent Team Name */}
      <div className="p-3 bg-slate-700 rounded-md">
        <label htmlFor="opponentTeam" className="block text-sm font-medium text-sky-200 mb-1">Opponent Team Name</label>
        <Input
          id="opponentTeam"
          value={opponentTeamName}
          onChange={e => setOpponentTeamName(sanitizeNameInput(e.target.value))}
          placeholder="Enter opponent team name (optional)"
          maxLength={50}
        />
        <p className="text-xs text-slate-400 mt-1">Leave empty to use "Opponent"</p>
      </div>

      {/* Game Settings */}
      <div className="p-3 bg-slate-700 rounded-md grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="numPeriods" className="block text-sm font-medium text-sky-200 mb-1">Number of Periods</label>
          <Select value={numPeriods} onChange={e => setNumPeriods(Number(e.target.value))} options={PERIOD_OPTIONS} id="numPeriods" />
        </div>
        <div>
          <label htmlFor="periodDuration" className="block text-sm font-medium text-sky-200 mb-1">Period Duration (minutes)</label>
          <Select value={periodDurationMinutes} onChange={e => setPeriodDurationMinutes(Number(e.target.value))} options={DURATION_OPTIONS} id="periodDuration" />
        </div>
        <div>
          <label htmlFor="alertMinutes" className="block text-sm font-medium text-sky-200 mb-1">Alert - minutes after substitution</label>
          <Select value={alertMinutes} onChange={e => setAlertMinutes(Number(e.target.value))} options={ALERT_OPTIONS} id="alertMinutes" />
        </div>
      </div>

      {/* Team Mode Selection */}
      {selectedSquadIds.length === 7 && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">Substitution Mode</h3>
          <div className="space-y-2">
            {selectedSquadIds.length === 7 && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="teamMode"
                  value={TEAM_MODES.PAIRS_7}
                  checked={teamMode === TEAM_MODES.PAIRS_7}
                  onChange={e => setTeamMode(e.target.value)}
                  className="form-radio h-4 w-4 text-sky-500 bg-slate-800 border-slate-500 focus:ring-sky-400"
                />
                <div>
                  <span className="text-sky-100 font-medium">Pairs</span>
                  <p className="text-xs text-slate-400">Players organized in defender-attacker pairs. Substitutions happen at pair level.</p>
                </div>
              </label>
            )}
            {selectedSquadIds.length === 7 && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="teamMode"
                  value={TEAM_MODES.INDIVIDUAL_7}
                  checked={teamMode === TEAM_MODES.INDIVIDUAL_7}
                  onChange={e => setTeamMode(e.target.value)}
                  className="form-radio h-4 w-4 text-sky-500 bg-slate-800 border-slate-500 focus:ring-sky-400"
                />
                <div>
                  <span className="text-sky-100 font-medium">Individual (7-player)</span>
                  <p className="text-xs text-slate-400">Individual positions with 2 substitutes. Dual next/next-next visual indicators.</p>
                </div>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Goalie Assignment */}
      {(selectedSquadIds.length === 5 || selectedSquadIds.length === 6 || selectedSquadIds.length === 7 || selectedSquadIds.length === 8) && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">Assign Goalies</h3>
          <div className="space-y-2">
            {Array.from({ length: numPeriods }, (_, i) => i + 1).map(period => (
              <div key={period}>
                <label htmlFor={`goalie_p${period}`} className="block text-sm font-medium text-sky-200 mb-1">Period {period} Goalie</label>
                <Select
                  id={`goalie_p${period}`}
                  value={periodGoalieIds[period] || ""}
                  onChange={e => handleGoalieChange(period, e.target.value)}
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
              onChange={e => handleCaptainChange(e.target.value)}
              options={[
                { value: "", label: "No Captain" },
                ...selectedSquadPlayers.map(p => ({ value: p.id, label: formatPlayerName(p) }))
              ]}
            />
            <p className="text-xs text-slate-400 mt-1">Optional - select a team captain for this game</p>
          </div>
        </div>
      )}

      <Button 
        onClick={handleStartPeriodSetup} 
        disabled={(selectedSquadIds.length < 5 || selectedSquadIds.length > 8) || !Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean)} 
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
    </div>
  );
}