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
    if (!user) {
      setError('Must be logged in to create club');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      // Step 1: Create the club
      const { data: club, error: clubError } = await supabase
        .from('club')
        .insert([{
          name: clubData.name,
          short_name: clubData.shortName || null,
          long_name: clubData.longName || null
        }])
        .select()
        .single();

      if (clubError) {
        console.error('Error creating club:', clubError);
        setError('Failed to create club');
        return null;
      }

      // Step 2: Add creator as club admin
      const { error: membershipError } = await supabase
        .from('club_user')
        .insert([{
          club_id: club.id,
          user_id: user.id,
          role: 'admin',
          status: 'active'
        }]);

      if (membershipError) {
        console.error('Error adding club admin membership:', membershipError);
        // Note: We don't fail the entire operation since the club was created successfully
        // The user can manually join the club if needed
        console.warn('Club created but admin membership failed. User may need to manually join club.');
      }

      return club;
    } catch (err) {
      console.error('Exception in createClub:', err);
      setError('Failed to create club');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

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

      // Create team_user relationship (user becomes admin)
      const { error: relationError } = await supabase
        .from('team_user')
        .insert([{
          team_id: team.id,
          user_id: user.id,
          role: 'admin'
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

  // ============================================================================
  // CLUB MEMBERSHIP FUNCTIONS
  // ============================================================================

  // Request membership in a club
  const requestClubMembership = useCallback(async (clubId, message = '') => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('club_user')
        .insert([{
          club_id: clubId,
          user_id: user.id,
          role: 'member',
          status: 'pending'
        }])
        .select(`
          id, role, status, created_at,
          club:club_id (id, name, short_name, long_name)
        `)
        .single();

      if (error) {
        console.error('Error requesting club membership:', error);
        setError('Failed to request club membership');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in requestClubMembership:', err);
      setError('Failed to request club membership');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

  // Get user's club memberships
  const getClubMemberships = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('club_user')
        .select(`
          id, role, status, joined_at,
          club:club_id (id, name, short_name, long_name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('Error fetching club memberships:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getClubMemberships:', err);
      return [];
    }
  }, [user]);

  // Get pending club membership requests (for club admins)
  const getPendingClubRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('club_user')
        .select(`
          id, created_at, role,
          user:user_id (id, name),
          club:club_id (id, name, short_name, long_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending club requests:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getPendingClubRequests:', err);
      return [];
    }
  }, []);

  // Approve club membership request (for club admins)
  const approveClubMembership = useCallback(async (membershipId, role = 'member') => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('club_user')
        .update({ 
          status: 'active',
          role: role,
          joined_at: new Date().toISOString()
        })
        .eq('id', membershipId)
        .select(`
          id, role, status, joined_at,
          user:user_id (id, name),
          club:club_id (id, name, short_name, long_name)
        `)
        .single();

      if (error) {
        console.error('Error approving club membership:', error);
        setError('Failed to approve club membership');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in approveClubMembership:', err);
      setError('Failed to approve club membership');
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Reject club membership request (for club admins)
  const rejectClubMembership = useCallback(async (membershipId, reviewNotes = '') => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('club_user')
        .update({ 
          status: 'inactive',
          review_notes: reviewNotes
        })
        .eq('id', membershipId)
        .select()
        .single();

      if (error) {
        console.error('Error rejecting club membership:', error);
        setError('Failed to reject club membership');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in rejectClubMembership:', err);
      setError('Failed to reject club membership');
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // ============================================================================
  // TEAM ACCESS REQUEST FUNCTIONS
  // ============================================================================

  // Request access to a team
  const requestTeamAccess = useCallback(async (teamId, requestedRole = 'coach', message = '') => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('team_access_request')
        .insert([{
          team_id: teamId,
          user_id: user.id,
          requested_role: requestedRole,
          message: message,
          status: 'pending'
        }])
        .select(`
          id, created_at, requested_role, message, status,
          team:team_id (id, name, club_id),
          user:user_id (id, name)
        `)
        .single();

      if (error) {
        console.error('Error requesting team access:', error);
        setError('Failed to request team access');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in requestTeamAccess:', err);
      setError('Failed to request team access');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

  // Get team access requests for a team (for team coaches)
  const getTeamAccessRequests = useCallback(async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('team_access_request')
        .select(`
          id, created_at, requested_role, message, status,
          user:user_id (id, name)
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching team access requests:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getTeamAccessRequests:', err);
      return [];
    }
  }, []);

  // Get user's team access requests
  const getUserTeamRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('team_access_request')
        .select(`
          id, created_at, requested_role, message, status, reviewed_at, review_notes,
          team:team_id (id, name, club_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user team requests:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getUserTeamRequests:', err);
      return [];
    }
  }, [user]);

  // Approve team access request (for team coaches)
  const approveTeamAccess = useCallback(async (requestId, approvedRole) => {
    try {
      setLoading(true);
      clearError();

      // First, get the request details
      const { data: request, error: requestError } = await supabase
        .from('team_access_request')
        .select('team_id, user_id')
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('Error fetching request:', requestError);
        setError('Failed to fetch request details');
        return null;
      }

      // Add user to team_user table
      const { error: teamUserError } = await supabase
        .from('team_user')
        .insert([{
          team_id: request.team_id,
          user_id: request.user_id,
          role: approvedRole
        }]);

      if (teamUserError) {
        console.error('Error adding user to team:', teamUserError);
        setError('Failed to add user to team');
        return null;
      }

      // Update request status
      const { data, error } = await supabase
        .from('team_access_request')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select(`
          id, status, reviewed_at,
          user:user_id (id, name),
          team:team_id (id, name)
        `)
        .single();

      if (error) {
        console.error('Error updating request status:', error);
        setError('Failed to update request status');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in approveTeamAccess:', err);
      setError('Failed to approve team access');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

  // Reject team access request (for team coaches)
  const rejectTeamAccess = useCallback(async (requestId, reviewNotes = '') => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('team_access_request')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', requestId)
        .select(`
          id, status, reviewed_at, review_notes,
          user:user_id (id, name),
          team:team_id (id, name)
        `)
        .single();

      if (error) {
        console.error('Error rejecting team access:', error);
        setError('Failed to reject team access');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in rejectTeamAccess:', err);
      setError('Failed to reject team access');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

  // Cancel team access request (for users)
  const cancelTeamAccess = useCallback(async (requestId) => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('team_access_request')
        .update({
          status: 'cancelled'
        })
        .eq('id', requestId)
        .eq('user_id', user.id) // Ensure user can only cancel their own requests
        .select()
        .single();

      if (error) {
        console.error('Error cancelling team access request:', error);
        setError('Failed to cancel request');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in cancelTeamAccess:', err);
      setError('Failed to cancel request');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

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
    
    // Club membership actions
    requestClubMembership,
    getClubMemberships,
    getPendingClubRequests,
    approveClubMembership,
    rejectClubMembership,
    
    // Team access request actions
    requestTeamAccess,
    getTeamAccessRequests,
    getUserTeamRequests,
    approveTeamAccess,
    rejectTeamAccess,
    cancelTeamAccess,
    
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