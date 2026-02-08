/**
 * Formation Voting Hook
 * 
 * Provides functionality for submitting votes for unimplemented formations.
 * Handles authentication, validation, and error states.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const useFormationVotes = () => {
  const { t } = useTranslation('configuration');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const submitVote = useCallback(async (formation, format) => {
    // Check authentication
    if (!user) {
      setError(t('formationVoting.errors.loginRequired'));
      return { success: false, error: 'Authentication required' };
    }

    setLoading(true);
    setError(null);
    setSuccessMessage('');
    setInfoMessage('');

    try {
      const { data: result, error: rpcError } = await supabase.rpc('submit_formation_vote', {
        p_formation: formation,
        p_format: format
      });

      if (rpcError) {
        throw new Error(rpcError.message || t('formationVoting.errors.submitFailed'));
      }

      if (result.error === 'duplicate_vote') {
        setInfoMessage(result.message || t('formationVoting.messages.duplicateVote', { formation, format }));
        return { success: false, error: 'duplicate_vote', message: result.message };
      }

      if (!result.success) {
        throw new Error(result.error || t('formationVoting.errors.voteSubmissionFailed'));
      }

      // Success
      setSuccessMessage(result.message || t('formationVoting.messages.voteRecorded', { formation }));

      return {
        success: true,
        message: result.message
      };

    } catch (err) {
      const errorMessage = err.message || t('formationVoting.errors.submitFailed');
      setError(errorMessage);
      console.error('Formation vote submission error:', err);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, t]);

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