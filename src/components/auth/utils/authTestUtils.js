/**
 * Authentication Testing Utilities
 * 
 * Provides common mocks, helpers, and test data for authentication component testing.
 * Follows the established testing patterns from the project's testing guidelines.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

/**
 * Mock user data for testing
 */
export const createMockUser = (overrides = {}) => ({
  id: 'user_123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    name: 'Test User'
  },
  app_metadata: {},
  aud: 'authenticated',
  confirmed_at: '2023-12-01T10:00:00.000Z',
  created_at: '2023-12-01T10:00:00.000Z',
  email_confirmed_at: '2023-12-01T10:00:00.000Z',
  identities: [],
  last_sign_in_at: '2023-12-01T10:00:00.000Z',
  phone: '',
  role: 'authenticated',
  updated_at: '2023-12-01T10:00:00.000Z',
  ...overrides
});

/**
 * Mock session data for testing
 */
export const createMockSession = (overrides = {}) => ({
  access_token: 'mock_access_token',
  expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  expires_in: 3600,
  refresh_token: 'mock_refresh_token',
  token_type: 'bearer',
  user: createMockUser(),
  ...overrides
});

/**
 * Mock Supabase auth client for testing
 */
export const createMockSupabaseAuth = () => ({
  // Auth state methods
  getSession: jest.fn(),
  getUser: jest.fn(),
  onAuthStateChange: jest.fn(),
  
  // Authentication methods
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  
  // Session management
  setSession: jest.fn(),
  refreshSession: jest.fn(),
  
  // Helper methods for tests
  __setUser: function(user) {
    this.getUser.mockResolvedValue({ data: { user }, error: null });
    this.getSession.mockResolvedValue({ 
      data: { session: user ? createMockSession({ user }) : null }, 
      error: null 
    });
  },
  __setSession: function(session) {
    this.getSession.mockResolvedValue({ data: { session }, error: null });
  },
  __setError: function(method, error) {
    this[method].mockResolvedValue({ data: null, error });
  },
  __reset: function() {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && key.startsWith('mock')) {
        this[key].mockReset();
      }
    });
  }
});

/**
 * Mock Supabase client for testing
 */
export const createMockSupabaseClient = () => {
  const mockAuth = createMockSupabaseAuth();
  
  return {
    auth: mockAuth,
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    })),
    // Helper methods for tests
    __getAuth: () => mockAuth,
    __reset: function() {
      mockAuth.__reset();
      this.from.mockReset();
    }
  };
};

/**
 * Mock AuthContext value for testing
 */
export const createMockAuthContext = (overrides = {}) => ({
  // Authentication state
  user: null,
  session: null,
  isAuthenticated: false,
  hasValidProfile: false,
  loading: false,
  
  // Authentication methods
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  updateProfile: jest.fn(),
  
  // Profile management
  profile: null,
  refreshProfile: jest.fn(),
  
  // Error handling
  authError: null,
  clearAuthError: jest.fn(),
  
  ...overrides
});

/**
 * Mock AuthModal context for testing
 */
export const createMockAuthModal = (overrides = {}) => ({
  // Modal state
  isOpen: false,
  currentView: 'login',
  
  // Modal actions
  openLogin: jest.fn(),
  openSignup: jest.fn(),
  openPasswordReset: jest.fn(),
  close: jest.fn(),
  
  // Navigation
  switchToLogin: jest.fn(),
  switchToSignup: jest.fn(),
  switchToPasswordReset: jest.fn(),
  
  ...overrides
});

/**
 * Authentication test wrapper component
 * Provides mock contexts for testing authentication components
 */
export const AuthTestWrapper = ({ 
  children, 
  authContextValue = {}, 
  authModalValue = {} 
}) => {
  const mockAuthContext = createMockAuthContext(authContextValue);
  const mockAuthModalContext = createMockAuthModal(authModalValue);
  
  // Mock the contexts
  React.useContext = jest.fn((context) => {
    if (context.displayName === 'AuthContext') {
      return mockAuthContext;
    }
    if (context.displayName === 'AuthModalContext') {
      return mockAuthModalContext;
    }
    return {};
  });
  
  return children;
};

/**
 * Render helper for authentication components
 * Automatically wraps components with required contexts
 */
export const renderWithAuthContext = (
  ui, 
  { 
    authContextValue = {}, 
    authModalValue = {},
    ...renderOptions 
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <AuthTestWrapper 
      authContextValue={authContextValue} 
      authModalValue={authModalValue}
    >
      {children}
    </AuthTestWrapper>
  );
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Mock form validation responses
 */
export const createMockValidationErrors = () => ({
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address'
  },
  password: {
    required: 'Password is required',
    minLength: 'Password must be at least 6 characters',
    weak: 'Password is too weak'
  },
  confirmPassword: {
    required: 'Please confirm your password',
    mismatch: 'Passwords do not match'
  },
  name: {
    required: 'Name is required',
    minLength: 'Name must be at least 2 characters'
  }
});

/**
 * Mock authentication API responses
 */
export const createMockAuthResponses = () => ({
  signUp: {
    success: {
      data: {
        user: createMockUser(),
        session: null // Email confirmation required
      },
      error: null
    },
    error: {
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 400 }
    }
  },
  signIn: {
    success: {
      data: {
        user: createMockUser(),
        session: createMockSession()
      },
      error: null
    },
    error: {
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 }
    }
  },
  signOut: {
    success: {
      error: null
    },
    error: {
      error: { message: 'Sign out failed', status: 500 }
    }
  },
  resetPassword: {
    success: {
      data: {},
      error: null
    },
    error: {
      data: {},
      error: { message: 'Unable to send reset email', status: 400 }
    }
  }
});

