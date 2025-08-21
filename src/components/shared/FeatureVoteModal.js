import React from 'react';
import { X, ThumbsUp, Info, CheckCircle, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from './UI';

const FeatureVoteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  featureName, 
  loading = false,
  error = null,
  successMessage = null,
  infoMessage = null,
  isAuthenticated = false,
  authModal = null,
  children 
}) => {
  if (!isOpen) return null;

  const handleAuthRequired = () => {
    if (authModal) {
      authModal.current?.showModal();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-6">
          <div className="flex items-start">
            <div className={`p-2 rounded-full mr-4 ${
              successMessage ? 'bg-emerald-500/20' :
              infoMessage ? 'bg-sky-500/20' :
              error ? 'bg-rose-500/20' :
              'bg-sky-500/20'
            }`}>
              {successMessage ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : infoMessage ? (
                <CheckCircle className="w-6 h-6 text-sky-400" />
              ) : error ? (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              ) : (
                <Info className="w-6 h-6 text-sky-400" />
              )}
            </div>
            <div className="flex-1">
              {successMessage ? (
                <div>
                  <h2 className="text-xl font-bold text-emerald-200 mb-2">Vote Recorded!</h2>
                  <p className="text-emerald-100 mb-4">{successMessage}</p>
                </div>
              ) : infoMessage ? (
                <div>
                  <h2 className="text-xl font-bold text-sky-200 mb-2">Vote Already Recorded</h2>
                  <p className="text-sky-100 mb-4">{infoMessage}</p>
                </div>
              ) : error ? (
                <div>
                  <h2 className="text-xl font-bold text-rose-200 mb-2">Vote Failed</h2>
                  <p className="text-rose-100 mb-4">{error}</p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-sky-200 mb-2">Feature Coming Soon!</h2>
                  <p className="text-slate-300 mb-4">
                    The "{featureName}" formation is not yet implemented. You can vote for it to be prioritized.
                  </p>
                  <div className="text-xs text-slate-400 mb-6">
                    {children}
                  </div>
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-2">
            <Button onClick={onClose} variant="secondary">
              {successMessage || infoMessage ? 'Close' : 'Cancel'}
            </Button>
            
            {/* Only show vote button if not already successful and no critical error */}
            {!successMessage && !infoMessage && (
              <>
                {!isAuthenticated ? (
                  <Button onClick={handleAuthRequired} Icon={LogIn}>
                    Sign In to Vote
                  </Button>
                ) : (
                  <Button 
                    onClick={onConfirm} 
                    Icon={loading ? undefined : ThumbsUp}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : `Vote for ${featureName}`}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureVoteModal;