import React from 'react';
import PropTypes from 'prop-types';

export function SectionHeader({ title, actions, border = false, icon: Icon, className = '' }) {
  return (
    <div className={`flex items-center justify-between ${border ? 'border-b border-slate-600 pb-3' : ''} ${className}`}>
      <h3 className="text-lg font-semibold text-sky-300 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5" />}
        {title}
      </h3>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
  border: PropTypes.bool,
  icon: PropTypes.elementType,
  className: PropTypes.string,
};
