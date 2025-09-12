import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { detectInvitationParams, clearInvitationParamsFromUrl } from '../utils/invitationUtils';

/**
 * Custom hook for detecting and managing invitation parameters from URL
 * 
 * Handles:
 * - URL parameter detection and parsing
 * - Supabase session setup from invitation tokens
 * - Invitation parameter state management
 * - URL cleanup after processing
 * 
 * @returns {Object} Invitation detection state and utilities
 */
export function useInvitationDetection() {
  const [invitationParams, setInvitationParams] = useState(null);

  // Check for invitation parameters in URL on mount
  useEffect(() => {
    const handleInvitationAndSession = async () => {
      const params = detectInvitationParams();

      if (params.hasInvitation) {
        console.log('Invitation detected:', params);
        setInvitationParams(params);

        // If we have Supabase tokens in the URL hash, set the session
        if (params.isSupabaseInvitation && params.accessToken && params.refreshToken) {
          try {
            console.log('Setting Supabase session with invitation tokens...');
            const { data, error } = await supabase.auth.setSession({
              access_token: params.accessToken,
              refresh_token: params.refreshToken
            });

            if (error) {
              console.error('Error setting session:', error);
            } else {
              console.log('Session set successfully:', data);
            }
          } catch (error) {
            console.error('Exception setting session:', error);
          }
        }
      }
    };

    handleInvitationAndSession();
  }, []); // Run only once on mount

  // Utility functions
  const clearInvitationParams = () => {
    clearInvitationParamsFromUrl();
    setInvitationParams(null);
  };

  return {
    invitationParams,
    setInvitationParams,
    clearInvitationParams,
    hasInvitation: !!invitationParams?.hasInvitation
  };
}