/**
 * Mock user profile data
 */
export const createMockProfile = (overrides = {}) => ({
  id: 'profile_123',
  user_id: 'user_123',
  full_name: 'Test User',
  display_name: 'Test User',
  avatar_url: null,
  created_at: '2023-12-01T10:00:00.000Z',
  updated_at: '2023-12-01T10:00:00.000Z',
  ...overrides
});

/**
 * Team context mock for authentication testing
 */
export const createMockTeamContext = (overrides = {}) => ({
  // Team state
  currentTeam: null,
  userTeams: [],
  hasTeams: false,
  loading: false,
  
  // Team methods
  createTeam: jest.fn(),
  selectTeam: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  refreshTeams: jest.fn(),
  
  // Data migration
  migrateLocalData: jest.fn(),
  
  ...overrides
});

/**
 * Mock data sync manager for testing
 */
export const createMockDataSyncManager = () => ({
  // Configuration
  setUserId: jest.fn(),
  isAuthenticated: false,
  userId: null,
  
  // Data operations
  saveMatch: jest.fn(),
  getMatchHistory: jest.fn(),
  deleteMatch: jest.fn(),
  
  // Local storage operations
  saveMatchToLocal: jest.fn(),
  getLocalMatches: jest.fn(),
  
  // Cloud operations
  saveMatchToCloud: jest.fn(),
  getCloudMatches: jest.fn(),
  
  // Migration
  migrateLocalToCloud: jest.fn(),
  
  // Helper methods for tests
  __setAuthenticated: function(isAuth, userId = null) {
    this.isAuthenticated = isAuth;
    this.userId = userId;
  },
  __reset: function() {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && !key.startsWith('__')) {
        this[key].mockReset();
      }
    });
    this.isAuthenticated = false;
    this.userId = null;
  }
});

/**
 * Common authentication test scenarios
 */
export const createAuthTestScenarios = () => ({
  unauthenticated: {
    name: 'Unauthenticated User',
    authContext: {
      user: null,
      session: null,
      isAuthenticated: false,
      hasValidProfile: false,
      loading: false
    }
  },
  authenticated: {
    name: 'Authenticated User',
    authContext: {
      user: createMockUser(),
      session: createMockSession(),
      isAuthenticated: true,
      hasValidProfile: true,
      loading: false
    }
  },
  authenticatedNoProfile: {
    name: 'Authenticated User Without Profile',
    authContext: {
      user: createMockUser(),
      session: createMockSession(),
      isAuthenticated: true,
      hasValidProfile: false,
      loading: false
    }
  },
  loading: {
    name: 'Loading Authentication State',
    authContext: {
      user: null,
      session: null,
      isAuthenticated: false,
      hasValidProfile: false,
      loading: true
    }
  }
});

/**
 * User interaction helpers for authentication forms
 */
export const authUserInteractions = {
  fillEmailField: (emailInput, email) => {
    fireEvent.change(emailInput, { target: { value: email } });
  },
  
  fillPasswordField: (passwordInput, password) => {
    fireEvent.change(passwordInput, { target: { value: password } });
  },
  
  fillNameField: (nameInput, name) => {
    fireEvent.change(nameInput, { target: { value: name } });
  },
  
  submitForm: (form) => {
    fireEvent.submit(form);
  },
  
  clickButton: (button) => {
    fireEvent.click(button);
  }
};

/**
 * Assertion helpers for authentication testing
 */
export const expectAuthState = (result, expectedState) => {
  Object.keys(expectedState).forEach(key => {
    expect(result.current).toHaveProperty(key, expectedState[key]);
  });
};

export const expectAuthMethodCalled = (mockFn, expectedArgs = []) => {
  expect(mockFn).toHaveBeenCalled();
  if (expectedArgs.length > 0) {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
  }
};

/**
 * Helper to simulate authentication errors
 */
export const simulateAuthError = (mockAuthClient, method, error) => {
  const mockError = {
    message: error.message || 'Authentication error',
    status: error.status || 400
  };
  
  mockAuthClient.auth[method].mockResolvedValue({
    data: null,
    error: mockError
  });
  
  return mockError;
};

/**
 * Helper to setup successful authentication flow
 */
export const setupSuccessfulAuth = (mockAuthClient, user = null, session = null) => {
  const mockUser = user || createMockUser();
  const mockSession = session || createMockSession({ user: mockUser });
  
  mockAuthClient.auth.signUp.mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null
  });
  
  mockAuthClient.auth.signInWithPassword.mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null
  });
  
  mockAuthClient.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null
  });
  
  return { user: mockUser, session: mockSession };
};

export default {
  createMockUser,
  createMockSession,
  createMockSupabaseAuth,
  createMockSupabaseClient,
  createMockAuthContext,
  createMockAuthModal,
  AuthTestWrapper,
  renderWithAuthContext,
  createMockValidationErrors,
  createMockAuthResponses,
  createMockProfile,
  createMockTeamContext,
  createMockDataSyncManager,
  createAuthTestScenarios,
  authUserInteractions,
  expectAuthState,
  expectAuthMethodCalled,
  simulateAuthError,
  setupSuccessfulAuth
};