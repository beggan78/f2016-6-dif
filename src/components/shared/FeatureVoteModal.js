import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Info, CheckCircle, AlertTriangle, LogIn } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from './UI';

const FeatureVoteModal = ({
  isOpen,
  onClose,
  onConfirm,
  featureName,
  loading = false,
  error = null,
  successMessage = null,
  infoMessage = null,
  isAuthenticated = false,
  authModal = null,
  children
}) => {
  const { t } = useTranslation('modals');

  if (!isOpen) return null;

  const handleAuthRequired = () => {
    if (authModal) {
      authModal.current?.showModal();
    }
  };

  const modalIcon = successMessage ? CheckCircle : infoMessage ? CheckCircle : error ? AlertTriangle : Info;
  const modalIconColor = successMessage ? 'emerald' : infoMessage ? 'sky' : error ? 'rose' : 'sky';
  const modalTitle = successMessage ? t('featureVote.voteRecorded')
    : infoMessage ? t('featureVote.voteAlreadyRecorded')
    : error ? t('featureVote.voteFailed')
    : t('featureVote.featureComingSoon');

  return (
    <ModalShell
      title={modalTitle}
      icon={modalIcon}
      iconColor={modalIconColor}
      onClose={onClose}
    >
          {successMessage ? (
            <p className="text-emerald-100 mb-4">{successMessage}</p>
          ) : infoMessage ? (
            <p className="text-sky-100 mb-4">{infoMessage}</p>
          ) : error ? (
            <p className="text-rose-100 mb-4">{error}</p>
          ) : (
            <div>
              <p className="text-slate-300 mb-4">
                {t('featureVote.featureDescription', { featureName })}
              </p>
              <div className="text-xs text-slate-400 mb-6">
                {children}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-2">
            <Button onClick={onClose} variant="secondary">
              {successMessage || infoMessage ? t('featureVote.close') : t('featureVote.cancel')}
            </Button>

            {/* Only show vote button if not already successful and no critical error */}
            {!successMessage && !infoMessage && (
              <>
                {!isAuthenticated ? (
                  <Button onClick={handleAuthRequired} Icon={LogIn}>
                    {t('featureVote.signInToVote')}
                  </Button>
                ) : (
                  <Button
                    onClick={onConfirm}
                    Icon={loading ? undefined : ThumbsUp}
                    disabled={loading}
                  >
                    {loading ? t('featureVote.submitting') : t('featureVote.voteFor', { featureName })}
                  </Button>
                )}
              </>
            )}
          </div>
    </ModalShell>
  );
};

FeatureVoteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  featureName: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  successMessage: PropTypes.string,
  infoMessage: PropTypes.string,
  isAuthenticated: PropTypes.bool,
  authModal: PropTypes.object,
  children: PropTypes.node,
};

export default FeatureVoteModal;
