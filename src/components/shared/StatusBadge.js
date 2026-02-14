import React from 'react';
import PropTypes from 'prop-types';

export function StatusBadge({
  label,
  colorClass = '',
  icon: Icon,
  iconClassName = 'w-4 h-4',
  className = '',
  children
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {Icon ? <Icon className={iconClassName} /> : null}
      <span>{label}</span>
      {children}
    </span>
  );
}

StatusBadge.propTypes = {
  label: PropTypes.string.isRequired,
  colorClass: PropTypes.string,
  icon: PropTypes.elementType,
  iconClassName: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
};
