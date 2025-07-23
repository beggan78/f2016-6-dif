import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// 1. Create the context
const AuthContext = createContext(null);

// 2. Create the Provider component
export const AuthProvider = ({ children }) => {
  // Core state for authentication
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // Start as true until the first auth check is done

  // --- Core Authentication Flow ---
  useEffect(() => {
    // This effect runs only ONCE on mount, because of the empty dependency array [].
    // It's the heart of our authentication handling.
    setLoading(true);

    // First, try to get the current session. This handles the page-refresh case.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user);
      }
      setLoading(false); // We have our answer, stop loading.
    });

    // Then, set up a listener for any future auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // This will fire for SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, etc.
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // If a user exists, fetch their profile.
          // The fetchUserProfile function is "idempotent" enough to handle this.
          await fetchUserProfile(session.user);
        } else {
          // If the session is null (user signed out), clear the profile.
          setUserProfile(null);
        }

        // If loading was still true, this is the final confirmation.
        setLoading(false);
      }
    );

    // The cleanup function runs when the component unmounts.
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // <-- CRITICAL: The empty array ensures this effect runs only once.

  // --- Data Fetching and Actions ---

  const fetchUserProfile = useCallback(async (userToFetch) => {
    if (!userToFetch) return;
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', userToFetch.id)
        .single();

      if (error) {
        // This can happen if the profile doesn't exist yet after signup.
        console.warn('Could not fetch user profile:', error.message);
        setUserProfile(null);
        return;
      }

      setUserProfile(data);
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  }, []);

  const signIn = (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = () => {
    return supabase.auth.signOut();
  };

  const signUp = (email, password, userData = {}) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData, // e.g., { name: 'John Doe' }
      },
    });
  };

  // --- Context Value ---

  // useMemo is used to prevent the context value object from being recreated on every render.
  // This is a performance optimization that prevents unnecessary re-renders of child components.
  const value = useMemo(() => ({
    user,
    userProfile,
    session,
    loading,
    isAuthenticated: !!user && !!session,
    signIn,
    signOut,
    signUp,
  }), [user, userProfile, session, loading]);

  // Expose for debugging in development
  if (process.env.NODE_ENV === 'development') {
    window.auth = value;
  }

  // Finally, return the provider with the value.
  // We don't render children until the initial loading is complete.
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 3. Create the custom hook for consuming the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};