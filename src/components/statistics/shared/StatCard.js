import React from 'react';

/**
 * StatCard Component
 *
 * Reusable summary statistic card with icon, title, value, and optional subtitle.
 * Used across statistics views to display key metrics.
 *
 * @param {Object} props
 * @param {React.Component} props.icon - Lucide icon component
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Main value to display
 * @param {string} [props.subtitle] - Optional subtitle text
 */
export function StatCard({ icon: Icon, title, value, subtitle }) {
  return (
    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg">
            <Icon className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-slate-100 text-xl font-semibold">{value}</p>
            {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
