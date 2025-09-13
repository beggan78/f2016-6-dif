/**
 * Integration tests for invitation flows
 * 
 * Tests invitation utility functions and components working together.
 * These tests verify the coordination between different invitation modules.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitationWelcome } from '../components/auth/InvitationWelcome';
import * as invitationUtils from '../utils/invitationUtils';

// Mock contexts
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../contexts/TeamContext', () => ({
  useTeam: jest.fn()
}));

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      updateUser: jest.fn()
    }
  }
}));

// Mock validation utils
jest.mock('../utils/authValidation', () => ({
  validatePassword: jest.fn(),
  getPasswordRequirementsText: jest.fn()
}));

describe('Invitation Flow Integration Tests', () => {
  let mockUseAuth, mockUseTeam, mockSupabase, mockAuthValidation;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock auth context
    const { useAuth } = require('../contexts/AuthContext');
    mockUseAuth = useAuth;
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
      error: null,
      signOut: jest.fn(),
      enableProfileFetchSkip: jest.fn(),
      disableProfileFetchSkip: jest.fn()
    });

    // Mock team context
    const { useTeam } = require('../contexts/TeamContext');
    mockUseTeam = useTeam;
    mockUseTeam.mockReturnValue({
      acceptTeamInvitation: jest.fn().mockResolvedValue({ success: true }),
      getUserPendingInvitations: jest.fn().mockResolvedValue([]),
      loading: false,
      error: null
    });

    // Mock Supabase
    const { supabase } = require('../lib/supabase');
    mockSupabase = supabase;
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: {} },
      error: null
    });

    // Mock auth validation
    const authValidation = require('../utils/authValidation');
    mockAuthValidation = authValidation;
    mockAuthValidation.validatePassword.mockReturnValue({ isValid: true });
    mockAuthValidation.getPasswordRequirementsText.mockReturnValue('Password must be at least 8 characters');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Invitation utilities integration', () => {
    it('should correctly process URL parameters through utility functions', () => {
      // Mock window for URL parsing
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            search: '?invitation=true&team=team-123&role=player&invitation_id=inv-123',
            hash: ''
          }
        },
        writable: true
      });

      const params = invitationUtils.detectInvitationParams();
      
      expect(params.hasInvitation).toBe(true);
      expect(params.teamId).toBe('team-123');
      expect(params.role).toBe('player');
      expect(params.invitationId).toBe('inv-123');
      expect(params.isCustomInvitation).toBe(true);
      expect(params.isSupabaseInvitation).toBe(false);
    });

    it('should correctly process Supabase auth tokens', () => {
      // Mock window with Supabase tokens
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            search: '?team=team-456&role=coach&invitation_id=inv-456',
            hash: '#access_token=token123&token_type=bearer&expires_in=3600'
          }
        },
        writable: true
      });

      const params = invitationUtils.detectInvitationParams();
      
      expect(params.hasInvitation).toBe(true);
      expect(params.accessToken).toBe('token123');
      expect(params.tokenType).toBe('bearer');
      expect(params.isSupabaseInvitation).toBe(true);
      expect(params.isCustomInvitation).toBe(false);
    });

    it('should determine correct invitation status for different user states', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-123',
        isCustomInvitation: true
      };

      // Test with authenticated user
      const authenticatedUser = { id: 'user-123', email: 'test@example.com' };
      const statusWithUser = invitationUtils.getInvitationStatus(authenticatedUser, invitationParams);
      
      expect(statusWithUser.type).toBe('ready_to_process');

      // Test without user
      const statusWithoutUser = invitationUtils.getInvitationStatus(null, invitationParams);
      
      expect(statusWithoutUser.type).toBe('sign_in_required');
    });

    it('should format invitation context correctly', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'admin',
        invitationId: 'inv-123'
      };

      const context = invitationUtils.getInvitationContext(invitationParams);
      
      expect(context.teamId).toBe('team-123');
      expect(context.role).toBe('admin');
      expect(context.invitationId).toBe('inv-123');
      expect(context.displayRole).toBe('Administrator');
    });
  });

  describe('Invitation utilities workflow integration', () => {
    it('should coordinate between detection and status functions', () => {
      // Mock window with valid invitation
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            search: '?invitation=true&team=team-123&role=player&invitation_id=inv-123',
            hash: ''
          }
        },
        writable: true
      });

      // Detect invitation parameters
      const params = invitationUtils.detectInvitationParams();
      expect(params.hasInvitation).toBe(true);

      // Get status with authenticated user
      const user = { id: 'user-123', email: 'test@example.com' };
      const status = invitationUtils.getInvitationStatus(user, params);
      expect(status.type).toBe('ready_to_process');

      // Get invitation context
      const context = invitationUtils.getInvitationContext(params);
      expect(context.teamId).toBe('team-123');
      expect(context.displayRole).toBe('Player');

      // Check if processing should happen
      const shouldProcess = invitationUtils.shouldProcessInvitation(user, params);
      expect(shouldProcess).toBe(true);
    });

    it('should handle complete Supabase invitation workflow', () => {
      // Mock window with Supabase tokens
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            search: '?team=team-456&role=coach&invitation_id=inv-456',
            hash: '#access_token=token123&token_type=bearer&expires_in=3600'
          }
        },
        writable: true
      });

      // Detect Supabase invitation
      const params = invitationUtils.detectInvitationParams();
      expect(params.isSupabaseInvitation).toBe(true);

      // Check if account completion is needed
      const needsCompletion = invitationUtils.needsAccountCompletion(params);
      expect(needsCompletion).toBe(true); // Should need completion for fresh token

      // Get appropriate status
      const status = invitationUtils.getInvitationStatus(null, params);
      expect(status.type).toBe('account_setup');
    });

    it('should handle invitation flow state transitions', () => {
      const params = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-123',
        isCustomInvitation: true
      };

      // Initially no user -> sign in required
      const statusNoUser = invitationUtils.getInvitationStatus(null, params);
      expect(statusNoUser.type).toBe('sign_in_required');

      // User signs in -> ready to process
      const user = { id: 'user-123', email: 'test@example.com' };
      const statusWithUser = invitationUtils.getInvitationStatus(user, params);
      expect(statusWithUser.type).toBe('ready_to_process');

      // Should now be ready to process
      const shouldProcess = invitationUtils.shouldProcessInvitation(user, params);
      expect(shouldProcess).toBe(true);
    });
  });

  describe('Error handling integration', () => {
    it('should handle invalid invitation parameters gracefully', () => {
      // Mock window with invalid parameters
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            search: '?invitation=invalid&team=&role=',
            hash: ''
          }
        },
        writable: true
      });

      const params = invitationUtils.detectInvitationParams();
      
      expect(params.hasInvitation).toBe(false);
      expect(params.isCustomInvitation).toBe(false);
      expect(params.isSupabaseInvitation).toBe(false);
      
      // Status should handle invalid params gracefully
      const status = invitationUtils.getInvitationStatus(null, params);
      expect(status.type).toBe('none');
    });

    it('should handle missing window gracefully', () => {
      // Mock undefined window (SSR scenario)
      const originalWindow = global.window;
      delete global.window;

      expect(() => {
        const params = invitationUtils.detectInvitationParams();
        expect(params.hasInvitation).toBe(false);
        
        // All utility functions should handle this gracefully
        const status = invitationUtils.getInvitationStatus(null, params);
        expect(status.type).toBe('none');
        
        const context = invitationUtils.getInvitationContext(params);
        expect(context).toBeNull();
      }).not.toThrow();

      // Restore window
      global.window = originalWindow;
    });

    it('should handle localStorage operations in different environments', () => {
      const invitationDetails = {
        invitationId: 'inv-123',
        teamName: 'Test Team',
        role: 'player'
      };

      // Should not crash if localStorage is not available
      const originalWindow = global.window;
      delete global.window;

      expect(() => {
        invitationUtils.storePendingInvitation(invitationDetails);
        const retrieved = invitationUtils.retrievePendingInvitation();
        expect(retrieved).toBeNull();
        const hasPending = invitationUtils.hasPendingInvitation();
        expect(hasPending).toBe(false);
      }).not.toThrow();

      // Restore window
      global.window = originalWindow;
    });
  });
});