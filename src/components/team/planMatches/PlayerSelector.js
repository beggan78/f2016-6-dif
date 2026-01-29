import React, { useMemo } from 'react';
import { Ban } from 'lucide-react';
import { Tooltip } from '../../shared';

export function PlayerSelector({
  players,
  selectedIds,
  unavailableIds,
  onToggleSelect,
  onToggleUnavailable,
  isSelectedInOtherMatch,
  practicesTooltip,
  emptyMessage
}) {
  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const unavailableSet = useMemo(() => new Set(unavailableIds || []), [unavailableIds]);

  if (!players || players.length === 0) {
    return (
      <div className="rounded border border-slate-700 bg-slate-900/30 px-2 py-2 text-xs text-slate-400">
        {emptyMessage || 'No roster players.'}
      </div>
    );
  }

  return (
    <div className="space-y-1 pr-1">
      {players.map((player) => {
        const isUnavailable = unavailableSet.has(player.id);
        const isSelected = selectedSet.has(player.id);
        const isSelectedElsewhere = isSelectedInOtherMatch ? isSelectedInOtherMatch(player.id) : false;

        return (
          <div
            key={player.id}
            role="button"
            tabIndex={0}
            onClick={() => onToggleSelect(player.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onToggleSelect(player.id);
              }
            }}
            className={`flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs transition-colors ${
              isUnavailable
                ? 'border-rose-500/40 bg-rose-900/20 text-rose-200 opacity-70 cursor-not-allowed'
                : isSelected
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-50 cursor-pointer'
                  : isSelectedElsewhere
                    ? 'border-indigo-400/60 bg-indigo-900/20 text-indigo-100 cursor-pointer'
                    : 'border-slate-700 bg-slate-900/30 text-slate-200 hover:border-slate-500 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isUnavailable && <Ban className="h-3.5 w-3.5 text-rose-300" />}
              <span className="truncate">{player.displayName}</span>
              {player.jerseyNumber && (
                <span className="text-[10px] text-slate-400">#{player.jerseyNumber}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
              <Tooltip content={practicesTooltip} position="top" trigger="hover" className="inline-flex">
                <span>{player.practicesPerMatch.toFixed(2)}</span>
              </Tooltip>
              <span>{player.attendanceRate.toFixed(1)}%</span>
              {onToggleUnavailable && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleUnavailable(player.id);
                  }}
                  className={`rounded p-1 ${
                    isUnavailable
                      ? 'text-rose-200 hover:text-rose-100'
                      : 'text-slate-400 hover:text-rose-200'
                  }`}
                  title={isUnavailable ? 'Mark available' : 'Mark unavailable'}
                  aria-label={isUnavailable ? 'Mark available' : 'Mark unavailable'}
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
