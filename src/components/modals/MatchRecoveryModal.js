import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/UI';
import { Card } from '../shared/Card';
import { Alert } from '../shared/Alert';
import { ModalShell } from '../shared/ModalShell';
import { History, Trash2, Calendar, Clock, Trophy, Users } from 'lucide-react';
import { FORMATS } from '../../constants/teamConfiguration';

/**
 * Modal for recovering finished matches that weren't saved to history
 *
 * Presents users with options to either save the match to history
 * or delete it permanently when a recoverable match is detected on login.
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Object} match - Match data from database
 * @param {function} onSave - Called when user chooses to save match to history
 * @param {function} onDelete - Called when user chooses to delete match
 * @param {function} onClose - Called when modal is closed without action
 */
export function MatchRecoveryModal({
  isOpen,
  match,
  onSave,
  onDelete,
  onClose
}) {
  const { t, i18n } = useTranslation('modals');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !match) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  // Format date for display
  const formatMatchDate = (dateString) => {
    if (!dateString) return t('matchRecovery.unknownDate');
    try {
      const locale = i18n.language === 'sv' ? 'sv-SE' : 'en-US';
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return t('matchRecovery.unknownDate');
    }
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return t('matchRecovery.unknownDuration');
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get outcome display with appropriate styling
  const getOutcomeDisplay = (outcome, goalsScored, goalsConceded) => {
    if (!outcome) return { text: t('matchRecovery.unknown'), color: 'text-slate-400' };

    const score = `${goalsScored || 0}-${goalsConceded || 0}`;

    switch (outcome) {
      case 'win':
        return { text: t('matchRecovery.wonScore', { score }), color: 'text-emerald-400' };
      case 'loss':
        return { text: t('matchRecovery.lostScore', { score }), color: 'text-rose-400' };
      case 'draw':
        return { text: t('matchRecovery.drewScore', { score }), color: 'text-amber-400' };
      default:
        return { text: score, color: 'text-slate-300' };
    }
  };

  const outcomeDisplay = getOutcomeDisplay(match.outcome, match.goals_scored, match.goals_conceded);

  return (
    <ModalShell
      title={t('matchRecovery.title')}
      subtitle={t('matchRecovery.subtitle')}
      icon={History}
      iconColor="blue"
      onClose={onClose}
    >
          {/* Match Details */}
          <Card className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-slate-200">{t('matchRecovery.matchDetails')}</h3>
              <span className={`text-sm font-semibold ${outcomeDisplay.color}`}>
                {outcomeDisplay.text}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  {formatMatchDate(match.finished_at)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  {formatDuration(match.match_duration_seconds)}
                </span>
              </div>

              {match.opponent && (
                <div className="flex items-center space-x-2 col-span-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{t('matchRecovery.vsOpponent', { opponent: match.opponent })}</span>
                </div>
              )}

              <div className="flex items-center space-x-2 col-span-2">
                <Trophy className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  {t('matchRecovery.formatInfo', { format: match.format || FORMATS.FORMAT_5V5, formation: match.formation || '2-2' })}
                </span>
              </div>
            </div>
          </Card>

          {/* Explanation */}
          <Alert variant="info" className="mb-6">
            <p className="leading-relaxed">
              {t('matchRecovery.explanation')}
            </p>
          </Alert>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSave}
              variant="accent"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={saving || deleting}
              Icon={saving ? undefined : History}
            >
              {saving ? t('matchRecovery.savingMatch') : t('matchRecovery.saveToHistory')}
            </Button>

            <Button
              onClick={handleDelete}
              variant="danger"
              className="w-full"
              disabled={saving || deleting}
              Icon={deleting ? undefined : Trash2}
            >
              {deleting ? t('matchRecovery.deletingMatch') : t('matchRecovery.deleteMatchPermanently')}
            </Button>
          </div>

          {/* Warning for delete action */}
          <div className="mt-4 p-2 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400 text-center">
              <strong>{t('matchRecovery.tip')}</strong>
            </p>
          </div>
    </ModalShell>
  );
}
