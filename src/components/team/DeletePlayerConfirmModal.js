import React from 'react';
import { Button } from '../shared/UI';
import { Card } from '../shared/Card';
import { Trash2, AlertTriangle } from 'lucide-react';
import { ModalShell } from '../shared/ModalShell';
import { useTranslation } from 'react-i18next';

export function DeletePlayerConfirmModal({ player, hasGameHistory, onClose, onConfirm }) {
  const { t } = useTranslation('team');

  if (!player) return null;

  const willBeDeleted = !hasGameHistory;
  const displayName = player.display_name || player.displayName || player.first_name || t('deletePlayerModal.unknownPlayer');
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <ModalShell
      title={t('deletePlayerModal.title')}
      subtitle={willBeDeleted ? t('deletePlayerModal.subtitleDelete') : t('deletePlayerModal.subtitleDeactivate')}
      icon={AlertTriangle}
      iconColor="rose"
      onClose={onClose}
    >
          {/* Player Info */}
          <Card padding="md" className="mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-sky-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {displayInitial}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-slate-100 font-medium">{displayName}</h3>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  {player.jersey_number && (
                    <span className="flex items-center">
                      <span className="text-amber-400 mr-1">#</span>
                      {player.jersey_number}
                    </span>
                  )}
                  <span className={player.on_roster ? 'text-emerald-400' : 'text-slate-400'}>
                    {player.on_roster ? t('deletePlayerModal.status.active') : t('deletePlayerModal.status.inactive')}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Warning Message */}
          <div className="bg-rose-900/20 border border-rose-600 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-rose-200 font-medium">
                  {t('deletePlayerModal.warning.title')}
                </p>
                {willBeDeleted ? (
                  <ul className="text-rose-300 text-sm space-y-1">
                    <li>{t('deletePlayerModal.warning.permanentDeleteFull')}</li>
                    <li>{t('deletePlayerModal.warning.cannotUndo')}</li>
                  </ul>
                ) : (
                  <ul className="text-rose-300 text-sm space-y-1">
                    <li>{t('deletePlayerModal.warning.deactivatedFull')}</li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Additional info for permanent delete path */}
          {willBeDeleted && (
            <Card padding="md" className="mb-6">
              <p className="text-slate-200 font-medium mb-2">{t('deletePlayerModal.whatHappensNext')}</p>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>{t('deletePlayerModal.deleteConsequences.jerseyAvailable')}</li>
              </ul>
            </Card>
          )}

          {/* Reassurance for deactivation path */}
          {!willBeDeleted && (
            <Card padding="md" className="mb-6">
              <p className="text-slate-200 font-medium mb-2">{t('deletePlayerModal.whatHappensNext')}</p>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>{t('deletePlayerModal.deactivateConsequences.statsPreserved')}</li>
                <li>{t('deletePlayerModal.deactivateConsequences.jerseyAvailable')}</li>
                <li>{t('deletePlayerModal.deactivateConsequences.canReactivate')}</li>
              </ul>
            </Card>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={onConfirm}
              variant="danger"
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
              Icon={Trash2}
            >
              {willBeDeleted ? t('deletePlayerModal.buttons.deletePlayer') : t('deletePlayerModal.buttons.deactivatePlayer')}
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              {t('deletePlayerModal.buttons.cancel')}
            </Button>
          </div>
    </ModalShell>
  );
}
