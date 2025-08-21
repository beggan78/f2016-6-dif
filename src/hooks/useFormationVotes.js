/**
 * Formation Voting Hook
 * 
 * Provides functionality for submitting votes for unimplemented formations.
 * Handles authentication, validation, and error states.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;

export const useFormationVotes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const submitVote = useCallback(async (formation, format) => {
    // Check authentication
    if (!user) {
      setError('You must be logged in to vote for formations');
      return { success: false, error: 'Authentication required' };
    }

    setLoading(true);
    setError(null);
    setSuccessMessage('');
    setInfoMessage('');

    try {
      // Get current session for authorization header
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-formation-vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          formation,
          format
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle different error types
        if (response.status === 409 && result.error === 'duplicate_vote') {
          setInfoMessage(result.message || `You've already voted for the ${formation} formation in ${format} format.`);
          return { success: false, error: 'duplicate_vote', message: result.message };
        }
        
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Vote submission failed');
      }

      // Success
      setSuccessMessage(result.message || `Your vote for the ${formation} formation has been recorded!`);
      
      return { 
        success: true, 
        message: result.message 
      };

    } catch (err) {
      const errorMessage = err.message || 'Failed to submit vote. Please try again.';
      setError(errorMessage);
      console.error('Formation vote submission error:', err);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage('');
    setInfoMessage('');
  }, []);

  return {
    submitVote,
    loading,
    error,
    successMessage,
    infoMessage,
    clearMessages,
    isAuthenticated: !!user
  };
};