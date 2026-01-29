import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../../shared/UI';
import { AUTO_SELECT_STRATEGY } from '../../../constants/planMatchesConstants';

export function PlanMatchesToolbar({
  sortMetric,
  onSortChange,
  statsLoading,
  statsError,
  defaultsError,
  onRecommend
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:relative">
      <div className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800/80 p-1">
        <button
          type="button"
          onClick={() => onSortChange(AUTO_SELECT_STRATEGY.PRACTICES)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
            sortMetric === AUTO_SELECT_STRATEGY.PRACTICES
              ? 'bg-sky-600 text-white'
              : 'text-slate-300 hover:text-slate-100'
          }`}
          title="Sort by practices per match"
        >
          P/M
        </button>
        <button
          type="button"
          onClick={() => onSortChange(AUTO_SELECT_STRATEGY.ATTENDANCE)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
            sortMetric === AUTO_SELECT_STRATEGY.ATTENDANCE
              ? 'bg-sky-600 text-white'
              : 'text-slate-300 hover:text-slate-100'
          }`}
          title="Sort by attendance percentage"
        >
          %
        </button>
      </div>
      {statsLoading && (
        <span className="text-xs text-slate-400">Stats...</span>
      )}
      {statsError && (
        <span className="text-xs text-rose-300">{statsError}</span>
      )}
      {defaultsError && (
        <span className="text-xs text-rose-300">{defaultsError}</span>
      )}
      <div className="w-full flex justify-center lg:w-auto lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
        <Button
          size="md"
          variant="primary"
          onClick={onRecommend}
          className="px-4 shadow-lg shadow-sky-500/40 ring-1 ring-sky-400/60 bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-500 hover:from-sky-400 hover:via-sky-300 hover:to-cyan-400"
          Icon={Sparkles}
        >
          Recommend
        </Button>
      </div>
    </div>
  );
}
