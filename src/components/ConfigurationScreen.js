    import React from 'react';
import { Settings, Play } from 'lucide-react';
import { Select, Button, Input } from './UI';
import { PERIOD_OPTIONS, DURATION_OPTIONS, ALERT_OPTIONS, FORMATION_TYPES } from '../utils/gameLogic';
import { sanitizeNameInput } from '../utils/inputSanitization';

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
  formationType,
  setFormationType,
  alertMinutes,
  setAlertMinutes,
  handleStartPeriodSetup, 
  selectedSquadPlayers,
  opponentTeamName,
  setOpponentTeamName
}) {
  const togglePlayerSelection = (playerId) => {
    setSelectedSquadIds(prev => {
      const newIds = prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId];
      
      // Auto-set formation type based on squad size
      if (newIds.length === 6) {
        setFormationType(FORMATION_TYPES.INDIVIDUAL_6);
      } else if (newIds.length === 7 && formationType === FORMATION_TYPES.INDIVIDUAL_6) {
        setFormationType(FORMATION_TYPES.PAIRS_7); // Default to pairs for 7-player
      }
      
      return newIds;
    });
  };

  const handleGoalieChange = (period, playerId) => {
    setPeriodGoalieIds(prev => ({ ...prev, [period]: playerId }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Settings className="mr-2 h-6 w-6" />Game & Squad Configuration
      </h2>

      {/* Squad Selection */}
      <div className="p-3 bg-slate-700 rounded-md">
        <h3 className="text-base font-medium text-sky-200 mb-2">Select Squad ({selectedSquadIds.length}/6-7 Players)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allPlayers.map(player => (
            <label key={player.id} className={`flex items-center space-x-2 p-1.5 rounded-md cursor-pointer transition-all ${selectedSquadIds.includes(player.id) ? 'bg-sky-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
              <input
                type="checkbox"
                checked={selectedSquadIds.includes(player.id)}
                onChange={() => togglePlayerSelection(player.id)}
                className="form-checkbox h-5 w-5 text-sky-500 bg-slate-800 border-slate-500 rounded focus:ring-sky-400"
                disabled={selectedSquadIds.length >= 7 && !selectedSquadIds.includes(player.id)}
              />
              <span>{player.name}</span>
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

      {/* Formation Type Selection */}
      {selectedSquadIds.length === 7 && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">Substitution Mode</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="formationType"
                value={FORMATION_TYPES.PAIRS_7}
                checked={formationType === FORMATION_TYPES.PAIRS_7}
                onChange={e => setFormationType(e.target.value)}
                className="form-radio h-4 w-4 text-sky-500 bg-slate-800 border-slate-500 focus:ring-sky-400"
              />
              <div>
                <span className="text-sky-100 font-medium">Pairs</span>
                <p className="text-xs text-slate-400">Players organized in defender-attacker pairs. Substitutions happen at pair level.</p>
              </div>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="formationType"
                value={FORMATION_TYPES.INDIVIDUAL_7}
                checked={formationType === FORMATION_TYPES.INDIVIDUAL_7}
                onChange={e => setFormationType(e.target.value)}
                className="form-radio h-4 w-4 text-sky-500 bg-slate-800 border-slate-500 focus:ring-sky-400"
              />
              <div>
                <span className="text-sky-100 font-medium">Individual</span>
                <p className="text-xs text-slate-400">Individual positions with 2 substitutes. Dual next/next-next visual indicators.</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Goalie Assignment */}
      {(selectedSquadIds.length === 6 || selectedSquadIds.length === 7) && (
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
                  options={selectedSquadPlayers.map(p => ({ value: p.id, label: p.name }))}
                  placeholder="Select Goalie"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <Button 
        onClick={handleStartPeriodSetup} 
        disabled={(selectedSquadIds.length !== 6 && selectedSquadIds.length !== 7) || !Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean)} 
        Icon={Play}
      >
        Proceed to Period Setup
      </Button>
    </div>
  );
}