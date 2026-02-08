import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

export const COMING_SOON_BADGE_CLASS =
  'px-2 py-[3px] text-[10px] font-semibold bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 text-slate-900 rounded-full shadow-sm shadow-rose-900/30 border border-white/60';

export function ComingSoonBadge({ className = '', label }) {
  const { t } = useTranslation('shared');
  const combinedClassName = `${COMING_SOON_BADGE_CLASS} ${className}`.trim();
  const displayLabel = label || t('badges.comingSoon');
  return <span className={combinedClassName}>{displayLabel}</span>;
}

ComingSoonBadge.propTypes = {
  className: PropTypes.string,
  label: PropTypes.string
};
