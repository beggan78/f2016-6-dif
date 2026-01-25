import React, { useState } from 'react';
import { sanitizeNameInput } from '../../utils/inputSanitization';

export function AddPlayerModal({ isOpen, onClose, onAddPlayer }) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 border border-slate-600">
        <h2 className="text-xl font-bold text-sky-400 mb-2">Add Temporary Player</h2>
        <p className="text-sm text-slate-400 mb-4">
          This player will only appear in the current match and won't be added to the team roster.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-2">
              Player Name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(sanitizeNameInput(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              placeholder="Enter player name"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={!playerName.trim()}
              className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
