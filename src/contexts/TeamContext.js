import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getCachedTeamData, cacheTeamData } from '../utils/cacheUtils';

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
  const [userClubs, setUserClubs] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
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
            created_at,
            club:club_id (
              id,
              name,
              short_name,
              long_name
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
      
      // Cache the results
      cacheTeamData({ userTeams: teams });
      
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

  // Create a new club using atomic function
  const createClub = useCallback(async (clubData) => {
    if (!user) {
      setError('Must be logged in to create club');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      // Use atomic creation function to ensure creator becomes admin
      const { data, error } = await supabase.rpc('create_club_with_admin', {
        club_name: clubData.name,
        club_short_name: clubData.shortName || null,
        club_long_name: clubData.longName || null
      });

      if (error) {
        console.error('Error calling create_club_with_admin:', error);
        setError('Failed to create club');
        return null;
      }

      // Check if the function returned an error result
      if (!data.success) {
        console.error('Create club function failed:', data.error);
        setError(data.message || 'Failed to create club');
        return null;
      }

      console.log('Club created successfully:', data.message);
      
      // Refresh user club memberships to reflect the new admin membership
      const updatedClubs = await getClubMemberships();
      setUserClubs(updatedClubs);
      console.log('Updated club memberships after creation:', updatedClubs.length, 'clubs');
      
      return data.club;
    } catch (err) {
      console.error('Exception in createClub:', err);
      setError('Failed to create club');
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, clearError]); // getClubMemberships omitted to avoid hoisting error - it's called directly, not captured

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

  // Create a new team using atomic function
  const createTeam = useCallback(async (teamData) => {
    if (!user) {
      setError('User must be authenticated to create a team');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      // Use atomic creation function to ensure creator becomes admin
      const { data, error } = await supabase.rpc('create_team_with_admin', {
        p_club_id: teamData.clubId,
        team_name: teamData.name,
        team_config: teamData.configuration || {}
      });

      if (error) {
        console.error('Error calling create_team_with_admin:', error);
        setError('Failed to create team');
        return null;
      }

      // Check if the function returned an error result
      if (!data.success) {
        console.error('Create team function failed:', data.error);
        setError(data.message || 'Failed to create team');
        return null;
      }

      console.log('Team created successfully:', data.message);

      // Refresh user teams
      await getUserTeams();

      return data.team;
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

    // Cache the current team and players
    cacheTeamData({ 
      currentTeam: team,
      teamPlayers: players 
    });

    // Store in localStorage for persistence
    localStorage.setItem('currentTeamId', teamId);
  }, [userTeams, getTeamPlayers]);

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

      const clubs = data || [];
      
      // Cache the results
      cacheTeamData({ userClubs: clubs });
      
      return clubs;
    } catch (err) {
      console.error('Exception in getClubMemberships:', err);
      return [];
    }
  }, [user]);

  // Initialize team and club data when user is authenticated
  useEffect(() => {
    if (user && userProfile && !initializationDone.current) {
      initializationDone.current = true;
      
      // Check cache first if this is a page refresh AND valid cache exists
      const cachedData = getCachedTeamData();
      const hasValidCache = cachedData.userTeams || cachedData.userClubs || cachedData.currentTeam;
      const isPageRefresh = performance.navigation.type === 1;
      
      if (isPageRefresh && hasValidCache) {
        console.log('🔄 Page refresh detected with valid cache, loading team data from cache...');
        
        if (cachedData.userTeams) {
          setUserTeams(cachedData.userTeams);
          console.log('✅ Cached teams loaded:', cachedData.userTeams.length);
        }
        
        if (cachedData.userClubs) {
          setUserClubs(cachedData.userClubs);
          console.log('✅ Cached clubs loaded:', cachedData.userClubs.length);
        }
        
        if (cachedData.currentTeam) {
          setCurrentTeam(cachedData.currentTeam);
          console.log('✅ Cached current team loaded:', cachedData.currentTeam.name);
        }
        
        if (cachedData.teamPlayers) {
          setTeamPlayers(cachedData.teamPlayers);
          console.log('✅ Cached team players loaded:', cachedData.teamPlayers.length);
        }
        
        if (cachedData.pendingRequests) {
          setPendingRequests(cachedData.pendingRequests);
          console.log('✅ Cached pending requests loaded:', cachedData.pendingRequests.length);
        }
        
        // Background refresh to update cache
        Promise.all([
          getUserTeams(),
          getClubMemberships()
        ]).then(([teams, clubs]) => {
          console.log('🔄 Background refresh completed - Teams:', teams.length, 'Clubs:', clubs.length);
        }).catch((error) => {
          console.error('Background refresh failed:', error);
        });
      } else {
        // Normal loading (fresh sign-in or no valid cache)
        if (isPageRefresh) {
          console.log('⚠️ Page refresh detected but no valid cache found - proceeding with normal data loading');
        }
        
        Promise.all([
          getUserTeams(),
          getClubMemberships()
        ]).then(([teams, clubs]) => {
          console.log('Teams loaded:', teams.length);
          console.log('Clubs loaded:', clubs.length);
          setUserClubs(clubs);
        }).catch((error) => {
          console.error('Error initializing user data:', error);
          setError('Failed to initialize user data');
        });
      }
    } else if (!user) {
      // Clear all user state when user is not authenticated
      initializationDone.current = false;
      setCurrentTeam(null);
      setUserTeams([]);
      setUserClubs([]);
      setTeamPlayers([]);
      setPendingRequests([]);
      localStorage.removeItem('currentTeamId');
    }
  }, [user, userProfile, getUserTeams, getClubMemberships]);

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

  // Get team access requests for a team (for team coaches)
  const getTeamAccessRequests = useCallback(async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('team_access_request')
        .select(`
          id, created_at, requested_role, message, status, user_id,
          user:user_id (id, name)
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching team access requests:', error);
        return [];
      }

      const requests = data || [];
      
      // Fetch user emails using the secure function
      const requestsWithEmails = await Promise.all(
        requests.map(async (request) => {
          try {
            const { data: emailData, error: emailError } = await supabase
              .rpc('get_user_email_for_team_request', {
                request_user_id: request.user_id,
                team_id: teamId
              });
            
            if (emailError) {
              console.error('Error fetching user email:', emailError);
            }
            
            return {
              ...request,
              user_email: emailData || null
            };
          } catch (emailErr) {
            console.error('Exception fetching user email:', emailErr);
            return request;
          }
        })
      );
      
      // Update local state if this is for the current team
      if (currentTeam && currentTeam.id === teamId) {
        setPendingRequests(requestsWithEmails);
      }

      return requestsWithEmails;
    } catch (err) {
      console.error('Exception in getTeamAccessRequests:', err);
      return [];
    }
  }, [currentTeam]);

  // Check for pending requests for current team (for automatic notification)
  const checkPendingRequests = useCallback(async () => {
    if (!currentTeam || !user || !userProfile) {
      setPendingRequests([]);
      return;
    }

    // Only check if user can manage the team
    const userRole = currentTeam.userRole;
    if (userRole !== 'admin' && userRole !== 'coach') {
      setPendingRequests([]);
      return;
    }

    try {
      const requests = await getTeamAccessRequests(currentTeam.id);
      // getTeamAccessRequests already updates setPendingRequests
      return requests;
    } catch (err) {
      console.error('Exception in checkPendingRequests:', err);
      setPendingRequests([]);
      return [];
    }
  }, [currentTeam, user, userProfile, getTeamAccessRequests]);

  // Automatic pending request check for team admins
  useEffect(() => {
    // Check if all required conditions are met for pending request check
    if (user && userProfile && currentTeam) {
      const userRole = currentTeam.userRole;
      // Only check for admins and coaches
      if (userRole === 'admin' || userRole === 'coach') {
        console.log('Checking for pending requests for team admin/coach:', currentTeam.name);
        checkPendingRequests();
      } else {
        // Clear pending requests if user is not admin/coach
        setPendingRequests([]);
      }
    } else {
      // Clear pending requests if conditions not met
      setPendingRequests([]);
    }
  }, [user, userProfile, currentTeam, checkPendingRequests]);

  // ============================================================================
  // CLUB MEMBERSHIP FUNCTIONS
  // ============================================================================

  // Join a club directly (self-registration model)
  const joinClub = useCallback(async (clubId) => {
    try {
      setLoading(true);
      clearError();

      // Check if user is already a member of this club
      const { data: existingMembership, error: checkError } = await supabase
        .from('club_user')
        .select('id, role, status')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking existing club membership:', checkError);
        setError('Failed to check club membership');
        return null;
      }

      if (existingMembership) {
        console.log('User is already a member of this club:', existingMembership);
        setError('You are already a member of this club');
        return null;
      }

      const { data, error } = await supabase
        .from('club_user')
        .insert([{
          club_id: clubId,
          user_id: user.id,
          role: 'member',
          status: 'active'
        }])
        .select(`
          id, role, status, created_at,
          club:club_id (id, name, short_name, long_name)
        `)
        .single();

      if (error) {
        console.error('Error joining club:', error);
        // Handle specific duplicate key error
        if (error.code === '23505') {
          setError('You are already a member of this club');
        } else {
          setError('Failed to join club');
        }
        return null;
      }

      // Refresh user clubs after successful join
      const updatedClubs = await getClubMemberships();
      setUserClubs(updatedClubs);

      return data;
    } catch (err) {
      console.error('Exception in joinClub:', err);
      setError('Failed to join club');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getClubMemberships]);


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
  // TEAM INVITATION FUNCTIONS  
  // ============================================================================

  // Invite a user to join a team via email
  const inviteUserToTeam = useCallback(async ({ teamId, email, role, message = '' }) => {
    try {
      if (!user) {
        setError('Must be authenticated to send invitations');
        return { success: false, error: 'Authentication required' };
      }

      setLoading(true);
      clearError();

      // Validate that the user has permission to invite (admin or coach)
      const currentUserTeam = userTeams.find(t => t.id === teamId);
      if (!currentUserTeam || (currentUserTeam.userRole !== 'admin' && currentUserTeam.userRole !== 'coach')) {
        setError('You do not have permission to invite users to this team');
        return { success: false, error: 'Insufficient permissions' };
      }

      // Validate role restrictions (coaches can't invite admins)
      if (currentUserTeam.userRole === 'coach' && role === 'admin') {
        setError('Coaches cannot invite users as administrators');
        return { success: false, error: 'Role restriction' };
      }

      // Call Supabase Edge Function to handle invitation (database validation + email sending)
      const { data, error } = await supabase.functions.invoke('invite-user-to-team', {
        body: {
          p_team_id: teamId,
          p_email: email.toLowerCase(),
          p_role: role,
          p_message: message,
          p_redirect_url: `${window.location.origin}/?invitation=true&team=${teamId}&role=${role}`
        }
      });

      if (error) {
        console.error('Error calling Edge Function:', error);
        setError(error.message || 'Failed to send invitation');
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        console.error('Edge Function returned error:', data?.error);
        setError(data?.error || 'Failed to send invitation');
        return { success: false, error: data?.error };
      }

      console.log('Edge Function response:', data);
      
      // Handle both success and warning cases (warning means database worked but email failed)
      if (data.warning) {
        console.warn('Invitation created with warning:', data.warning);
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message || `Invitation sent successfully to ${email}`,
        warning: data.warning
      };

    } catch (err) {
      console.error('Exception in inviteUserToTeam:', err);
      const errorMessage = err.message || 'Failed to send invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, userTeams, clearError]);

  // Get team invitations (for team admins/coaches)
  const getTeamInvitations = useCallback(async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('team_invitation')
        .select(`
          id, email, role, message, status, created_at,
          invited_by:invited_by_user_id (id, name),
          invited_user:invited_user_id (id, name)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team invitations:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getTeamInvitations:', err);
      return [];
    }
  }, []);

  // Cancel a team invitation
  const cancelTeamInvitation = useCallback(async (invitationId) => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('team_invitation')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('invited_by_user_id', user.id) // Ensure user can only cancel their own invitations
        .select()
        .single();

      if (error) {
        console.error('Error cancelling invitation:', error);
        setError('Failed to cancel invitation');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in cancelTeamInvitation:', err);
      setError('Failed to cancel invitation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

  // Accept a team invitation
  const acceptTeamInvitation = useCallback(async (invitationId) => {
    try {
      if (!user) {
        setError('Must be authenticated to accept invitations');
        return { success: false, error: 'Authentication required' };
      }

      setLoading(true);
      clearError();

      // Call RPC function to handle invitation acceptance
      const { data, error } = await supabase.rpc('accept_team_invitation', {
        p_invitation_id: invitationId,
        p_user_email: user.email
      });

      if (error) {
        console.error('Error accepting invitation:', error);
        const errorMessage = error.message || 'Failed to accept invitation';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      console.log('Invitation accepted successfully:', data);

      // Refresh user teams to include the new team
      await getUserTeams();

      return { 
        success: true, 
        data,
        message: 'Welcome to the team! You have been successfully added.' 
      };

    } catch (err) {
      console.error('Exception in acceptTeamInvitation:', err);
      const errorMessage = err.message || 'Failed to accept invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getUserTeams]);

  // ============================================================================
  // TEAM ACCESS REQUEST FUNCTIONS
  // ============================================================================

  // Request access to a team
  const requestTeamAccess = useCallback(async (teamId, requestedRole = 'coach', message = '', skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
        clearError();
      }

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
        if (!skipLoadingState) {
          setError('Failed to request team access');
        }
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in requestTeamAccess:', err);
      if (!skipLoadingState) {
        setError('Failed to request team access');
      }
      return null;
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  }, [user, clearError]);



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

      // Refresh pending requests after approval
      if (currentTeam) {
        checkPendingRequests();
      }

      return data;
    } catch (err) {
      console.error('Exception in approveTeamAccess:', err);
      setError('Failed to approve team access');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, currentTeam, checkPendingRequests]);

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

      // Refresh pending requests after rejection
      if (currentTeam) {
        checkPendingRequests();
      }

      return data;
    } catch (err) {
      console.error('Exception in rejectTeamAccess:', err);
      setError('Failed to reject team access');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, currentTeam, checkPendingRequests]);

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

  // Get team members (for admins to manage roles)
  const getTeamMembers = useCallback(async (teamId) => {
    try {
      const { data, error } = await supabase
        .from('team_user')
        .select(`
          id, role, created_at,
          user:user_id (id, name)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching team members:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getTeamMembers:', err);
      return [];
    }
  }, []);

  // Update team member role (for admins)
  const updateTeamMemberRole = useCallback(async (teamUserId, newRole) => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('team_user')
        .update({ role: newRole })
        .eq('id', teamUserId)
        .select(`
          id, role, created_at,
          user:user_id (id, name)
        `)
        .single();

      if (error) {
        console.error('Error updating team member role:', error);
        setError('Failed to update member role');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in updateTeamMemberRole:', err);
      setError('Failed to update member role');
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Remove team member (for admins)
  const removeTeamMember = useCallback(async (teamUserId) => {
    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('team_user')
        .delete()
        .eq('id', teamUserId)
        .select()
        .single();

      if (error) {
        console.error('Error removing team member:', error);
        setError('Failed to remove team member');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in removeTeamMember:', err);
      setError('Failed to remove team member');
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Get team roster (players)
  const getTeamRoster = useCallback(async (teamId) => {
    if (!teamId) return [];

    try {
      const { data, error } = await supabase
        .from('player')
        .select(`
          id,
          name,
          jersey_number,
          on_roster,
          created_at,
          updated_at
        `)
        .eq('team_id', teamId)
        .order('jersey_number', { ascending: true });

      if (error) {
        console.error('Error fetching team roster:', error);
        throw new Error('Failed to load team roster');
      }

      return data || [];
    } catch (err) {
      console.error('Exception in getTeamRoster:', err);
      throw err;
    }
  }, []);

  // Add player to team roster
  const addRosterPlayer = useCallback(async (teamId, playerData) => {
    if (!teamId || !playerData?.name) return null;

    try {
      // Check if jersey number is already taken
      if (playerData.jersey_number) {
        const { data: existingPlayer } = await supabase
          .from('player')
          .select('id')
          .eq('team_id', teamId)
          .eq('jersey_number', playerData.jersey_number)
          .single();

        if (existingPlayer) {
          throw new Error(`Jersey number ${playerData.jersey_number} is already taken`);
        }
      }

      const { data, error } = await supabase
        .from('player')
        .insert({
          team_id: teamId,
          name: playerData.name.trim(),
          jersey_number: playerData.jersey_number || null,
          on_roster: playerData.on_roster ?? true,
          created_by: user.id,
          last_updated_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding roster player:', error);
        throw new Error('Failed to add player to roster');
      }

      return data;
    } catch (err) {
      console.error('Exception in addRosterPlayer:', err);
      throw err;
    }
  }, [user]);

  // Update roster player
  const updateRosterPlayer = useCallback(async (playerId, updates) => {
    if (!playerId) return null;

    try {
      // Check jersey number conflicts if updating jersey number
      if (updates.jersey_number !== undefined) {
        const { data: player } = await supabase
          .from('player')
          .select('team_id')
          .eq('id', playerId)
          .single();

        if (player && updates.jersey_number) {
          const { data: existingPlayer } = await supabase
            .from('player')
            .select('id')
            .eq('team_id', player.team_id)
            .eq('jersey_number', updates.jersey_number)
            .neq('id', playerId)
            .single();

          if (existingPlayer) {
            throw new Error(`Jersey number ${updates.jersey_number} is already taken`);
          }
        }
      }

      const updateData = {
        ...updates,
        last_updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      // Clean the data
      if (updateData.name) {
        updateData.name = updateData.name.trim();
      }

      const { data, error } = await supabase
        .from('player')
        .update(updateData)
        .eq('id', playerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating roster player:', error);
        throw new Error('Failed to update player');
      }

      return data;
    } catch (err) {
      console.error('Exception in updateRosterPlayer:', err);
      throw err;
    }
  }, [user]);

  // Remove player from roster
  const removeRosterPlayer = useCallback(async (playerId) => {
    if (!playerId) return null;

    try {
      // Check if player has played any games
      const { data: statsCheck, error: statsError } = await supabase
        .from('player_match_stats')
        .select('id')
        .eq('player_id', playerId)
        .limit(1);

      if (statsError) {
        console.error('Error checking player game history:', statsError);
        throw new Error('Failed to check player game history');
      }

      const hasPlayedGames = statsCheck && statsCheck.length > 0;

      if (hasPlayedGames) {
        // Player has game history - soft delete by setting on_roster = false
        const { data, error } = await supabase
          .from('player')
          .update({ 
            on_roster: false,
            last_updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', playerId)
          .select()
          .single();

        if (error) {
          console.error('Error deactivating player:', error);
          throw new Error('Failed to deactivate player');
        }

        return { ...data, operation: 'deactivated' };
      } else {
        // Player has no game history - hard delete
        const { data, error } = await supabase
          .from('player')
          .delete()
          .eq('id', playerId)
          .select()
          .single();

        if (error) {
          console.error('Error removing player:', error);
          throw new Error('Failed to remove player from roster');
        }

        return { ...data, operation: 'deleted' };
      }
    } catch (err) {
      console.error('Exception in removeRosterPlayer:', err);
      throw err;
    }
  }, [user]);

  // Check if player has played any games
  const checkPlayerGameHistory = useCallback(async (playerId) => {
    if (!playerId) return false;

    try {
      const { data, error } = await supabase
        .from('player_match_stats')
        .select('id')
        .eq('player_id', playerId)
        .limit(1);

      if (error) {
        console.error('Error checking player game history:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (err) {
      console.error('Exception in checkPlayerGameHistory:', err);
      return false;
    }
  }, []);

  // Get available jersey numbers for a team
  const getAvailableJerseyNumbers = useCallback(async (teamId, excludePlayerId = null) => {
    if (!teamId) return [];

    try {
      const { data, error } = await supabase
        .from('player')
        .select('jersey_number')
        .eq('team_id', teamId)
        .not('jersey_number', 'is', null);

      if (error) {
        console.error('Error fetching jersey numbers:', error);
        return [];
      }

      const usedNumbers = new Set(
        data
          .filter(p => p.jersey_number !== null && (!excludePlayerId || p.id !== excludePlayerId))
          .map(p => p.jersey_number)
      );

      // Generate available numbers 1-100
      const available = [];
      for (let i = 1; i <= 100; i++) {
        if (!usedNumbers.has(i)) {
          available.push(i);
        }
      }

      return available;
    } catch (err) {
      console.error('Exception in getAvailableJerseyNumbers:', err);
      return [];
    }
  }, []);

  // Check if current user is the creator of a club
  const isClubCreator = useCallback((club) => {
    if (!user || !club) return false;
    return club.created_by === user.id;
  }, [user]);

  const value = {
    // State
    currentTeam,
    userTeams,
    userClubs,
    teamPlayers,
    pendingRequests,
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
    isClubCreator,
    
    // Club membership actions
    joinClub,
    getClubMemberships,
    getPendingClubRequests,
    approveClubMembership,
    rejectClubMembership,
    
    // Team invitation actions
    inviteUserToTeam,
    getTeamInvitations,
    cancelTeamInvitation,
    acceptTeamInvitation,
    
    // Team access request actions
    requestTeamAccess,
    getTeamAccessRequests,
    getUserTeamRequests,
    approveTeamAccess,
    rejectTeamAccess,
    cancelTeamAccess,
    
    // Team member management actions
    getTeamMembers,
    updateTeamMemberRole,
    removeTeamMember,
    
    // Roster management actions
    getTeamRoster,
    addRosterPlayer,
    updateRosterPlayer,
    removeRosterPlayer,
    checkPlayerGameHistory,
    getAvailableJerseyNumbers,
    
    // Pending request management
    checkPendingRequests,
    
    // Computed properties
    hasTeams: userTeams.length > 0,
    hasClubs: userClubs.length > 0,
    isCoach: currentTeam?.userRole === 'coach',
    isTeamAdmin: currentTeam?.userRole === 'admin',
    canManageTeam: currentTeam?.userRole === 'admin' || currentTeam?.userRole === 'coach',
    hasPendingRequests: pendingRequests.length > 0,
    pendingRequestsCount: pendingRequests.length,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};