import React from 'react';
import { X } from 'lucide-react';

export default function PairRoleRotationHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-sky-100">Paired Role Strategy Options</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Keep Roles Throughout Period */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-sky-200 mb-2">
                  Keep Roles Throughout Period
                </h3>
                <div className="text-sm text-slate-300 mb-4">
                  Players keep the same role every time they re-enter, even when two teammates substitute together
                </div>
              </div>

              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-200 mb-2">Benefits</h4>
                <ul className="text-xs text-green-100 space-y-1">
                  <li>• Players can focus on one role throughout the period and build confidence in that position</li>
                  <li>• Simpler for players to remember responsibilities when rotating in pairs</li>
                </ul>
              </div>
            </div>

            {/* Swap Roles Every Rotation */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-sky-200 mb-2">
                  Swap Roles Every Rotation
                </h3>
                <div className="text-sm text-slate-300 mb-4">
                  Players swap defender/attacker roles each time their pair rotates onto the field
                </div>
              </div>

              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-200 mb-2">Benefits</h4>
                <ul className="text-xs text-green-100 space-y-1">
                  <li>• Immediate fairness—each player gets equal time in both roles during the match</li>
                  <li>• Prevents players from feeling "stuck" in one role while still rotating as a pair</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
