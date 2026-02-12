import React from 'react';
import { Button, Input } from '../../shared/UI';
import { ModalShell } from '../../shared/ModalShell';
import { AUTO_SELECT_STRATEGY } from '../../../constants/planMatchesConstants';
import { useTranslation } from 'react-i18next';

export function AutoSelectModal({
  isOpen,
  matches,
  autoSelectMatches,
  rosterCount,
  targetCounts,
  autoSelectSettings,
  onUpdateTargetCount,
  onUpdateSettings,
  onCancel,
  onConfirm,
  formatSchedule
}) {
  const { t } = useTranslation('team');

  if (!isOpen) {
    return null;
  }

  const isMultiMatch = matches.length > 1;

  return (
    <ModalShell
      title={t('planMatches.autoSelect.title')}
      onClose={onCancel}
    >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-200">
              {isMultiMatch ? t('planMatches.autoSelect.squadSizeMulti') : t('planMatches.autoSelect.squadSizeSingle')}
            </div>
            <div className="space-y-2">
              {autoSelectMatches.map((match) => (
                <div key={match.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-100">{match.opponent}</div>
                    <div className="text-xs text-slate-400">{formatSchedule(match.matchDate, match.matchTime)}</div>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="0"
                      max={rosterCount}
                      value={targetCounts[match.id] ?? ''}
                      onChange={(event) => onUpdateTargetCount(match.id, event.target.value)}
                      className="text-xs py-1 px-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isMultiMatch && (
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={autoSelectSettings.ensureCoverage}
                onChange={(event) => onUpdateSettings({
                  ...autoSelectSettings,
                  ensureCoverage: event.target.checked
                })}
                className="h-4 w-4 rounded border-slate-500 text-sky-500 focus:ring-sky-500"
              />
              {t('planMatches.autoSelect.ensureCoverage')}
            </label>
          )}
          {isMultiMatch && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="auto-select-strategy"
                  checked={autoSelectSettings.metric === AUTO_SELECT_STRATEGY.PRACTICES}
                  onChange={() => onUpdateSettings({
                    ...autoSelectSettings,
                    metric: AUTO_SELECT_STRATEGY.PRACTICES
                  })}
                  className="h-4 w-4 border-slate-500 text-sky-500 focus:ring-sky-500"
                />
                {t('planMatches.autoSelect.prioritizePractices')}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="auto-select-strategy"
                  checked={autoSelectSettings.metric === AUTO_SELECT_STRATEGY.ATTENDANCE}
                  onChange={() => onUpdateSettings({
                    ...autoSelectSettings,
                    metric: AUTO_SELECT_STRATEGY.ATTENDANCE
                  })}
                  className="h-4 w-4 border-slate-500 text-sky-500 focus:ring-sky-500"
                />
                {t('planMatches.autoSelect.prioritizeAttendance')}
              </label>
            </div>
          )}
        </div>
        <div className="pt-4 border-t border-slate-600 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            {t('planMatches.autoSelect.cancel')}
          </Button>
          <Button variant="accent" onClick={onConfirm}>
            {t('planMatches.autoSelect.apply')}
          </Button>
        </div>
    </ModalShell>
  );
}
