import React, { useEffect, useMemo, useState } from 'react';
import { Repeat, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, MultiSelect } from '../shared/UI';
import { formatPlayerDisplayName } from '../../utils/playerUtils';

export function PlayerLoanModal({
  isOpen,
  onClose,
  onSave,
  players = [],
  loan = null,
  defaultPlayerId = ''
}) {
  const { t } = useTranslation('team');
  const isEditMode = Boolean(loan);

  const [formState, setFormState] = useState({
    playerIds: defaultPlayerId ? [defaultPlayerId] : [],
    receivingTeamName: '',
    loanDate: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const initialPlayerIds = Array.isArray(loan?.playerIds)
      ? loan.playerIds
      : loan?.player_id
      ? [loan.player_id]
      : defaultPlayerId
      ? [defaultPlayerId]
      : [];

    setFormState({
      playerIds: initialPlayerIds,
      receivingTeamName: loan?.receivingTeamName || loan?.receiving_team_name || '',
      loanDate: loan?.loanDate || loan?.loan_date || ''
    });
    setErrors({});
    setLoading(false);
  }, [isOpen, loan, defaultPlayerId]);

  const playerOptions = useMemo(() => {
    const options = players.map(player => ({
      value: player.id,
      label: formatPlayerDisplayName(player)
    }));

    // Sort: selected players first, then alphabetically within each group
    return options.sort((a, b) => {
      const aSelected = formState.playerIds.includes(a.value);
      const bSelected = formState.playerIds.includes(b.value);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      return a.label.localeCompare(b.label);
    });
  }, [players, formState.playerIds]);

  const validate = () => {
    const nextErrors = {};

    if (!formState.playerIds || formState.playerIds.length === 0) {
      nextErrors.playerIds = t('loanModal.validation.playersRequired');
    }
    if (!formState.receivingTeamName.trim()) {
      nextErrors.receivingTeamName = t('loanModal.validation.receivingTeamRequired');
    } else if (formState.receivingTeamName.trim().length > 200) {
      nextErrors.receivingTeamName = t('loanModal.validation.receivingTeamMaxLength');
    }
    if (!formState.loanDate) {
      nextErrors.loanDate = t('loanModal.validation.loanDateRequired');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await onSave({
        playerIds: formState.playerIds,
        receivingTeamName: formState.receivingTeamName.trim(),
        loanDate: formState.loanDate
      });
      onClose();
    } catch (error) {
      console.error('Player loan save error:', error);
      setErrors({
        general: error?.message || t('loanModal.validation.saveFailed')
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
              <Repeat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {isEditMode ? t('loanModal.header.titleEdit') : t('loanModal.header.titleNew')}
              </h2>
              <p className="text-sm text-slate-400">
                {isEditMode ? t('loanModal.header.subtitleEdit') : t('loanModal.header.subtitleNew')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label={t('loanModal.header.closeLabel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.general && (
            <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
              <p className="text-rose-200 text-sm">{errors.general}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('loanModal.form.labels.players')}
            </label>
            <MultiSelect
              value={formState.playerIds}
              onChange={(value) => handleChange('playerIds', value)}
              options={playerOptions}
              placeholder={t('loanModal.form.placeholders.players')}
              disabled={loading}
            />
            {errors.playerIds && (
              <p className="mt-1 text-sm text-rose-400">{errors.playerIds}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('loanModal.form.labels.receivingTeam')}
            </label>
            <Input
              value={formState.receivingTeamName}
              onChange={(e) => handleChange('receivingTeamName', e.target.value)}
              placeholder={t('loanModal.form.placeholders.receivingTeam')}
              disabled={loading}
              className={errors.receivingTeamName ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            {errors.receivingTeamName && (
              <p className="mt-1 text-sm text-rose-400">{errors.receivingTeamName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('loanModal.form.labels.loanDate')}
            </label>
            <Input
              type="date"
              value={formState.loanDate}
              onChange={(e) => handleChange('loanDate', e.target.value)}
              disabled={loading}
              className={errors.loanDate ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            {errors.loanDate && (
              <p className="mt-1 text-sm text-rose-400">{errors.loanDate}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={loading}
            >
              {t('loanModal.buttons.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? t('loanModal.buttons.saving') : isEditMode ? t('loanModal.buttons.saveChanges') : t('loanModal.buttons.recordLoan')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
