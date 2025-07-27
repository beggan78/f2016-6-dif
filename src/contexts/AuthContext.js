import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
// import { createClient } from '@supabase/supabase-js'; // Removed - not used after simplifying recovery approach

// Debug logging utility with environment-aware verbosity
const debugLog = (message, data = null, isError = false) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Always log errors, but filter debug messages based on environment
  if (isError || isDevelopment) {
    const timestamp = new Date().toISOString();
    const ms = performance.now().toFixed(3);
    const prefix = isError ? '💥' : '🔍';
    
    if (data) {
      console.log(`${prefix} [${timestamp}] [${ms}ms] ${message}`, data);
    } else {
      console.log(`${prefix} [${timestamp}] [${ms}ms] ${message}`);
    }
  }
};

// Global auth subscription management to prevent React Strict Mode duplicates
let globalAuthSubscription = null;
let globalAuthSubscriptionCount = 0;
let isAuthInitializing = false;

// Auth operation queue to prevent concurrent processing and state corruption
let authOperationQueue = [];
let isProcessingAuthEvent = false;

const queueAuthOperation = async (operationObj) => {
  return new Promise((resolve, reject) => {
    const queueItem = {
      operation: operationObj.execute || operationObj,
      operationName: operationObj.name || 'anonymous',
      resolve,
      reject,
      timestamp: Date.now()
    };
    
    authOperationQueue.push(queueItem);
    debugLog('📥 Queued auth operation', {
      queueLength: authOperationQueue.length,
      operationName: queueItem.operationName,
      timestamp: queueItem.timestamp
    });
    
    // Process queue if not already processing
    if (!isProcessingAuthEvent) {
      processAuthQueue();
    }
  });
};

const processAuthQueue = async () => {
  if (isProcessingAuthEvent || authOperationQueue.length === 0) {
    return;
  }
  
  isProcessingAuthEvent = true;
  debugLog('🔄 Starting auth queue processing', {
    queueLength: authOperationQueue.length
  });
  
  while (authOperationQueue.length > 0) {
    const queueItem = authOperationQueue.shift();
    const { operation, operationName, resolve, reject, timestamp } = queueItem;
    
    try {
      debugLog('⚡ Processing auth operation', {
        operationName,
        queuedFor: `${Date.now() - timestamp}ms`,
        remainingInQueue: authOperationQueue.length
      });
      
      const result = await operation();
      resolve(result);
      
      debugLog('✅ Auth operation completed', {
        operationName
      });
    } catch (error) {
      debugLog('❌ Auth operation failed', {
        operationName,
        error: error.message
      }, true);
      reject(error);
    }
  }
  
  isProcessingAuthEvent = false;
  debugLog('🏁 Auth queue processing completed');
};

// Event tracking for deduplication
let eventCounter = 0;
const recentEvents = new Map(); // eventType -> {count, lastTimestamp, eventId}

const trackAuthEvent = (eventType, sessionInfo) => {
  eventCounter++;
  const eventId = `evt-${eventCounter}-${Date.now()}`;
  const now = Date.now();
  
  // Check for potential duplicates
  if (recentEvents.has(eventType)) {
    const recent = recentEvents.get(eventType);
    const timeDiff = now - recent.lastTimestamp;
    
    if (timeDiff < 1000) { // Less than 1 second apart
      debugLog(`⚠️ POTENTIAL DUPLICATE AUTH EVENT: "${eventType}" (${timeDiff}ms apart)`, {
        eventId,
        previousEventId: recent.eventId,
        timeDiff,
        count: recent.count + 1,
        sessionInfo
      }, true);
    }
    
    recent.count++;
    recent.lastTimestamp = now;
    recent.eventId = eventId;
  } else {
    recentEvents.set(eventType, {
      count: 1,
      lastTimestamp: now,
      eventId
    });
  }
  
  return eventId;
};

// Detect React Strict Mode double mounting
const detectStrictMode = () => {
  globalAuthSubscriptionCount++;
  const isStrictMode = globalAuthSubscriptionCount > 1;
  
  if (isStrictMode) {
    debugLog(`⚠️ REACT STRICT MODE DETECTED: AuthProvider mounted ${globalAuthSubscriptionCount} times`, {
      subscriptionCount: globalAuthSubscriptionCount,
      hasExistingSubscription: !!globalAuthSubscription,
      isInitializing: isAuthInitializing,
      isDevelopment: process.env.NODE_ENV === 'development',
      recommendation: 'This is normal in development with React Strict Mode enabled'
    }, true);
    
    // Development-only helpful message
    if (process.env.NODE_ENV === 'development') {
      console.group('🔧 React Strict Mode Information');
      console.log('React Strict Mode intentionally double-mounts components in development to help detect side effects.');
      console.log('Our AuthProvider is now protected against this - only one auth subscription will be active.');
      console.log('This behavior does not occur in production builds.');
      console.log('Learn more: https://reactjs.org/docs/strict-mode.html');
      console.groupEnd();
    }
  } else {
    debugLog('✅ First AuthProvider mount - initializing auth system', {
      subscriptionCount: globalAuthSubscriptionCount,
      isDevelopment: process.env.NODE_ENV === 'development'
    });
  }
  
  return isStrictMode;
};

