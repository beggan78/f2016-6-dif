/**
 * Tests for invitationUtils
 * 
 * Tests URL parameter detection, invitation status logic, account completion checks,
 * localStorage operations, and utility functions for invitation management.
 */

import {
  detectInvitationParams,
  clearInvitationParamsFromUrl,
  shouldProcessInvitation,
  needsAccountCompletion,
  getInvitationStatus,
  getInvitationContext,
  storePendingInvitation,
  retrievePendingInvitation,
  hasPendingInvitation
} from '../invitationUtils';

describe('invitationUtils', () => {
  let originalLocation;
  let originalWindow;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock console methods for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Save original window and mock
    originalWindow = global.window;
    originalLocation = global.window?.location;

    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };

    // Mock window and location with proper URL structure
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          href: 'http://localhost:3000',
          search: '',
          hash: '',
          pathname: '/',
          hostname: 'localhost',
          port: '3000',
          protocol: 'http:',
          toString: () => 'http://localhost:3000'
        },
        history: {
          replaceState: jest.fn()
        },
        localStorage: mockLocalStorage
      },
      writable: true,
      configurable: true
    });

    // Also mock global localStorage for direct access
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    // Restore original window
    if (originalWindow) {
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true
      });
    }

    // Clear global localStorage mock
    delete global.localStorage;

    // Restore console methods
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('detectInvitationParams', () => {
    it('should return no invitation when window is undefined', () => {
      // Temporarily remove window
      const tempWindow = global.window;
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const result = detectInvitationParams();

      expect(result).toEqual({ hasInvitation: false });

      // Restore window
      Object.defineProperty(global, 'window', {
        value: tempWindow,
        writable: true,
        configurable: true
      });
    });

    it('should detect custom invitation parameters', () => {
      global.window.location.search = '?invitation=true&team=team-123&role=player&invitation_id=inv-456';

      const result = detectInvitationParams();

      expect(result).toEqual({
        hasInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-456',
        accessToken: null,
        tokenType: null,
        expiresIn: null,
        refreshToken: null,
        isSupabaseInvitation: false,
        isCustomInvitation: true,
        params: {
          invitation: 'true',
          teamId: 'team-123',
          role: 'player',
          invitationId: 'inv-456',
          accessToken: null,
          tokenType: null,
          expiresIn: null,
          refreshToken: null
        }
      });
    });

    it('should detect Supabase invitation parameters', () => {
      global.window.location.hash = '#access_token=abc123&token_type=bearer&expires_in=3600&refresh_token=def456';

      const result = detectInvitationParams();

      expect(result).toEqual({
        hasInvitation: true,
        teamId: null,
        role: null,
        invitationId: null,
        accessToken: 'abc123',
        tokenType: 'bearer',
        expiresIn: '3600',
        refreshToken: 'def456',
        isSupabaseInvitation: true,
        isCustomInvitation: false,
        params: {
          invitation: null,
          teamId: null,
          role: null,
          invitationId: null,
          accessToken: 'abc123',
          tokenType: 'bearer',
          expiresIn: '3600',
          refreshToken: 'def456'
        }
      });
    });

    it('should detect mixed invitation parameters', () => {
      global.window.location.search = '?team=team-789&role=coach&invitation_id=inv-789';
      global.window.location.hash = '#access_token=xyz789&token_type=bearer';

      const result = detectInvitationParams();

      expect(result.hasInvitation).toBe(true);
      expect(result.isSupabaseInvitation).toBe(true);
      expect(result.isCustomInvitation).toBe(false); // Missing invitation=true
      expect(result.teamId).toBe('team-789');
      expect(result.accessToken).toBe('xyz789');
    });

    it('should not detect custom invitation without invitation=true', () => {
      global.window.location.search = '?team=team-123&role=player';

      const result = detectInvitationParams();

      expect(result.hasInvitation).toBe(false);
      expect(result.isCustomInvitation).toBe(false);
      expect(result.isSupabaseInvitation).toBe(false);
    });

    it('should not detect custom invitation with incomplete parameters', () => {
      global.window.location.search = '?invitation=true&team=team-123';
      // Missing role

      const result = detectInvitationParams();

      expect(result.hasInvitation).toBe(false);
      expect(result.isCustomInvitation).toBe(false);
    });

    it('should not detect Supabase invitation without bearer token', () => {
      global.window.location.hash = '#access_token=abc123&token_type=basic';

      const result = detectInvitationParams();

      expect(result.hasInvitation).toBe(false);
      expect(result.isSupabaseInvitation).toBe(false);
    });

    it('should handle empty URL parameters', () => {
      global.window.location.search = '';
      global.window.location.hash = '';

      const result = detectInvitationParams();

      expect(result.hasInvitation).toBe(false);
      expect(result.isCustomInvitation).toBe(false);
      expect(result.isSupabaseInvitation).toBe(false);
    });
  });

  describe('clearInvitationParamsFromUrl', () => {
    it('should clear invitation parameters from URL with query params', () => {
      // Mock location with full URL string for proper URL constructor
      global.window.location = {
        ...global.window.location,
        href: 'http://localhost:3000/app?invitation=true&team=team-123&role=player&other=keep',
        search: '?invitation=true&team=team-123&role=player&other=keep',
        pathname: '/app',
        toString: () => 'http://localhost:3000/app?invitation=true&team=team-123&role=player&other=keep'
      };

      clearInvitationParamsFromUrl();

      expect(global.window.history.replaceState).toHaveBeenCalledWith({}, '', '/app?other=keep');
    });

    it('should clear URL to pathname only when no remaining params', () => {
      global.window.location = {
        ...global.window.location,
        href: 'http://localhost:3000/dashboard?invitation=true&team=team-123',
        search: '?invitation=true&team=team-123',
        pathname: '/dashboard',
        toString: () => 'http://localhost:3000/dashboard?invitation=true&team=team-123'
      };

      clearInvitationParamsFromUrl();

      expect(global.window.history.replaceState).toHaveBeenCalledWith({}, '', '/dashboard');
    });

    it('should handle URL with no query parameters', () => {
      global.window.location = {
        ...global.window.location,
        href: 'http://localhost:3000/home',
        search: '',
        pathname: '/home',
        toString: () => 'http://localhost:3000/home'
      };

      clearInvitationParamsFromUrl();

      expect(global.window.history.replaceState).toHaveBeenCalledWith({}, '', '/home');
    });

    it('should not do anything when window is undefined', () => {
      const tempWindow = global.window;
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true
      });

      expect(() => clearInvitationParamsFromUrl()).not.toThrow();

      Object.defineProperty(global, 'window', {
        value: tempWindow,
        writable: true,
        configurable: true
      });
    });
  });

  describe('shouldProcessInvitation', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    it('should return false when no invitation', () => {
      const invitationParams = { hasInvitation: false };

      expect(shouldProcessInvitation(mockUser, invitationParams)).toBe(false);
    });

    it('should return false for custom invitation without user', () => {
      const invitationParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-123'
      };

      expect(shouldProcessInvitation(null, invitationParams)).toBe(false);
    });

    it('should return true for Supabase invitation without user', () => {
      const invitationParams = {
        hasInvitation: true,
        isSupabaseInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-123'
      };

      expect(shouldProcessInvitation(null, invitationParams)).toBe(true);
    });

    it('should return true for custom invitation with user and complete params', () => {
      const invitationParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-123'
      };

      expect(shouldProcessInvitation(mockUser, invitationParams)).toBe(true);
    });

    it('should return false when missing teamId', () => {
      const invitationParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        role: 'player',
        invitationId: 'inv-123'
      };

      expect(shouldProcessInvitation(mockUser, invitationParams)).toBe(false);
    });

    it('should return false when missing role', () => {
      const invitationParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        teamId: 'team-123',
        invitationId: 'inv-123'
      };

      expect(shouldProcessInvitation(mockUser, invitationParams)).toBe(false);
    });

    it('should return false when missing invitationId', () => {
      const invitationParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        teamId: 'team-123',
        role: 'player'
      };

      expect(shouldProcessInvitation(mockUser, invitationParams)).toBe(false);
    });
  });

  describe('needsAccountCompletion', () => {
    it('should return false for non-Supabase invitations', () => {
      const invitationParams = {
        isSupabaseInvitation: false,
        isCustomInvitation: true
      };

      expect(needsAccountCompletion(invitationParams)).toBe(false);
    });

    it('should return false without access token', () => {
      const invitationParams = {
        isSupabaseInvitation: true,
        accessToken: null
      };

      expect(needsAccountCompletion(invitationParams)).toBe(false);
    });

    it('should return true when no user is provided', () => {
      const invitationParams = {
        isSupabaseInvitation: true,
        accessToken: 'token123'
      };

      expect(needsAccountCompletion(invitationParams)).toBe(true);
    });

    it('should return true for fresh invitation user (times within 1 minute)', () => {
      const now = new Date();
      const almostNow = new Date(now.getTime() + 30000); // 30 seconds later

      const user = {
        invited_at: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
        confirmed_at: now.toISOString(),
        last_sign_in_at: almostNow.toISOString()
      };

      const invitationParams = {
        isSupabaseInvitation: true,
        accessToken: 'token123'
      };

      expect(needsAccountCompletion(invitationParams, user)).toBe(true);
    });

    it('should return false for established user (times more than 1 minute apart)', () => {
      const now = new Date();
      const laterTime = new Date(now.getTime() + 120000); // 2 minutes later

      const user = {
        invited_at: new Date(now.getTime() - 3600000).toISOString(),
        confirmed_at: now.toISOString(),
        last_sign_in_at: laterTime.toISOString()
      };

      const invitationParams = {
        isSupabaseInvitation: true,
        accessToken: 'token123'
      };

      expect(needsAccountCompletion(invitationParams, user)).toBe(false);
    });

    it('should return false when user lacks required timestamps', () => {
      const user = {
        confirmed_at: new Date().toISOString()
        // Missing invited_at and last_sign_in_at
      };

      const invitationParams = {
        isSupabaseInvitation: true,
        accessToken: 'token123'
      };

      expect(needsAccountCompletion(invitationParams, user)).toBe(false);
    });
  });

  describe('getInvitationStatus', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    it('should return none status when no invitation', () => {
      const invitationParams = { hasInvitation: false };

      expect(getInvitationStatus(mockUser, invitationParams)).toEqual({
        type: 'none'
      });
    });

    it('should return account_setup status when user needs completion', () => {
      const invitationParams = {
        hasInvitation: true,
        isSupabaseInvitation: true,
        accessToken: 'token123'
      };

      expect(getInvitationStatus(null, invitationParams)).toEqual({
        type: 'account_setup',
        message: 'Complete your account setup to join the team'
      });
    });

    it('should return sign_in_required for custom invitation without user', () => {
      const invitationParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        teamId: 'team-123',
        role: 'player'
      };

      expect(getInvitationStatus(null, invitationParams)).toEqual({
        type: 'sign_in_required',
        message: 'Sign in to accept your team invitation'
      });
    });

    it('should return ready_to_process when user can process invitation', () => {
      const invitationParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-123'
      };

      expect(getInvitationStatus(mockUser, invitationParams)).toEqual({
        type: 'ready_to_process',
        message: 'Processing your team invitation...'
      });
    });

    it('should return unknown status as fallback', () => {
      const invitationParams = {
        hasInvitation: true,
        isCustomInvitation: true,
        teamId: 'team-123'
        // Missing role and invitationId
      };

      expect(getInvitationStatus(mockUser, invitationParams)).toEqual({
        type: 'unknown'
      });
    });
  });

  describe('getInvitationContext', () => {
    it('should return null when no invitation', () => {
      const invitationParams = { hasInvitation: false };

      expect(getInvitationContext(invitationParams)).toBeNull();
    });

    it('should return formatted invitation context', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-456'
      };

      expect(getInvitationContext(invitationParams)).toEqual({
        teamId: 'team-123',
        role: 'player',
        invitationId: 'inv-456',
        displayRole: 'Player'
      });
    });

    it('should format admin role correctly', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'admin',
        invitationId: 'inv-456'
      };

      expect(getInvitationContext(invitationParams).displayRole).toBe('Administrator');
    });

    it('should format coach role correctly', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'coach',
        invitationId: 'inv-456'
      };

      expect(getInvitationContext(invitationParams).displayRole).toBe('Coach');
    });

    it('should format parent role correctly', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'parent',
        invitationId: 'inv-456'
      };

      expect(getInvitationContext(invitationParams).displayRole).toBe('Parent');
    });

    it('should handle unknown role with default', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'unknown_role',
        invitationId: 'inv-456'
      };

      expect(getInvitationContext(invitationParams).displayRole).toBe('unknown_role');
    });

    it('should handle null role with default', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: null,
        invitationId: 'inv-456'
      };

      expect(getInvitationContext(invitationParams).displayRole).toBe('Member');
    });

    it('should handle case insensitive role formatting', () => {
      const invitationParams = {
        hasInvitation: true,
        teamId: 'team-123',
        role: 'ADMIN',
        invitationId: 'inv-456'
      };

      expect(getInvitationContext(invitationParams).displayRole).toBe('Administrator');
    });
  });

  describe('localStorage operations', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockClear();
      mockLocalStorage.setItem.mockClear();
      mockLocalStorage.removeItem.mockClear();
    });

    describe('storePendingInvitation', () => {
      it('should store invitation details in localStorage', () => {
        const invitationDetails = {
          invitationId: 'inv-123',
          teamName: 'Test Team',
          role: 'player',
          email: 'test@example.com'
        };

        storePendingInvitation(invitationDetails);

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'pendingInvitation',
          JSON.stringify(invitationDetails)
        );
      });

      it('should handle localStorage errors gracefully', () => {
        const error = new Error('Storage quota exceeded');
        mockLocalStorage.setItem.mockImplementation(() => {
          throw error;
        });

        const invitationDetails = { invitationId: 'inv-123' };

        expect(() => storePendingInvitation(invitationDetails)).not.toThrow();
        expect(console.error).toHaveBeenCalledWith('Failed to store pending invitation:', error);
      });

      it('should not do anything when window is undefined', () => {
        const tempWindow = global.window;
        Object.defineProperty(global, 'window', {
          value: undefined,
          writable: true,
          configurable: true
        });

        expect(() => storePendingInvitation({ invitationId: 'inv-123' })).not.toThrow();

        Object.defineProperty(global, 'window', {
          value: tempWindow,
          writable: true,
          configurable: true
        });
      });
    });

    describe('retrievePendingInvitation', () => {
      it('should retrieve and clear pending invitation', () => {
        const storedInvitation = {
          invitationId: 'inv-123',
          teamName: 'Test Team',
          role: 'player'
        };
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedInvitation));

        const result = retrievePendingInvitation();

        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('pendingInvitation');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('pendingInvitation');
        expect(result).toEqual(storedInvitation);
      });

      it('should return null when no stored invitation', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        const result = retrievePendingInvitation();

        expect(result).toBeNull();
        expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      });

      it('should handle JSON parse errors gracefully', () => {
        const invalidJson = 'invalid json data';
        mockLocalStorage.getItem.mockReturnValue(invalidJson);

        const result = retrievePendingInvitation();

        expect(result).toBeNull();
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('pendingInvitation');
        expect(console.error).toHaveBeenCalledWith(
          'Failed to retrieve pending invitation:',
          expect.any(Error)
        );
      });

      it('should handle localStorage access errors', () => {
        const error = new Error('localStorage not available');
        mockLocalStorage.getItem.mockImplementation(() => {
          throw error;
        });

        const result = retrievePendingInvitation();

        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Failed to retrieve pending invitation:', error);
      });

      it('should return null when window is undefined', () => {
        const tempWindow = global.window;
        Object.defineProperty(global, 'window', {
          value: undefined,
          writable: true,
          configurable: true
        });

        const result = retrievePendingInvitation();

        expect(result).toBeNull();

        Object.defineProperty(global, 'window', {
          value: tempWindow,
          writable: true,
          configurable: true
        });
      });
    });

    describe('hasPendingInvitation', () => {
      it('should return true when pending invitation exists', () => {
        mockLocalStorage.getItem.mockReturnValue('{"invitationId": "inv-123"}');

        expect(hasPendingInvitation()).toBe(true);
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('pendingInvitation');
      });

      it('should return false when no pending invitation', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        expect(hasPendingInvitation()).toBe(false);
      });

      it('should return false when localStorage access throws error', () => {
        mockLocalStorage.getItem.mockImplementation(() => {
          throw new Error('localStorage error');
        });

        expect(hasPendingInvitation()).toBe(false);
      });

      it('should return false when window is undefined', () => {
        const tempWindow = global.window;
        Object.defineProperty(global, 'window', {
          value: undefined,
          writable: true,
          configurable: true
        });

        expect(hasPendingInvitation()).toBe(false);

        Object.defineProperty(global, 'window', {
          value: tempWindow,
          writable: true,
          configurable: true
        });
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed URL parameters gracefully', () => {
      global.window.location.search = '?invitation=true&team=&role=player';

      const result = detectInvitationParams();

      expect(result.hasInvitation).toBe(false);
      expect(result.isCustomInvitation).toBe(false);
    });

    it('should handle URL with no hash symbol', () => {
      global.window.location.hash = '';

      const result = detectInvitationParams();

      expect(result.accessToken).toBeNull();
      expect(result.isSupabaseInvitation).toBe(false);
    });

    it('should handle complex URL scenarios', () => {
      global.window.location.search = '?invitation=true&team=team-123&role=player&invitation_id=inv-123&extra=value';
      global.window.location.hash = '#access_token=token&token_type=bearer&other=param';

      const result = detectInvitationParams();

      expect(result.hasInvitation).toBe(true);
      expect(result.isCustomInvitation).toBe(true);
      expect(result.isSupabaseInvitation).toBe(true);
      expect(result.teamId).toBe('team-123');
      expect(result.accessToken).toBe('token');
    });
  });
});