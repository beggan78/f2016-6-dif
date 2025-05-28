import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Zap, RotateCcw, Square } from 'lucide-react';
import { Button } from './UI';

export function GameScreen({ 
  currentPeriodNumber, 
  periodFormation, 
  allPlayers, 
  matchTimerSeconds, 
  subTimerSeconds, 
  formatTime, 
  handleSubstitution, 
  handleEndPeriod, 
  nextPhysicalPairToSubOut 
}) {
  const getPlayerName = (id) => allPlayers.find(p => p.id === id)?.name || 'N/A';

  const renderPair = (pairKey, pairName) => {
    const pairData = periodFormation[pairKey];
    if (!pairData) return null;
    const isNextOff = pairKey === nextPhysicalPairToSubOut && pairKey !== 'subPair';
    const isNextOn = pairKey === 'subPair';

    let bgColor = 'bg-slate-700'; // Default for subs or if logic is off
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';

    if (pairKey === 'leftPair' || pairKey === 'rightPair') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn) {
      borderColor = 'border-emerald-500';
    }

    return (
      <div className={`p-3 rounded-lg shadow-md transition-all border-2 ${borderColor} ${bgColor} ${textColor}`}>
        <h3 className="text-base font-semibold mb-1.5 flex items-center justify-between">
          {pairName}
          <div>
            {isNextOff && <ArrowDownCircle className="h-6 w-6 text-rose-400 inline-block" />}
            {isNextOn && <ArrowUpCircle className="h-6 w-6 text-emerald-400 inline-block" />}
          </div>
        </h3>
        <p><Shield className="inline h-4 w-4 mr-1" /> D: {getPlayerName(pairData.defender)}</p>
        <p><Zap className="inline h-4 w-4 mr-1" /> A: {getPlayerName(pairData.attacker)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-300 text-center">Period {currentPeriodNumber} In Progress</h2>

      {/* Timers */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-slate-700 rounded-lg">
          <p className="text-sm text-sky-200 mb-1">Match Clock</p>
          <p className="text-3xl font-mono text-sky-400">{formatTime(matchTimerSeconds)}</p>
        </div>
        <div className="p-3 bg-slate-700 rounded-lg">
          <p className="text-sm text-sky-200 mb-1">Substitution Timer</p>
          <p className="text-3xl font-mono text-emerald-400">{formatTime(subTimerSeconds)}</p>
        </div>
      </div>

      {/* Field & Subs Visualization */}
      <div className="p-2 bg-slate-700 rounded-lg">
        <p className="text-center my-1 text-sky-200">Goalie: <span className="font-semibold">{getPlayerName(periodFormation.goalie)}</span></p>
      </div>
      <div className="space-y-3">
        {renderPair('leftPair', 'Left Pair (Field)')}
        {renderPair('rightPair', 'Right Pair (Field)')}
        {renderPair('subPair', 'Substitutes')}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Button onClick={handleSubstitution} Icon={RotateCcw} className="flex-1">
          SUB NOW
        </Button>
        <Button onClick={handleEndPeriod} Icon={Square} variant="danger" className="flex-1">
          End Period
        </Button>
      </div>
    </div>
  );
}