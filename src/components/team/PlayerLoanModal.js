import React, { useEffect, useMemo, useState } from 'react';
import { Repeat } from 'lucide-react';
import { ModalShell } from '../shared/ModalShell';
import { useTranslation } from 'react-i18next';
import { Button, Input, MultiSelect } from '../shared/UI';
import { Alert } from '../shared/Alert';
import { FormGroup } from '../shared/FormGroup';
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
    <ModalShell
      title={isEditMode ? t('loanModal.header.titleEdit') : t('loanModal.header.titleNew')}
      subtitle={isEditMode ? t('loanModal.header.subtitleEdit') : t('loanModal.header.subtitleNew')}
      icon={Repeat}
      iconColor="sky"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <Alert variant="error">{errors.general}</Alert>
          )}

          <FormGroup label={t('loanModal.form.labels.players')} error={errors.playerIds}>
            <MultiSelect
              value={formState.playerIds}
              onChange={(value) => handleChange('playerIds', value)}
              options={playerOptions}
              placeholder={t('loanModal.form.placeholders.players')}
              disabled={loading}
            />
          </FormGroup>

          <FormGroup label={t('loanModal.form.labels.receivingTeam')} error={errors.receivingTeamName}>
            <Input
              value={formState.receivingTeamName}
              onChange={(e) => handleChange('receivingTeamName', e.target.value)}
              placeholder={t('loanModal.form.placeholders.receivingTeam')}
              disabled={loading}
              error={!!errors.receivingTeamName}
            />
          </FormGroup>

          <FormGroup label={t('loanModal.form.labels.loanDate')} error={errors.loanDate}>
            <Input
              type="date"
              value={formState.loanDate}
              onChange={(e) => handleChange('loanDate', e.target.value)}
              disabled={loading}
              error={!!errors.loanDate}
            />
          </FormGroup>

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
    </ModalShell>
  );
}
