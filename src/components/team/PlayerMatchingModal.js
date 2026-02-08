import React, { useState, useMemo } from 'react';
import { Button, Select } from '../shared/UI';
import { Link, X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{t('playerMatching.title')}</h2>
              <p className="text-sm text-slate-400">{t('playerMatching.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
              <p className="text-rose-200 text-sm">{error}</p>
            </div>
          )}

          {/* Roster Player Info */}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2">{t('playerMatching.rosterPlayer')}</h3>
            <div className="text-lg font-semibold text-slate-100">
              {rosterPlayer.jersey_number && `#${rosterPlayer.jersey_number} - `}
              {rosterPlayer.display_name}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {rosterPlayer.first_name} {rosterPlayer.last_name}
            </div>
          </div>

          {/* Provider Player Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('playerMatching.selectProviderLabel')}
            </label>
            <Select
              name="provider_player"
              value={selectedExternalPlayerId}
              onChange={(value) => {
                setSelectedExternalPlayerId(value);
                setError(null);
              }}
              options={attendanceOptions}
              disabled={loading}
              className={error ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            <p className="mt-2 text-xs text-slate-400">
              {t('playerMatching.selectProviderHelp')}
            </p>
          </div>

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
      </div>
    </div>
  );
}
