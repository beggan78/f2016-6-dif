import React from 'react';
import PropTypes from 'prop-types';

export function FormGroup({ label, htmlFor, error, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-300 mb-2">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-rose-400 text-sm mt-1">{error}</p>}
    </div>
  );
}

FormGroup.propTypes = {
  label: PropTypes.string,
  htmlFor: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
