import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Input } from './UI';
import { ModalShell } from './ModalShell';
import { sanitizeNameInput } from '../../utils/inputSanitization';

export function AddPlayerModal({ isOpen, onClose, onAddPlayer }) {
  const { t } = useTranslation('modals');
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      onAddPlayer(playerName.trim());
      setPlayerName('');
      onClose();
    }
  };

  const handleCancel = () => {
    setPlayerName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      title={t('addTemporaryPlayer.title')}
      onClose={handleCancel}
    >
        <p className="text-sm text-slate-400 mb-4">
          {t('addTemporaryPlayer.description')}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-2">
              {t('addTemporaryPlayer.playerNameLabel')}
            </label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(sanitizeNameInput(e.target.value))}
              placeholder={t('addTemporaryPlayer.playerNamePlaceholder')}
              maxLength={50}
              autoFocus
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-slate-300 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 rounded"
            >
              {t('addTemporaryPlayer.cancel')}
            </button>
            <button
              type="submit"
              disabled={!playerName.trim()}
              className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('addTemporaryPlayer.addPlayer')}
            </button>
          </div>
        </form>
    </ModalShell>
  );
}

AddPlayerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddPlayer: PropTypes.func.isRequired,
};
