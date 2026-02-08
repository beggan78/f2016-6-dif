import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/UI';
import { POSITION_CONFIG } from '../../constants/positionConfig';

const humanizePositionKey = (positionKey) => {
  return positionKey
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
};

const getPositionConfig = (positionKey) => {
  const presetConfig = POSITION_CONFIG[positionKey];
  if (presetConfig) {
    return presetConfig;
  }

  return { title: humanizePositionKey(positionKey), position: positionKey };
};

export function PositionRecommendationCard({
  recommendations,
  onAccept,
  onDismiss,
  allPlayers,
  loading,
  error
}) {
  const { t } = useTranslation('configuration');
  const hasRecommendations = recommendations?.recommendations &&
                             Object.keys(recommendations.recommendations).length > 0;

  return (
    <div
      data-testid="position-recommendations"
      className="p-2 bg-slate-700 rounded-lg space-y-2"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-sky-200">{t('positionRecommendations.title')}</h3>
        <span className="text-xs text-slate-300">{t('positionRecommendations.timeframe')}</span>
      </div>

      {loading ? (
        <p className="text-xs text-slate-300">{t('positionRecommendations.loading')}</p>
      ) : error ? (
        <p className="text-xs text-rose-300">{t('positionRecommendations.error')}</p>
      ) : hasRecommendations ? (
        <>
          <p className="text-xs text-slate-300">
            {t('positionRecommendations.description')}
          </p>
          <ul className="space-y-1" data-testid="position-recommendations-list">
            {Object.entries(recommendations.recommendations).map(([position, data]) => {
              const player = allPlayers.find(p => p.id === data.playerId);
              const positionConfig = getPositionConfig(position);

              return (
                <li
                  key={position}
                  className="flex items-center justify-between rounded-md bg-slate-800/60 px-2 py-1 text-sm text-slate-100"
                >
                  <span>{positionConfig.title}: {player?.displayName || t('positionRecommendations.unknown')}</span>
                  <span className="text-xs text-slate-300">{t(`positionRecommendations.reasons.${data.reasonKey}`, data.reasonParams || {})}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-xs text-slate-300">{t('positionRecommendations.noRecommendations')}</p>
      )}

      <div className="flex items-center justify-end space-x-2 pt-1">
        <Button
          variant="secondary"
          onClick={onDismiss}
        >
          {t('positionRecommendations.dismiss')}
        </Button>
        <Button
          variant="accent"
          onClick={onAccept}
          disabled={loading || !hasRecommendations}
        >
          {t('positionRecommendations.acceptAll')}
        </Button>
      </div>
    </div>
  );
}

PositionRecommendationCard.propTypes = {
  recommendations: PropTypes.object,
  onAccept: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  allPlayers: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string
};

PositionRecommendationCard.defaultProps = {
  recommendations: null,
  loading: false,
  error: null
};
