import React, { useMemo } from 'react';
import { Button } from '../../shared/UI';
import { Tooltip } from '../../shared';
import { PlayerSelector } from './PlayerSelector';
import { PRACTICES_TOOLTIP } from '../../../constants/planMatchesConstants';

export function MatchCard({
  match,
  roster,
  rosterById,
  selectedIds,
  unavailableIds,
  planningStatus,
  canPlan,
  isSelectedInOtherMatch,
  onPlanMatch,
  onToggleSelect,
  onToggleUnavailable,
  formatSchedule,
  isPlayerInMultipleMatches
}) {
  const unavailableSet = useMemo(() => new Set(unavailableIds || []), [unavailableIds]);
  const displayRoster = useMemo(() => {
    return [
      ...(roster || []).filter(player => !unavailableSet.has(player.id)),
      ...(roster || []).filter(player => unavailableSet.has(player.id))
    ];
  }, [roster, unavailableSet]);

  const plannedState = planningStatus || null;
  const isPlanning = plannedState === 'loading';
  const isPlanned = plannedState === 'done';

  const selectedPlayers = useMemo(() => {
    return (selectedIds || [])
      .map((playerId) => rosterById.get(playerId))
      .filter(Boolean);
  }, [rosterById, selectedIds]);

  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2 items-start">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPlanned ? 'secondary' : 'accent'}
            onClick={onPlanMatch}
            disabled={isPlanning || isPlanned || !canPlan}
            className="px-2"
          >
            {isPlanning ? 'Saving...' : isPlanned ? 'Saved' : 'Save'}
          </Button>
        </div>

        <div className="flex items-center justify-end gap-3 min-w-0 text-right">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{match.opponent}</div>
            <div className="text-xs text-slate-400">{formatSchedule(match.matchDate, match.matchTime)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Roster</span>
            <span>{roster.length}</span>
          </div>
          <PlayerSelector
            players={displayRoster}
            selectedIds={selectedIds}
            unavailableIds={unavailableIds}
            onToggleSelect={onToggleSelect}
            onToggleUnavailable={onToggleUnavailable}
            isSelectedInOtherMatch={isSelectedInOtherMatch}
            practicesTooltip={PRACTICES_TOOLTIP}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Selected</span>
            <span>{selectedIds.length}</span>
          </div>
          <div className="space-y-1 pr-1">
            {selectedPlayers.map((player) => (
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
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-xs cursor-pointer ${
                  isPlayerInMultipleMatches(player.id)
                    ? 'border-2 border-sky-400 bg-sky-900/20 text-sky-100 shadow-lg shadow-sky-500/60'
                    : 'border border-sky-500/60 bg-sky-900/20 text-sky-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{player.displayName}</span>
                  {player.jerseyNumber && (
                    <span className="text-[10px] text-sky-200/70">#{player.jerseyNumber}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-sky-100/80">
                  <Tooltip content={PRACTICES_TOOLTIP} position="top" trigger="hover" className="inline-flex">
                    <span>{player.practicesPerMatch.toFixed(2)}</span>
                  </Tooltip>
                  <span>{player.attendanceRate.toFixed(1)}%</span>
                </div>
              </div>
            ))}
            {selectedPlayers.length === 0 && (
              <div className="rounded border border-slate-700 bg-slate-900/30 px-2 py-2 text-xs text-slate-400">
                Empty.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
