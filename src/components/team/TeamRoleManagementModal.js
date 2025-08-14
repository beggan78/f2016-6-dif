import React, { useState, useEffect } from 'react';
import { X, UserCheck, Trash2, AlertTriangle, Shield, Lock } from 'lucide-react';
import { Button, Select } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full team management access' },
  { value: 'coach', label: 'Coach', description: 'Manage team and players' },
  { value: 'player', label: 'Player', description: 'Basic team member' },
  { value: 'parent', label: 'Parent', description: 'View team information' }
];

export function TeamRoleManagementModal({ 
  isOpen, 
  onClose, 
  team, 
  members, 
  onRefresh,
  currentUserRole 
}) {
  const { updateTeamMemberRole, removeTeamMember } = useTeam();
  const { user } = useAuth();
  const [memberRoles, setMemberRoles] = useState({});
  const [pendingChanges, setPendingChanges] = useState({});
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize member roles state
  useEffect(() => {
    if (members && members.length > 0) {
      const roles = {};
      members.forEach(member => {
        roles[member.id] = member.role;
      });
      setMemberRoles(roles);
      setPendingChanges({});
    }
  }, [members]);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!isOpen) return null;

  // Helper functions
  const getCurrentAdminCount = () => {
    return Object.values(memberRoles).filter(role => role === 'admin').length;
  };

  const isCurrentUser = (member) => {
    return member.user?.id === user?.id;
  };

  const isAdminToAdminChange = (member, newRole) => {
    const currentRole = memberRoles[member.id];
    return (currentRole === 'admin' || newRole === 'admin') && member.role === 'admin';
  };

  const wouldCreateLastAdminDemotion = (memberId, newRole) => {
    const currentRole = memberRoles[memberId];
    if (currentRole === 'admin' && newRole !== 'admin') {
      return getCurrentAdminCount() <= 1;
    }
    return false;
  };

  const handleRoleChange = (memberId, newRole) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    // Check if coach is trying to promote someone to admin
    if (currentUserRole === 'coach' && newRole === 'admin') {
      setError('Coaches cannot promote members to admin role');
      return;
    }

    // Prevent self-modification
    if (isCurrentUser(member)) {
      setError('You cannot modify your own role');
      return;
    }

    // Prevent admin-to-admin changes (except by super admin if implemented)
    if (isAdminToAdminChange(member, newRole) && currentUserRole !== 'super_admin') {
      setError('Admins cannot modify other admin roles');
      return;
    }

    // Prevent demoting the last admin
    if (wouldCreateLastAdminDemotion(memberId, newRole)) {
      setError('Cannot demote the last admin. At least one admin must remain.');
      return;
    }

    setMemberRoles(prev => ({ ...prev, [memberId]: newRole }));
    
    // Track pending changes
    if (newRole !== members.find(m => m.id === memberId)?.role) {
      setPendingChanges(prev => ({ ...prev, [memberId]: newRole }));
    } else {
      setPendingChanges(prev => {
        const updated = { ...prev };
        delete updated[memberId];
        return updated;
      });
    }
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setError('No changes to save');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      for (const [memberId, newRole] of Object.entries(pendingChanges)) {
        await updateTeamMemberRole(memberId, newRole);
      }

      setSuccessMessage(`Successfully updated ${Object.keys(pendingChanges).length} member role(s)`);
      setPendingChanges({});
      
      // Refresh team data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Error updating member roles:', err);
      setError(err.message || 'Failed to update member roles');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    // Prevent self-removal
    if (isCurrentUser(member)) {
      setError('You cannot remove yourself from the team');
      return;
    }

    // Prevent removing admins
    if (member.role === 'admin') {
      setError('Admin users cannot be removed. Demote them first, then remove.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove ${member.user?.name || member.user?.email} from the team?`)) {
      return;
    }

    setRemoving(member.id);
    setError(null);

    try {
      await removeTeamMember(member.id);
      setSuccessMessage(`Successfully removed ${member.user?.name || member.user?.email} from the team`);
      
      // Refresh team data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Error removing team member:', err);
      setError(err.message || 'Failed to remove team member');
    } finally {
      setRemoving(null);
    }
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <UserCheck className="w-6 h-6 text-sky-400" />
            <h2 className="text-xl font-semibold text-slate-100">Manage Team Roles</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-rose-900/50 border border-rose-600 rounded-lg">
              <p className="text-rose-200 text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-600 rounded-lg">
              <p className="text-emerald-200 text-sm">✓ {successMessage}</p>
            </div>
          )}

          {/* Team Info */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-200 mb-2">{team?.name}</h3>
            <p className="text-slate-400 text-sm mb-3">
              Manage roles and permissions for {members.length} team member{members.length !== 1 ? 's' : ''}
            </p>
            
            {/* Security Info */}
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-slate-200 text-sm font-medium">Security Restrictions</span>
              </div>
              <ul className="text-slate-400 text-xs space-y-1">
                <li>• You cannot modify your own role or remove yourself</li>
                <li>• Admin roles are protected from modification by other admins</li>
                <li>• At least one admin must remain on the team</li>
              </ul>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-4">
            {members.map((member) => {
              const currentRole = memberRoles[member.id];
              const originalRole = member.role;
              const hasChange = pendingChanges[member.id];
              const isRemoving = removing === member.id;
              const isCurrentUserMember = isCurrentUser(member);
              const isAdminMember = member.role === 'admin';
              const isLastAdmin = getCurrentAdminCount() <= 1 && currentRole === 'admin';
              const canModifyRole = !isCurrentUserMember && (!isAdminMember || currentUserRole === 'super_admin');
              const canRemove = !isCurrentUserMember && !isAdminMember;

              return (
                <div 
                  key={member.id} 
                  className={`p-4 bg-slate-700 rounded-lg border ${
                    hasChange ? 'border-amber-500' : 'border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${
                          isAdminMember ? 'bg-emerald-600' : 'bg-sky-600'
                        }`}>
                          <span className="text-white font-medium">
                            {(member.user?.name || member.user?.email)?.charAt(0).toUpperCase() || '?'}
                          </span>
                          {isAdminMember && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <Shield className="w-2.5 h-2.5 text-amber-900" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-slate-100 font-medium">
                              {member.user?.name || member.user?.email?.split('@')[0] || 'Unknown User'}
                            </p>
                            {isCurrentUserMember && (
                              <span className="text-xs px-2 py-0.5 bg-blue-600 text-blue-100 rounded-full">
                                You
                              </span>
                            )}
                            {isLastAdmin && (
                              <span className="text-xs px-2 py-0.5 bg-amber-600 text-amber-100 rounded-full flex items-center">
                                <Lock className="w-3 h-3 mr-1" />
                                Last Admin
                              </span>
                            )}
                          </div>
                          {member.user?.email && (
                            <p className="text-slate-400 text-sm">{member.user.email}</p>
                          )}
                        </div>
                      </div>

                      {hasChange && (
                        <div className="mt-2 text-xs text-amber-400 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Role will change from {originalRole} to {pendingChanges[member.id]}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Role Selector */}
                      <div className="min-w-[140px]">
                        {!canModifyRole ? (
                          <div className="px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-300 text-sm flex items-center">
                            <Lock className="w-3 h-3 mr-2" />
                            {currentRole}
                          </div>
                        ) : (
                          <Select
                            value={currentRole}
                            onChange={(value) => handleRoleChange(member.id, value)}
                            options={ROLE_OPTIONS.filter(option => {
                              // Coaches can't promote to admin
                              if (currentUserRole === 'coach' && option.value === 'admin') {
                                return false;
                              }
                              return true;
                            })}
                            disabled={loading || isRemoving}
                          />
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={loading || isRemoving || !canRemove}
                        className={`p-2 transition-colors disabled:opacity-50 ${
                          canRemove 
                            ? 'text-slate-400 hover:text-rose-400' 
                            : 'text-slate-600 cursor-not-allowed'
                        }`}
                        title={
                          !canRemove 
                            ? isCurrentUserMember 
                              ? "Cannot remove yourself" 
                              : "Cannot remove admin users"
                            : "Remove from team"
                        }
                      >
                        {isRemoving ? (
                          <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {members.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No team members found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-600">
          <div className="text-sm text-slate-400">
            {hasPendingChanges && (
              <span className="text-amber-400">
                {Object.keys(pendingChanges).length} unsaved change(s)
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={loading}
            >
              {hasPendingChanges ? 'Cancel' : 'Close'}
            </Button>
            
            {hasPendingChanges && (
              <Button
                onClick={handleSaveChanges}
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}