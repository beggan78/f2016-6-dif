import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedUserProfile, cacheUserProfile, clearAllCache, cacheAuthUser, getCachedAuthUser } from '../utils/cacheUtils';
import { cleanupAbandonedMatches } from '../services/matchCleanupService';
import { cleanupPreviousSession } from '../utils/sessionCleanupUtils';
import { detectSessionType, shouldCleanupSession, clearAllSessionData, DETECTION_TYPES } from '../services/sessionDetectionService';

// Feature flag to control session expiry warnings
const ENABLE_SESSION_EXPIRY_WARNINGS = false;

const AuthContext = createContext({
  // Core state
  user: null,
  userProfile: null,
  loading: true,
  authError: null,
  sessionExpiry: null,
  
  // Session detection
  sessionDetectionResult: null,
  
  // Computed properties
  isAuthenticated: false,
  isEmailConfirmed: false,
  hasValidProfile: false,
  profileName: 'Not set',
  needsProfileCompletion: false,
  
  // Session management
  showSessionWarning: false,
  extendSession: async () => {},
  dismissSessionWarning: () => {},
  clearAuthError: () => {},
  markProfileCompleted: () => {},
  
  // Auth functions
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  verifyOtp: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  changePassword: async () => {},
  updateProfile: async () => {},
});


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [skipProfileFetch, setSkipProfileFetch] = useState(false);
  const [sessionDetectionResult, setSessionDetectionResult] = useState(null);

  // Clear any auth errors when user changes
  useEffect(() => {
    if (authError) {
      setAuthError(null);
    }
  }, [user, authError]);

  // Simple profile fetch function with timeout
  const fetchUserProfile = useCallback(async (userId, session = null, detectionResult = null) => {
    try {

      // Check cache first if session detection indicates page refresh
      if (detectionResult?.type === DETECTION_TYPES.PAGE_REFRESH) {
        const cachedProfile = getCachedUserProfile();
        if (cachedProfile && cachedProfile.id === userId) {
          setUserProfile(cachedProfile);
          const needsCompletion = !cachedProfile.name || cachedProfile.name.trim().length === 0;
          setNeedsProfileCompletion(needsCompletion);
          
          // Return cached data immediately, skip database query
          return cachedProfile;
        }
      }
      
      // Use provided session data to avoid auth deadlock
      if (!session) {
        // Fallback: only call auth methods if no session provided
        const sessionCheck = await supabase.auth.getSession();
        session = sessionCheck.data?.session;
      }

      
      // Create the database query
      const queryPromise = supabase
        .from('user_profile')
        .select('*')
        .eq('id', userId)
        .single();
      
      // Add 12 second timeout to accommodate Supabase delays during invitation flow
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 12000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - treat as incomplete but do not crash
          setUserProfile(null);
          setNeedsProfileCompletion(true);
          return null;
        }
        throw error;
      }
      
      setUserProfile(data);
      
      // Cache the successful result
      cacheUserProfile(data);
      
      // Check if profile needs completion
      const needsCompletion = !data || !data.name || data.name.trim().length === 0;
      setNeedsProfileCompletion(needsCompletion);
      
      return data;
      
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      setUserProfile(null);
      // Do not force profile completion prompt on transient fetch failures
      return null;
    }
  }, []);

  // Session management functions
  const extendSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (session) {
        const expiryTime = new Date(session.expires_at * 1000);
        setSessionExpiry(expiryTime);
        setShowSessionWarning(false);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const dismissSessionWarning = useCallback(() => {
    setShowSessionWarning(false);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Mark profile as completed
  const markProfileCompleted = useCallback(() => {
    setNeedsProfileCompletion(false);
  }, []);

  // Session expiry monitoring
  const setupSessionMonitoring = useCallback((session) => {
    if (!session) {
      setSessionExpiry(null);
      setShowSessionWarning(false);
      return;
    }

    const expiryTime = new Date(session.expires_at * 1000);
    setSessionExpiry(expiryTime);
    
    
    // Warn user 5 minutes before expiry (disabled via feature flag)
    if (ENABLE_SESSION_EXPIRY_WARNINGS) {
      const warningTime = expiryTime.getTime() - Date.now() - (5 * 60 * 1000);
      if (warningTime > 0) {
        setTimeout(() => {
          setShowSessionWarning(true);
        }, warningTime);
      }
    }
  }, []);

  const initialDetectionRef = useRef(null);
  const hasCachedProfileRef = useRef(false);
  // Track if we've already processed initial session to prevent duplicates
  const initializedRef = useRef(false);
  const currentFetchRef = useRef(null);
  const currentUserIdRef = useRef(null);

  // Early detection to hydrate state from cache before Supabase finishes recovery
  useEffect(() => {
    const detection = detectSessionType();
    initialDetectionRef.current = detection;
    setSessionDetectionResult(detection);

    if (detection.type === DETECTION_TYPES.PAGE_REFRESH) {
      const cachedUser = getCachedAuthUser();
      const cachedProfile = getCachedUserProfile();

      if (cachedUser) {
        setUser(cachedUser);
      }

      if (cachedProfile && (!cachedUser || cachedProfile.id === cachedUser.id)) {
        setUserProfile(cachedProfile);
        const needsCompletion = !cachedProfile?.name || cachedProfile.name.trim().length === 0;
        setNeedsProfileCompletion(needsCompletion);
        hasCachedProfileRef.current = true;
      }

      if (cachedUser || cachedProfile) {
        setLoading(false);
      }
    }
  }, []);


  // Main auth state change handler
  useEffect(() => {
    // Listen for auth changes - this will handle initial session too
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        // Handle sign out
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setUserProfile(null);
          setSessionExpiry(null);
          setNeedsProfileCompletion(false);
          setLoading(false);
          initializedRef.current = false;
          currentUserIdRef.current = null;
          return;
        }

        // For any session events with a user, check if we've already initialized to prevent duplicates
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && initializedRef.current && session?.user) {
          // Extra check: are we processing the same user?
          if (currentUserIdRef.current === session.user.id) {
            return;
          }
        }

        // Process the session
        if (session?.user) {
          const userId = session.user.id;
          
          // Check if we're already processing this user
          if (currentUserIdRef.current === userId && currentFetchRef.current) {
            return;
          }
          
          setUser(session.user);
          cacheAuthUser(session.user);
          setupSessionMonitoring(session);
          currentUserIdRef.current = userId;
          
          // Use advanced session detection to determine cleanup strategy
          const detectionResult = initialDetectionRef.current || detectSessionType();
          initialDetectionRef.current = detectionResult;
          
          // Store detection result for other components to access
          setSessionDetectionResult(detectionResult);
          
          // Set session flag immediately after detection to prevent false positives on subsequent runs
          sessionStorage.setItem('auth_session_initialized', 'true');
          
          // Only clean up localStorage based on reliable detection
          if (shouldCleanupSession(detectionResult)) {
            cleanupPreviousSession();
          } else {
          }
          
          // Run match cleanup in background (fire-and-forget)
          if (detectionResult.type === DETECTION_TYPES.NEW_SIGN_IN) {
            cleanupAbandonedMatches().catch(error => {
              // Log cleanup errors but don't disrupt login flow
              if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ Match cleanup failed during login:', error.message);
              }
            });
          }
          
          // Cancel any existing profile fetch for different user
          if (currentFetchRef.current) {
          }
          
          // Skip profile fetch during invitation password setup to prevent delays
          if (skipProfileFetch) {
            initializedRef.current = true;
            setLoading(false);
          } else {
            const isPageRefresh = detectionResult.type === DETECTION_TYPES.PAGE_REFRESH;
            const skipImmediateFetch = isPageRefresh && hasCachedProfileRef.current;

            // Fetch profile with proper tracking and detection result when needed
            if (!skipImmediateFetch) {
              const fetchPromise = fetchUserProfile(userId, session, detectionResult);
              currentFetchRef.current = fetchPromise;

              if (isPageRefresh) {
                fetchPromise.finally(() => {
                  if (currentFetchRef.current === fetchPromise) {
                    currentFetchRef.current = null;
                  }
                });
                initializedRef.current = true;
                setLoading(false);
              } else {
                try {
                  await fetchPromise;
                } finally {
                  currentFetchRef.current = null;
                  initializedRef.current = true;
                  setLoading(false);
                }
              }
            } else {
              // We already hydrated from cache; mark initialization complete without hitting Supabase
              initializedRef.current = true;
              setLoading(false);
            }
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, setupSessionMonitoring, skipProfileFetch]); // Include required dependencies

  // Auth functions
  const signUp = async (email, password, name) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      const signUpParams = {
        email,
        password,
        options: {
          data: { name } // Store name in user metadata
        }
      };
      
      const { data, error } = await supabase.auth.signUp(signUpParams);
      
      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // User was created but no session - email confirmation required
        return { 
          user: null, 
          error: null, 
          message: "Please check your email for confirmation link" 
        };
      }

      // User was created and signed in immediately
      return { user: data.user, error: null };
    } catch (error) {
      const errorMessage = error.message || 'Failed to sign up';
      setAuthError(errorMessage);
      console.error('Sign up error:', error.message);
      return { user: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      const errorMessage = error.message || 'Failed to sign in';
      setAuthError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setAuthError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local state
      setUser(null);
      setUserProfile(null);
      setSessionExpiry(null);
      
      // Clear all cached data on sign out
      clearAllCache();
      cacheAuthUser(null);
      
      // Clear session detection state to ensure fresh detection on next sign-in
      clearAllSessionData();
      
      // Reset refs to prevent stale state
      initializedRef.current = false;
      currentUserIdRef.current = null;

      return { error: null };
    } catch (error) {
      const errorMessage = error.message || 'Failed to sign out';
      setAuthError(errorMessage);
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, token, type = 'signup') => {
    try {
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      const errorMessage = error.message || 'Verification failed';
      setAuthError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setAuthError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });

      if (error) throw error;

      return { 
        error: null, 
        message: 'Password reset link sent to your email. Please check your inbox and follow the instructions.' 
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to send password reset email';
      setAuthError(errorMessage);
      return { error: { message: errorMessage }, message: null };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      setAuthError(null);

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { 
        error: null, 
        message: 'Password updated successfully. You can now sign in with your new password.' 
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to update password';
      setAuthError(errorMessage);
      return { error: { message: errorMessage }, message: null };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      if (!user) throw new Error('No authenticated user');
      
      setLoading(true);
      setAuthError(null);

      // First, verify the current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (verifyError) {
        const errorMessage = verifyError.message === 'Invalid login credentials' 
          ? 'Current password is incorrect'
          : 'Failed to verify current password';
        setAuthError(errorMessage);
        return { error: { message: errorMessage }, message: null };
      }

      // If verification succeeds, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      return { 
        error: null, 
        message: 'Password updated successfully. Your account security has been improved.' 
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to change password';
      setAuthError(errorMessage);
      return { error: { message: errorMessage }, message: null };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      if (!user) throw new Error('No authenticated user');
      
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase
        .from('user_profile')
        .upsert({ 
          id: user.id, 
          ...profileData 
        })
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      
      // Cache the updated profile to localStorage to prevent loss on page refresh
      cacheUserProfile(data);
      
      return { profile: data, error: null };
    } catch (error) {
      const errorMessage = error.message || 'Failed to update profile';
      setAuthError(errorMessage);
      return { profile: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  // Computed properties
  const isAuthenticated = !!user;
  const isEmailConfirmed = user?.email_confirmed_at != null;
  const hasValidProfile = !!userProfile && !!userProfile.id && userProfile.id === user?.id;
  const profileName = userProfile?.name || 'Not set';

  // Profile fetch control functions
  const enableProfileFetchSkip = useCallback(() => {
    setSkipProfileFetch(true);
  }, []);

  const disableProfileFetchSkip = useCallback(() => {
    setSkipProfileFetch(false);
  }, []);

  const value = {
    // Core state
    user,
    userProfile,
    loading,
    authError,
    sessionExpiry,
    
    // Session detection
    sessionDetectionResult,
    
    // Computed properties
    isAuthenticated,
    isEmailConfirmed,
    hasValidProfile,
    profileName,
    needsProfileCompletion,
    
    // Session management
    showSessionWarning,
    extendSession,
    dismissSessionWarning,
    clearAuthError,
    markProfileCompleted,
    
    // Profile fetch control
    enableProfileFetchSkip,
    disableProfileFetchSkip,
    
    // Auth functions
    signUp,
    signIn,
    signOut,
    verifyOtp,
    resetPassword,
    updatePassword,
    changePassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
