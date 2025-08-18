import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Users, Building, UserPlus, Check, Plus } from 'lucide-react';
import { Button, Input } from '../shared/UI';
import { ClubAutocomplete } from './ClubAutocomplete';
import { ClubJoinModal } from './ClubJoinModal';
import { TeamAccessRequestModal } from './TeamAccessRequestModal';
import { useTeam } from '../../contexts/TeamContext';
import { sanitizeNameInput } from '../../utils/inputSanitization';

const STEPS = {
  CLUB_SELECTION: 'club_selection',
  CLUB_CREATION: 'club_creation',
  TEAM_SELECTION: 'team_selection',
  TEAM_CREATION: 'team_creation',
  PLAYER_CREATION: 'player_creation',
  COMPLETE: 'complete'
};

export function TeamCreationWizard({ onComplete, onCancel }) {
  const { 
    createClub, 
    getTeamsByClub, 
    createTeam, 
    createPlayer,
    switchCurrentTeam,
    isClubCreator,
    hasClubs,
    userClubs,
    loading, 
    error, 
    clearError 
  } = useTeam();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(STEPS.CLUB_SELECTION);
  const [selectedClub, setSelectedClub] = useState(null);
  const [clubTeams, setClubTeams] = useState([]);
  const [createdTeam, setCreatedTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [showClubJoinModal, setShowClubJoinModal] = useState(false);
  const [clubToJoin, setClubToJoin] = useState(null);
  const [showTeamAccessModal, setShowTeamAccessModal] = useState(false);
  const [selectedTeamForAccess, setSelectedTeamForAccess] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [clubForm, setClubForm] = useState({ name: '', shortName: '', longName: '' });
  const [teamForm, setTeamForm] = useState({ name: '' });
  const [playerForm, setPlayerForm] = useState({ name: '' });
  const [errors, setErrors] = useState({});

  const clearFormErrors = useCallback(() => {
    setErrors({});
    clearError();
  }, [clearError]);

  // Initialize wizard step based on user's club status
  useEffect(() => {
    if (hasClubs && userClubs.length === 1) {
      // If user has exactly one club, auto-select it and go to team selection
      const clubMembership = userClubs[0];
      const club = clubMembership.club; // Extract actual club object
      setSelectedClub(club);
      getTeamsByClub(club.id).then(teams => {
        setClubTeams(teams);
        setCurrentStep(STEPS.TEAM_SELECTION);
      });
    } else if (hasClubs && userClubs.length > 1) {
      // If user has multiple clubs, they need to choose which one
      // We could show a club selector, but for now let them use the regular flow
      setCurrentStep(STEPS.CLUB_SELECTION);
    } else {
      // If user has no clubs, start with club selection
      setCurrentStep(STEPS.CLUB_SELECTION);
    }
  }, [hasClubs, userClubs, getTeamsByClub]);

  // Handle club selection from autocomplete
  const handleClubSelect = useCallback(async (club) => {
    clearFormErrors();
    
    // Check if user is the creator of this club
    if (isClubCreator(club)) {
      // User created this club, proceed directly
      setSelectedClub(club);
      const teams = await getTeamsByClub(club.id);
      setClubTeams(teams);
      setCurrentStep(STEPS.TEAM_SELECTION);
    } else {
      // User didn't create this club, show join modal
      setClubToJoin(club);
      setShowClubJoinModal(true);
    }
  }, [getTeamsByClub, clearFormErrors, isClubCreator]);

  // Handle create new club from autocomplete
  const handleCreateNewClub = useCallback((clubName) => {
    const displayName = clubName
      .split(' ')
      .filter(word => word !== word.toUpperCase())
      .join(' ');

    setClubForm({
      name: displayName.trim() || clubName,
      shortName: '',
      longName: clubName
    });
    setCurrentStep(STEPS.CLUB_CREATION);
  }, []);

  // Handle club creation
  const handleClubCreation = useCallback(async () => {
    clearFormErrors();

    // Validation
    if (!clubForm.name.trim()) {
      setErrors({ clubName: 'Club name is required' });
      return;
    }

    const club = await createClub({
      name: clubForm.name.trim(),
      shortName: clubForm.shortName.trim() || null,
      longName: clubForm.longName.trim() || null
    });

    if (club) {
      setSelectedClub(club);
      setClubTeams([]); // New club has no teams
      setCurrentStep(STEPS.TEAM_CREATION);
    }
  }, [clubForm, createClub, clearFormErrors]);

  // Handle existing team selection - show team access request modal
  const handleExistingTeamSelect = useCallback((team) => {
    clearError(); // Clear any previous error messages from team creation
    setSelectedTeamForAccess(team);
    setShowTeamAccessModal(true);
  }, [clearError]);

  // Handle team creation
  const handleTeamCreation = useCallback(async () => {
    clearFormErrors();

    // Validation
    if (!teamForm.name.trim()) {
      setErrors({ teamName: 'Team name is required' });
      return;
    }

    const team = await createTeam({
      clubId: selectedClub.id,
      name: teamForm.name.trim()
    });

    if (team) {
      setCreatedTeam(team);
      // Switch to the newly created team
      await switchCurrentTeam(team.id);
      setCurrentStep(STEPS.PLAYER_CREATION);
    }
  }, [teamForm, selectedClub, createTeam, switchCurrentTeam, clearFormErrors]);

  // Handle player creation
  const handleAddPlayer = useCallback(async () => {
    clearFormErrors();

    // Validation
    if (!playerForm.name.trim()) {
      setErrors({ playerName: 'Player name is required' });
      return;
    }

    const player = await createPlayer({
      name: playerForm.name.trim()
    });

    if (player) {
      setPlayers(prev => [...prev, player]);
      setPlayerForm({ name: '' });
    }
  }, [playerForm, createPlayer, clearFormErrors]);

  // Handle wizard completion
  const handleComplete = useCallback(() => {
    setCurrentStep(STEPS.COMPLETE);
    // Small delay to show success, then complete
    setTimeout(() => {
      onComplete();
    }, 1500);
  }, [onComplete]);

  // Handle club join modal success
  const handleClubJoinSuccess = useCallback(async () => {
    if (!clubToJoin) return;
    
    // Close modal
    setShowClubJoinModal(false);
    
    // Set as selected club and proceed to team selection
    setSelectedClub(clubToJoin);
    const teams = await getTeamsByClub(clubToJoin.id);
    setClubTeams(teams);
    setCurrentStep(STEPS.TEAM_SELECTION);
    
    // Clear modal state
    setClubToJoin(null);
  }, [clubToJoin, getTeamsByClub]);

  // Handle club join modal close
  const handleClubJoinClose = useCallback(() => {
    setShowClubJoinModal(false);
    setClubToJoin(null);
  }, []);

  // Handle team access request modal success
  const handleTeamAccessSuccess = useCallback((message) => {
    // Show success message if provided
    if (message) {
      setSuccessMessage(message);
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }
    
    // Close modal and complete wizard after a brief delay to show success message
    setTimeout(() => {
      setShowTeamAccessModal(false);
      setSelectedTeamForAccess(null);
      onComplete();
    }, message ? 1500 : 0); // Small delay if there's a success message
  }, [onComplete]);

  // Handle team access request modal close
  const handleTeamAccessClose = useCallback(() => {
    setShowTeamAccessModal(false);
    setSelectedTeamForAccess(null);
  }, []);

  const renderClubSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Building className="h-8 w-8 text-sky-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-sky-300">Select Your Club</h3>
        <p className="text-slate-400 text-sm mt-2">
          Search for your club or create a new one
        </p>
      </div>
      
      <ClubAutocomplete
        placeholder="Type your club name..."
        onSelect={handleClubSelect}
        onCreateNew={handleCreateNewClub}
      />
      
      <div className="flex justify-end">
        <Button onClick={onCancel} variant="secondary">
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderClubCreation = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Building className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-sky-300">Create New Club</h3>
        <p className="text-slate-400 text-sm mt-2">
          Set up your club information
        </p>
      </div>

      <div>
        <label htmlFor="clubLongName" className="block text-sm font-medium text-slate-300 mb-2">
          Full Club Name *
        </label>
        <Input
          id="clubLongName"
          value={clubForm.longName}
          onChange={(e) => setClubForm(prev => ({ ...prev, longName: sanitizeNameInput(e.target.value) }))}
          placeholder="e.g., Djurgårdens IF FF"
          className={errors.clubLongName ? 'border-rose-500' : ''}
        />
        {errors.clubLongName && (
          <p className="text-rose-400 text-sm mt-1">{errors.clubLongName}</p>
        )}
      </div>

      <div>
        <label htmlFor="clubName" className="block text-sm font-medium text-slate-300 mb-2">
          Display Name *
        </label>
        <Input
          id="clubName"
          value={clubForm.name}
          onChange={(e) => setClubForm(prev => ({ ...prev, name: sanitizeNameInput(e.target.value) }))}
          placeholder="Enter club name"
          className={errors.clubName ? 'border-rose-500' : ''}
        />
        {errors.clubName && (
          <p className="text-rose-400 text-sm mt-1">{errors.clubName}</p>
        )}
      </div>

      <div>
        <label htmlFor="clubShortName" className="block text-sm font-medium text-slate-300 mb-2">
          Short Name (optional)
        </label>
        <Input
          id="clubShortName"
          value={clubForm.shortName}
          onChange={(e) => setClubForm(prev => ({ ...prev, shortName: sanitizeNameInput(e.target.value) }))}
          placeholder="e.g., DIF"
        />
        <p className="text-slate-500 text-xs mt-1">Used for abbreviations and quick identification</p>
      </div>

      <div className="flex justify-between">
        <Button 
          onClick={() => setCurrentStep(STEPS.CLUB_SELECTION)} 
          variant="secondary"
          Icon={ArrowLeft}
        >
          Back
        </Button>
        <Button 
          onClick={handleClubCreation}
          disabled={loading}
          Icon={loading ? null : ArrowRight}
        >
          {loading ? 'Creating...' : 'Create Club'}
        </Button>
      </div>
    </div>
  );

  const renderTeamSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Users className="h-8 w-8 text-sky-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-sky-300">Select Team</h3>
        <p className="text-slate-400 text-sm mt-2">
          Choose an existing team or create a new one for <strong>{selectedClub.name}</strong>
        </p>
      </div>

      {clubTeams.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Existing Teams</h4>
          <div className="space-y-1">
            {clubTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleExistingTeamSelect(team)}
                className="w-full p-3 bg-slate-700 border border-slate-600 hover:bg-slate-600 rounded-lg text-left transition-colors"
              >
                <div className="text-slate-100 font-medium">{team.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-600 pt-4">
        <Button
          onClick={() => setCurrentStep(STEPS.TEAM_CREATION)}
          variant="primary"
          Icon={Plus}
          className="w-full"
        >
          Create New Team
        </Button>
      </div>

      <div className="flex justify-start">
        <Button 
          onClick={() => setCurrentStep(STEPS.CLUB_SELECTION)} 
          variant="secondary"
          Icon={ArrowLeft}
        >
          Back
        </Button>
      </div>
    </div>
  );

  const renderTeamCreation = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Users className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-sky-300">Create New Team</h3>
        <p className="text-slate-400 text-sm mt-2">
          Set up your team for <strong>{selectedClub.name}</strong>
        </p>
      </div>

      <div>
        <label htmlFor="teamName" className="block text-sm font-medium text-slate-300 mb-2">
          Team Name *
        </label>
        <Input
          id="teamName"
          value={teamForm.name}
          onChange={(e) => setTeamForm(prev => ({ ...prev, name: sanitizeNameInput(e.target.value) }))}
          placeholder="Enter team name"
          className={errors.teamName ? 'border-rose-500' : ''}
        />
        {errors.teamName && (
          <p className="text-rose-400 text-sm mt-1">{errors.teamName}</p>
        )}
        <p className="text-slate-500 text-xs mt-1">e.g., "F16-6", "U16 Boys", "Junior Team"</p>
      </div>

      <div className="flex justify-between">
        <Button 
          onClick={() => setCurrentStep(clubTeams.length > 0 ? STEPS.TEAM_SELECTION : STEPS.CLUB_SELECTION)} 
          variant="secondary"
          Icon={ArrowLeft}
        >
          Back
        </Button>
        <Button 
          onClick={handleTeamCreation}
          disabled={loading}
          Icon={loading ? null : ArrowRight}
        >
          {loading ? 'Creating...' : 'Create Team'}
        </Button>
      </div>
    </div>
  );

  const renderPlayerCreation = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <UserPlus className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-sky-300">Add Players</h3>
        <p className="text-slate-400 text-sm mt-2">
          Add players to <strong>{createdTeam?.name}</strong>
        </p>
      </div>

      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            value={playerForm.name}
            onChange={(e) => setPlayerForm(prev => ({ ...prev, name: sanitizeNameInput(e.target.value) }))}
            placeholder="Player name"
            className={errors.playerName ? 'border-rose-500' : ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && playerForm.name.trim()) {
                handleAddPlayer();
              }
            }}
          />
          {errors.playerName && (
            <p className="text-rose-400 text-sm mt-1">{errors.playerName}</p>
          )}
        </div>
        <Button
          onClick={handleAddPlayer}
          disabled={loading || !playerForm.name.trim()}
          Icon={UserPlus}
        >
          Add
        </Button>
      </div>

      {players.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Added Players ({players.length})</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {players.map((player) => (
              <div key={player.id} className="flex items-center p-2 bg-slate-700 rounded text-sm">
                <span className="text-slate-100">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 text-center">
        <p className="text-slate-300 text-sm">
          You can add more players later from the team management screen.
        </p>
      </div>

      <div className="flex justify-between">
        <Button 
          onClick={() => setCurrentStep(STEPS.TEAM_CREATION)} 
          variant="secondary"
          Icon={ArrowLeft}
        >
          Back
        </Button>
        <Button 
          onClick={handleComplete}
          variant="accent"
          Icon={Check}
        >
          Complete Setup
        </Button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center py-8">
      <div className="animate-pulse">
        <Check className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
      </div>
      <h3 className="text-lg font-semibold text-emerald-300 mb-2">Team Setup Complete!</h3>
      <p className="text-slate-400">
        Your team <strong>{createdTeam?.name}</strong> has been created successfully.
      </p>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.CLUB_SELECTION:
        return renderClubSelection();
      case STEPS.CLUB_CREATION:
        return renderClubCreation();
      case STEPS.TEAM_SELECTION:
        return renderTeamSelection();
      case STEPS.TEAM_CREATION:
        return renderTeamCreation();
      case STEPS.PLAYER_CREATION:
        return renderPlayerCreation();
      case STEPS.COMPLETE:
        return renderComplete();
      default:
        return renderClubSelection();
    }
  };

  return (
    <>
      <div className="p-6 bg-slate-700 rounded-lg border border-slate-600">
        {error && (
          <div className="mb-4 p-3 bg-rose-900/50 border border-rose-600 rounded-lg">
            <p className="text-rose-200 text-sm">{error}</p>
          </div>
        )}
        
        {/* Success Message Banner */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-600 rounded-lg">
            <p className="text-emerald-200 text-sm">{successMessage}</p>
          </div>
        )}
        
        {renderCurrentStep()}
      </div>

      {/* Club Join Modal */}
      {showClubJoinModal && clubToJoin && (
        <ClubJoinModal
          club={clubToJoin}
          onSuccess={handleClubJoinSuccess}
          onClose={handleClubJoinClose}
        />
      )}

      {/* Team Access Request Modal */}
      {showTeamAccessModal && selectedTeamForAccess && (
        <TeamAccessRequestModal
          team={selectedTeamForAccess}
          onSuccess={handleTeamAccessSuccess}
          onClose={handleTeamAccessClose}
        />
      )}
    </>
  );
}