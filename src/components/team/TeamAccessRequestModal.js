import React, { useState, useEffect, useCallback } from 'react';
import { Button, Select } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';

export function TeamAccessRequestModal({ team, onClose, onSuccess, isStandaloneMode = false }) {
  const {
    requestTeamAccess,
    getTeamAccessRequests,
    getUserTeamRequests,
    approveTeamAccess,
    rejectTeamAccess,
    cancelTeamAccess,
    getTeamMembers,
    removeTeamMember,
    loading,
    error,
    isCoach,
    isTeamAdmin,
    canManageTeam
  } = useTeam();

  const [activeTab, setActiveTab] = useState('request');
  const [requestForm, setRequestForm] = useState({
    role: 'coach',
    message: ''
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);

  const loadPendingRequests = useCallback(async () => {
    if (!team) return;
    const requests = await getTeamAccessRequests(team.id);
    setPendingRequests(requests);
  }, [team, getTeamAccessRequests]);

  const loadUserRequests = useCallback(async () => {
    if (!team) return;
    const requests = await getUserTeamRequests();
    // Filter requests for this specific team
    const teamRequests = requests.filter(req => req.team.id === team.id);
    setUserRequests(teamRequests);
  }, [team, getUserTeamRequests]);

  const loadTeamMembers = useCallback(async () => {
    if (!team) return;
    const members = await getTeamMembers(team.id);
    setTeamMembers(members);
  }, [team, getTeamMembers]);

  // Load data when modal opens
  useEffect(() => {
    if (team) {
      if (isStandaloneMode || canManageTeam) {
        // In standalone mode or for team managers, load management data
        loadPendingRequests();
        if (isTeamAdmin) {
          loadTeamMembers();
        }
        setActiveTab('manage'); // Show management tab
      } else {
        // For external users requesting access, load their requests
        loadUserRequests();
        setActiveTab('request'); // Show request tab
      }
    }
  }, [team, canManageTeam, isTeamAdmin, isStandaloneMode, loadPendingRequests, loadTeamMembers, loadUserRequests]);

  const handleSubmitRequest = async () => {
    if (!team) return;

    const result = await requestTeamAccess(
      team.id,
      requestForm.role,
      requestForm.message.trim(),
      true // Skip loading state to prevent modal closure
    );

    if (result) {
      // Show persistent success banner
      setSuccessMessage('Request submitted successfully! The team admin will review your request.');
      setJustSubmitted(true);
      
      // Don't auto-close modal - let user close manually after seeing confirmation
      // onSuccess?.('Request submitted successfully');
      
      // Reload user requests to show the new request
      await loadUserRequests();
      
      // Reset form
      setRequestForm({ role: 'coach', message: '' });
    }
  };

  const handleApproveRequest = async (requestId, role) => {
    const result = await approveTeamAccess(requestId, role);
    if (result) {
      await loadPendingRequests();
      onSuccess?.('Request approved successfully');
    }
  };

  const handleRejectRequest = async (requestId, notes) => {
    const result = await rejectTeamAccess(requestId, notes);
    if (result) {
      await loadPendingRequests();
    }
  };

  const handleCancelRequest = async (requestId) => {
    const result = await cancelTeamAccess(requestId);
    if (result) {
      await loadUserRequests();
    }
  };


  const handleRemoveMember = async (teamUserId) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }
    
    const result = await removeTeamMember(teamUserId);
    if (result) {
      await loadTeamMembers();
      onSuccess?.('Member removed from team');
    }
  };

  const hasExistingRequest = userRequests.some(req => req.status === 'pending');

  const renderRequestTab = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Users className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-sky-300">Request Team Access</h3>
        <p className="text-slate-400 text-sm mt-2">
          Request to join <strong>{team?.name}</strong>
        </p>
      </div>

      {successMessage ? (
        /* Show success banner when there's a success message */
        <div className="p-4 bg-emerald-900/50 border border-emerald-600 rounded-lg">
          <p className="text-emerald-200 text-sm">{successMessage}</p>
        </div>
      ) : hasExistingRequest && !justSubmitted ? (
        /* Show pending warning only if user has existing request but didn't just submit */
        <div className="p-4 bg-amber-900/20 border border-amber-600/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-amber-100 font-medium">Request Pending</p>
              <p className="text-amber-200 text-sm">
                You already have a pending request for this team
              </p>
            </div>
          </div>
        </div>
      ) : !successMessage ? (
        /* Show form only if no success message */
        <>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Requested Role *
            </label>
            <Select
              value={requestForm.role}
              onChange={(value) => setRequestForm(prev => ({ ...prev, role: value }))}
              options={[
                { value: 'coach', label: 'Coach' },
                { value: 'parent', label: 'Parent' },
                { value: 'admin', label: 'Admin' }
              ]}
            />
            <p className="text-slate-500 text-xs mt-1">
              The team coach will review and assign your final role
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Message to Team Coach
            </label>
            <textarea
              value={requestForm.message}
              onChange={(e) => setRequestForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Introduce yourself and explain why you'd like to join this team..."
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-slate-500 text-xs mt-1">
              {requestForm.message.length}/500 characters
            </p>
          </div>

          <div className="flex justify-between">
            <Button 
              onClick={onClose} 
              variant="secondary"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitRequest}
              disabled={loading || !requestForm.role}
              Icon={loading ? null : MessageSquare}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </>
      ) : null}

      {/* Show Close button after successful submission */}
      {successMessage && (
        <div className="flex justify-center mt-4">
          <Button 
            onClick={onClose} 
            variant="primary"
          >
            Close
          </Button>
        </div>
      )}

      {/* Show user's previous requests */}
      {userRequests.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-600">
          <h4 className="font-medium text-slate-200 mb-3">Your Requests</h4>
          <div className="space-y-2">
            {userRequests.map((request) => (
              <div key={request.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === 'pending' 
                          ? 'bg-amber-100 text-amber-800' 
                          : request.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                        {request.status}
                      </span>
                      <span className="text-sm text-slate-400">
                        Role: {request.requested_role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {request.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                {request.message && (
                  <p className="text-sm text-slate-300 mt-2 p-2 bg-slate-700 rounded">
                    "{request.message}"
                  </p>
                )}
                {request.review_notes && (
                  <p className="text-sm text-slate-400 mt-2 p-2 bg-slate-600 rounded">
                    <strong>Review:</strong> {request.review_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderManageTab = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <UserCheck className="h-8 w-8 text-sky-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-sky-300">
          Manage Team Requests
          {isTeamAdmin && <span className="text-xs bg-emerald-600 text-emerald-100 px-2 py-1 rounded-full ml-2">Admin</span>}
          {isCoach && !isTeamAdmin && <span className="text-xs bg-sky-600 text-sky-100 px-2 py-1 rounded-full ml-2">Coach</span>}
        </h3>
        <p className="text-slate-400 text-sm mt-2">
          Review access requests for <strong>{team?.name}</strong>
          {isTeamAdmin && <span className="block text-xs mt-1">You have full admin privileges for this team</span>}
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">No pending requests</p>
          <p className="text-slate-500 text-sm mt-2">
            New team access requests will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 mb-4">
            <p className="text-xs text-slate-400">
              📧 Email addresses are shown to help identify requesters and are only visible to team administrators.
            </p>
          </div>
          {pendingRequests.map((request) => (
            <div key={request.id} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-slate-100">
                      {request.user.name || 'Unnamed User'}
                    </h4>
                    {request.user_email && (
                      <p className="text-sm text-slate-400 mt-0.5">
                        {request.user_email}
                      </p>
                    )}
                    <p className="text-sm text-slate-400 mt-1">
                      Requested role: <strong>{request.requested_role}</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(request.created_at).toLocaleDateString()} at{' '}
                      {new Date(request.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </span>
                </div>

                {request.message && (
                  <div className="p-3 bg-slate-700 rounded-lg">
                    <p className="text-sm text-slate-200 font-medium mb-1">Message:</p>
                    <p className="text-sm text-slate-300">"{request.message}"</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-600">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRejectRequest(request.id, 'Request declined by team coach')}
                    disabled={loading}
                    Icon={XCircle}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveRequest(request.id, request.requested_role)}
                    disabled={loading}
                    Icon={CheckCircle}
                  >
                    Approve as {request.requested_role}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Team Member Management - Admin Only */}
      {isTeamAdmin && (
        <div className="mt-8 pt-6 border-t border-slate-600">
          <h4 className="font-medium text-slate-200 mb-4 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Team Members ({teamMembers.length})
          </h4>
          
          {teamMembers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-slate-400">No team members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-3 bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-slate-100">{member.user.name}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          member.role === 'admin' 
                            ? 'bg-emerald-100 text-emerald-800'
                            : member.role === 'coach'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {member.role}
                        </span>
                        <span className="text-xs text-slate-500">
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={loading || member.role === 'admin'}
                        title={member.role === 'admin' ? 'Cannot remove admin' : 'Remove member'}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!team) {
    return null;
  }

  const tabs = [
    ...(canManageTeam ? [{ 
      id: 'manage', 
      label: isTeamAdmin ? 'Team Management' : 'Manage Requests', 
      count: pendingRequests.length 
    }] : []),
    // Only show request tab if not in standalone mode (meaning user is not already a team member)
    ...(!isStandaloneMode ? [{ id: 'request', label: 'Request Access', count: null }] : [])
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-sky-300">Team Access</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <p className="text-rose-800 text-sm">{error}</p>
              </div>
            </div>
          )}


          {/* Tab Navigation */}
          {tabs.length > 1 && (
            <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg mt-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-slate-600 text-slate-100'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-600'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className="bg-amber-500 text-amber-900 text-xs px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'request' && renderRequestTab()}
          {activeTab === 'manage' && renderManageTab()}
        </div>
      </div>
    </div>
  );
}