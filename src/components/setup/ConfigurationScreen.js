    import React, { useState, useEffect } from 'react';
import { Settings, Play, Shuffle, Cloud, Upload, Layers, UserPlus } from 'lucide-react';
import { Select, Button, Input } from '../shared/UI';
import { PERIOD_OPTIONS, DURATION_OPTIONS, ALERT_OPTIONS } from '../../constants/gameConfig';
import { FORMATIONS, getValidFormations, FORMATION_DEFINITIONS, createTeamConfig, SUBSTITUTION_TYPES } from '../../constants/teamConfiguration';
import { sanitizeNameInput } from '../../utils/inputSanitization';
import { getRandomPlayers, randomizeGoalieAssignments } from '../../utils/debugUtils';
import { formatPlayerName } from '../../utils/formatUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { useFormationVotes } from '../../hooks/useFormationVotes';
import { TeamManagement } from '../team/TeamManagement';
import { dataSyncManager } from '../../utils/DataSyncManager';
import { FeatureGate } from '../auth/FeatureGate';
import { FormationPreview } from './FormationPreview';
import FeatureVoteModal from '../shared/FeatureVoteModal';
import { VIEWS } from '../../constants/viewConstants';

// Import TAB_VIEWS for team management navigation
const TAB_VIEWS = {
  OVERVIEW: 'overview',
  ACCESS: 'access',
  ROSTER: 'roster',
  PREFERENCES: 'preferences'
};

