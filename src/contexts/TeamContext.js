import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
const TRANSIENT_TEAM_ERROR_CLEAR_DELAY_MS = 0;

const TEAM_ERROR_CODES = {
  AUTH_REQUIRED: 'auth_required',
  CLUB_MEMBERSHIP_NOT_FOUND: 'club_membership_not_found',
  DUPLICATE_CLUB_MEMBERSHIP: 'duplicate_club_membership',
  DUPLICATE_TEAM_NAME: 'duplicate_team_name',
  GENERIC: 'generic_error',
  TEAM_MEMBERSHIP_NOT_FOUND: 'team_membership_not_found',
  TEAM_NOT_FOUND: 'team_not_found'
};

const TEAM_ERROR_MESSAGE_KEYS = {
  [TEAM_ERROR_CODES.AUTH_REQUIRED]: 'team:errors.loginRequired',
  [TEAM_ERROR_CODES.CLUB_MEMBERSHIP_NOT_FOUND]: 'team:errors.clubMembershipNotFound',
  [TEAM_ERROR_CODES.DUPLICATE_CLUB_MEMBERSHIP]: 'team:errors.alreadyClubMember',
  [TEAM_ERROR_CODES.DUPLICATE_TEAM_NAME]: 'team:errors.teamNameExists',
  [TEAM_ERROR_CODES.GENERIC]: 'team:errors.genericError',
  [TEAM_ERROR_CODES.TEAM_MEMBERSHIP_NOT_FOUND]: 'team:errors.teamMembershipNotFound',
  [TEAM_ERROR_CODES.TEAM_NOT_FOUND]: 'team:errors.teamNotFound'
};

const TEAM_ERROR_MESSAGE_TO_CODE = {
  'A team with this name already exists in this club. Please request to join the existing team.':
    TEAM_ERROR_CODES.DUPLICATE_TEAM_NAME,
  'Club membership not found': TEAM_ERROR_CODES.CLUB_MEMBERSHIP_NOT_FOUND,
  'Must be logged in to create club': TEAM_ERROR_CODES.AUTH_REQUIRED,
  'Must be logged in to delete team': TEAM_ERROR_CODES.AUTH_REQUIRED,
  'Must be logged in to leave club': TEAM_ERROR_CODES.AUTH_REQUIRED,
  'Must be logged in to leave team': TEAM_ERROR_CODES.AUTH_REQUIRED,
  'Team membership not found': TEAM_ERROR_CODES.TEAM_MEMBERSHIP_NOT_FOUND,
  'Team not found': TEAM_ERROR_CODES.TEAM_NOT_FOUND,
  'User must be authenticated to create a team': TEAM_ERROR_CODES.AUTH_REQUIRED,
  'You are already a member of this club': TEAM_ERROR_CODES.DUPLICATE_CLUB_MEMBERSHIP
};

const isTeamErrorCode = (value) => Object.values(TEAM_ERROR_CODES).includes(value);

