export const scrollToTopSmooth = () => {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
    return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};
