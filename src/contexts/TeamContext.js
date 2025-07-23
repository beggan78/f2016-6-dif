import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const TeamContext = createContext({});

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [currentTeam, setCurrentTeam] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Flag to prevent redundant initialization
  const initializationDone = useRef(false);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get all teams the user has access to
  const getUserTeams = useCallback(async () => {
    if (!user) return [];

    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('team_user')
        .select(`
          id,
          role,
          team:team_id (
            id,
            name,
            active,
            club:club_id (
              id,
              name,
              short_name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('team.active', true);

      if (error) {
        console.error('Error fetching user teams:', error);
        setError('Failed to load teams');
        return [];
      }

      const teams = data?.map(item => ({
        ...item.team,
        userRole: item.role,
        club: item.team.club
      })) || [];

      setUserTeams(teams);
      return teams;
    } catch (err) {
      console.error('Exception in getUserTeams:', err);
      setError('Failed to load teams');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

  // Search clubs for autocomplete
  const searchClubs = useCallback(async (query) => {
    if (!query?.trim()) return [];

    try {
      const searchTerm = query.trim().toLowerCase();
      
      const { data, error } = await supabase
        .from('club')
        .select('id, name, short_name, long_name')
        .or(`name.ilike.%${searchTerm}%,short_name.ilike.%${searchTerm}%,long_name.ilike.%${searchTerm}%`)
        .order('name')
        .limit(10);

      if (error) {
        console.error('Error searching clubs:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in searchClubs:', err);
      return [];
    }
  }, []);

  // Create a new club
  const createClub = useCallback(async (clubData) => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('club')
        .insert([{
          name: clubData.name,
          short_name: clubData.shortName || null,
          long_name: clubData.longName || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating club:', error);
        setError('Failed to create club');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in createClub:', err);
      setError('Failed to create club');
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Get teams for a specific club
  const getTeamsByClub = useCallback(async (clubId) => {
    try {
      const { data, error } = await supabase
        .from('team')
        .select('id, name, active')
        .eq('club_id', clubId)
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error fetching teams by club:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getTeamsByClub:', err);
      return [];
    }
  }, []);

  // Create a new team
  const createTeam = useCallback(async (teamData) => {
    if (!user) {
      setError('User must be authenticated to create a team');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      // Create the team
      const { data: team, error: teamError } = await supabase
        .from('team')
        .insert([{
          club_id: teamData.clubId,
          name: teamData.name,
          configuration: teamData.configuration || {}
        }])
        .select()
        .single();

      if (teamError) {
        console.error('Error creating team:', teamError);
        setError('Failed to create team');
        return null;
      }

      // Create team_user relationship (user becomes coach)
      const { error: relationError } = await supabase
        .from('team_user')
        .insert([{
          team_id: team.id,
          user_id: user.id,
          role: 'coach'
        }]);

      if (relationError) {
        console.error('Error creating team-user relationship:', relationError);
        // Don't fail completely, team was created successfully
      }

      // Refresh user teams
      await getUserTeams();

      return team;
    } catch (err) {
      console.error('Exception in createTeam:', err);
      setError('Failed to create team');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getUserTeams]);

  // Get players for current team
  const getTeamPlayers = useCallback(async (teamId) => {
    if (!teamId) return [];

    try {
      const { data, error } = await supabase
        .from('player')
        .select('id, name, jersey_number, on_roster')
        .eq('team_id', teamId)
        .eq('on_roster', true)
        .order('name');

      if (error) {
        console.error('Error fetching team players:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getTeamPlayers:', err);
      return [];
    }
  }, []);

  // Create a new player for current team
  const createPlayer = useCallback(async (playerData) => {
    if (!currentTeam) {
      setError('No team selected');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('player')
        .insert([{
          team_id: currentTeam.id,
          name: playerData.name,
          jersey_number: playerData.jerseyNumber || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating player:', error);
        setError('Failed to create player');
        return null;
      }

      // Refresh team players
      const updatedPlayers = await getTeamPlayers(currentTeam.id);
      setTeamPlayers(updatedPlayers);

      return data;
    } catch (err) {
      console.error('Exception in createPlayer:', err);
      setError('Failed to create player');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentTeam, clearError, getTeamPlayers]);

  // Switch current team
  const switchCurrentTeam = useCallback(async (teamId) => {
    const team = userTeams.find(t => t.id === teamId);
    if (!team) {
      setError('Team not found');
      return;
    }

    setCurrentTeam(team);
    
    // Load players for this team
    const players = await getTeamPlayers(teamId);
    setTeamPlayers(players);

    // Store in localStorage for persistence
    localStorage.setItem('currentTeamId', teamId);
  }, [userTeams, getTeamPlayers]);

  // Initialize team data when user is authenticated
  useEffect(() => {
    if (user && userProfile && !initializationDone.current) {
      initializationDone.current = true;
      
      getUserTeams().then((teams) => {
        console.log('Teams loaded:', teams.length);
        // Team switching logic will be handled by separate useEffect
      }).catch((error) => {
        console.error('Error initializing teams:', error);
        setError('Failed to initialize team data');
      });
    } else if (!user) {
      // Clear team state when user is not authenticated
      initializationDone.current = false;
      setCurrentTeam(null);
      setUserTeams([]);
      setTeamPlayers([]);
      localStorage.removeItem('currentTeamId');
    }
  }, [user, userProfile, getUserTeams]);

  // Handle team switching when userTeams changes
  useEffect(() => {
    if (userTeams.length > 0 && !currentTeam) {
      // Try to restore previously selected team
      const savedTeamId = localStorage.getItem('currentTeamId');
      const savedTeam = savedTeamId ? userTeams.find(t => t.id === savedTeamId) : null;
      
      if (savedTeam) {
        // Restore saved team
        setCurrentTeam(savedTeam);
        getTeamPlayers(savedTeam.id).then(players => {
          setTeamPlayers(players);
        });
        localStorage.setItem('currentTeamId', savedTeam.id);
      } else if (userTeams.length === 1) {
        // Auto-select if user has only one team
        const team = userTeams[0];
        setCurrentTeam(team);
        getTeamPlayers(team.id).then(players => {
          setTeamPlayers(players);
        });
        localStorage.setItem('currentTeamId', team.id);
      }
    } else if (userTeams.length === 0 && initializationDone.current) {
      // Explicitly handle no teams case - ensure loading is false
      console.log('No teams found - user needs to create a team');
      // Make sure currentTeam is null and teamPlayers is empty
      setCurrentTeam(null);
      setTeamPlayers([]);
    }
  }, [userTeams, currentTeam, getTeamPlayers]);

  const value = {
    // State
    currentTeam,
    userTeams,
    teamPlayers,
    loading,
    error,
    
    // Actions
    getUserTeams,
    searchClubs,
    createClub,
    getTeamsByClub,
    createTeam,
    createPlayer,
    switchCurrentTeam,
    clearError,
    
    // Computed properties
    hasTeams: userTeams.length > 0,
    isCoach: currentTeam?.userRole === 'coach',
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};