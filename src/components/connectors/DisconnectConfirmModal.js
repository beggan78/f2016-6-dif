import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { AlertTriangle, X, Unplug } from 'lucide-react';
import { getProviderById } from '../../constants/connectorProviders';

export function DisconnectConfirmModal({ isOpen, onClose, connector, onConfirm }) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !connector) return null;

  const provider = getProviderById(connector.provider);
  const providerName = provider?.name || connector.provider;

  const handleConfirm = async () => {
    try {
      setIsDisconnecting(true);
      setError(null);
      await onConfirm();
      // Modal will be closed by parent component after successful disconnect
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError(err.message || 'Failed to disconnect provider');
      setIsDisconnecting(false);
    }
  };

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
              <h2 className="text-lg font-semibold text-slate-100">Disconnect {providerName}?</h2>
              <p className="text-sm text-slate-400">
                This will stop automatic synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            disabled={isDisconnecting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning Message */}
          <div className="bg-rose-900/20 border border-rose-600 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-rose-200 font-medium">
                  Are you sure you want to disconnect {providerName}?
                </p>
                <ul className="text-rose-300 text-sm space-y-1">
                  <li>• Automatic data synchronization will stop</li>
                  <li>• Stored credentials will be removed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reassurance */}
          <div className="bg-slate-700 border border-slate-600 rounded-lg p-4 mb-6">
            <ul className="text-slate-200 text-sm space-y-1">
              <li>• Existing attendance and match data will be preserved</li>
              <li>• You can reconnect at any time</li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3 mb-4">
              <p className="text-rose-200 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={handleConfirm}
              variant="danger"
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
              Icon={Unplug}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
