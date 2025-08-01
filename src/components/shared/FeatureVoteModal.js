import React from 'react';
import { X, ThumbsUp, Info } from 'lucide-react';
import { Button } from './UI';

const FeatureVoteModal = ({ isOpen, onClose, onConfirm, featureName, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-6">
          <div className="flex items-start">
            <div className="p-2 bg-sky-500/20 rounded-full mr-4">
              <Info className="w-6 h-6 text-sky-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-sky-200 mb-2">Feature Coming Soon!</h2>
              <p className="text-slate-300 mb-4">
                The "{featureName}" formation is not yet implemented. You can vote for it to be prioritized.
              </p>
              <div className="text-xs text-slate-400 mb-6">
                {children}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex justify-end space-x-3 mt-2">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button onClick={onConfirm} Icon={ThumbsUp}>
              Vote for {featureName}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureVoteModal;