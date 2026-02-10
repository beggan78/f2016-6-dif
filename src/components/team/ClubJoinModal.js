import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { Alert } from '../shared/Alert';
import { useTeam } from '../../contexts/TeamContext';
import { useTranslation } from 'react-i18next';
import {
  Building,
  Users,
  AlertTriangle,
  UserPlus,
  X
} from 'lucide-react';

export function ClubJoinModal({ club, onClose, onSuccess }) {
  const { t } = useTranslation('team');
  const {
    joinClub,
    loading,
    error
  } = useTeam();

  const [joinRequested, setJoinRequested] = useState(false);

  const handleJoinClub = async () => {
    if (!club) return;

    try {
      const result = await joinClub(club.id);
      if (result) {
        setJoinRequested(true);
        // Call onSuccess after a brief delay to show success state
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      console.error('Error joining club:', err);
    }
  };

  if (!club) {
    return null;
  }

  if (joinRequested) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 rounded-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-pulse mb-4">
              <UserPlus className="h-12 w-12 text-emerald-400 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-emerald-300 mb-2">
              {t('clubJoin.successTitle')}
            </h3>
            <p className="text-slate-400">
              {t('clubJoin.successMessage', { clubName: club.long_name || club.name })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-sky-300">{t('clubJoin.title')}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <Alert variant="error" icon={AlertTriangle} className="mt-4">{error}</Alert>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <Building className="h-12 w-12 text-sky-400 mx-auto mb-4" />
            
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              {club.long_name || club.name}
            </h3>
            
            {club.short_name && (
              <p className="text-slate-400 text-sm">
                ({club.name}, {club.short_name})
              </p>
            )}
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-slate-300 text-sm mb-2">
                  <strong>{t('clubJoin.joinBenefitsTitle')}</strong>
                </p>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>{t('clubJoin.benefits.accessTeams')}</li>
                  <li>{t('clubJoin.benefits.requestJoin')}</li>
                  <li>{t('clubJoin.benefits.createTeams')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={loading}
            >
              {t('clubJoin.buttons.cancel')}
            </Button>
            <Button
              onClick={handleJoinClub}
              variant="primary"
              className="flex-1"
              disabled={loading}
              Icon={loading ? null : UserPlus}
            >
              {loading ? t('clubJoin.buttons.joining') : t('clubJoin.buttons.joinClub')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
