import React from 'react';
import { Settings, Play } from 'lucide-react';
import { Select, Button } from './UI';
import { PERIOD_OPTIONS, DURATION_OPTIONS } from '../utils/gameLogic';

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
  handleStartPeriodSetup, 
  selectedSquadPlayers 
}) {
  const togglePlayerSelection = (playerId) => {
    setSelectedSquadIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const handleGoalieChange = (period, playerId) => {
    setPeriodGoalieIds(prev => ({ ...prev, [period]: playerId }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-sky-300 flex items-center">
        <Settings className="mr-2 h-6 w-6" />Game & Squad Configuration
      </h2>

      {/* Squad Selection */}
      <div className="p-4 bg-slate-700 rounded-md">
        <h3 className="text-lg font-medium text-sky-200 mb-2">Select Squad ({selectedSquadIds.length}/7 Players)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allPlayers.map(player => (
            <label key={player.id} className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all ${selectedSquadIds.includes(player.id) ? 'bg-sky-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
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

      {/* Game Settings */}
      <div className="p-4 bg-slate-700 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="numPeriods" className="block text-sm font-medium text-sky-200 mb-1">Number of Periods</label>
          <Select value={numPeriods} onChange={e => setNumPeriods(Number(e.target.value))} options={PERIOD_OPTIONS} id="numPeriods" />
        </div>
        <div>
          <label htmlFor="periodDuration" className="block text-sm font-medium text-sky-200 mb-1">Period Duration (minutes)</label>
          <Select value={periodDurationMinutes} onChange={e => setPeriodDurationMinutes(Number(e.target.value))} options={DURATION_OPTIONS} id="periodDuration" />
        </div>
      </div>

      {/* Goalie Assignment */}
      {selectedSquadIds.length === 7 && (
        <div className="p-4 bg-slate-700 rounded-md">
          <h3 className="text-lg font-medium text-sky-200 mb-2">Assign Goalies</h3>
          <div className="space-y-3">
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
        disabled={selectedSquadIds.length !== 7 || !Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean)} 
        Icon={Play}
      >
        Proceed to Period Setup
      </Button>
    </div>
  );
}