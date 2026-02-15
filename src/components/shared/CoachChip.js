import React from 'react';
import { getInitials } from '../../utils/formatUtils';

const SIZE_CLASSES = {
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-7 h-7 text-xs'
};

export function CoachChip({ name, size = 'md' }) {
  if (!name) return null;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-sky-600/20 text-sky-300 font-medium ${SIZE_CLASSES[size] || SIZE_CLASSES.md}`}
      title={name}
    >
      {getInitials(name)}
    </span>
  );
}