export function ConfigurationScreen({ 
  allPlayers, 
  setAllPlayers,
  selectedSquadIds, 
  setSelectedSquadIds, 
  numPeriods, 
  setNumPeriods, 
  periodDurationMinutes, 
  setPeriodDurationMinutes, 
  periodGoalieIds, 
  setPeriodGoalieIds, 
  teamConfig,
  updateTeamConfig,
  selectedFormation,
  updateFormationSelection,
  createTeamConfigFromSquadSize,
  alertMinutes,
  setAlertMinutes,
  handleStartPeriodSetup, 
  selectedSquadPlayers,
  opponentTeam,
  setOpponentTeam,
  captainId,
  setCaptain,
  debugMode = false,
  authModal,
  setView,
  setViewWithData,
  syncPlayersFromTeamRoster
}) {
  const [isVoteModalOpen, setIsVoteModalOpen] = React.useState(false);
  const [formationToVoteFor, setFormationToVoteFor] = React.useState(null);
  const [playerSyncStatus, setPlayerSyncStatus] = React.useState({ loading: false, message: '' });
  
  // Auth and Team hooks (must be before useEffect that use these values)
  const { isAuthenticated, user } = useAuth();
  const { currentTeam, teamPlayers, hasTeams, hasClubs } = useTeam();
  const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', error: null });
  const [showMigration, setShowMigration] = useState(false);
  
  // Formation voting hook
  const { 
    submitVote, 
    loading: voteLoading, 
    error: voteError, 
    successMessage: voteSuccessMessage, 
    infoMessage: voteInfoMessage,
    clearMessages: clearVoteMessages,
    isAuthenticated: isVoteAuthenticated
  } = useFormationVotes();

  // Handle substitution mode changes
  const handleSubstitutionModeChange = React.useCallback((newSubstitutionType) => {
    if (!teamConfig) return;

    const newTeamConfig = createTeamConfig(
      teamConfig.format || '5v5',
      teamConfig.squadSize || selectedSquadIds.length,
      teamConfig.formation || selectedFormation,
      newSubstitutionType
    );

    updateTeamConfig(newTeamConfig);
  }, [teamConfig, selectedSquadIds.length, selectedFormation, updateTeamConfig]);

  // Auto-select "Pairs" substitution mode when 7 players + 2-2 formation is selected
  React.useEffect(() => {
    if (selectedSquadIds.length === 7 && selectedFormation === FORMATIONS.FORMATION_2_2) {
      // If no substitution type is set or if we need to default to pairs
      if (!teamConfig?.substitutionType) {
        handleSubstitutionModeChange(SUBSTITUTION_TYPES.PAIRS);
      }
    }
  }, [selectedSquadIds.length, selectedFormation, teamConfig?.substitutionType, handleSubstitutionModeChange]);

  // Sync team roster to game state on mount and when team/players change
  React.useEffect(() => {
    console.log('🔄 Sync useEffect triggered:', { 
      currentTeamId: currentTeam?.id, 
      teamPlayersCount: teamPlayers.length 
    });
    
    // Check sync requirements with descriptive variables
    const hasCurrentTeam = !!currentTeam;
    const hasTeamPlayers = teamPlayers && teamPlayers.length > 0;
    const hasSyncFunction = !!syncPlayersFromTeamRoster;
    
    if (!hasCurrentTeam || !hasTeamPlayers || !hasSyncFunction) {
      console.log('🚫 Sync skipped - missing requirements:', {
        hasCurrentTeam,
        hasTeamPlayers,
        hasSyncFunction
      });
      return; // No team selected or no sync function available
    }

    const performSync = async () => {
      setPlayerSyncStatus({ loading: true, message: 'Syncing team roster...' });
      
      try {
        const result = syncPlayersFromTeamRoster(teamPlayers);
        
        if (result.success) {
          setPlayerSyncStatus({ 
            loading: false, 
            message: result.message === 'No sync needed' ? '' : `✅ ${result.message}` 
          });
          
          // Clear success message after 3 seconds
          if (result.message !== 'No sync needed') {
            setTimeout(() => {
              setPlayerSyncStatus(prev => ({ ...prev, message: '' }));
            }, 3000);
          }
        } else {
          setPlayerSyncStatus({ 
            loading: false, 
            message: `⚠️ Sync failed: ${result.error}` 
          });
        }
      } catch (error) {
        console.error('ConfigurationScreen sync error:', error);
        setPlayerSyncStatus({ 
          loading: false, 
          message: `⚠️ Sync error: ${error.message}` 
        });
      }
    };

    performSync();
  }, [currentTeam, currentTeam?.id, teamPlayers, syncPlayersFromTeamRoster]);

  const handleFormationChange = (newFormation) => {
    const definition = FORMATION_DEFINITIONS[newFormation];
    if (definition && definition.status === 'coming-soon') {
      setFormationToVoteFor(newFormation);
      setIsVoteModalOpen(true);
    } else {
      updateFormationSelection(newFormation);
    }
  };

  const handleVoteConfirm = async () => {
    if (!formationToVoteFor) return;
    
    // Clear any previous messages
    clearVoteMessages();
    
    // Check if user is authenticated
    if (!isVoteAuthenticated) {
      console.error('User must be authenticated to vote');
      // The modal will handle showing authentication requirement
      return;
    }
    
    // Submit the vote (currently always for 5v5 format)
    const result = await submitVote(formationToVoteFor, '5v5');
    
    if (result.success) {
      // Close modal on success after a brief delay to show success message
      setTimeout(() => {
        setIsVoteModalOpen(false);
        // Clear the formation to vote for
        setFormationToVoteFor(null);
      }, 2000);
    }
    // On error, keep modal open to show error message
  };

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

  // Determine which players to show and if team has no players
  const hasNoTeamPlayers = isAuthenticated && currentTeam && teamPlayers.length === 0;
  const playersToShow = isAuthenticated && currentTeam && teamPlayers.length > 0
    ? teamPlayers.map(player => ({
        id: player.id,
        name: player.name,
        jerseyNumber: player.jersey_number
      }))
    : allPlayers;
  
  console.log('🔍 ConfigurationScreen render:', {
    isAuthenticated,
    currentTeam: currentTeam?.name,
    teamPlayersCount: teamPlayers.length,
    allPlayersCount: allPlayers.length,
    playersToShowCount: playersToShow.length,
    playersToShowSource: (isAuthenticated && currentTeam && teamPlayers.length > 0) ? 'teamPlayers' : 'allPlayers'
  });

  // Clear selectedSquadIds when team has no players to avoid showing orphaned selections
  React.useEffect(() => {
    if (hasNoTeamPlayers && selectedSquadIds.length > 0) {
      setSelectedSquadIds([]);
    }
  }, [hasNoTeamPlayers, selectedSquadIds.length, setSelectedSquadIds]);

  // Ensure allPlayers is updated with team data when authenticated
  // This is necessary for selectedSquadPlayers to work correctly with team data
  React.useEffect(() => {
    if (isAuthenticated && currentTeam && teamPlayers.length > 0) {
      const transformedTeamPlayers = teamPlayers.map(player => ({
        id: player.id,
        name: player.name,
        jerseyNumber: player.jersey_number,
        // Initialize player stats if not present (required for game logic)
        stats: {
          timeOnFieldSeconds: 0,
          timeAsAttackerSeconds: 0,
          timeAsDefenderSeconds: 0,
          timeAsGoalieSeconds: 0,
          timeAsMidfielderSeconds: 0,
          currentStatus: 'substitute',
          currentPosition: null,
          currentRole: null,
          isInactive: false,
          lastStintStartTimeEpoch: null
        }
      }));
      
      // Only update allPlayers if the data has actually changed
      if (JSON.stringify(allPlayers.map(p => ({ id: p.id, name: p.name }))) !== 
          JSON.stringify(transformedTeamPlayers.map(p => ({ id: p.id, name: p.name })))) {
        setAllPlayers(transformedTeamPlayers);
      }
    }
  }, [isAuthenticated, currentTeam, teamPlayers, allPlayers, setAllPlayers]);

  const togglePlayerSelection = (playerId) => {
    setSelectedSquadIds(prev => {
      const newIds = prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId];
      
      // Auto-create team configuration based on squad size
      if (newIds.length >= 5 && newIds.length <= 10) {
        // Default to pairs for 7-player mode, individual for others
        const defaultSubstitutionType = (newIds.length === 7) ? 'pairs' : 'individual';
        createTeamConfigFromSquadSize(newIds.length, defaultSubstitutionType);
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
    
    // Always select 2-2 formation to avoid debug mode bug with 1-2-1
    const randomFormation = FORMATIONS.FORMATION_2_2;
    updateFormationSelection(randomFormation);

    // Create team config for 7 players with pairs substitution
    createTeamConfigFromSquadSize(7, 'pairs');
    
    // Randomize goalie assignments (use current numPeriods setting)
    const goalieAssignments = randomizeGoalieAssignments(randomPlayers, numPeriods);
    setPeriodGoalieIds(goalieAssignments);
    
    // Set a random opponent name
    const opponentNames = ['Lions FC', 'Eagles United', 'Sharks', 'Thunder', 'Storm', 'Wildcats'];
    const randomOpponent = opponentNames[Math.floor(Math.random() * opponentNames.length)];
    setOpponentTeam(randomOpponent);
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
        <TeamManagement setView={setView} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAuthenticated && currentTeam && (
        <div className="p-3 bg-sky-600/20 border border-sky-500 rounded-lg">
          <div className="text-sky-200 font-medium">Team: {currentTeam.club?.name} {currentTeam.name}</div>
          {playerSyncStatus.loading && (
            <div className="text-sky-300 text-sm mt-1">
              🔄 {playerSyncStatus.message}
            </div>
          )}
          {!playerSyncStatus.loading && playerSyncStatus.message && (
            <div className="text-sky-300 text-sm mt-1">
              {playerSyncStatus.message}
            </div>
          )}
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
        <h3 className="text-base font-medium text-sky-200 mb-2">
          {hasNoTeamPlayers 
            ? "Add Players to Your Team" 
            : `Select Squad (5-10 Players) - Selected: ${selectedSquadIds.length}`
          }
        </h3>
        {hasNoTeamPlayers ? (
          <div className="text-center py-8">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-lg font-medium text-slate-300 mb-2">No Players Added Yet</p>
            <p className="text-sm text-slate-400 mb-4">
              Your team roster is empty. Add players to start setting up your game.
            </p>
            <div className="flex justify-center">
              <Button
                onClick={() => setViewWithData(VIEWS.TEAM_MANAGEMENT, { openToTab: TAB_VIEWS.ROSTER })}
                variant="primary"
                Icon={UserPlus}
              >
                Add Players
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Opponent Team Name */}
      <div className="p-3 bg-slate-700 rounded-md">
        <label htmlFor="opponentTeam" className="block text-sm font-medium text-sky-200 mb-1">Opponent Team Name</label>
        <Input
          id="opponentTeam"
          value={opponentTeam}
          onChange={e => setOpponentTeam(sanitizeNameInput(e.target.value))}
          placeholder="Enter opponent team name (optional)"
          maxLength={50}
        />
        <p className="text-xs text-slate-400 mt-1">Leave empty to use "Opponent"</p>
      </div>

      {/* Game Settings */}
      <div className="p-3 bg-slate-700 rounded-md grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="numPeriods" className="block text-sm font-medium text-sky-200 mb-1">Number of Periods</label>
          <Select value={numPeriods} onChange={value => setNumPeriods(Number(value))} options={PERIOD_OPTIONS} id="numPeriods" />
        </div>
        <div>
          <label htmlFor="periodDuration" className="block text-sm font-medium text-sky-200 mb-1">Period Duration (minutes)</label>
          <Select value={periodDurationMinutes} onChange={value => setPeriodDurationMinutes(Number(value))} options={DURATION_OPTIONS} id="periodDuration" />
        </div>
        <div>
          <label htmlFor="alertMinutes" className="block text-sm font-medium text-sky-200 mb-1">Substitution Alert</label>
          <Select value={alertMinutes} onChange={value => setAlertMinutes(Number(value))} options={ALERT_OPTIONS} id="alertMinutes" />
        </div>
      </div>

      {/* Formation Selection */}
      {selectedSquadIds.length >= 5 && selectedSquadIds.length <= 10 && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2 flex items-center">
            <Layers className="mr-2 h-4 w-4" />
            Formation Selection
          </h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="formation" className="block text-sm font-medium text-sky-200 mb-1">
                Tactical Formation
              </label>
              <Select
                id="formation"
                value={selectedFormation}
                onChange={value => handleFormationChange(value)}
                options={getValidFormations('5v5', selectedSquadIds.length).map(formation => ({
                  value: formation,
                  label: FORMATION_DEFINITIONS[formation].label
                }))}
              />
              <p className="text-xs text-slate-400 mt-1">
                {selectedFormation === FORMATIONS.FORMATION_2_2 && 'Classic formation with left/right defenders and attackers'}
                {selectedFormation === FORMATIONS.FORMATION_1_2_1 && 'Modern formation with center back, wing midfielders, and striker'}
              </p>
            </div>

            {/* Formation Preview */}
            <FormationPreview formation={selectedFormation} className="mt-3" />
          </div>
        </div>
      )}

      {/* Team Mode Selection - Only show for 7 players with 2-2 formation */}
      {selectedSquadIds.length === 7 && selectedFormation === FORMATIONS.FORMATION_2_2 && (
        <div className="p-3 bg-slate-700 rounded-md">
          <h3 className="text-base font-medium text-sky-200 mb-2">Substitution Mode</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="substitutionMode"
                value={SUBSTITUTION_TYPES.PAIRS}
                checked={teamConfig?.substitutionType === SUBSTITUTION_TYPES.PAIRS}
                onChange={e => handleSubstitutionModeChange(e.target.value)}
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
                name="substitutionMode"
                value={SUBSTITUTION_TYPES.INDIVIDUAL}
                checked={teamConfig?.substitutionType === SUBSTITUTION_TYPES.INDIVIDUAL}
                onChange={e => handleSubstitutionModeChange(e.target.value)}
                className="form-radio h-4 w-4 text-sky-500 bg-slate-800 border-slate-500 focus:ring-sky-400"
              />
              <div>
                <span className="text-sky-100 font-medium">Individual (7-player)</span>
                <p className="text-xs text-slate-400">Individual positions with 2 substitutes. Dual next/next-next visual indicators.</p>
              </div>
            </label>
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
                  onChange={value => handleGoalieChange(period, value)}
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
              onChange={value => handleCaptainChange(value)}
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

      <FeatureVoteModal
        isOpen={isVoteModalOpen}
        onClose={() => {
          setIsVoteModalOpen(false);
          setFormationToVoteFor(null);
          clearVoteMessages();
        }}
        onConfirm={handleVoteConfirm}
        featureName={formationToVoteFor}
        loading={voteLoading}
        error={voteError}
        successMessage={voteSuccessMessage}
        infoMessage={voteInfoMessage}
        isAuthenticated={isVoteAuthenticated}
        authModal={authModal}
      >
        <p>Only the 2-2 and 1-2-1 formations are currently implemented. By voting, you help us prioritize which formations to build next. Only one vote per user per formation will be counted.</p>
      </FeatureVoteModal>
    </div>
  );
}