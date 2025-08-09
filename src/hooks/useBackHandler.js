import { useEffect } from 'react';
import { useBackHandlerContext } from './BackHandlerContext';

export const useBackHandler = (handler) => {
  const { pushBackHandler, popBackHandler } = useBackHandlerContext();

  useEffect(() => {
    pushBackHandler(handler);
    return () => {
      popBackHandler();
    };
  }, [handler, pushBackHandler, popBackHandler]);
};