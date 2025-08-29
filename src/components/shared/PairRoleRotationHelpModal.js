import React from 'react';
import { X, Shield, Sword } from 'lucide-react';

export default function PairRoleRotationHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-sky-100">Pair Role Rotation Options</h2>
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
                  Players maintain their defender/attacker roles for the entire period
                </div>
              </div>

              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-sky-100 mb-3">Timeline Example</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Time →</span>
                    <div className="flex space-x-2 text-slate-400">
                      <span>0-5min</span>
                      <span>5-10min</span>
                      <span>10-15min</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-300 text-xs w-12">P1:</span>
                    <div className="flex space-x-1">
                      <div className="flex items-center bg-blue-600 px-2 py-1 rounded text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        D
                      </div>
                      <div className="flex items-center bg-blue-600 px-2 py-1 rounded text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        D
                      </div>
                      <div className="flex items-center bg-blue-600 px-2 py-1 rounded text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        D
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-300 text-xs w-12">P2:</span>
                    <div className="flex space-x-1">
                      <div className="flex items-center bg-red-600 px-2 py-1 rounded text-xs">
                        <Sword className="h-3 w-3 mr-1" />
                        A
                      </div>
                      <div className="flex items-center bg-red-600 px-2 py-1 rounded text-xs">
                        <Sword className="h-3 w-3 mr-1" />
                        A
                      </div>
                      <div className="flex items-center bg-red-600 px-2 py-1 rounded text-xs">
                        <Sword className="h-3 w-3 mr-1" />
                        A
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-200 mb-2">Benefits</h4>
                <ul className="text-xs text-green-100 space-y-1">
                  <li>• Role consistency builds confidence</li>
                  <li>• Easier for young players to focus</li>
                  <li>• Players master one position</li>
                  <li>• Simpler tactical communication</li>
                </ul>
              </div>

              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-200 mb-2">Best For</h4>
                <ul className="text-xs text-amber-100 space-y-1">
                  <li>• Younger players (U8-U10)</li>
                  <li>• Teams learning formations</li>
                  <li>• Players with clear preferences</li>
                  <li>• Tournament situations</li>
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
                  Players swap defender/attacker roles each time the pair is substituted
                </div>
              </div>

              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-sky-100 mb-3">Timeline Example</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Time →</span>
                    <div className="flex space-x-2 text-slate-400">
                      <span>0-5min</span>
                      <span>5-10min</span>
                      <span>10-15min</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-300 text-xs w-12">P1:</span>
                    <div className="flex space-x-1">
                      <div className="flex items-center bg-blue-600 px-2 py-1 rounded text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        D
                      </div>
                      <div className="flex items-center bg-red-600 px-2 py-1 rounded text-xs">
                        <Sword className="h-3 w-3 mr-1" />
                        A
                      </div>
                      <div className="flex items-center bg-blue-600 px-2 py-1 rounded text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        D
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-300 text-xs w-12">P2:</span>
                    <div className="flex space-x-1">
                      <div className="flex items-center bg-red-600 px-2 py-1 rounded text-xs">
                        <Sword className="h-3 w-3 mr-1" />
                        A
                      </div>
                      <div className="flex items-center bg-blue-600 px-2 py-1 rounded text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        D
                      </div>
                      <div className="flex items-center bg-red-600 px-2 py-1 rounded text-xs">
                        <Sword className="h-3 w-3 mr-1" />
                        A
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-200 mb-2">Benefits</h4>
                <ul className="text-xs text-green-100 space-y-1">
                  <li>• Develops both attacking & defending skills</li>
                  <li>• Keeps players more engaged</li>
                  <li>• Better tactical understanding</li>
                  <li>• More balanced skill development</li>
                </ul>
              </div>

              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-200 mb-2">Best For</h4>
                <ul className="text-xs text-amber-100 space-y-1">
                  <li>• Older players (U12+)</li>
                  <li>• Skill development focus</li>
                  <li>• Well-rounded players</li>
                  <li>• Practice sessions</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <div className="bg-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-sky-100 mb-2">💡 Coaching Tip</h4>
              <p className="text-xs text-slate-300">
                You can change this setting between periods! Try "Keep roles" for the first period to 
                let players get comfortable, then switch to "Swap roles" in later periods for more variety.
              </p>
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