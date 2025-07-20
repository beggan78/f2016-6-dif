import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize authentication state on component mount
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error.message);
          setAuthError(error.message);
        } else {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error.message);
        setAuthError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          // Try to fetch existing profile
          await fetchUserProfile(session.user.id);
          
          // If user just signed up, try to create profile
          if (event === 'SIGNED_UP' || event === 'SIGNED_IN') {
            // Check if profile exists, if not create it
            const { data: existingProfile } = await supabase
              .from('user_profile')
              .select('id')
              .eq('id', session.user.id)
              .single();
            
            if (!existingProfile) {
              // Extract name from user metadata if available
              const userData = session.user.user_metadata || {};
              await createUserProfile(session.user, userData);
            }
          }
        } else {
          setUserProfile(null);
        }

        // Clear any previous auth errors on successful auth changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setAuthError(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch user profile from the database
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching user profile:', error.message);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error.message);
    }
  };

  // Create user profile in the database
  const createUserProfile = async (user, userData = {}) => {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .insert([
          {
            id: user.id,
            name: userData.name || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error.message);
        return;
      }

      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Error in createUserProfile:', error.message);
    }
  };

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

      // Create user profile if sign up was successful
      if (data.user) {
        // If email confirmation is required, return confirmation message
        if (!data.user.email_confirmed_at) {
          return { 
            user: data.user, 
            error: null, 
            message: 'Please check your email to confirm your account.' 
          };
        }

        // If user is immediately confirmed, create profile
        await createUserProfile(data.user, userData);
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
    try {
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred during sign in';
      setAuthError(errorMessage);
      return { user: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      setAuthError(null);

      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error.message);
        return { error };
      }

      // Clear local state
      setUser(null);
      setUserProfile(null);
      
      return { error: null };
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred during sign out';
      setAuthError(errorMessage);
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

  // Update user profile function
  const updateProfile = async (profileData) => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }

      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase
        .from('user_profile')
        .upsert({
          id: user.id,
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        setAuthError(error.message);
        return { data: null, error };
      }

      setUserProfile(data);
      return { data, error: null };
    } catch (error) {
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

  // Context value object
  const value = {
    user,
    userProfile,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    clearAuthError,
    // Computed properties
    isAuthenticated: !!user,
    isEmailConfirmed: user?.email_confirmed_at != null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;