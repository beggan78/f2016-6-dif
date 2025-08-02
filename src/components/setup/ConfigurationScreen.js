    import React, { useState, useEffect } from 'react';
import { Settings, Play, Shuffle, Cloud, Upload } from 'lucide-react';
import { Select, Button, Input } from '../shared/UI';
import { TEAM_MODES } from '../../constants/playerConstants';
import { PERIOD_OPTIONS, DURATION_OPTIONS, ALERT_OPTIONS } from '../../constants/gameConfig';
import { sanitizeNameInput } from '../../utils/inputSanitization';
import { getRandomPlayers, randomizeGoalieAssignments } from '../../utils/debugUtils';
import { formatPlayerName } from '../../utils/formatUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { TeamManagement } from '../team/TeamManagement';
import { dataSyncManager } from '../../utils/DataSyncManager';
import { FeatureGate } from '../auth/FeatureGate';

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
  debugMode = false,
  authModal
}) {
  const { isAuthenticated, user } = useAuth();
  const { currentTeam, teamPlayers, hasTeams, hasClubs } = useTeam();
  const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', error: null });
  const [showMigration, setShowMigration] = useState(false);

  // Update DataSyncManager when user changes
  useEffect(() => {
    if (user?.id) {
      dataSyncManager.setUserId(user.id);
      
      // Check if user has local data that could be migrated
      const localMatches = dataSyncManager.getLocalMatches();
      setShowMigration(localMatches.length > 0);
    } else {
      dataSyncManager.setUserId(null);
      setShowMigration(false);
    }
  }, [user]);

  // Determine which players to show
  const playersToShow = isAuthenticated && currentTeam && teamPlayers.length > 0 
    ? teamPlayers.map(player => ({ 
        id: player.id, 
        name: player.name, 
        jerseyNumber: player.jersey_number 
      }))
    : allPlayers;

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
      } else if (newIds.length === 9) {
        setTeamMode(TEAM_MODES.INDIVIDUAL_9); // Auto-set 9-player individual mode
      } else if (newIds.length === 10) {
        setTeamMode(TEAM_MODES.INDIVIDUAL_10); // Auto-set 10-player individual mode
      }
      
      // Clear captain if the captain is being deselected
      if (captainId && !newIds.includes(captainId)) {
        setCaptain(null);
      }
      
      return newIds;
    });
  };

  const handleGoalieChange = (period, playerId) => {
    setPeriodGoalieIds(prev => {
      const newGoalieIds = { ...prev, [period]: playerId };
      if (period === 1) {
        for (let i = 2; i <= numPeriods; i++) {
          if (prev[i] === prev[1] || !prev[i]) {
            newGoalieIds[i] = playerId;
          }
        }
      }
      return newGoalieIds;
    });
  };

  const handleCaptainChange = (playerId) => {
    // Empty string means no captain selected
    const captainId = playerId === "" ? null : playerId;
    
    setCaptain(captainId);
  };

  const randomizeConfiguration = () => {
    // Clear existing selections
    setSelectedSquadIds([]);
    setPeriodGoalieIds({});
    setCaptain(null);
    
    // Randomly select 7 players from roster
    const randomPlayers = getRandomPlayers(playersToShow, 7);
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

  const handleMigrateData = async () => {
    setSyncStatus({ loading: true, message: 'Migrating local data to cloud...', error: null });
    
    try {
      const result = await dataSyncManager.migrateLocalDataToCloud();
      
      if (result.success) {
        setSyncStatus({
          loading: false,
          message: result.message,
          error: null
        });
        setShowMigration(false);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSyncStatus({ loading: false, message: '', error: null });
        }, 5000);
      } else {
        setSyncStatus({
          loading: false,
          message: '',
          error: result.error || 'Migration failed'
        });
      }
    } catch (error) {
      setSyncStatus({
        loading: false,
        message: '',
        error: 'Migration failed: ' + error.message
      });
    }
  };

  const handleDismissMigration = () => {
    setShowMigration(false);
  };

  // Show team management for authenticated users who need to set up teams
  // If user has no clubs at all, they need to create/join a club first
  // If user has clubs but no teams, they need to create/join a team
  if (isAuthenticated && (!hasClubs || (hasClubs && !hasTeams) || !currentTeam)) {
    return (
      <div className="space-y-4">
        <TeamManagement />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAuthenticated && currentTeam && (
        <div className="p-3 bg-sky-600/20 border border-sky-500 rounded-lg">
          <div className="text-sky-200 font-medium">Team: {currentTeam.club?.name} {currentTeam.name}</div>
        </div>
      )}

      {/* Cloud Data Sync Section */}
      {isAuthenticated ? (
        <div className="space-y-3">
          {/* Data Migration Alert */}
          {showMigration && (
            <div className="p-4 bg-emerald-900/30 border border-emerald-600/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-300 text-sm">Migrate Local Data</h3>
                  <p className="text-emerald-200 text-sm mt-1">
                    We found match history saved locally. Would you like to sync it to your cloud account?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={handleMigrateData}
                      variant="primary"
                      size="sm"
                      disabled={syncStatus.loading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {syncStatus.loading ? 'Migrating...' : 'Migrate Data'}
                    </Button>
                    <Button
                      onClick={handleDismissMigration}
                      variant="secondary"
                      size="sm"
                      disabled={syncStatus.loading}
                    >
                      Later
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Status Messages */}
          {syncStatus.message && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-600 rounded-lg">
              <p className="text-emerald-200 text-sm">✓ {syncStatus.message}</p>
            </div>
          )}
          
          {syncStatus.error && (
            <div className="p-3 bg-rose-900/20 border border-rose-600 rounded-lg">
              <p className="text-rose-200 text-sm">❌ {syncStatus.error}</p>
            </div>
          )}
        </div>
      ) : (
        /* Cloud Sync Features for Anonymous Users */
        <FeatureGate
          feature="cloud synchronization"
          description="Save your team, configurations and match data. Access your data from any device and unlock season statistics."
          variant="inline"
          authModal={authModal}
        >
          <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg opacity-50">
            <div className="flex items-center space-x-3">
              <Cloud className="w-8 h-8 text-slate-400" />
              <div>
                <div className="text-slate-300 font-medium">Cloud Sync Available</div>
                <div className="text-slate-400 text-sm">Keep your data safe across devices</div>
              </div>
            </div>
          </div>
        </FeatureGate>
      )}
      
      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Settings className="mr-2 h-6 w-6" />Game & Squad Configuration
      </h2>

      {/* Squad Selection */}
      <div className="p-3 bg-slate-700 rounded-md">
        <h3 className="text-base font-medium text-sky-200 mb-2">Select Squad (5-10 Players) - Selected: {selectedSquadIds.length}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {playersToShow.map(player => (
            <label key={player.id} className={`flex items-center space-x-2 p-1.5 rounded-md cursor-pointer transition-all ${selectedSquadIds.includes(player.id) ? 'bg-sky-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
              <input
                type="checkbox"
                checked={selectedSquadIds.includes(player.id)}
                onChange={() => togglePlayerSelection(player.id)}
                className="form-checkbox h-5 w-5 text-sky-500 bg-slate-800 border-slate-500 rounded focus:ring-sky-400"
                disabled={selectedSquadIds.length >= 10 && !selectedSquadIds.includes(player.id)}
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
      {(selectedSquadIds.length >= 5 && selectedSquadIds.length <= 10) && (
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
        disabled={(selectedSquadIds.length < 5 || selectedSquadIds.length > 10) || !Array.from({ length: numPeriods }, (_, i) => periodGoalieIds[i + 1]).every(Boolean)} 
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