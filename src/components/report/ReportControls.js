/**
 * Report Controls Component
 * Navigation and export controls for the match report
 */

import React from 'react';
import { BarChart, Printer, Share2, Settings } from 'lucide-react';
import { Button } from '../shared/UI';

const ReportControls = ({
  onNavigateToStats,
  onPrint,
  onShare,
  showSubstitutions,
  onToggleSubstitutions,
  sortOrder,
  onSortOrderChange,
  eventFilter,
  onEventFilterChange
}) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior
      window.print();
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior - copy URL to clipboard
      if (navigator.share) {
        navigator.share({
          title: 'Match Report',
          text: 'Check out this match report',
          url: window.location.href
        }).catch(err => console.log('Error sharing:', err));
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          alert('Report link copied to clipboard!');
        }).catch(err => console.log('Error copying to clipboard:', err));
      }
    }
  };

  return (
    <div className="space-y-4 no-print">
      {/* Navigation Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          {onNavigateToStats && (
            <Button
              onClick={onNavigateToStats}
              variant="primary"
              size="md"
              Icon={BarChart}
            >
              Final Stats
            </Button>
          )}
        </div>

        {/* Export Controls */}
        <div className="flex gap-3">
          <Button
            onClick={handlePrint}
            variant="secondary"
            size="md"
            Icon={Printer}
          >
            Print
          </Button>
          <Button
            onClick={handleShare}
            variant="secondary"
            size="md"
            Icon={Share2}
          >
            Share
          </Button>
        </div>
      </div>

      {/* Report Options */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-slate-200">Report Options</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Substitution Events Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Event Timeline</label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSubstitutions}
                onChange={(e) => onToggleSubstitutions && onToggleSubstitutions(e.target.checked)}
                className="rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500 focus:ring-offset-slate-800"
              />
              <span className="text-sm text-slate-300">Show substitutions</span>
            </label>
          </div>

          {/* Sort Order */}
          {onSortOrderChange && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Timeline Order</label>
              <select
                value={sortOrder || 'desc'}
                onChange={(e) => onSortOrderChange(e.target.value)}
                className="w-full bg-slate-700 border border-slate-500 text-slate-100 py-1.5 px-2.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          )}

          {/* Event Filter */}
          {onEventFilterChange && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Event Filter</label>
              <select
                value={eventFilter || 'all'}
                onChange={(e) => onEventFilterChange(e.target.value)}
                className="w-full bg-slate-700 border border-slate-500 text-slate-100 py-1.5 px-2.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="all">All Events</option>
                <option value="goals">Goals Only</option>
                <option value="substitutions">Substitutions Only</option>
                <option value="important">Important Events</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportControls;
export { ReportControls };