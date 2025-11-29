import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DETECTION_TYPES } from '../services/sessionDetectionService';
import { getCachedTeamData, cacheTeamData } from '../utils/cacheUtils';
import { sanitizeSearchInput } from '../utils/inputSanitization';
import { syncTeamRosterToGameState } from '../utils/playerSyncUtils';
import { createPersistenceManager } from '../utils/persistenceManager';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  PREFERENCE_CATEGORIES,
  parsePreferenceValue,
  serializePreferenceValue
} from '../types/preferences';

const TeamContext = createContext({});

const REFRESH_REVALIDATION_DELAY_MS = 0;
const TEAM_PREFERENCES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }) => {
  const { user, userProfile, sessionDetectionResult } = useAuth();

  // Create persistence manager for currentTeamId
  const teamIdPersistence = useMemo(
    () => createPersistenceManager(STORAGE_KEYS.CURRENT_TEAM_ID, { teamId: null }),
    []
  );
  const teamPreferencesCache = useMemo(
    () => createPersistenceManager(STORAGE_KEYS.TEAM_PREFERENCES_CACHE, { teamId: null, fetchedAt: 0, preferences: {} }),
    []
  );

  const [currentTeam, setCurrentTeam] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [userClubs, setUserClubs] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [matchActivityStatus, setMatchActivityStatus] = useState(() => ({
    matchState: 'not_started',
    isRunning: false,
    isActive: false
  }));
  const isMatchRunning = matchActivityStatus.isRunning;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const deferredRefreshTimeoutRef = useRef(null);

  // Flag to prevent redundant initialization
  const initializationDone = useRef(false);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const readCachedTeamPreferences = useCallback((teamId) => {
    if (!teamId) {
      return null;
    }

    const cached = teamPreferencesCache.loadState();
    if (!cached?.teamId || cached.teamId !== teamId) {
      return null;
    }

    if (!cached.fetchedAt) {
      return null;
    }

    const ageMs = Date.now() - cached.fetchedAt;
    if (ageMs > TEAM_PREFERENCES_CACHE_TTL_MS) {
      return null;
    }

    return cached.preferences || {};
  }, [teamPreferencesCache]);

  const writeCachedTeamPreferences = useCallback((teamId, preferences) => {
    if (!teamId) {
      return {};
    }

    const normalizedPreferences = preferences && typeof preferences === 'object' ? preferences : {};
    teamPreferencesCache.saveState({
      teamId,
      fetchedAt: Date.now(),
      preferences: normalizedPreferences
    });
    return normalizedPreferences;
  }, [teamPreferencesCache]);

  const clearTeamPreferencesCache = useCallback(() => {
    teamPreferencesCache.clearState();
  }, [teamPreferencesCache]);

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
      // Use enhanced sanitization to prevent SQL injection and XSS
      const sanitizedQuery = sanitizeSearchInput(query);
      
      if (sanitizedQuery.length < 2) {
        return []; // Require minimum 2 characters for search
      }

      // Use safer approach with individual ilike filters and combine results
      const searchPattern = `%${sanitizedQuery}%`;
      
      const { data, error } = await supabase
        .from('club')
        .select('id, name, short_name, long_name')
        .or(`name.ilike.${searchPattern},short_name.ilike.${searchPattern},long_name.ilike.${searchPattern}`)
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

      // Refresh user club memberships to reflect the new admin membership
      const updatedClubs = await getClubMemberships();
      setUserClubs(updatedClubs);

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
        
        // Provide specific error handling for duplicate team names
        if (data.error === 'duplicate_team_name') {
          setError('A team with this name already exists in this club. Please request to join the existing team.');
        } else {
          setError(data.message || 'Failed to create team');
        }
        return null;
      }

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
      const { data, error} = await supabase
        .from('player')
        .select('id, first_name, last_name, display_name, jersey_number, on_roster')
        .eq('team_id', teamId)
        .eq('on_roster', true)
        .order('display_name');

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
          first_name: playerData.firstName,
          last_name: playerData.lastName || null,
          display_name: playerData.displayName,
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

      // Sync new player to game state localStorage
      try {
        const syncResult = syncTeamRosterToGameState(updatedPlayers, []);
        if (syncResult.success) {
        } else {
          console.warn('⚠️ Failed to sync new player to game state:', syncResult.error);
        }
      } catch (syncError) {
        console.warn('⚠️ Player sync error (non-blocking):', syncError);
      }

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

    // Sync team roster to game state localStorage
    try {
      const syncResult = syncTeamRosterToGameState(players, []);
      if (syncResult.success) {
      } else {
        console.warn('⚠️ Failed to sync team roster to game state:', syncResult.error);
      }
    } catch (syncError) {
      console.warn('⚠️ Team roster sync error (non-blocking):', syncError);
    }

    // Cache the current team and players
    cacheTeamData({
      currentTeam: team,
      teamPlayers: players
    });

    // Store in localStorage for persistence via PersistenceManager
    teamIdPersistence.saveState({ teamId });
  }, [userTeams, getTeamPlayers, teamIdPersistence]);

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
      
      // Update the userClubs state
      setUserClubs(clubs);
      
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
    // Only require user to be available, not userProfile to avoid circular dependency delays
    if (user && !initializationDone.current) {
      initializationDone.current = true;
      
      // Check cache first if this is a page refresh AND valid cache exists
      const cachedData = getCachedTeamData();
      const hasValidCache = cachedData.userTeams || cachedData.userClubs || cachedData.currentTeam;
      const detectedRefresh = sessionDetectionResult?.type === DETECTION_TYPES.PAGE_REFRESH;
      const navigationRefresh = typeof performance !== 'undefined' && performance.navigation?.type === 1;
      const isPageRefresh = detectedRefresh || navigationRefresh;
      
      if (isPageRefresh && hasValidCache) {
        console.log('🔄 Page refresh detected with valid cache, loading team data from cache...');
        
        if (cachedData.userTeams) {
          setUserTeams(cachedData.userTeams);
        }
        
        if (cachedData.userClubs) {
          setUserClubs(cachedData.userClubs);
        }
        
        if (cachedData.currentTeam) {
          setCurrentTeam(cachedData.currentTeam);
        }
        
        if (cachedData.teamPlayers) {
          setTeamPlayers(cachedData.teamPlayers);
        }
        
        if (cachedData.pendingRequests) {
          setPendingRequests(cachedData.pendingRequests);
        }
        
        // Defer background refresh to avoid blocking during session recovery
        if (deferredRefreshTimeoutRef.current) {
          clearTimeout(deferredRefreshTimeoutRef.current);
        }

        deferredRefreshTimeoutRef.current = setTimeout(() => {
          Promise.all([
            getUserTeams(),
            getClubMemberships()
          ]).then(([teams, clubs]) => {
            console.log('🔄 Deferred refresh completed - Teams:', teams.length, 'Clubs:', clubs.length);
            setUserClubs(clubs);
          }).catch((error) => {
            console.error('Deferred background refresh failed:', error);
          }).finally(() => {
            deferredRefreshTimeoutRef.current = null;
          });
        }, REFRESH_REVALIDATION_DELAY_MS);
      } else {
        // Normal loading (fresh sign-in or no valid cache)

        Promise.all([
          getUserTeams(),
          getClubMemberships()
        ]).then(([teams, clubs]) => {
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
      teamIdPersistence.clearState();
      clearTeamPreferencesCache();
    }
  }, [user, getUserTeams, getClubMemberships, sessionDetectionResult, teamIdPersistence, clearTeamPreferencesCache]);

  useEffect(() => {
    return () => {
      if (deferredRefreshTimeoutRef.current) {
        clearTimeout(deferredRefreshTimeoutRef.current);
        deferredRefreshTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle team switching when userTeams changes
  useEffect(() => {
    if (userTeams.length > 0 && !currentTeam) {
      // Try to restore previously selected team
      const stored = teamIdPersistence.loadState();
      const savedTeamId = stored.teamId;
      const savedTeam = savedTeamId ? userTeams.find(t => t.id === savedTeamId) : null;

      if (savedTeam) {
        // Restore saved team
        setCurrentTeam(savedTeam);
        getTeamPlayers(savedTeam.id).then(players => {
          setTeamPlayers(players);
        });
        teamIdPersistence.saveState({ teamId: savedTeam.id });
      } else if (userTeams.length === 1) {
        // Auto-select if user has only one team
        const team = userTeams[0];
        setCurrentTeam(team);
        getTeamPlayers(team.id).then(players => {
          setTeamPlayers(players);
        });
        teamIdPersistence.saveState({ teamId: team.id });
      }
    } else if (userTeams.length === 0 && initializationDone.current) {
      // Explicitly handle no teams case - ensure loading is false
      // Make sure currentTeam is null and teamPlayers is empty
      setCurrentTeam(null);
      setTeamPlayers([]);
    }
  }, [userTeams, currentTeam, getTeamPlayers, teamIdPersistence]);

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
    if (isMatchRunning) {
      return;
    }

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
  }, [currentTeam, user, userProfile, getTeamAccessRequests, isMatchRunning]);

  const updateMatchActivityStatus = useCallback((nextMatchState) => {
    if (!nextMatchState) {
      return;
    }

    setMatchActivityStatus(prev => {
      if (prev.matchState === nextMatchState) {
        return prev;
      }

      const isRunning = nextMatchState === 'running';
      const isActive = isRunning || nextMatchState === 'pending';

      return {
        matchState: nextMatchState,
        isRunning,
        isActive
      };
    });
  }, []);

  // Automatic pending request check for team admins
  useEffect(() => {
    if (isMatchRunning) {
      return;
    }

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
  }, [user, userProfile, currentTeam, checkPendingRequests, isMatchRunning]);

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
          p_redirect_url: `${window.location.origin}/?invitation=true&team=${encodeURIComponent(teamId)}&role=${encodeURIComponent(role)}`
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
        .select('id, email, role, message, status, created_at, invited_by_user_id, expires_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team invitations:', error);
        return [];
      }

      // Return all invitations - UI will handle display of expired vs pending
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

  // Get pending invitations for the current user
  const getUserPendingInvitations = useCallback(async () => {
    try {
      if (!user) {
        return [];
      }

      setLoading(true);
      clearError();

      const { data, error } = await supabase
        .from('team_invitation')
        .select(`
          id,
          team_id,
          email,
          role,
          message,
          created_at,
          expires_at,
          team:team_id (
            id,
            name,
            club:club_id (
              id,
              name,
              short_name,
              long_name
            )
          )
        `)
        .eq('status', 'pending')
        .eq('email', user.email)
        .gt('expires_at', 'now()')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user pending invitations:', error);
        setError('Failed to load pending invitations');
        return [];
      }

      const invitations = data?.map(invitation => ({
        id: invitation.id,
        teamId: invitation.team_id,
        email: invitation.email,
        role: invitation.role,
        message: invitation.message,
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at,
        team: invitation.team ? {
          id: invitation.team.id,
          name: invitation.team.name,
          club: invitation.team.club
        } : {
          id: invitation.team_id,
          name: 'Team',
          club: null
        },
        invitedBy: {
          id: null,
          name: 'Team Admin'
        }
      })) || [];

      return invitations;
    } catch (err) {
      console.error('Exception in getUserPendingInvitations:', err);
      setError('Failed to load pending invitations');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

  // Decline a team invitation
  const declineTeamInvitation = useCallback(async (invitationId) => {
    try {
      if (!user) {
        setError('Must be authenticated to decline invitations');
        return { success: false, error: 'Authentication required' };
      }

      setLoading(true);
      clearError();

      // Call RPC function to handle invitation decline
      const { data, error } = await supabase.rpc('decline_team_invitation', {
        p_invitation_id: invitationId,
        p_user_email: user.email
      });

      if (error) {
        console.error('Error declining invitation:', error);
        const errorMessage = error.message || 'Failed to decline invitation';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return {
        success: true, 
        data,
        message: data?.message || 'Invitation declined successfully'
      };
    } catch (err) {
      console.error('Exception in declineTeamInvitation:', err);
      const errorMessage = 'Failed to decline invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

  // Refresh an existing invitation (pending or expired)
  const refreshInvitation = useCallback(async ({ invitationId, teamId, email, role, message = '' }) => {
    try {
      if (!user) {
        setError('Must be authenticated to refresh invitations');
        return { success: false, error: 'Authentication required' };
      }

      setLoading(true);
      clearError();

      // Use the existing inviteUserToTeam function which now handles expired invitations
      const result = await inviteUserToTeam({ teamId, email, role, message });

      if (result.success) {
        return {
          success: true,
          message: result.message,
          was_expired: result.was_expired
        };
      } else {
        setError(result.error || 'Failed to refresh invitation');
        return { success: false, error: result.error };
      }

    } catch (err) {
      console.error('Exception in refreshInvitation:', err);
      const errorMessage = err.message || 'Failed to refresh invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, inviteUserToTeam, clearError]);

  // Delete a team invitation permanently
  const deleteInvitation = useCallback(async (invitationId) => {
    try {
      if (!user) {
        setError('Must be authenticated to delete invitations');
        return { success: false, error: 'Authentication required' };
      }

      setLoading(true);
      clearError();

      // Call the new delete function
      const { data, error } = await supabase.rpc('delete_team_invitation', {
        p_invitation_id: invitationId
      });

      if (error) {
        console.error('Error deleting invitation:', error);
        const errorMessage = error.message || 'Failed to delete invitation';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return {
        success: data.success || true,
        message: data.message || 'Invitation deleted successfully'
      };

    } catch (err) {
      console.error('Exception in deleteInvitation:', err);
      const errorMessage = err.message || 'Failed to delete invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, clearError]);

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
          team:team_id (
            id,
            name,
            club:club_id (id, name, short_name, long_name)
          ),
          user:user_id (id, name)
        `)
        .single();

      if (error) {
        console.error('Error requesting team access:', error);
        if (!skipLoadingState) {
          // Handle specific unique constraint violation (23505 = unique_violation)
          if (error.code === '23505' && error.message?.includes('unique_pending_request_idx')) {
            setError('You already have a pending request for this team. Please wait for the current request to be reviewed, or cancel it first to submit a new one.');
          } else {
            setError('Failed to request team access');
          }
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
          team:team_id (
            id,
            name,
            club:club_id (id, name, short_name, long_name)
          )
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
          team:team_id (
            id,
            name,
            club:club_id (id, name, short_name, long_name)
          )
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
          team:team_id (
            id,
            name,
            club:club_id (id, name, short_name, long_name)
          )
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
          first_name,
          last_name,
          display_name,
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
    if (!teamId || !playerData?.first_name) return null;

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
          first_name: playerData.first_name.trim(),
          last_name: playerData.last_name ? playerData.last_name.trim() : null,
          display_name: playerData.display_name.trim(),
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

      // Update teamPlayers state if this is for the current team
      if (currentTeam?.id === teamId) {
        const updatedPlayers = await getTeamPlayers(teamId);
        setTeamPlayers(updatedPlayers);

        // Sync new player to game state localStorage for consistency
        try {
          const syncResult = syncTeamRosterToGameState(updatedPlayers, []);
          if (syncResult.success) {
          } else {
            console.warn('⚠️ Failed to sync new roster player to game state:', syncResult.error);
          }
        } catch (syncError) {
          console.warn('⚠️ Roster player sync error (non-blocking):', syncError);
        }
      }

      return data;
    } catch (err) {
      console.error('Exception in addRosterPlayer:', err);
      throw err;
    }
  }, [user, currentTeam, getTeamPlayers]);

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
      if (updateData.first_name) {
        updateData.first_name = updateData.first_name.trim();
      }
      if (updateData.last_name) {
        updateData.last_name = updateData.last_name.trim();
      }
      if (updateData.display_name) {
        updateData.display_name = updateData.display_name.trim();
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

      const teamId = data?.team_id;

      if (teamId && currentTeam?.id === teamId) {
        const updatedPlayers = await getTeamPlayers(teamId);
        setTeamPlayers(updatedPlayers);

        try {
          const syncResult = syncTeamRosterToGameState(updatedPlayers, []);
          if (!syncResult.success) {
            console.warn('⚠️ Failed to sync updated roster player to game state:', syncResult.error);
          }
        } catch (syncError) {
          console.warn('⚠️ Roster player sync error (non-blocking):', syncError);
        }
      }

      return data;
    } catch (err) {
      console.error('Exception in updateRosterPlayer:', err);
      throw err;
    }
  }, [user, currentTeam, getTeamPlayers]);

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

  // ============================================================================
  // TEAM PREFERENCE FUNCTIONS
  // ============================================================================

  // Helper to determine category from key
  const getCategoryForKey = useCallback((key) => {
    if (['matchFormat', 'formation'].includes(key)) return PREFERENCE_CATEGORIES.MATCH;
    if (['periodLength', 'numPeriods'].includes(key)) return PREFERENCE_CATEGORIES.TIME;
    if (['substitutionLogic'].includes(key)) return PREFERENCE_CATEGORIES.SUBSTITUTION;
    if (['trackGoalScorer', 'fairPlayAward', 'teamCaptain'].includes(key)) return PREFERENCE_CATEGORIES.FEATURES;
    return null;
  }, []);

  // Load team preferences (cached in localStorage with TTL)
  const loadTeamPreferences = useCallback(async (teamId, { forceRefresh = false } = {}) => {
    if (!teamId) return {};

    const cachedPreferences = forceRefresh ? null : readCachedTeamPreferences(teamId);
    if (cachedPreferences) {
      return cachedPreferences;
    }

    try {
      const { data, error } = await supabase
        .from('team_preference')
        .select('key, value')
        .eq('team_id', teamId);

      if (error) {
        console.error('Error loading team preferences:', error);
        const fallback = readCachedTeamPreferences(teamId);
        return fallback || {};
      }

      const preferences = {};
      data?.forEach(pref => {
        preferences[pref.key] = parsePreferenceValue(pref.key, pref.value);
      });

      return writeCachedTeamPreferences(teamId, preferences);
    } catch (err) {
      console.error('Unexpected error loading preferences:', err);
      const fallback = readCachedTeamPreferences(teamId);
      return fallback || {};
    }
  }, [readCachedTeamPreferences, writeCachedTeamPreferences]);

  // Save team preferences (upsert)
  const saveTeamPreferences = useCallback(async (teamId, preferences) => {
    if (!teamId || !preferences) {
      throw new Error('Team ID and preferences are required');
    }

    try {
      // Convert preferences object to array of records
      const records = Object.entries(preferences).map(([key, value]) => ({
        team_id: teamId,
        key,
        value: serializePreferenceValue(value),
        category: getCategoryForKey(key),
      }));

      // Upsert all preferences
      const { error } = await supabase
        .from('team_preference')
        .upsert(records, {
          onConflict: 'team_id,key',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error saving team preferences:', error);
        throw new Error('Failed to save preferences');
      }

      writeCachedTeamPreferences(teamId, preferences);

      return true;
    } catch (err) {
      console.error('Unexpected error saving preferences:', err);
      throw err;
    }
  }, [getCategoryForKey, writeCachedTeamPreferences]);

  // Delete a specific preference
  const deleteTeamPreference = useCallback(async (teamId, key) => {
    if (!teamId || !key) {
      throw new Error('Team ID and preference key are required');
    }

    try {
      const { error } = await supabase
        .from('team_preference')
        .delete()
        .eq('team_id', teamId)
        .eq('key', key);

      if (error) {
        console.error('Error deleting preference:', error);
        throw new Error('Failed to delete preference');
      }

      const cached = readCachedTeamPreferences(teamId);
      if (cached && Object.prototype.hasOwnProperty.call(cached, key)) {
        const updated = { ...cached };
        delete updated[key];
        writeCachedTeamPreferences(teamId, updated);
      }

      return true;
    } catch (err) {
      console.error('Unexpected error deleting preference:', err);
      throw err;
    }
  }, [readCachedTeamPreferences, writeCachedTeamPreferences]);

  useEffect(() => {
    if (!currentTeam?.id) {
      clearTeamPreferencesCache();
      return;
    }

    loadTeamPreferences(currentTeam.id, { forceRefresh: true }).catch((error) => {
      console.error('Failed to prefetch team preferences:', error);
    });
  }, [currentTeam?.id, loadTeamPreferences, clearTeamPreferencesCache]);

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
    getUserPendingInvitations,
    declineTeamInvitation,
    refreshInvitation,
    deleteInvitation,
    
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

    // Team preference actions
    loadTeamPreferences,
    saveTeamPreferences,
    deleteTeamPreference,

    // Pending request management
    checkPendingRequests,
    matchActivityStatus,
    isMatchRunning,
    updateMatchActivityStatus,

    // Computed properties
    hasTeams: userTeams.length > 0,
    hasClubs: userClubs.length > 0,
    isCoach: currentTeam?.userRole === 'coach',
    isTeamAdmin: currentTeam?.userRole === 'admin',
    isParent: currentTeam?.userRole === 'parent',
    canManageTeam: currentTeam?.userRole === 'admin' || currentTeam?.userRole === 'coach',
    canViewStatistics: ['parent', 'coach', 'admin'].includes(currentTeam?.userRole),
    hasPendingRequests: pendingRequests.length > 0,
    pendingRequestsCount: pendingRequests.length,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};
