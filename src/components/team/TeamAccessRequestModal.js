import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Select, Textarea } from '../shared/UI';
import { Alert } from '../shared/Alert';
import { Card } from '../shared/Card';
import { FormGroup } from '../shared/FormGroup';
import { ModalShell } from '../shared/ModalShell';
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
  const { t } = useTranslation('team');
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
      setSuccessMessage(t('accessRequestModal.request.success.submitted'));
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
      onSuccess?.(t('accessRequestModal.success.requestApproved'));
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
    if (!window.confirm(t('accessRequestModal.manage.members.confirmRemove'))) {
      return;
    }
    
    const result = await removeTeamMember(teamUserId);
    if (result) {
      await loadTeamMembers();
      onSuccess?.(t('accessRequestModal.manage.members.removed'));
    }
  };

  const hasExistingRequest = userRequests.some(req => req.status === 'pending');

  const renderRequestTab = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Users className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-sky-300">{t('accessRequestModal.request.header.title')}</h3>
        <p className="text-slate-400 text-sm mt-2">
          {t('accessRequestModal.request.header.subtitle')} <strong>{team?.club?.long_name ? `${team.club.long_name} ${team.name}` : team?.name}</strong>
        </p>
      </div>

      {successMessage ? (
        /* Show success banner when there's a success message */
        <Alert variant="success">{successMessage}</Alert>
      ) : hasExistingRequest && !justSubmitted ? (
        /* Show pending warning only if user has existing request but didn't just submit */
        <div className="p-4 bg-amber-900/20 border border-amber-600/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-amber-100 font-medium">{t('accessRequestModal.request.warnings.pendingTitle')}</p>
              <p className="text-amber-200 text-sm">
                {t('accessRequestModal.request.warnings.pendingMessage')}
              </p>
            </div>
          </div>
        </div>
      ) : !successMessage ? (
        /* Show form only if no success message */
        <>
          <FormGroup label={t('accessRequestModal.request.form.roleLabel')}>
            <Select
              value={requestForm.role}
              onChange={(value) => setRequestForm(prev => ({ ...prev, role: value }))}
              options={[
                { value: 'coach', label: t('accessRequestModal.request.form.roles.coach') },
                { value: 'parent', label: t('accessRequestModal.request.form.roles.parent') },
                { value: 'admin', label: t('accessRequestModal.request.form.roles.admin') }
              ]}
            />
            <p className="text-slate-500 text-xs mt-1">
              {t('accessRequestModal.request.form.roleHint')}
            </p>
          </FormGroup>

          <FormGroup label={t('accessRequestModal.request.form.messageLabel')}>
            <Textarea
              value={requestForm.message}
              onChange={(e) => setRequestForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder={t('accessRequestModal.request.form.messagePlaceholder')}
              rows={4}
              maxLength={500}
            />
            <p className="text-slate-500 text-xs mt-1">
              {t('accessRequestModal.request.form.characterCount', { count: requestForm.message.length })}
            </p>
          </FormGroup>

          <div className="flex justify-between">
            <Button
              onClick={onClose}
              variant="secondary"
            >
              {t('accessRequestModal.request.buttons.cancel')}
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={loading || !requestForm.role}
              Icon={loading ? null : MessageSquare}
            >
              {loading ? t('accessRequestModal.request.buttons.sending') : t('accessRequestModal.request.buttons.sendRequest')}
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
            {t('accessRequestModal.request.buttons.close')}
          </Button>
        </div>
      )}

      {/* Show user's previous requests */}
      {userRequests.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-600">
          <h4 className="font-medium text-slate-200 mb-3">{t('accessRequestModal.request.yourRequests.title')}</h4>
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
                        {t(`accessRequestModal.request.status.${request.status}`)}
                      </span>
                      <span className="text-sm text-slate-400">
                        {t('accessRequestModal.request.yourRequests.role', { role: request.requested_role })}
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
                      {t('accessRequestModal.request.yourRequests.cancel')}
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
                    <strong>{t('accessRequestModal.request.yourRequests.reviewLabel')}</strong> {request.review_notes}
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
          {t('accessRequestModal.manage.header.title')}
          {isTeamAdmin && <span className="text-xs bg-emerald-600 text-emerald-100 px-2 py-1 rounded-full ml-2">{t('accessRequestModal.manage.header.badgeAdmin')}</span>}
          {isCoach && !isTeamAdmin && <span className="text-xs bg-sky-600 text-sky-100 px-2 py-1 rounded-full ml-2">{t('accessRequestModal.manage.header.badgeCoach')}</span>}
        </h3>
        <p className="text-slate-400 text-sm mt-2">
          {t('accessRequestModal.manage.header.subtitle')} <strong>{team?.name}</strong>
          {isTeamAdmin && <span className="block text-xs mt-1">{t('accessRequestModal.manage.header.adminPrivileges')}</span>}
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">{t('accessRequestModal.manage.empty.title')}</p>
          <p className="text-slate-500 text-sm mt-2">
            {t('accessRequestModal.manage.empty.description')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Card variant="subtle" padding="sm" className="mb-4">
            <p className="text-xs text-slate-400">
              {t('accessRequestModal.manage.privacyNotice')}
            </p>
          </Card>
          {pendingRequests.map((request) => (
            <div key={request.id} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-slate-100">
                      {request.user.name || t('accessRequestModal.manage.request.unnamedUser')}
                    </h4>
                    {request.user_email && (
                      <p className="text-sm text-slate-400 mt-0.5">
                        {request.user_email}
                      </p>
                    )}
                    <p className="text-sm text-slate-400 mt-1">
                      {t('accessRequestModal.manage.request.requestedRole')} <strong>{request.requested_role}</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(request.created_at).toLocaleDateString()} {t('accessRequestModal.manage.request.atTime')}{' '}
                      {new Date(request.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                    <Clock className="h-3 w-3 mr-1" />
                    {t('accessRequestModal.manage.request.statusPending')}
                  </span>
                </div>

                {request.message && (
                  <Card padding="sm">
                    <p className="text-sm text-slate-200 font-medium mb-1">{t('accessRequestModal.manage.request.messageLabel')}</p>
                    <p className="text-sm text-slate-300">"{request.message}"</p>
                  </Card>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-600">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRejectRequest(request.id, t('accessRequestModal.manage.buttons.rejectReason'))}
                    disabled={loading}
                    Icon={XCircle}
                  >
                    {t('accessRequestModal.manage.buttons.reject')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveRequest(request.id, request.requested_role)}
                    disabled={loading}
                    Icon={CheckCircle}
                  >
                    {t('accessRequestModal.manage.buttons.approve', { role: request.requested_role })}
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
            {t('accessRequestModal.manage.members.title', { count: teamMembers.length })}
          </h4>
          
          {teamMembers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-slate-400">{t('accessRequestModal.manage.members.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <Card key={member.id} padding="sm">
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
                          {t(`roleManagement.roles.${member.role}`, { defaultValue: member.role })}
                        </span>
                        <span className="text-xs text-slate-500">
                          {t('accessRequestModal.manage.members.joined', { date: new Date(member.created_at).toLocaleDateString() })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={loading || member.role === 'admin'}
                        title={member.role === 'admin' ? t('accessRequestModal.manage.members.cannotRemoveAdmin') : t('accessRequestModal.manage.members.removeMember')}
                      >
                        {t('accessRequestModal.manage.members.remove')}
                      </Button>
                    </div>
                  </div>
                </Card>
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
      label: isTeamAdmin ? t('accessRequestModal.tabs.teamManagement') : t('accessRequestModal.tabs.manageRequests'),
      count: pendingRequests.length 
    }] : []),
    // Only show request tab if not in standalone mode (meaning user is not already a team member)
    ...(!isStandaloneMode ? [{ id: 'request', label: t('accessRequestModal.tabs.request'), count: null }] : [])
  ];

  return (
    <ModalShell
      title={t('accessRequestModal.header.title')}
      onClose={onClose}
      maxWidth="2xl"
    >
          {error && (
            <Alert variant="error" icon={AlertTriangle} className="mb-4">{error}</Alert>
          )}

          {/* Tab Navigation */}
          {tabs.length > 1 && (
            <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg mb-4">
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

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'request' && renderRequestTab()}
          {activeTab === 'manage' && renderManageTab()}
        </div>
    </ModalShell>
  );
}
