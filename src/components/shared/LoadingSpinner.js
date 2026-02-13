import React from 'react';
import PropTypes from 'prop-types';

const SIZE_STYLES = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'lg', message, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-sky-400 ${SIZE_STYLES[size]}`} />
      {message && <p className="text-slate-400 mt-3 text-sm">{message}</p>}
    </div>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  message: PropTypes.string,
  className: PropTypes.string,
};