const normalizeTeamError = (errorValue, t) => {
  if (!errorValue) {
    return null;
  }

  const resolveMessage = (key) => t ? t(key) : key;

  if (typeof errorValue === 'string') {
    if (isTeamErrorCode(errorValue)) {
      const messageKey = TEAM_ERROR_MESSAGE_KEYS[errorValue] || TEAM_ERROR_MESSAGE_KEYS[TEAM_ERROR_CODES.GENERIC];
      return {
        code: errorValue,
        message: resolveMessage(messageKey),
        isTransient: errorValue === TEAM_ERROR_CODES.TEAM_NOT_FOUND
      };
    }

    const code = TEAM_ERROR_MESSAGE_TO_CODE[errorValue] || TEAM_ERROR_CODES.GENERIC;
    return {
      code,
      message: errorValue,
      isTransient: code === TEAM_ERROR_CODES.TEAM_NOT_FOUND
    };
  }

  const code = isTeamErrorCode(errorValue.code)
    ? errorValue.code
    : TEAM_ERROR_CODES.GENERIC;
  const messageKey = TEAM_ERROR_MESSAGE_KEYS[code] || TEAM_ERROR_MESSAGE_KEYS[TEAM_ERROR_CODES.GENERIC];
  const message = errorValue.message || resolveMessage(messageKey);

  return {
    ...errorValue,
    code,
    message,
    isTransient: Boolean(errorValue.isTransient || code === TEAM_ERROR_CODES.TEAM_NOT_FOUND)
  };
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }) => {
  const { t } = useTranslation('team');
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
  const errorDetails = useMemo(() => normalizeTeamError(error, t), [error, t]);
  const displayError = useMemo(() => {
    if (!errorDetails || errorDetails.isTransient) {
      return null;
    }
    return errorDetails.message;
  }, [errorDetails]);
  const deferredRefreshTimeoutRef = useRef(null);

  // Flag to prevent redundant initialization
  const initializationDone = useRef(false);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (!errorDetails?.isTransient) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setError(null);
    }, TRANSIENT_TEAM_ERROR_CLEAR_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [errorDetails?.code, errorDetails?.isTransient]);

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
        setError(t('errors.loadTeams'));
        return [];
      }

      const teams = (data || [])
        .filter(item => item?.team)
        .map(item => ({
          ...item.team,
          userRole: item.role,
          club: item.team?.club || null
        }));

      setUserTeams(teams);
      
      // Cache the results
      cacheTeamData({ userTeams: teams });

      if (currentTeam && !teams.some(team => team.id === currentTeam.id)) {
        setCurrentTeam(null);
        setTeamPlayers([]);
        teamIdPersistence.clearState();
        cacheTeamData({
          currentTeam: null,
          teamPlayers: []
        });
      }
      
      return teams;
    } catch (err) {
      console.error('Exception in getUserTeams:', err);
      setError(t('errors.loadTeams'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, clearError, currentTeam, teamIdPersistence, t]);

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

  // Create a new club using atomic function
  const createClub = useCallback(async (clubData) => {
    if (!user) {
      setError(t('errors.loginRequiredCreateClub'));
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
        setError(t('errors.createClub'));
        return null;
      }

      // Check if the function returned an error result
      if (!data.success) {
        console.error('Create club function failed:', data.error);
        setError(data.message || t('errors.createClub'));
        return null;
      }

      // Refresh user club memberships to reflect the new admin membership
      const updatedClubs = await getClubMemberships();
      setUserClubs(updatedClubs);

      return data.club;
    } catch (err) {
      console.error('Exception in createClub:', err);
      setError(t('errors.createClub'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getClubMemberships, t]);

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
      setError(t('errors.loginRequiredCreateTeam'));
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
        setError(t('errors.createTeam'));
        return null;
      }

      // Check if the function returned an error result
      if (!data.success) {
        console.error('Create team function failed:', data.error);
        
        // Provide specific error handling for duplicate team names
        if (data.error === 'duplicate_team_name') {
          setError(t('errors.teamNameExists'));
        } else {
          setError(data.message || t('errors.createTeam'));
        }
        return null;
      }

      // Refresh user teams
      await getUserTeams();

      return data.team;
    } catch (err) {
      console.error('Exception in createTeam:', err);
      setError(t('errors.createTeam'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getUserTeams, t]);

  // Get players for current team
  const getTeamPlayers = useCallback(async (teamId, includeTemporary = false) => {
    if (!teamId) return [];

    try {
      let query = supabase
        .from('player')
        .select('id, first_name, last_name, display_name, jersey_number, on_roster')
        .eq('team_id', teamId)
        .order('display_name');

      if (!includeTemporary) {
        query = query.eq('on_roster', true);
      }

      const { data, error } = await query;

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

  const refreshTeamPlayers = useCallback(async (teamId) => {
    const effectiveTeamId = teamId || currentTeam?.id;
    if (!effectiveTeamId) return [];

    const players = await getTeamPlayers(effectiveTeamId);
    setTeamPlayers(players);
    return players;
  }, [currentTeam?.id, getTeamPlayers]);

  // Create a new player for current team
  const createPlayer = useCallback(async (playerData) => {
    if (!currentTeam) {
      setError(t('errors.noTeamSelected'));
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
        setError(t('errors.createPlayer'));
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
      setError(t('errors.createPlayer'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentTeam, clearError, getTeamPlayers, t]);

  // Switch current team
  const switchCurrentTeam = useCallback(async (teamId) => {
    const team = userTeams.find(t => t.id === teamId);
    if (!team) {
      setError(t('errors.teamNotFound'));
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
  }, [userTeams, getTeamPlayers, teamIdPersistence, t]);

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
          setError(t('errors.initUserData'));
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
  }, [user, getUserTeams, getClubMemberships, sessionDetectionResult, teamIdPersistence, clearTeamPreferencesCache, t]);

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
        setError(t('errors.checkClubMembership'));
        return null;
      }

      if (existingMembership) {
        setError(t('errors.alreadyClubMember'));
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
          setError(t('errors.alreadyClubMember'));
        } else {
          setError(t('errors.joinClub'));
        }
        return null;
      }

      // Refresh user clubs after successful join
      const updatedClubs = await getClubMemberships();
      setUserClubs(updatedClubs);

      return data;
    } catch (err) {
      console.error('Exception in joinClub:', err);
      setError(t('errors.joinClub'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getClubMemberships, t]);

  // Leave a club (remove club and team memberships)
  const leaveClub = useCallback(async (membership) => {
    const clubId = typeof membership === 'string'
      ? membership
      : membership?.club?.id || membership?.club_id || null;

    if (!clubId) {
      setError(t('errors.clubMembershipNotFound'));
      return null;
    }

    if (!user) {
      setError(t('errors.loginRequiredLeaveClub'));
      return null;
    }

    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase.rpc('leave_club', {
        p_club_id: clubId
      });

      if (error) {
        console.error('Error leaving club:', error);
        setError(t('errors.leaveClub'));
        return null;
      }

      if (!data?.success) {
        if (data?.error === 'last_team_member') {
          return data;
        }

        const message = data?.message || data?.error || t('errors.leaveClub');
        setError(message);
        return data;
      }

      await getUserTeams();
      const updatedClubs = await getClubMemberships();
      setUserClubs(updatedClubs);

      return data;
    } catch (err) {
      console.error('Exception in leaveClub:', err);
      setError(t('errors.leaveClub'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getClubMemberships, getUserTeams, t]);

  // Leave a team (remove team membership only)
  const leaveTeam = useCallback(async (team) => {
    const teamId = typeof team === 'string'
      ? team
      : team?.id || team?.team_id || null;

    if (!teamId) {
      setError(t('errors.teamMembershipNotFound'));
      return null;
    }

    if (!user) {
      setError(t('errors.loginRequiredLeaveTeam'));
      return null;
    }

    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase.rpc('leave_team', {
        p_team_id: teamId
      });

      if (error) {
        console.error('Error leaving team:', error);
        setError(t('errors.leaveTeam'));
        return null;
      }

      if (!data?.success) {
        setError(data?.message || data?.error || t('errors.leaveTeam'));
        return data;
      }

      await getUserTeams();

      if (currentTeam?.id === teamId) {
        setCurrentTeam(null);
        setTeamPlayers([]);
        teamIdPersistence.clearState();
        cacheTeamData({
          currentTeam: null,
          teamPlayers: []
        });
      }

      return data;
    } catch (err) {
      console.error('Exception in leaveTeam:', err);
      setError(t('errors.leaveTeam'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getUserTeams, currentTeam, teamIdPersistence, t]);

  // Delete (deactivate) a team
  const deleteTeam = useCallback(async (team) => {
    const teamId = typeof team === 'string'
      ? team
      : team?.id || team?.team_id || null;

    if (!teamId) {
      setError(t('errors.teamNotFound'));
      return null;
    }

    if (!user) {
      setError(t('errors.loginRequiredDeleteTeam'));
      return null;
    }

    try {
      setLoading(true);
      clearError();

      const { data, error } = await supabase.rpc('delete_team', {
        p_team_id: teamId
      });

      if (error) {
        console.error('Error deleting team:', error);
        setError(t('errors.deleteTeam'));
        return null;
      }

      if (!data?.success) {
        setError(data?.message || data?.error || t('errors.deleteTeam'));
        return null;
      }

      await getUserTeams();

      if (currentTeam?.id === teamId) {
        setCurrentTeam(null);
        setTeamPlayers([]);
        teamIdPersistence.clearState();
        cacheTeamData({
          currentTeam: null,
          teamPlayers: []
        });
      }

      return data;
    } catch (err) {
      console.error('Exception in deleteTeam:', err);
      setError(t('errors.deleteTeam'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getUserTeams, currentTeam, teamIdPersistence, t]);


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
        setError(t('errors.approveClubMembership'));
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in approveClubMembership:', err);
      setError(t('errors.approveClubMembership'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError, t]);

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
        setError(t('errors.rejectClubMembership'));
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in rejectClubMembership:', err);
      setError(t('errors.rejectClubMembership'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError, t]);

  // ============================================================================
  // TEAM INVITATION FUNCTIONS
  // ============================================================================

  // Invite a user to join a team via email
  const inviteUserToTeam = useCallback(async ({ teamId, email, role, message = '' }) => {
    try {
      if (!user) {
        setError(t('errors.loginRequiredInvite'));
        return { success: false, error: 'Authentication required' };
      }

      setLoading(true);
      clearError();

      // Validate that the user has permission to invite (admin or coach)
      const currentUserTeam = userTeams.find(t => t.id === teamId);
      if (!currentUserTeam || (currentUserTeam.userRole !== 'admin' && currentUserTeam.userRole !== 'coach')) {
        setError(t('errors.noPermissionInvite'));
        return { success: false, error: 'Insufficient permissions' };
      }

      // Validate role restrictions (coaches can't invite admins)
      if (currentUserTeam.userRole === 'coach' && role === 'admin') {
        setError(t('errors.coachCannotInviteAdmin'));
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
        setError(error.message || t('errors.sendInvitation'));
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        console.error('Edge Function returned error:', data?.error);
        setError(data?.error || t('errors.sendInvitation'));
        return { success: false, error: data?.error };
      }

      // Handle both success and warning cases (warning means database worked but email failed)
      if (data.warning) {
        console.warn('Invitation created with warning:', data.warning);
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message || t('context.invitationSentTo', { email }),
        warning: data.warning
      };

    } catch (err) {
      console.error('Exception in inviteUserToTeam:', err);
      const errorMessage = err.message || t('errors.sendInvitation');
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, userTeams, clearError, t]);

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
        setError(t('errors.cancelInvitation'));
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in cancelTeamInvitation:', err);
      setError(t('errors.cancelInvitation'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, t]);

  // Accept a team invitation
  const acceptTeamInvitation = useCallback(async (invitationId) => {
    try {
      if (!user) {
        setError(t('errors.loginRequiredAccept'));
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
        const errorMessage = error.message || t('errors.acceptInvitation');
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Refresh user teams to include the new team
      await getUserTeams();

      return {
        success: true,
        data,
        message: t('context.welcomeToTeam')
      };

    } catch (err) {
      console.error('Exception in acceptTeamInvitation:', err);
      const errorMessage = err.message || t('errors.acceptInvitation');
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, clearError, getUserTeams, t]);

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
        setError(t('errors.loadInvitations'));
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
          name: t('context.teamFallbackName'),
          club: null
        },
        invitedBy: {
          id: null,
          name: t('context.teamAdminFallback')
        }
      })) || [];

      return invitations;
    } catch (err) {
      console.error('Exception in getUserPendingInvitations:', err);
      setError(t('errors.loadInvitations'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, clearError, t]);

  // Decline a team invitation
  const declineTeamInvitation = useCallback(async (invitationId) => {
    try {
      if (!user) {
        setError(t('errors.loginRequiredDecline'));
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
        const errorMessage = error.message || t('errors.declineInvitation');
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return {
        success: true,
        data,
        message: data?.message || t('context.invitationDeclined')
      };
    } catch (err) {
      console.error('Exception in declineTeamInvitation:', err);
      const errorMessage = t('errors.declineInvitation');
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, clearError, t]);

  // Refresh an existing invitation (pending or expired)
  const refreshInvitation = useCallback(async ({ invitationId, teamId, email, role, message = '' }) => {
    try {
      if (!user) {
        setError(t('errors.loginRequiredRefresh'));
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
        setError(result.error || t('errors.refreshInvitation'));
        return { success: false, error: result.error };
      }

    } catch (err) {
      console.error('Exception in refreshInvitation:', err);
      const errorMessage = err.message || t('errors.refreshInvitation');
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, inviteUserToTeam, clearError, t]);

  // Delete a team invitation permanently
  const deleteInvitation = useCallback(async (invitationId) => {
    try {
      if (!user) {
        setError(t('errors.loginRequiredDelete'));
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
        const errorMessage = error.message || t('errors.deleteInvitation');
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      return {
        success: data.success || true,
        message: data.message || t('context.invitationDeleted')
      };

    } catch (err) {
      console.error('Exception in deleteInvitation:', err);
      const errorMessage = err.message || t('errors.deleteInvitation');
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, clearError, t]);

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
            setError(t('errors.pendingRequestExists'));
          } else {
            setError(t('errors.requestTeamAccess'));
          }
        }
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in requestTeamAccess:', err);
      if (!skipLoadingState) {
        setError(t('errors.requestTeamAccess'));
      }
      return null;
    } finally {
      if (!skipLoadingState) {
        setLoading(false);
      }
    }
  }, [user, clearError, t]);



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
        setError(t('errors.fetchRequestDetails'));
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
        setError(t('errors.addUserToTeam'));
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
        setError(t('errors.updateRequestStatus'));
        return null;
      }

      // Refresh pending requests after approval
      if (currentTeam) {
        checkPendingRequests();
      }

      return data;
    } catch (err) {
      console.error('Exception in approveTeamAccess:', err);
      setError(t('errors.approveTeamAccess'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, currentTeam, checkPendingRequests, t]);

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
        setError(t('errors.rejectTeamAccess'));
        return null;
      }

      // Refresh pending requests after rejection
      if (currentTeam) {
        checkPendingRequests();
      }

      return data;
    } catch (err) {
      console.error('Exception in rejectTeamAccess:', err);
      setError(t('errors.rejectTeamAccess'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, currentTeam, checkPendingRequests, t]);

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
        setError(t('errors.cancelRequest'));
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in cancelTeamAccess:', err);
      setError(t('errors.cancelRequest'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, clearError, t]);

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
        setError(t('errors.updateMemberRole'));
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in updateTeamMemberRole:', err);
      setError(t('errors.updateMemberRole'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError, t]);

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
        setError(t('errors.removeTeamMember'));
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception in removeTeamMember:', err);
      setError(t('errors.removeTeamMember'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearError, t]);

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
          match_id,
          created_at,
          updated_at,
          related_to,
          related_user:related_to (id, name)
        `)
        .eq('team_id', teamId)
        .is('match_id', null)
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
          related_to: playerData.related_to || null,
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
    if (['substitutionLogic', 'alternateRoles'].includes(key)) return PREFERENCE_CATEGORIES.SUBSTITUTION;
    if (['trackGoalScorer', 'fairPlayAward', 'teamCaptain'].includes(key)) return PREFERENCE_CATEGORIES.FEATURES;
    if (['loanMatchWeight'].includes(key)) return PREFERENCE_CATEGORIES.STATISTICS;
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
    // `error` is a user-facing message string; transient errors are auto-cleared and not surfaced.
    error: displayError,
    
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
    leaveClub,
    leaveTeam,
    deleteTeam,
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
    refreshTeamPlayers,
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
