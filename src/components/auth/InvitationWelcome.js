import React, { useState } from 'react';
import { Button, Input } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { getInvitationContext, getInvitationStatus, needsAccountCompletion, storePendingInvitation } from '../../utils/invitationUtils';
import { validatePassword, getPasswordRequirementsText } from '../../utils/authValidation';
import { supabase } from '../../lib/supabase';
import { 
  Mail, 
  Users, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  UserPlus
} from 'lucide-react';

/**
 * InvitationWelcome - Shows invitation details and guides user through acceptance
 * 
 * Handles both Supabase invitation tokens and custom invitation flows
 * 
 * @param {Object} props
 * @param {Object} props.invitationParams - Invitation parameters from URL
 * @param {Function} props.onInvitationProcessed - Callback when invitation is accepted
 * @param {Function} props.onRequestSignIn - Callback to request sign-in modal after password setup
 * @returns {React.ReactNode}
 */
export function InvitationWelcome({ invitationParams, onInvitationProcessed, onRequestSignIn }) {
  const { user, signOut, enableProfileFetchSkip, disableProfileFetchSkip } = useAuth();
  const { acceptTeamInvitation, loading, errorMessage } = useTeam();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordSetupComplete, setPasswordSetupComplete] = useState(false);

  const invitationContext = getInvitationContext(invitationParams);
  const invitationStatus = getInvitationStatus(user, invitationParams);
  const needsSetup = needsAccountCompletion(invitationParams, user);

  // Handle password setup for Supabase invitations
  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error);
      return;
    }

    try {
      setIsProcessing(true);
      setPasswordError('');
      
      // Enable profile fetch skipping to prevent delays during password setup
      enableProfileFetchSkip();
      
      // For Supabase invitations, the user should already be authenticated
      // We just need to update their password
      console.log('Setting password for authenticated user...');
      
      // Update the user's password since they're already authenticated
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Password updated successfully', data);
      
      // Set password setup as complete
      setPasswordSetupComplete(true);
      
      // Store invitation details in localStorage for after sign-in
      storePendingInvitation({
        invitationId: invitationContext?.invitationId,
        teamName: getTeamName(),
        role: invitationContext?.role,
        email: user?.email
      });
      
      console.log('Password setup complete. User will be signed out and redirected to sign-in.');
      
    } catch (error) {
      console.error('Error setting up account:', error);
      setPasswordError(error.message || 'Failed to set up account');
      // Re-enable profile fetch on error
      disableProfileFetchSkip();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle sign out and redirect to sign-in
  const handleSignOutAndRedirect = async () => {
    try {
      setIsProcessing(true);
      
      // Re-enable profile fetch before signing out
      disableProfileFetchSkip();
      
      await signOut();
      
      // Request that the parent component show the sign-in modal
      if (onRequestSignIn) {
        onRequestSignIn(user?.email);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      setPasswordError('Failed to sign out. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle invitation acceptance for authenticated users
  const handleAcceptInvitation = async () => {
    if (!invitationContext?.invitationId) {
      console.error('No invitation ID available');
      return;
    }

    try {
      setIsProcessing(true);
      const result = await acceptTeamInvitation(invitationContext.invitationId);
      
      if (result.success) {
        onInvitationProcessed?.(result);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return Shield;
      case 'coach': return Users;
      case 'parent': return UserPlus;
      case 'player': return Users;
      default: return Users;
    }
  };

  // Helper function to decode JWT and extract team name
  const extractTeamNameFromJWT = (accessToken) => {
    if (!accessToken) return null;
    
    try {
      // JWT has 3 parts: header.payload.signature
      const payloadBase64 = accessToken.split('.')[1];
      if (!payloadBase64) return null;
      
      // Decode the base64 payload with proper UTF-8 handling
      const payloadBytes = Uint8Array.from(atob(payloadBase64), c => c.charCodeAt(0));
      const payloadJson = new TextDecoder('utf-8').decode(payloadBytes);
      const payload = JSON.parse(payloadJson);
      
      // Extract team name from user metadata
      return payload.user_metadata?.team_name || null;
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  };

  const getTeamName = () => {
    // Try to get team name from Supabase invitation metadata first
    if (invitationParams?.isSupabaseInvitation && invitationParams?.accessToken) {
      const teamName = extractTeamNameFromJWT(invitationParams.accessToken);
      if (teamName) return teamName;
    }
    
    // For custom invitations, team name isn't readily available in URL
    return invitationContext?.teamName || 'Loading team details...';
  };

  const RoleIcon = getRoleIcon(invitationContext?.role);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-600 max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-sky-300">Team Invitation</h2>
          <p className="text-slate-400 mt-2">You've been invited to join a team!</p>
        </div>

        {/* Invitation Details */}
        {invitationContext && (
          <div className="bg-slate-700 rounded-lg p-4 mb-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-sky-400" />
                <div>
                  <p className="text-slate-300 font-medium">Team</p>
                  <p className="text-slate-400 text-sm">{getTeamName()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <RoleIcon className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-slate-300 font-medium">Role</p>
                  <p className="text-slate-400 text-sm">{invitationContext.displayRole}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status-specific content */}
        {passwordSetupComplete ? (
          <div className="space-y-4">
            <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-emerald-200 text-lg font-medium mb-2">Password Set Successfully!</p>
                  <p className="text-emerald-300 text-sm mb-3">
                    Your account is ready. To complete your team invitation and ensure secure access, 
                    please sign in with your new password.
                  </p>
                  <div className="bg-emerald-800/50 rounded-lg p-3 mb-3">
                    <p className="text-emerald-200 text-sm font-medium">What happens next:</p>
                    <ul className="text-emerald-300 text-sm mt-1 space-y-1">
                      <li>• You'll be signed out for security</li>
                      <li>• Sign in with: <span className="font-mono text-emerald-200">{user?.email}</span></li>
                      <li>• Your team invitation will be processed automatically</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSignOutAndRedirect}
              variant="primary"
              size="lg"
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Signing you out...' : 'Continue to Sign In'}
            </Button>
          </div>
        ) : invitationStatus.type === 'account_setup' && needsSetup && (
          <div className="space-y-4">
            <div className="bg-sky-900/50 border border-sky-600 rounded-lg p-3 mb-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sky-200 text-sm font-medium">Almost there!</p>
                  <p className="text-sky-300 text-sm">Set up your password to complete your account and join the team.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePasswordSetup} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Create Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isProcessing}
                />
                <p className="text-slate-500 text-xs mt-1">
                  {getPasswordRequirementsText()}
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={isProcessing}
                />
              </div>

              {passwordError && (
                <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-rose-200 text-sm">{passwordError}</p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isProcessing || !password || !confirmPassword}
                className="w-full"
              >
                {isProcessing ? 'Setting up account...' : 'Complete Account Setup'}
              </Button>
            </form>
          </div>
        )}

        {invitationStatus.type === 'ready_to_process' && user && (
          <div className="space-y-4">
            <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3 mb-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-200 text-sm font-medium">Ready to join!</p>
                  <p className="text-emerald-300 text-sm">Click below to accept your invitation and join the team.</p>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-rose-200 text-sm">{errorMessage}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleAcceptInvitation}
              variant="primary"
              size="lg"
              disabled={isProcessing || loading}
              className="w-full"
            >
              {isProcessing || loading ? 'Joining team...' : 'Accept Invitation'}
            </Button>
          </div>
        )}

        {invitationStatus.type === 'sign_in_required' && (
          <div className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-slate-300 text-sm text-center">
                Please sign in or create an account to accept this invitation.
              </p>
            </div>

            <div className="text-center text-xs text-slate-500">
              Close this modal to access the sign-in options
            </div>
          </div>
        )}

        {/* Close instruction */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            This invitation will remain valid until you accept it or it expires.
          </p>
        </div>
      </div>
    </div>
  );
}
