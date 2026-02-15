import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '../shared/UI';
import { Alert } from '../shared/Alert';
import { FormGroup } from '../shared/FormGroup';
import { UserPlus } from 'lucide-react';
import { ModalShell } from '../shared/ModalShell';

export function AddRosterPlayerModal({ team, onClose, onPlayerAdded, getAvailableJerseyNumbers, getTeamMembers }) {
  const { t } = useTranslation('team');
  const [playerData, setPlayerData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    jersey_number: '',
    related_to: '',
    on_roster: true
  });
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Load available jersey numbers
  useEffect(() => {
    const loadAvailableNumbers = async () => {
      if (team?.id && getAvailableJerseyNumbers) {
        const numbers = await getAvailableJerseyNumbers(team.id);
        setAvailableNumbers(numbers);
      }
    };
    loadAvailableNumbers();
  }, [team?.id, getAvailableJerseyNumbers]);

  // Load team members for related_to dropdown
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (team?.id && getTeamMembers) {
        const members = await getTeamMembers(team.id);
        const coachesAndAdmins = members.filter(
          m => m.role === 'admin' || m.role === 'coach'
        );
        setTeamMembers(coachesAndAdmins);
      }
    };
    loadTeamMembers();
  }, [team?.id, getTeamMembers]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!playerData.first_name.trim()) {
      newErrors.first_name = t('addRosterPlayerModal.validation.firstNameRequired');
    } else if (playerData.first_name.trim().length < 2) {
      newErrors.first_name = t('addRosterPlayerModal.validation.firstNameMinLength');
    } else if (playerData.first_name.trim().length > 50) {
      newErrors.first_name = t('addRosterPlayerModal.validation.firstNameMaxLength');
    }

    if (playerData.last_name && playerData.last_name.trim().length > 50) {
      newErrors.last_name = t('addRosterPlayerModal.validation.lastNameMaxLength');
    }

    if (!playerData.display_name.trim()) {
      newErrors.display_name = t('addRosterPlayerModal.validation.displayNameRequired');
    } else if (playerData.display_name.trim().length < 2) {
      newErrors.display_name = t('addRosterPlayerModal.validation.displayNameMinLength');
    } else if (playerData.display_name.trim().length > 50) {
      newErrors.display_name = t('addRosterPlayerModal.validation.displayNameMaxLength');
    }

    if (playerData.jersey_number && (
      playerData.jersey_number < 1 ||
      playerData.jersey_number > 100 ||
      !availableNumbers.includes(parseInt(playerData.jersey_number))
    )) {
      newErrors.jersey_number = t('addRosterPlayerModal.validation.jerseyNumberInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await onPlayerAdded({
        first_name: playerData.first_name.trim(),
        last_name: playerData.last_name ? playerData.last_name.trim() : null,
        display_name: playerData.display_name.trim(),
        jersey_number: playerData.jersey_number ? parseInt(playerData.jersey_number) : null,
        related_to: playerData.related_to || null,
        on_roster: playerData.on_roster
      });

      // Reset form for next player
      setPlayerData({
        first_name: '',
        last_name: '',
        display_name: '',
        jersey_number: '',
        related_to: '',
        on_roster: true
      });
      setErrors({});

      // Show success message briefly
      setSuccessMessage(t('addRosterPlayerModal.success.playerAdded', { playerName: playerData.display_name.trim() }));
      setTimeout(() => setSuccessMessage(''), 2000);

      // Refresh available jersey numbers
      if (team?.id && getAvailableJerseyNumbers) {
        const numbers = await getAvailableJerseyNumbers(team.id);
        setAvailableNumbers(numbers);
      }

      // Focus back to first name input
      setTimeout(() => {
        const firstNameInput = document.querySelector('input[name="first_name"]');
        if (firstNameInput) firstNameInput.focus();
      }, 100);

    } catch (error) {
      console.error('Error adding player:', error);
      setErrors({ general: error.message || t('addRosterPlayerModal.validation.failedToAdd') });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setPlayerData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Auto-fill display name from first name when user leaves the first name field
  const handleFirstNameBlur = () => {
    if (playerData.first_name.trim() && !playerData.display_name.trim()) {
      setPlayerData(prev => ({ ...prev, display_name: prev.first_name.trim() }));
    }
  };

  // Jersey number options
  const jerseyOptions = [
    { value: '', label: t('addRosterPlayerModal.jerseyNumber.noNumber') },
    ...availableNumbers.map(num => ({
      value: num.toString(),
      label: `#${num}`
    }))
  ];

  // Related to options
  const relatedToOptions = [
    { value: '', label: t('addRosterPlayerModal.form.placeholders.relatedTo') },
    ...teamMembers.map(member => ({
      value: member.user?.id,
      label: `${member.user?.name || '?'} (${member.role})`
    }))
  ];

  return (
    <ModalShell
      title={t('addRosterPlayerModal.header.title')}
      subtitle={t('addRosterPlayerModal.header.subtitle', { teamName: team.name })}
      icon={UserPlus}
      iconColor="sky"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Success Message */}
          {successMessage && (
            <Alert variant="success">{successMessage}</Alert>
          )}

          {/* General Error */}
          {errors.general && (
            <Alert variant="error">{errors.general}</Alert>
          )}
          {/* First Name */}
          <FormGroup label={t('addRosterPlayerModal.form.labels.firstName')} error={errors.first_name}>
            <Input
              name="first_name"
              value={playerData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              onBlur={handleFirstNameBlur}
              placeholder={t('addRosterPlayerModal.form.placeholders.firstName')}
              disabled={loading}
              error={!!errors.first_name}
            />
          </FormGroup>

          {/* Last Name */}
          <FormGroup label={t('addRosterPlayerModal.form.labels.lastName')} error={errors.last_name}>
            <Input
              name="last_name"
              value={playerData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder={t('addRosterPlayerModal.form.placeholders.lastName')}
              disabled={loading}
              error={!!errors.last_name}
            />
          </FormGroup>

          {/* Display Name */}
          <FormGroup label={t('addRosterPlayerModal.form.labels.displayName')} error={errors.display_name}>
            <Input
              name="display_name"
              value={playerData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              placeholder={t('addRosterPlayerModal.form.placeholders.displayName')}
              disabled={loading}
              error={!!errors.display_name}
            />
            <p className="mt-1 text-xs text-slate-400">
              {t('addRosterPlayerModal.form.helperText.displayName')}
            </p>
          </FormGroup>

          {/* Jersey Number */}
          <FormGroup label={t('addRosterPlayerModal.form.labels.jerseyNumber')} error={errors.jersey_number}>
            <Select
              value={playerData.jersey_number}
              onChange={(value) => handleInputChange('jersey_number', value)}
              options={jerseyOptions}
              disabled={loading}
              error={!!errors.jersey_number}
            />
            {availableNumbers.length === 0 && (
              <p className="mt-1 text-sm text-amber-400">
                {t('addRosterPlayerModal.jerseyNumber.allTaken')}
              </p>
            )}
          </FormGroup>

          {/* Related To */}
          {teamMembers.length > 0 && (
            <FormGroup label={t('addRosterPlayerModal.form.labels.relatedTo')}>
              <Select
                value={playerData.related_to}
                onChange={(value) => handleInputChange('related_to', value)}
                options={relatedToOptions}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-slate-400">
                {t('addRosterPlayerModal.form.helperText.relatedTo')}
              </p>
            </FormGroup>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? t('addRosterPlayerModal.buttons.adding') : t('addRosterPlayerModal.buttons.addPlayer')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              {t('addRosterPlayerModal.buttons.cancel')}
            </Button>
          </div>
      </form>
    </ModalShell>
  );
}
