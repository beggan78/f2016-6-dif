let lockCount = 0;

export const lockScroll = () => {
  if (lockCount === 0) document.body.style.overflow = 'hidden';
  lockCount++;
};

export const unlockScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = '';
};
