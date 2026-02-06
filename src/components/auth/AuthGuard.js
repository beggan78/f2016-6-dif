import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModalIntegration } from '../../hooks/useAuthModalIntegration';
import { AnonymousAlert } from './AnonymousAlert';

/**
 * AuthGuard - Higher-order component for protecting features behind authentication
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render when authenticated
 * @param {React.ReactNode} props.fallback - Optional custom fallback for unauthenticated users
 * @param {string} props.feature - Feature name for contextual messaging
 * @param {string} props.description - Description of why authentication is needed
 * @param {boolean} props.requireProfile - Whether user profile is also required
 * @param {Function} props.onAuthRequired - Callback when authentication is required
 * @returns {React.ReactNode}
 */
export function AuthGuard({
  children,
  fallback,
  feature,
  description,
  requireProfile = false,
  onAuthRequired,
  authModal
}) {
  const { t } = useTranslation('auth');
  const { isAuthenticated, hasValidProfile, loading } = useAuth();
  const resolvedAuthModal = useAuthModalIntegration(authModal);

  const effectiveFeature = feature || t('authGuard.defaultFeature');
  const effectiveDescription = description || t('authGuard.defaultDescription');

  // Show loading state during auth check
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-slate-400">{t('authGuard.loading')}</div>
      </div>
    );
  }
  
  // Check authentication requirement
  const isAuthorized = isAuthenticated && (!requireProfile || hasValidProfile);
  
  if (!isAuthorized) {
    // Call callback if provided
    if (onAuthRequired) {
      onAuthRequired();
    }
    
    // Use custom fallback or default anonymous alert
    if (fallback) {
      return fallback;
    }
    
    return (
      <AnonymousAlert
        feature={effectiveFeature}
        description={effectiveDescription}
        requireProfile={requireProfile && isAuthenticated}
        authModal={resolvedAuthModal}
      />
    );
  }
  
  // User is authorized, render children
  return children;
}

/**
 * withAuthGuard - HOC function to wrap components with authentication
 * 
 * @param {React.Component} WrappedComponent - Component to protect
 * @param {Object} guardOptions - Options for the auth guard
 * @returns {React.Component} - Protected component
 */
export function withAuthGuard(WrappedComponent, guardOptions = {}) {
  const AuthGuardedComponent = (props) => {
    return (
      <AuthGuard {...guardOptions}>
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  };
  
  AuthGuardedComponent.displayName = `withAuthGuard(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return AuthGuardedComponent;
}

/**
 * useAuthGuard - Hook for conditional rendering based on auth state
 * 
 * @param {Object} options
 * @param {boolean} options.requireProfile - Whether user profile is required
 * @returns {Object} Auth state and helper functions
 */
export function useAuthGuard(options = {}) {
  const { requireProfile = false } = options;
  const { isAuthenticated, hasValidProfile, loading, user, userProfile } = useAuth();
  
  const isAuthorized = isAuthenticated && (!requireProfile || hasValidProfile);
  const needsProfile = isAuthenticated && requireProfile && !hasValidProfile;
  
  return {
    isAuthorized,
    isAuthenticated,
    hasValidProfile,
    needsProfile,
    loading,
    user,
    userProfile,
    // Helper functions
    canAccess: (feature) => isAuthorized,
    getAuthState: () => {
      if (loading) return 'loading';
      if (!isAuthenticated) return 'unauthenticated';
      if (needsProfile) return 'needs-profile';
      return 'authorized';
    }
  };
}