import React from 'react';
import PropTypes from 'prop-types';

const SIZE_STYLES = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
};

const COLOR_STYLES = {
  sky: 'bg-sky-600',
  emerald: 'bg-emerald-600',
  slate: 'bg-slate-600',
};

export function Avatar({ size = 'md', color = 'sky', className = '', children }) {
  return (
    <div className={`${SIZE_STYLES[size]} ${COLOR_STYLES[color]} rounded-full flex items-center justify-center shrink-0 text-white font-medium ${className}`}>
      {children}
    </div>
  );
}

Avatar.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf(['sky', 'emerald', 'slate']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
