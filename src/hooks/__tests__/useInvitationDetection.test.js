/**
 * Tests for useInvitationDetection hook
 * 
 * Tests invitation parameter detection from URL, Supabase session handling,
 * and invitation state management functionality.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvitationDetection } from '../useInvitationDetection';
import * as invitationUtils from '../../utils/invitationUtils';
import { supabase } from '../../lib/supabase';

// Mock the dependencies
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: jest.fn()
    }
  }
}));

jest.mock('../../utils/invitationUtils', () => ({
  detectInvitationParams: jest.fn(),
  clearInvitationParamsFromUrl: jest.fn()
}));

describe('useInvitationDetection', () => {
  let originalLocation;
  let mockSupabaseAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Save original location and mock
    originalLocation = window.location;
    delete window.location;
    window.location = {
      href: 'http://localhost:3000',
      search: '',
      hash: '',
      pathname: '/'
    };

    // Mock Supabase auth
    mockSupabaseAuth = supabase.auth;
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
    
    // Restore console methods
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('initial state', () => {
    it('should initialize with null invitation params', () => {
      invitationUtils.detectInvitationParams.mockReturnValue({ hasInvitation: false });

      const { result } = renderHook(() => useInvitationDetection());

      expect(result.current.invitationParams).toBeNull();
      expect(result.current.hasInvitation).toBe(false);
    });

    it('should detect invitation parameters on mount', async () => {
      const mockParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-123'
      };
      
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);

      const { result } = renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(result.current.invitationParams).toEqual(mockParams);
        expect(result.current.hasInvitation).toBe(true);
      });

      expect(invitationUtils.detectInvitationParams).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom invitation detection', () => {
    it('should handle custom invitation parameters', async () => {
      const mockParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        isSupabaseInvitation: false,
        teamId: 'team-456',
        role: 'coach',
        invitationId: 'inv-456'
      };
      
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);

      const { result } = renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(result.current.invitationParams).toEqual(mockParams);
        expect(result.current.hasInvitation).toBe(true);
      });

      // Should not call setSession for custom invitations
      expect(mockSupabaseAuth.setSession).not.toHaveBeenCalled();
    });

    it('should not set invitation params when no invitation detected', async () => {
      invitationUtils.detectInvitationParams.mockReturnValue({ hasInvitation: false });

      const { result } = renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(result.current.invitationParams).toBeNull();
        expect(result.current.hasInvitation).toBe(false);
      });

      expect(mockSupabaseAuth.setSession).not.toHaveBeenCalled();
    });
  });

  describe('Supabase invitation handling', () => {
    it('should set Supabase session with invitation tokens', async () => {
      const mockParams = {
        hasInvitation: true,
        isSupabaseInvitation: true,
        isCustomInvitation: false,
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        teamId: 'team-789',
        role: 'admin',
        invitationId: 'inv-789'
      };
      
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);
      mockSupabaseAuth.setSession.mockResolvedValue({
        data: { session: { access_token: 'access_token_123' } },
        error: null
      });

      const { result } = renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(result.current.invitationParams).toEqual(mockParams);
      });

      expect(mockSupabaseAuth.setSession).toHaveBeenCalledWith({
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123'
      });
    });

    it('should handle Supabase session setup errors gracefully', async () => {
      const mockParams = {
        hasInvitation: true,
        isSupabaseInvitation: true,
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        teamId: 'team-789',
        role: 'admin'
      };
      
      const sessionError = new Error('Invalid token');
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);
      mockSupabaseAuth.setSession.mockResolvedValue({
        data: null,
        error: sessionError
      });

      const { result } = renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(result.current.invitationParams).toEqual(mockParams);
        expect(mockSupabaseAuth.setSession).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error setting session:', sessionError);
      });
    });

    it('should handle Supabase session setup exceptions', async () => {
      const mockParams = {
        hasInvitation: true,
        isSupabaseInvitation: true,
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123'
      };
      
      const exception = new Error('Network error');
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);
      mockSupabaseAuth.setSession.mockRejectedValue(exception);

      const { result } = renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(result.current.invitationParams).toEqual(mockParams);
      });

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Exception setting session:', exception);
      });
    });

    it('should not set session if missing required tokens', async () => {
      const mockParams = {
        hasInvitation: true,
        isSupabaseInvitation: true,
        accessToken: 'access_token_123',
        refreshToken: null // Missing refresh token
      };
      
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);

      const { result } = renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(result.current.invitationParams).toEqual(mockParams);
      });

      expect(mockSupabaseAuth.setSession).not.toHaveBeenCalled();
    });
  });

  describe('invitation parameter management', () => {
    it('should allow manual setting of invitation parameters', async () => {
      invitationUtils.detectInvitationParams.mockReturnValue({ hasInvitation: false });

      const { result } = renderHook(() => useInvitationDetection());

      const newParams = {
        hasInvitation: true,
        teamId: 'team-999',
        role: 'player'
      };

      act(() => {
        result.current.setInvitationParams(newParams);
      });

      expect(result.current.invitationParams).toEqual(newParams);
      expect(result.current.hasInvitation).toBe(true);
    });

    it('should clear invitation parameters and URL', () => {
      const mockParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'player'
      };
      
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);

      const { result } = renderHook(() => useInvitationDetection());

      act(() => {
        result.current.clearInvitationParams();
      });

      expect(result.current.invitationParams).toBeNull();
      expect(result.current.hasInvitation).toBe(false);
      expect(invitationUtils.clearInvitationParamsFromUrl).toHaveBeenCalledTimes(1);
    });

    it('should handle clearing when no params are set', () => {
      invitationUtils.detectInvitationParams.mockReturnValue({ hasInvitation: false });

      const { result } = renderHook(() => useInvitationDetection());

      act(() => {
        result.current.clearInvitationParams();
      });

      expect(result.current.invitationParams).toBeNull();
      expect(result.current.hasInvitation).toBe(false);
      expect(invitationUtils.clearInvitationParamsFromUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasInvitation computed property', () => {
    it('should return false when invitation params is null', () => {
      invitationUtils.detectInvitationParams.mockReturnValue({ hasInvitation: false });

      const { result } = renderHook(() => useInvitationDetection());

      expect(result.current.hasInvitation).toBe(false);
    });

    it('should return false when hasInvitation is false', async () => {
      const mockParams = {
        hasInvitation: false,
        teamId: null,
        role: null
      };
      
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);

      const { result } = renderHook(() => useInvitationDetection());

      // When hasInvitation is false, the hook doesn't set invitation params
      expect(result.current.invitationParams).toBeNull();
      expect(result.current.hasInvitation).toBe(false);
    });

    it('should return true when hasInvitation is true', async () => {
      const mockParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'player'
      };
      
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);

      const { result } = renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(result.current.invitationParams).toEqual(mockParams);
      });

      expect(result.current.hasInvitation).toBe(true);
    });
  });

  describe('effect dependency handling', () => {
    it('should only run detection effect once on mount', async () => {
      invitationUtils.detectInvitationParams.mockReturnValue({ hasInvitation: false });

      const { rerender } = renderHook(() => useInvitationDetection());

      // Rerender multiple times
      rerender();
      rerender();
      rerender();

      await waitFor(() => {
        expect(invitationUtils.detectInvitationParams).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('console logging', () => {
    it('should log invitation detection', async () => {
      const mockParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'player'
      };
      
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);

      renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('Invitation detected:', mockParams);
      });
    });

    it('should log successful session setup', async () => {
      const mockParams = {
        hasInvitation: true,
        isSupabaseInvitation: true,
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123'
      };
      
      const sessionData = { session: { access_token: 'access_token_123' } };
      invitationUtils.detectInvitationParams.mockReturnValue(mockParams);
      mockSupabaseAuth.setSession.mockResolvedValue({
        data: sessionData,
        error: null
      });

      renderHook(() => useInvitationDetection());

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('Setting Supabase session with invitation tokens...');
        expect(console.log).toHaveBeenCalledWith('Session set successfully:', sessionData);
      });
    });
  });
});