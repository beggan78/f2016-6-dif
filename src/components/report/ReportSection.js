import React from 'react';

/**
 * ReportSection - Standardized section wrapper for match report components
 * 
 * @param {Object} props - Component props
 * @param {React.Component} props.icon - Lucide icon component to display in header
 * @param {string} props.title - Section title text
 * @param {React.ReactNode} props.children - Section content
 * @param {React.ReactNode} props.headerExtra - Optional additional content in header (for toggle buttons, etc.)
 * @param {string} props.className - Optional additional CSS classes for the section
 */
export function ReportSection({
  icon: Icon,
  title,
  children,
  headerExtra = null,
  className = ""
}) {
  return (
    <section className={`bg-slate-800 rounded-lg p-6 border border-slate-700 ${className}`.trim()}>
      <div className={`flex items-center mb-4 ${headerExtra ? 'justify-between' : ''}`}>
        <div className="flex items-center">
          {Icon && <Icon className="h-5 w-5 text-sky-400 mr-2" />}
          <h2 className="text-xl font-semibold text-sky-300">{title}</h2>
        </div>
        {headerExtra && (
          <div className="flex items-center">
            {headerExtra}
          </div>
        )}
      </div>
      
      {children}
    </section>
  );
}