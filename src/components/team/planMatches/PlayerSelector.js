import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Ban } from 'lucide-react';
import { Tooltip, CoachChip } from '../../shared';
import { useTranslation } from 'react-i18next';
import { AUTO_SELECT_STRATEGY } from '../../../constants/planMatchesConstants';

export function PlayerSelector({
  players,
  selectedIds,
  unavailableIds,
  providerUnavailableIds,
  onToggleSelect,
  onToggleUnavailable,
  isSelectedInOtherMatch,
  isSelectedAndOnlyAvailableHere,
  emptyMessage,
  sortMetric
}) {
  const { t } = useTranslation('team');
  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const unavailableSet = useMemo(() => new Set(unavailableIds || []), [unavailableIds]);
  const providerUnavailableSet = useMemo(() => new Set(providerUnavailableIds || []), [providerUnavailableIds]);

  if (!players || players.length === 0) {
    return (
      <div className="rounded border border-slate-700 bg-slate-900/30 px-2 py-2 text-xs text-slate-400">
        {emptyMessage || t('planMatches.playerSelector.noPlayers')}
      </div>
    );
  }

  return (
    <div className="space-y-1 pr-1">
      {players.map((player) => {
        const isUnavailable = unavailableSet.has(player.id);
        const isProviderUnavailable = providerUnavailableSet.has(player.id);
        const isProviderOverrideActive = isProviderUnavailable && !isUnavailable;
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
              {player.relatedUser?.name && <CoachChip name={player.relatedUser.name} size="sm" />}
              {sortMetric === AUTO_SELECT_STRATEGY.ATTENDANCE
                ? <span>{player.attendanceRate.toFixed(0)}%</span>
                : <Tooltip content={t('planMatches.playerSelector.practicesTooltip')} position="top" trigger="hover" className="inline-flex">
                    <span>{player.practicesPerMatch.toFixed(2)}</span>
                  </Tooltip>
              }
              {onToggleUnavailable && (
                isProviderUnavailable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleUnavailable(player.id);
                    }}
                    className={`rounded p-1 inline-flex items-center ${
                      isProviderOverrideActive
                        ? 'text-amber-300 hover:text-amber-200'
                        : 'text-rose-200 hover:text-rose-100'
                    }`}
                    title={isProviderOverrideActive
                      ? t('planMatches.playerSelector.markUnavailable')
                      : t('planMatches.playerSelector.markAvailable')}
                    aria-label={isProviderOverrideActive
                      ? t('planMatches.playerSelector.markUnavailable')
                      : t('planMatches.playerSelector.markAvailable')}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                ) : (
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
                    title={isUnavailable ? t('planMatches.playerSelector.markAvailable') : t('planMatches.playerSelector.markUnavailable')}
                    aria-label={isUnavailable ? t('planMatches.playerSelector.markAvailable') : t('planMatches.playerSelector.markUnavailable')}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

PlayerSelector.propTypes = {
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      displayName: PropTypes.string.isRequired,
      jerseyNumber: PropTypes.number,
      practicesPerMatch: PropTypes.number,
      attendanceRate: PropTypes.number,
      relatedUser: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string
      })
    })
  ),
  selectedIds: PropTypes.arrayOf(PropTypes.number),
  unavailableIds: PropTypes.arrayOf(PropTypes.number),
  providerUnavailableIds: PropTypes.arrayOf(PropTypes.number),
  onToggleSelect: PropTypes.func.isRequired,
  onToggleUnavailable: PropTypes.func,
  isSelectedInOtherMatch: PropTypes.func,
  isSelectedAndOnlyAvailableHere: PropTypes.func,
  emptyMessage: PropTypes.string,
  sortMetric: PropTypes.string
};
