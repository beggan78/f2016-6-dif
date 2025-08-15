import React from 'react';
import { Button } from '../shared/UI';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export function DeletePlayerConfirmModal({ player, hasGameHistory, onClose, onConfirm }) {
  if (!player) return null;

  const willBeDeleted = !hasGameHistory;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Remove Player</h2>
              <p className="text-sm text-slate-400">
                {willBeDeleted ? 'This player will be permanently deleted' : 'This player will be deactivated'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Player Info */}
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-sky-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-slate-100 font-medium">{player.name}</h3>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  {player.jersey_number && (
                    <span className="flex items-center">
                      <span className="text-amber-400 mr-1">#</span>
                      {player.jersey_number}
                    </span>
                  )}
                  <span className={player.on_roster ? 'text-emerald-400' : 'text-slate-400'}>
                    {player.on_roster ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-rose-900/20 border border-rose-600 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-rose-200 font-medium">
                  Are you sure you want to remove this player?
                </p>
                {willBeDeleted ? (
                  <ul className="text-rose-300 text-sm space-y-1">
                    <li>• Player has no game history and will be <strong>permanently deleted</strong></li>
                    <li>• Jersey number will become available for other players</li>
                    <li>• This action cannot be undone</li>
                  </ul>
                ) : (
                  <ul className="text-rose-300 text-sm space-y-1">
                    <li>• Player has game history and will be <strong>deactivated</strong> (set as inactive)</li>
                    <li>• All match statistics and history will be preserved</li>
                    <li>• Jersey number will become available for other players</li>
                    <li>• Player can be reactivated later if needed</li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={onConfirm}
              variant="danger"
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
              Icon={Trash2}
            >
              {willBeDeleted ? 'Delete Player' : 'Deactivate Player'}
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}