// Create the authentication context
const AuthContext = createContext({});

// Custom hook to use the authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component to wrap the app and provide authentication state
export const AuthProvider = ({ children }) => {
  // Enhanced state setters with debug logging
  const [user, _setUser] = useState(null);
  const [userProfile, _setUserProfile] = useState(null);
  const [loading, _setLoading] = useState(true);
  const [authError, _setAuthError] = useState(null);
  const [sessionExpiry, _setSessionExpiry] = useState(null);
  const [showSessionWarning, _setShowSessionWarning] = useState(false);
  const [lastActivity, _setLastActivity] = useState(Date.now());
  const [needsProfileCompletion, _setNeedsProfileCompletion] = useState(false);
  
  // Simplified approach - use original supabase client
  
  // Wrapped state setters with essential logging
  const setUser = useCallback((newUser) => {
    _setUser(currentUser => {
      if (process.env.NODE_ENV === 'development') {
        debugLog('🔄 STATE: setUser', {
          previous: currentUser?.id || 'null',
          new: newUser?.id || 'null'
        });
      }
      return newUser;
    });
  }, []);

  const setUserProfile = useCallback((newProfile) => {
    _setUserProfile(currentProfile => {
      if (process.env.NODE_ENV === 'development') {
        debugLog('🔄 STATE: setUserProfile', {
          previous: currentProfile?.id || 'null',
          new: newProfile?.id || 'null',
          name: newProfile?.name || 'null'
        });
      }
      return newProfile;
    });
  }, []);

  const setLoading = useCallback((newLoading) => {
    _setLoading(currentLoading => {
      if (process.env.NODE_ENV === 'development' && currentLoading !== newLoading) {
        debugLog('🔄 STATE: setLoading', {
          previous: currentLoading,
          new: newLoading
        });
      }
      return newLoading;
    });
  }, []);

  const setAuthError = useCallback((newError) => {
    // Always log errors
    if (newError) {
      debugLog('🔄 STATE: setAuthError', {
        error: newError
      }, true);
    }
    _setAuthError(newError);
  }, []);

  const setSessionExpiry = useCallback((newExpiry) => {
    _setSessionExpiry(currentExpiry => {
      if (process.env.NODE_ENV === 'development') {
        debugLog('🔄 STATE: setSessionExpiry', {
          previous: currentExpiry?.toISOString() || 'null',
          new: newExpiry?.toISOString() || 'null'
        });
      }
      return newExpiry;
    });
  }, []);

  const setShowSessionWarning = useCallback((newWarning) => {
    _setShowSessionWarning(currentWarning => {
      if (process.env.NODE_ENV === 'development' && newWarning !== currentWarning) {
        debugLog('🔄 STATE: setShowSessionWarning', {
          previous: currentWarning,
          new: newWarning
        });
      }
      return newWarning;
    });
  }, []);
  
  const setLastActivity = useCallback((newActivity) => {
    // Don't log activity updates - too verbose
    _setLastActivity(newActivity);
  }, []);

  const setNeedsProfileCompletion = useCallback((needsCompletion) => {
    _setNeedsProfileCompletion(currentNeedsCompletion => {
      if (process.env.NODE_ENV === 'development' && needsCompletion !== currentNeedsCompletion) {
        debugLog('🔄 STATE: setNeedsProfileCompletion', {
          previous: currentNeedsCompletion,
          new: needsCompletion
        });
      }
      return needsCompletion;
    });
  }, []);
  
  // Refs for timers and tracking
  const sessionWarningTimer = useRef(null);
  const sessionExpiryTimer = useRef(null);
  const activityTimer = useRef(null);
  const isActive = useRef(true);

  // Session monitoring functions
  const clearSessionMonitoring = useCallback(() => {
    if (sessionWarningTimer.current) {
      clearTimeout(sessionWarningTimer.current);
      sessionWarningTimer.current = null;
    }
    if (sessionExpiryTimer.current) {
      clearTimeout(sessionExpiryTimer.current);
      sessionExpiryTimer.current = null;
    }
    if (activityTimer.current) {
      clearTimeout(activityTimer.current);
      activityTimer.current = null;
    }
  }, []);

  const handleSessionExpired = useCallback(async () => {
    console.log('Handling session expiry');
    setShowSessionWarning(false);
    setAuthError('Your session has expired. Please sign in again.');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error during automatic signout:', error.message);
      }
      
      // Clear local state
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Exception during automatic signout:', error);
    }
  }, [setShowSessionWarning, setAuthError, setUser, setUserProfile]);

  const setupSessionMonitoring = useCallback((expiryTime) => {
    // Clear existing timers first
    if (sessionWarningTimer.current) {
      clearTimeout(sessionWarningTimer.current);
      sessionWarningTimer.current = null;
    }
    if (sessionExpiryTimer.current) {
      clearTimeout(sessionExpiryTimer.current);
      sessionExpiryTimer.current = null;
    }
    
    if (!expiryTime) return;
    
    const now = Date.now();
    const timeUntilExpiry = expiryTime.getTime() - now;
    const warningTime = timeUntilExpiry - (5 * 60 * 1000); // 5 minutes before expiry
    
    console.log(`Session expires at: ${expiryTime.toLocaleTimeString()}`);
    console.log(`Warning in: ${Math.max(0, warningTime / 1000 / 60)} minutes`);
    
    // Set warning timer (5 minutes before expiry)
    if (warningTime > 0) {
      sessionWarningTimer.current = setTimeout(() => {
        console.log('Session expiring soon, showing warning');
        setShowSessionWarning(true);
      }, warningTime);
    }
    
    // Set expiry timer
    if (timeUntilExpiry > 0) {
      sessionExpiryTimer.current = setTimeout(() => {
        console.log('Session expired, signing out');
        handleSessionExpired();
      }, timeUntilExpiry);
    }
  }, [handleSessionExpired, setShowSessionWarning]);

  // Fetch user profile from the database with retry logic and timeout
  const fetchUserProfile = useCallback(async (userId, attempt = 1, maxRetries = 3) => {
    try {
      console.log(`📋 Fetching profile for user: ${userId} (attempt ${attempt}/${maxRetries})`);
      
      // Add timeout to prevent hanging
      const timeoutMs = 10000; // 10 seconds
      const fetchPromise = supabase
        .from('user_profile')
        .select('*')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Profile fetch timeout after ${timeoutMs}ms`)), timeoutMs)
      );
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error(`❌ Error fetching user profile (attempt ${attempt}):`, error.message, error.details);
        
        // Retry on certain error types if we haven't exceeded max retries
        if (attempt < maxRetries && (
          error.message.includes('timeout') ||
          error.message.includes('network') ||
          error.message.includes('connection') ||
          error.message.includes('Profile fetch timeout') ||
          error.code === 'PGRST301' // JWT expired during fetch
        )) {
          console.log(`🔄 Retrying profile fetch in ${attempt * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          return await fetchUserProfile(userId, attempt + 1, maxRetries);
        }
        
        // If not retryable or max retries exceeded, log error but don't crash
        console.error(`💥 Profile fetch failed after ${attempt} attempts, continuing without profile`);
        setUserProfile(null);
        return null;
      }

      if (data) {
        console.log('✅ Profile fetched successfully:', { id: data.id, name: data.name });
        
        // Validate profile data consistency
        if (data.id !== userId) {
          console.warn('⚠️ Profile ID mismatch! Expected:', userId, 'Got:', data.id);
          return null;
        }
        
        setUserProfile(data);
        return data;
      } else {
        console.log('📭 No profile found for user:', userId);
        setUserProfile(null);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Exception in fetchUserProfile (attempt ${attempt}):`, error.message);
      
      // Retry on exceptions (including timeouts) if we haven't exceeded max retries
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying after exception in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        return await fetchUserProfile(userId, attempt + 1, maxRetries);
      }
      
      // Max retries exceeded
      console.error(`💥 Profile fetch failed with exception after ${attempt} attempts`);
      setUserProfile(null);
      return null;
    }
  }, [setUserProfile]);

  // Create user profile in the database
  const createUserProfile = useCallback(async (user, userData = {}) => {
    try {
      const profileData = {
        id: user.id,
        name: userData.name || user.user_metadata?.name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profile')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error.message);
        return;
      }

      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Exception in createUserProfile:', error);
    }
  }, [setUserProfile]);

  // Initialize authentication state on component mount
  useEffect(() => {
    const isStrictMode = detectStrictMode();
    
    // If this is a duplicate mount from React Strict Mode, don't initialize again
    if (isStrictMode && globalAuthSubscription) {
      debugLog('🛑 SKIPPING duplicate AuthProvider initialization due to React Strict Mode', {
        subscriptionCount: globalAuthSubscriptionCount,
        hasExistingSubscription: true
      }, true);
      
      // Still need to set loading false for this instance
      setLoading(false);
      return () => {
        debugLog('🧹 Cleaning up duplicate AuthProvider (no-op)');
      };
    }
    
    // Prevent concurrent initialization
    if (isAuthInitializing) {
      debugLog('🛑 SKIPPING concurrent auth initialization', {
        isInitializing: isAuthInitializing
      }, true);
      setLoading(false);
      return () => {};
    }
    
    isAuthInitializing = true;
    debugLog('🚀 Starting primary auth initialization', {
      subscriptionCount: globalAuthSubscriptionCount,
      isStrictMode
    });

    // AI Agent's recommended approach: Don't call getSession immediately!
    // Instead, let onAuthStateChange handle session restoration
    debugLog('🔄 Following AI agent pattern - waiting for onAuthStateChange instead of calling getSession immediately');
    
    // We'll set loading=false in the onAuthStateChange handler once we know the auth state

    // Listen for auth changes - enhanced with event-specific handling
    debugLog('🔌 Setting up GLOBAL onAuthStateChange subscription', {
      replacingExisting: !!globalAuthSubscription
    });
    
    // Clean up existing subscription if it exists
    if (globalAuthSubscription) {
      debugLog('🧹 Cleaning up previous global auth subscription');
      globalAuthSubscription.unsubscribe();
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const eventType = event || 'UNKNOWN';
        const sessionInfo = session ? {
          email: session.user.email,
          userId: session.user.id,
          expiresAt: new Date(session.expires_at * 1000).toISOString()
        } : null;
        
        // Track and detect duplicate events
        const eventId = trackAuthEvent(eventType, sessionInfo);
        
        debugLog(`🔄 AUTH EVENT RECEIVED: "${eventType}"`, {
          eventId,
          sessionInfo,
          hasSession: !!session,
          stackTrace: new Error().stack.split('\n').slice(1, 4).join('\n')
        });
        
        // Queue this auth event to prevent concurrent processing
        const authEventOperation = {
          name: `authEvent_${eventType}_${eventId}`,
          execute: async () => {
            debugLog('🔄 Processing auth state change - AI agent pattern', {
              eventType,
              eventId,
              previousUser: user?.id,
              newUser: session?.user?.id,
              isInitialLoad: isAuthInitializing
            });
            
            const previousUserId = user?.id;
            const newUserId = session?.user?.id;

            // Set user first, which is crucial for dependency updates
            setUser(session?.user ?? null);

            // Mark auth as initialized and set loading to false on the first event
            if (isAuthInitializing) {
              debugLog('✅ Auth initialization complete via onAuthStateChange', {
                eventType,
                eventId,
                hasSession: !!session
              });
              setLoading(false);
              isAuthInitializing = false;
            }

            if (newUserId) {
              const expiryTime = session.expires_at ? new Date(session.expires_at * 1000) : null;

              // Scenario 1: A new user has logged in (or initial load with a user)
              if (newUserId !== previousUserId) {
                debugLog('✅ New user detected or initial load. Performing full setup.', {
                  eventType,
                  eventId,
                  userId: newUserId,
                  previousUserId: previousUserId || 'none'
                });

                // Full setup: session, monitoring, profile fetch
                setSessionExpiry(expiryTime);
                setupSessionMonitoring(expiryTime);
                setLastActivity(Date.now());
                
                const profile = await fetchUserProfile(newUserId);

                // Create profile for new users (both SIGNED_UP and first-time SIGNED_IN after email confirmation)
                if (!profile) {
                  debugLog('🔨 Creating new user profile for new user...', { 
                    eventId, 
                    eventType,
                    isNewUser: true 
                  });
                  const newProfile = await createUserProfile(session.user, session.user.user_metadata || {});
                  
                  // Check if the new user needs to complete their profile (no name)
                  if (!newProfile?.name) {
                    debugLog('👤 New user needs profile completion', { eventId });
                    setNeedsProfileCompletion(true);
                  }
                } else {
                  // Check existing profile for completeness
                  if (!profile.name) {
                    debugLog('👤 Existing user needs profile completion', { eventId });
                    setNeedsProfileCompletion(true);
                  } else {
                    setNeedsProfileCompletion(false);
                  }
                }
              } 
              // Scenario 2: Same user, session is just being refreshed
              else {
                debugLog('🔄 Session refresh for existing user. Performing minimal updates.', {
                  eventType,
                  eventId,
                  userId: newUserId
                });
                
                // Minimal setup: update expiry, activity, but don't re-fetch profile
                _setSessionExpiry(currentExpiry => {
                  const newExpiryTime = expiryTime?.getTime();
                  const currentExpiryTime = currentExpiry?.getTime();
                  const timeDiff = newExpiryTime && currentExpiryTime ? Math.abs(newExpiryTime - currentExpiryTime) : Infinity;

                  if (timeDiff > 60000) { // Update monitoring if expiry changed by > 1 min
                    setupSessionMonitoring(expiryTime);
                  }
                  return expiryTime;
                });
                
                setLastActivity(Date.now());
                setShowSessionWarning(false);
                debugLog('ℹ️ Preserving existing profile during session refresh.', { eventId });
              }
            } 
            // Scenario 3: User has logged out
            else {
              debugLog('❌ No session - clearing all auth state', {
                eventType,
                eventId
              });
              clearSessionMonitoring();
              setUserProfile(null);
              setSessionExpiry(null);
              setShowSessionWarning(false);
              setNeedsProfileCompletion(false);
            }

            // Clear any previous auth errors on successful auth changes
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              debugLog('🧹 Clearing auth errors', { eventType, eventId });
              setAuthError(null);
            }
        
            debugLog('🏁 Auth event processing completed', {
              eventType,
              eventId,
              hasSession: !!session,
              processingTime: `${(performance.now() - Number(eventId.split('-')[2])).toFixed(3)}ms`
            });
          }
        };
        
        // Queue the operation to prevent race conditions
        await queueAuthOperation(authEventOperation);
      }
    );
    
    // Store as global subscription
    globalAuthSubscription = subscription;
    debugLog('✅ Global auth subscription established', {
      subscriptionId: subscription.id || 'unknown'
    });

    // AI Agent pattern: Add fallback timeout in case no auth events fire
    // This handles the case where user is not logged in at all
    const fallbackTimer = setTimeout(() => {
      if (isAuthInitializing) {
        debugLog('⏰ Auth initialization fallback - no auth events received, assuming no session');
        setLoading(false);
        isAuthInitializing = false;
      }
    }, 1000); // Give Supabase 1 second to fire auth events

    // Cleanup subscription on unmount
    return () => {
      debugLog('🧹 Cleaning up PRIMARY auth subscription and timers');
      
      // Clear fallback timer
      clearTimeout(fallbackTimer);
      
      // Only clean up if this is the global subscription
      if (globalAuthSubscription === subscription) {
        debugLog('🧹 Unsubscribing global auth subscription');
        globalAuthSubscription?.unsubscribe();
        globalAuthSubscription = null;
      } else {
        debugLog('🧹 Skipping cleanup - not the global subscription');
      }
      
      clearSessionMonitoring();
      isAuthInitializing = false;
    };
  }, [clearSessionMonitoring, setupSessionMonitoring, fetchUserProfile, createUserProfile, setAuthError, setLastActivity, setLoading, setSessionExpiry, setShowSessionWarning, setUser, setUserProfile, setNeedsProfileCompletion, user?.id]);

  // Optimized activity tracking with debouncing
  const lastActivityUpdateTime = useRef(0);
  const activityUpdateDebounceMs = 5000; // Only update activity every 5 seconds
  
  const trackActivity = useCallback(() => {
    if (!user) return;
    
    const now = Date.now();
    isActive.current = true;
    
    // Debounce activity updates to prevent excessive React renders
    const timeSinceLastUpdate = now - lastActivityUpdateTime.current;
    if (timeSinceLastUpdate >= activityUpdateDebounceMs) {
      // Only log in development and not too frequently
      if (process.env.NODE_ENV === 'development' && timeSinceLastUpdate > 30000) {
        debugLog('👆 Updating last activity (debounced)', {
          timeSinceLastUpdate,
          debounceMs: activityUpdateDebounceMs
        });
      }
      setLastActivity(now);
      lastActivityUpdateTime.current = now;
    }
    
    // Clear existing activity timer
    if (activityTimer.current) {
      clearTimeout(activityTimer.current);
    }
    
    // Set user as inactive after 30 minutes of no activity
    activityTimer.current = setTimeout(() => {
      isActive.current = false;
      debugLog('👤 User marked as inactive due to no activity');
    }, 30 * 60 * 1000); // 30 minutes
  }, [user, setLastActivity]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      trackActivity();
    };
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    
    // Initial activity tracking
    trackActivity();
    
    // Cleanup event listeners
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [user, trackActivity]);

  // Sign up function
  const signUp = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData, // Additional user metadata
        },
      });

      if (error) {
        setAuthError(error.message);
        return { user: null, error };
      }

      if (data.user) {
        // Check if email confirmation is required
        if (!data.user.email_confirmed_at) {
          return { 
            user: data.user, 
            error: null, 
            message: 'Please check your email to confirm your account.' 
          };
        }
        // Note: Profile creation is deferred until user signs in and is prompted via ProfileCompletionPrompt
      }

      return { user: data.user, error: null };
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred during sign up';
      setAuthError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    debugLog('🔐 STARTING signIn process', { email });
    
    try {
      debugLog('🔄 Setting loading=true and clearing auth error');
      setLoading(true);
      setAuthError(null);

      debugLog('📞 Calling supabase.auth.signInWithPassword', { email });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      debugLog('📨 signInWithPassword response received', {
        hasUser: !!data?.user,
        userId: data?.user?.id,
        hasError: !!error,
        errorMessage: error?.message,
        willTriggerOnAuthStateChange: !!data?.user
      });

      if (error) {
        debugLog('❌ Sign in failed', { error: error.message }, true);
        setAuthError(error.message);
        return { user: null, error };
      }

      debugLog('✅ Sign in successful', {
        userId: data.user.id,
        email: data.user.email,
        willTriggerAuthEvents: true
      });
      return { user: data.user, error: null };
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred during sign in';
      debugLog('💥 Exception in signIn', { errorMessage }, true);
      setAuthError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    } finally {
      debugLog('🏁 signIn process completed, setting loading=false');
      setLoading(false);
    }
  };

  // Sign out function - enhanced with explicit cleanup
  const signOut = async () => {
    try {
      console.log('\ud83d\udeaa Starting sign out process...');
      setLoading(true);
      setAuthError(null);

      // Clear all session monitoring timers FIRST
      console.log('\ud83e\uddfd Clearing session monitoring...');
      clearSessionMonitoring();

      // Call Supabase signOut
      console.log('\ud83d\udcde Calling Supabase signOut...');
      // Create timeout promise to prevent hanging
      const timeoutMs = 5000; // 5 second timeout (reduced for better UX)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Supabase signOut timed out after ${timeoutMs}ms - investigating root cause`));
        }, timeoutMs);
      });
      
      // Diagnostic logging before signOut call
      debugLog('🔍 Pre-signOut diagnostics', {
        authQueueLength: authOperationQueue.length,
        isProcessingAuth: isProcessingAuthEvent,
        hasGlobalSubscription: !!globalAuthSubscription,
        networkOnline: navigator.onLine,
        currentUser: user?.id
      });

      // Create the signOut promise  
      const signOutPromise = supabase.auth.signOut();

      // Race the signOut vs timeout
      let supabaseResult;
      try {
        supabaseResult = await Promise.race([signOutPromise, timeoutPromise]);
        
        if (supabaseResult && supabaseResult.error) {
          console.error('\u274c Supabase signOut error:', supabaseResult.error.message);
          // Don't return early - continue with cleanup
        } else {
          console.log('\u2705 Supabase signOut successful');
        }
      } catch (timeoutOrError) {
        if (timeoutOrError.message && timeoutOrError.message.includes('timed out')) {
          debugLog('⏰ Supabase signOut timed out - analyzing cause', {
            error: timeoutOrError.message,
            authQueueLength: authOperationQueue.length,
            isProcessingAuth: isProcessingAuthEvent,
            hasGlobalSubscription: !!globalAuthSubscription,
            sessionExpiryState: sessionExpiry?.toISOString()
          }, true);
          
          // Run quick diagnostics to understand why it timed out
          debugLog('🔍 Timeout root cause analysis starting');
          try {
            await testSignOutDiagnostics();
          } catch (diagError) {
            debugLog('❌ Diagnostic test failed during timeout', { error: diagError.message }, true);
          }
          
          await forceSignOutCleanup();
        } else {
          debugLog('❌ Supabase signOut failed with error', { 
            error: timeoutOrError.message,
            stack: timeoutOrError.stack?.substring(0, 200)
          }, true);
        }
        // Continue with our cleanup regardless
      }

      // Explicit cleanup of ALL auth-related state
      console.log('\ud83e\uddfd Clearing all auth state...');
      setUser(null);
      setUserProfile(null);
      setSessionExpiry(null);
      setShowSessionWarning(false);
      setLastActivity(Date.now());

      // Explicit localStorage cleanup (in case Supabase didn't clear it)
      console.log('\ud83e\uddfd Clearing localStorage...');
      try {
        // Clear common Supabase storage keys
        const keysToRemove = [
          'sb-localhost-auth-token',
          'supabase.auth.token',
          'sb-auth-token',
        ];
        
        keysToRemove.forEach(key => {
          if (localStorage.getItem(key)) {
            console.log(`\u2699\ufe0f Removing localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        });

        // Also clear anything that starts with 'sb-' which is Supabase's pattern
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.includes('auth')) {
            console.log(`\u2699\ufe0f Removing localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.warn('\u26a0\ufe0f localStorage cleanup error:', storageError);
      }

      console.log('\u2705 Sign out completed successfully');
      return { error: null };
    } catch (error) {
      console.error('\u274c Exception during sign out:', error);
      const errorMessage = error.message || 'An unexpected error occurred during sign out';
      setAuthError(errorMessage);
      
      // Even if there's an error, try to clear local state
      setUser(null);
      setUserProfile(null);
      setSessionExpiry(null);
      setShowSessionWarning(false);
      clearSessionMonitoring();
      
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setAuthError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setAuthError(error.message);
        return { error };
      }

      return { 
        error: null, 
        message: 'Password reset email sent. Please check your email.' 
      };
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred during password reset';
      setAuthError(errorMessage);
      return { error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  // Verify email OTP function
  const verifyEmailOtp = async (email, token) => {
    debugLog('🔐 STARTING verifyEmailOtp process', { email, tokenLength: token?.length });
    
    try {
      debugLog('🔄 Setting loading=true and clearing auth error');
      setLoading(true);
      setAuthError(null);

      debugLog('📞 Calling supabase.auth.verifyOtp', { email, type: 'signup' });
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });
      
      debugLog('📨 verifyOtp response received', {
        hasUser: !!data?.user,
        userId: data?.user?.id,
        hasError: !!error,
        errorMessage: error?.message,
        isEmailConfirmed: data?.user?.email_confirmed_at ? true : false
      });

      if (error) {
        debugLog('❌ Email verification failed', { error: error.message }, true);
        setAuthError(error.message);
        return { user: null, error };
      }

      if (data.user) {
        debugLog('✅ Email verification successful', {
          userId: data.user.id,
          email: data.user.email,
          emailConfirmed: !!data.user.email_confirmed_at
        });

        // The onAuthStateChange handler will be triggered automatically by Supabase
        // and will handle profile creation and other setup
        return { user: data.user, error: null };
      }

      // This shouldn't happen, but handle it gracefully
      debugLog('⚠️ Unexpected verifyOtp response - no user and no error', { data });
      setAuthError('Verification failed. Please try again.');
      return { user: null, error: { message: 'Verification failed. Please try again.' } };

    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred during verification';
      debugLog('💥 Exception in verifyEmailOtp', { errorMessage }, true);
      setAuthError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    } finally {
      debugLog('🏁 verifyEmailOtp process completed, setting loading=false');
      setLoading(false);
    }
  };

  // Update user profile function
  const updateProfile = async (profileData) => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      setLoading(true);
      setAuthError(null);

      const updateData = {
        id: user.id,
        ...profileData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profile')
        .upsert(updateData)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error.message);
        setAuthError(error.message);
        return { data: null, error };
      }

      setUserProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Exception in updateProfile:', error);
      const errorMessage = error.message || 'An unexpected error occurred while updating profile';
      setAuthError(errorMessage);
      return { data: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  // Clear auth error function
  const clearAuthError = () => {
    setAuthError(null);
  };

  // Mark profile as completed
  const markProfileCompleted = useCallback(() => {
    setNeedsProfileCompletion(false);
  }, [setNeedsProfileCompletion]);

  // Session extension function
  const extendSession = useCallback(async () => {
    try {
      console.log('Extending session...');
      setLoading(true);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session extension failed:', error.message);
        setAuthError('Failed to extend session. Please sign in again.');
        return false;
      }
      
      if (data.session) {
        console.log('Session extended successfully');
        const expiryTime = new Date(data.session.expires_at * 1000);
        setSessionExpiry(expiryTime);
        setupSessionMonitoring(expiryTime);
        setShowSessionWarning(false);
        setAuthError(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Session extension error:', error);
      setAuthError('Failed to extend session. Please sign in again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setupSessionMonitoring, setLoading, setAuthError, setSessionExpiry, setShowSessionWarning]);

  // Dismiss session warning (user chose to ignore)
  const dismissSessionWarning = useCallback(() => {
    setShowSessionWarning(false);
    console.log('Session warning dismissed by user');
  }, [setShowSessionWarning]);

  // Comprehensive Supabase client health diagnostics
  const testSupabaseClientHealth = useCallback(async () => {
    const testId = `clientHealth-${Date.now()}`;
    debugLog('🏥 Starting Supabase client health check', { testId });
    
    const results = {};
    
    try {
      // Test 1: Check localStorage auth tokens
      debugLog('🧪 Test 1: Auth token state', { testId });
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.startsWith('sb-') || key.includes('auth')
      );
      
      const tokenInfo = {};
      authKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value && value.startsWith('{')) {
            const parsed = JSON.parse(value);
            tokenInfo[key] = {
              hasAccessToken: !!parsed.access_token,
              hasRefreshToken: !!parsed.refresh_token,
              expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : null,
              tokenLength: parsed.access_token?.length || 0
            };
          } else {
            tokenInfo[key] = { rawValue: value?.substring(0, 50) + '...' };
          }
        } catch (e) {
          tokenInfo[key] = { parseError: e.message };
        }
      });
      
      debugLog('📋 Auth token analysis', { testId, tokenInfo });
      
      // Test 2: Test Supabase client basic functionality
      debugLog('🧪 Test 2: Supabase client basic operations', { testId });
      
      // 2a: getSession (should work - no network) with timeout
      const sessionStart = performance.now();
      try {
        debugLog('🔍 Starting getSession test with 2s timeout', { testId });
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout after 2s')), 2000)
        );
        
        const { data: sessionData, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        const sessionEnd = performance.now();
        debugLog('✅ getSession test completed', {
          testId,
          duration: `${sessionEnd - sessionStart}ms`,
          hasSession: !!sessionData.session,
          hasError: !!sessionError,
          userId: sessionData.session?.user?.id
        });
      } catch (sessionTestError) {
        const sessionEnd = performance.now();
        debugLog('❌ getSession test failed', {
          testId,
          duration: `${sessionEnd - sessionStart}ms`,
          error: sessionTestError.message,
          isTimeout: sessionTestError.message.includes('timeout')
        }, true);
      }
      
      // 2b: Try a simple network operation (profile count)
      debugLog('🧪 Test 2b: Network operation test', { testId });
      const networkStart = performance.now();
      try {
        const { data, error } = await Promise.race([
          supabase.from('user_profile').select('id', { count: 'exact' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Network test timeout')), 3000))
        ]);
        const networkEnd = performance.now();
        debugLog('✅ Network operation test completed', {
          testId,
          duration: `${networkEnd - networkStart}ms`,
          hasData: !!data,
          hasError: !!error,
          errorMessage: error?.message
        });
      } catch (networkTestError) {
        debugLog('❌ Network operation test failed', {
          testId,
          error: networkTestError.message,
          isTimeout: networkTestError.message.includes('timeout')
        }, true);
      }
      
      // Test 3: Check if client URL and configuration are correct
      debugLog('🧪 Test 3: Client configuration', { testId });
      debugLog('📋 Supabase client config', {
        testId,
        supabaseUrl: supabase.supabaseUrl,
        supabaseKey: supabase.supabaseKey?.substring(0, 20) + '...',
        authUrl: supabase.auth?.url,
        authSettings: {
          autoRefreshToken: supabase.auth?.settings?.autoRefreshToken,
          persistSession: supabase.auth?.settings?.persistSession,
          detectSessionInUrl: supabase.auth?.settings?.detectSessionInUrl
        }
      });
      
      // Test 4: Check global subscription state
      debugLog('🧪 Test 4: Global subscription health', {
        testId,
        hasGlobalSubscription: !!globalAuthSubscription,
        subscriptionId: globalAuthSubscription?.id,
        isProcessing: isProcessingAuthEvent,
        queueLength: authOperationQueue.length
      });
      
      // Test 5: Try creating a new Supabase client instance
      debugLog('🧪 Test 5: Fresh client test', { testId });
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const freshClient = createClient(
          supabase.supabaseUrl,
          supabase.supabaseKey,
          {
            auth: {
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true,
              flowType: 'pkce'
            }
          }
        );
        
        const freshTestStart = performance.now();
        const { data: freshData, error: freshError } = await Promise.race([
          freshClient.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Fresh client timeout')), 2000))
        ]);
        const freshTestEnd = performance.now();
        
        debugLog('✅ Fresh client test completed', {
          testId,
          duration: `${freshTestEnd - freshTestStart}ms`,
          hasSession: !!freshData.session,
          hasError: !!freshError,
          sameUserId: freshData.session?.user?.id === user?.id
        });
      } catch (freshTestError) {
        debugLog('❌ Fresh client test failed', {
          testId,
          error: freshTestError.message
        }, true);
      }
      
    } catch (healthTestError) {
      debugLog('❌ Client health check failed', {
        testId,
        error: healthTestError.message
      }, true);
    } finally {
      debugLog('🏁 Client health check completed', { 
        testId, 
        results,
        summary: 'Check individual test results above for details'
      });
      return results;
    }
  }, [user]);

  // Manual cleanup function for when Supabase signOut hangs
  const forceSignOutCleanup = useCallback(async () => {
    debugLog('🔨 Forcing manual sign out cleanup');
    
    try {
      // Aggressive localStorage cleanup
      debugLog('🧽 Aggressive localStorage cleanup');
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => 
        key.includes('supabase') || 
        key.startsWith('sb-') || 
        key.includes('auth-token') ||
        key.includes('pkce')
      );
      
      supabaseKeys.forEach(key => {
        debugLog(`💥 Force removing: ${key}`);
        localStorage.removeItem(key);
      });
      
      // Also try sessionStorage cleanup
      const sessionKeys = Object.keys(sessionStorage);
      const supabaseSessionKeys = sessionKeys.filter(key => 
        key.includes('supabase') || key.startsWith('sb-')
      );
      
      supabaseSessionKeys.forEach(key => {
        debugLog(`💥 Force removing from session: ${key}`);
        sessionStorage.removeItem(key);
      });
      
    } catch (cleanupError) {
      debugLog('❌ Error during force cleanup', { error: cleanupError.message }, true);
    }
  }, []);

  // Quick diagnostics for signOut timeout scenarios  
  const testSignOutDiagnostics = useCallback(async () => {
    const testId = `signOutDiag-${Date.now()}`;
    debugLog('🔬 Quick signOut diagnostics', { testId });
    
    try {
      // Test if basic auth operations work
      const sessionTest = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Session test timeout')), 1000))
      ]);
      
      debugLog('📋 Session test result', {
        testId,
        hasSession: !!sessionTest.data?.session,
        error: sessionTest.error?.message
      });
      
      // Test if network requests work at all
      const networkTest = await Promise.race([
        fetch(window.location.origin),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Network test timeout')), 1000))
      ]);
      
      debugLog('🌐 Network test result', {
        testId,
        status: networkTest.status,
        online: navigator.onLine
      });
      
    } catch (diagError) {
      debugLog('❌ SignOut diagnostics failed', {
        testId,
        error: diagError.message,
        isTimeout: diagError.message.includes('timeout')
      }, true);
    }
  }, []);

  // Simplified approach - no need for complex recovery mechanism

  // Quick test for immediate debugging
  const testSupabaseQuick = useCallback(async () => {
    const testId = `quick-${Date.now()}`;
    debugLog('⚡ Quick Supabase test starting', { testId });
    
    try {
      // Test 1: getSession with short timeout
      debugLog('🔍 Testing getSession with 1s timeout', { testId });
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 1000))
      ]);
      debugLog('✅ getSession works', { 
        testId, 
        hasSession: !!sessionResult.data?.session,
        userId: sessionResult.data?.session?.user?.id
      });
    } catch (error) {
      debugLog('❌ getSession failed', { testId, error: error.message }, true);
    }
    
    try {
      // Test 2: Simple network request
      debugLog('🔍 Testing network request with 1s timeout', { testId });
      const networkResult = await Promise.race([
        fetch(window.location.origin + '/favicon.ico'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('network timeout')), 1000))
      ]);
      debugLog('✅ Network works', { testId, status: networkResult.status });
    } catch (error) {
      debugLog('❌ Network failed', { testId, error: error.message }, true);
    }
  }, []);

  // Context value object with state validation
  const value = {
    user,
    userProfile,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    resetPassword,
    verifyEmailOtp,
    updateProfile,
    clearAuthError,
    markProfileCompleted,
    // Session management
    sessionExpiry,
    showSessionWarning,
    lastActivity,
    extendSession,
    dismissSessionWarning,
    trackActivity,
    // Diagnostic functions (development only)
    testSignOutDiagnostics: process.env.NODE_ENV === 'development' ? testSignOutDiagnostics : undefined,
    testSupabaseClientHealth,
    testSupabaseQuick,
    // Computed properties
    isAuthenticated: !!user,
    isEmailConfirmed: user?.email_confirmed_at != null,
    isActive: isActive.current,
    // State validation helpers
    hasValidProfile: !!userProfile && !!userProfile.id && userProfile.id === user?.id,
    profileName: userProfile?.name || 'Not set',
    needsProfileCompletion,
    debugInfo: {
      userId: user?.id,
      profileId: userProfile?.id,
      sessionExpires: sessionExpiry?.toISOString(),
      lastActiveTime: new Date(lastActivity).toISOString(),
      authQueueLength: authOperationQueue.length,
      isProcessingAuth: isProcessingAuthEvent,
      globalSubscription: !!globalAuthSubscription
    },
  };

  // Expose auth context to window for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    window.auth = value;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;