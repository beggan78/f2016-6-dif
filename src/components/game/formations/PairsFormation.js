import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Shield, Sword, Clock } from 'lucide-react';
import { getPlayerAnimationProps } from '../../../game/animation/animationSupport';
import { formatTime, formatTimeDifference } from '../../../utils/formatUtils';

export function PairsFormation({ 
  periodFormation, 
  allPlayers, 
  animationState, 
  recentlySubstitutedPlayers,
  hideNextOffIndicator,
  nextPhysicalPairToSubOut,
  longPressHandlers,
  getPlayerNameById,
  getPlayerTimeStats 
}) {
  const renderPair = (pairKey, pairDisplayName, renderIndex) => {
    const pairData = periodFormation[pairKey];
    if (!pairData) return null;

    const isNextOff = pairKey === nextPhysicalPairToSubOut;
    const isNextOn = pairKey === 'subPair';
    const canBeSelected = pairKey !== 'subPair';

    // Check if any player in this pair was recently substituted
    const hasRecentlySubstitutedPlayer = 
      recentlySubstitutedPlayers.has(pairData.defender) || 
      recentlySubstitutedPlayers.has(pairData.attacker);

    // New unified animation logic
    let animationClass = '';
    let zIndexClass = '';
    let styleProps = {};
    
    // Get animation properties for defender or attacker (either one moving affects the pair)
    const defenderAnimationProps = getPlayerAnimationProps(pairData.defender, animationState);
    const attackerAnimationProps = getPlayerAnimationProps(pairData.attacker, animationState);
    
    // Use the animation props from whichever player is moving
    const animationProps = defenderAnimationProps || attackerAnimationProps;
    if (animationProps) {
      animationClass = animationProps.animationClass;
      zIndexClass = animationProps.zIndexClass;
      styleProps = animationProps.styleProps;
    }

    let bgColor = 'bg-slate-700'; // Default for subs or if logic is off
    let textColor = 'text-slate-300';
    let borderColor = 'border-transparent';
    let glowClass = '';

    if (pairKey === 'leftPair' || pairKey === 'rightPair') { // On field
      bgColor = 'bg-sky-700';
      textColor = 'text-sky-100';
    }

    if (isNextOff && !hideNextOffIndicator) {
      borderColor = 'border-rose-500';
    }
    if (isNextOn && !hideNextOffIndicator) {
      borderColor = 'border-emerald-500';
    }

    // Add glow effect for recently substituted players
    if (hasRecentlySubstitutedPlayer) {
      glowClass = 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400';
      borderColor = 'border-amber-400';
    }

    const longPressEvents = longPressHandlers[`${pairKey}Events`] || {};

    return (
      <div 
        key={pairKey}
        className={`p-2 rounded-lg shadow-md transition-all duration-300 border-2 ${borderColor} ${bgColor} ${textColor} ${glowClass} ${animationClass} ${zIndexClass} ${canBeSelected ? 'cursor-pointer select-none' : ''} relative`}
        style={styleProps}
        {...longPressEvents}
      >
        <h3 className="text-sm font-semibold mb-1 flex items-center justify-between">
          {pairDisplayName}
          <div>
            {isNextOff && !hideNextOffIndicator && <ArrowDownCircle className="h-5 w-5 text-rose-400 inline-block" />}
            {isNextOn && !hideNextOffIndicator && <ArrowUpCircle className="h-5 w-5 text-emerald-400 inline-block" />}
          </div>
        </h3>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <div><Shield className="inline h-3 w-3 mr-1" /> D: {getPlayerNameById(pairData.defender)}</div>
            {pairData.defender && (() => {
              const stats = getPlayerTimeStats(pairData.defender);
              return (
                <div className="text-right text-xs">
                  <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                  <span className="ml-4"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center justify-between">
            <div><Sword className="inline h-3 w-3 mr-1" /> A: {getPlayerNameById(pairData.attacker)}</div>
            {pairData.attacker && (() => {
              const stats = getPlayerTimeStats(pairData.attacker);
              return (
                <div className="text-right text-xs">
                  <span><Clock className="inline h-3 w-3" /> <span className="font-mono">{formatTime(stats.totalOutfieldTime)}</span></span>
                  <span className="ml-4"><Sword className="inline h-3 w-3" /> <span className="font-mono">{formatTimeDifference(stats.attackDefenderDiff)}</span></span>
                </div>
              );
            })()}
          </div>
        </div>
        {canBeSelected && (
          <p className="text-xs text-slate-400 mt-0.5">Hold for options</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderPair('leftPair', 'Left', 0)}
      {renderPair('rightPair', 'Right', 1)}
      {renderPair('subPair', 'Substitutes', 2)}
    </div>
  );
}