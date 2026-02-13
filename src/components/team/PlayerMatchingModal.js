import React, { useState, useMemo } from 'react';
import { Button, Select } from '../shared/UI';
import { Alert } from '../shared/Alert';
import { Card } from '../shared/Card';
import { FormGroup } from '../shared/FormGroup';
import { Link } from 'lucide-react';
import { ModalShell } from '../shared/ModalShell';
import { matchPlayerToConnectedPlayer } from '../../services/connectorService';
import { useTranslation } from 'react-i18next';

/**
 * Modal for manually matching a roster player to an unmatched connected_player record
 *
 * @param {Object} rosterPlayer - The roster player whose broken link was clicked
 * @param {Array} unmatchedExternalPlayers - List of unmatched connected_player records to choose from
 * @param {Function} onClose - Close modal callback
 * @param {Function} onMatched - Success callback after matching
 */
export function PlayerMatchingModal({ rosterPlayer, unmatchedExternalPlayers, onClose, onMatched }) {
  const { t } = useTranslation('team');
  const [selectedExternalPlayerId, setSelectedExternalPlayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Convert to select options
  const attendanceOptions = useMemo(() => {
    return [
      { value: '', label: t('playerMatching.selectProvider') },
      ...unmatchedExternalPlayers.map(record => {
        const label = `${record.playerNameInProvider} (${record.providerName})`;

        return {
          value: record.externalPlayerId,
          label
        };
      })
    ];
  }, [unmatchedExternalPlayers, t]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedExternalPlayerId) {
      setError(t('playerMatching.errors.selectPlayer'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const matchedRecord = unmatchedExternalPlayers.find(
        (record) => record.externalPlayerId === selectedExternalPlayerId
      );

      await matchPlayerToConnectedPlayer(selectedExternalPlayerId, rosterPlayer.id);

      // Call success callback with context so parent can update state optimistically
      if (onMatched) {
        await onMatched(matchedRecord || null, rosterPlayer);
      }

      onClose();
    } catch (err) {
      console.error('Error matching player:', err);
      setError(err.message || t('playerMatching.errors.matchFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!rosterPlayer) return null;

  return (
    <ModalShell
      title={t('playerMatching.title')}
      subtitle={t('playerMatching.subtitle')}
      icon={Link}
      iconColor="amber"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <Alert variant="error">{error}</Alert>
          )}

          {/* Roster Player Info */}
          <Card variant="subtle">
            <h3 className="text-sm font-medium text-slate-300 mb-2">{t('playerMatching.rosterPlayer')}</h3>
            <div className="text-lg font-semibold text-slate-100">
              {rosterPlayer.jersey_number && `#${rosterPlayer.jersey_number} - `}
              {rosterPlayer.display_name}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {rosterPlayer.first_name} {rosterPlayer.last_name}
            </div>
          </Card>

          {/* Provider Player Selection */}
          <FormGroup label={t('playerMatching.selectProviderLabel')}>
            <Select
              name="provider_player"
              value={selectedExternalPlayerId}
              onChange={(value) => {
                setSelectedExternalPlayerId(value);
                setError(null);
              }}
              options={attendanceOptions}
              disabled={loading}
              error={!!error}
            />
            <p className="mt-2 text-xs text-slate-400">
              {t('playerMatching.selectProviderHelp')}
            </p>
          </FormGroup>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-600">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={loading}
            >
              {t('playerMatching.buttons.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !selectedExternalPlayerId}
              Icon={Link}
            >
              {loading ? t('playerMatching.buttons.matching') : t('playerMatching.buttons.matchPlayer')}
            </Button>
          </div>
      </form>
    </ModalShell>
  );
}
