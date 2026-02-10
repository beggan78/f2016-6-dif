import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { getMatchTypeOptions } from '../../constants/matchTypes';
import { MultiSelect, Button } from '../shared/UI';
import { BREAKPOINTS } from '../../constants/layoutConstants';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';

/**
 * Reusable match filters panel with collapsible behavior
 * Used by both MatchHistoryView and TeamStatsView
 */
export function MatchFiltersPanel({
  matches = [],
  typeFilter,
  outcomeFilter,
  venueFilter,
  opponentFilter,
  playerFilter,
  formatFilter,
  showPlayerFilter = true,
  onTypeFilterChange,
  onOutcomeFilterChange,
  onVenueFilterChange,
  onOpponentFilterChange,
  onPlayerFilterChange,
  onFormatFilterChange,
  onClearAllFilters
}) {
  const { t } = useTranslation('statistics');

  const MATCH_TYPES = useMemo(() =>
    getMatchTypeOptions(t).map(({ value, label }) => ({ value, label })),
  [t]);

  const OUTCOMES = useMemo(() => [
    { value: 'W', label: t('filters.outcomes.win') },
    { value: 'D', label: t('filters.outcomes.draw') },
    { value: 'L', label: t('filters.outcomes.loss') }
  ], [t]);

  const VENUE_TYPES = useMemo(() => [
    { value: 'home', label: t('filters.venues.home') },
    { value: 'away', label: t('filters.venues.away') },
    { value: 'neutral', label: t('filters.venues.neutral') }
  ], [t]);

  const isBelowLgBreakpoint = useCallback(() => {
    return typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.LG;
  }, []);
  // Screen size detection and filter collapse state
  const [needsCollapse, setNeedsCollapse] = useState(() => {
    return isBelowLgBreakpoint();
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(() => {
    return isBelowLgBreakpoint();
  });

  // Detect screen size that requires filter collapsing
  useEffect(() => {
    const checkScreenSize = () => {
      const shouldCollapse = isBelowLgBreakpoint(); // lg breakpoint - when filters wrap to multiple rows

      setNeedsCollapse(prevNeedsCollapse => {
        // Only update collapse state if needsCollapse actually changed
        if (prevNeedsCollapse !== shouldCollapse) {
          // Use a callback to ensure we're working with the latest state
          setIsFilterCollapsed(prevIsCollapsed => {
            // Don't auto-collapse if user has manually expanded filters
            // Only auto-collapse when transitioning from wide to narrow screen
            if (shouldCollapse && !prevNeedsCollapse) {
              return true;
            } else if (!shouldCollapse) {
              return false;
            }
            return prevIsCollapsed;
          });
        }
        return shouldCollapse;
      });
    };

    // Initial check
    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isBelowLgBreakpoint]); // Remove needsCollapse dependency to prevent race condition

  // Get unique opponents from matches
  const opponents = useMemo(() => {
    const uniqueOpponents = [...new Set(matches.map(match => match.opponent).filter(Boolean))];
    // Sort opponents alphabetically
    const sortedOpponents = uniqueOpponents.sort((a, b) => a.localeCompare(b));
    return sortedOpponents.map(opponent => ({ value: opponent, label: opponent }));
  }, [matches]);

  // Get unique players from matches
  const players = useMemo(() => {
    const uniquePlayers = [...new Set(matches.flatMap(match => match.players || []).filter(Boolean))];
    return uniquePlayers.sort().map(player => ({ value: player, label: player }));
  }, [matches]);

  // Get unique formats from matches - only show filter if multiple formats exist
  const formats = useMemo(() => {
    const uniqueFormats = [...new Set(matches.map(match => match.format).filter(Boolean))];
    return uniqueFormats.sort().map(format => ({ value: format, label: format }));
  }, [matches]);

  const shouldShowFormatFilter = formats.length > 1;
  const filterColumnLayout = useMemo(() => {
    if (showPlayerFilter) {
      return shouldShowFormatFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5';
    }
    return shouldShowFormatFilter ? 'lg:grid-cols-5' : 'lg:grid-cols-4';
  }, [showPlayerFilter, shouldShowFormatFilter]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
        >
          <SectionHeader title={t('filters.title')} icon={Filter} />
          {needsCollapse && (
            <button className="text-sky-400 hover:text-sky-300 transition-colors">
              {isFilterCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        <Button
          onClick={onClearAllFilters}
          Icon={RotateCcw}
          variant="ghost"
          size="sm"
          className="text-sky-400 hover:text-sky-300"
        >
          {t('filters.clearAll')}
        </Button>
      </div>

      {/* Filter content - collapsible when screen is narrow */}
      <div className={`${
        needsCollapse
          ? (isFilterCollapsed ? 'hidden' : 'block mt-4')
          : 'mt-4'
      }`}>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${filterColumnLayout}`}>
          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">{t('filters.type')}</label>
            <MultiSelect
              value={typeFilter}
              onChange={onTypeFilterChange}
              options={MATCH_TYPES}
              placeholder={t('filters.all')}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">{t('filters.outcome')}</label>
            <MultiSelect
              value={outcomeFilter}
              onChange={onOutcomeFilterChange}
              options={OUTCOMES}
              placeholder={t('filters.all')}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">{t('filters.venue')}</label>
            <MultiSelect
              value={venueFilter}
              onChange={onVenueFilterChange}
              options={VENUE_TYPES}
              placeholder={t('filters.all')}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">{t('filters.opponent')}</label>
            <MultiSelect
              value={opponentFilter}
              onChange={onOpponentFilterChange}
              options={opponents}
              placeholder={t('filters.all')}
            />
          </div>

          {showPlayerFilter && (
            <div className="flex flex-col">
              <label className="text-slate-300 text-sm mb-2">{t('filters.withPlayer')}</label>
              <MultiSelect
                value={playerFilter}
                onChange={onPlayerFilterChange}
                options={players}
                placeholder={t('filters.all')}
              />
            </div>
          )}

          {shouldShowFormatFilter && (
            <div className="flex flex-col">
              <label className="text-slate-300 text-sm mb-2">{t('filters.format')}</label>
              <MultiSelect
                value={formatFilter}
                onChange={onFormatFilterChange}
                options={formats}
                placeholder={t('filters.all')}
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
