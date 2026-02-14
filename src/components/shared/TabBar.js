import React from 'react';
import PropTypes from 'prop-types';

const variantStyles = {
  scroll: {
    nav: 'flex space-x-0 min-w-max',
    container: 'overflow-x-auto',
    active: 'border-sky-400 text-sky-300 bg-slate-600/50',
    inactive: 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-600/30',
    tab: 'flex items-center space-x-2 px-2 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors relative flex-shrink-0 whitespace-nowrap',
    iconSize: 'w-4 h-4',
    badge: 'absolute -top-1 -right-1 bg-red-600 text-red-100 text-xs rounded-full w-5 h-5 flex items-center justify-center',
  },
  wrap: {
    nav: 'flex flex-wrap gap-3 sm:gap-4 md:gap-8',
    container: '',
    active: 'border-sky-400 text-sky-400',
    inactive: 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300',
    tab: 'flex items-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
    iconSize: 'h-5 w-5',
    badge: 'absolute -top-1 -right-1 bg-red-600 text-red-100 text-xs rounded-full w-5 h-5 flex items-center justify-center',
  },
  pill: {
    nav: 'flex space-x-1',
    container: 'bg-slate-700 p-1 rounded-lg',
    active: 'bg-slate-600 text-slate-100',
    inactive: 'text-slate-300 hover:text-slate-100 hover:bg-slate-600',
    tab: 'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
    iconSize: 'w-4 h-4',
    badge: 'bg-sky-500 text-sky-100 text-xs px-2 py-1 rounded-full',
  },
};

export function TabBar({ tabs, activeTab, onTabChange, variant = 'scroll', className = '' }) {
  const styles = variantStyles[variant] || variantStyles.scroll;

  return (
    <div className={`${styles.container} ${className}`.trim()}>
      <nav className={styles.nav}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`${styles.tab} ${isActive ? styles.active : styles.inactive}`}
            >
              {Icon && <Icon className={styles.iconSize} />}
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span className={styles.badge}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

TabBar.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      badge: PropTypes.number,
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['scroll', 'wrap', 'pill']),
  className: PropTypes.string,
};
