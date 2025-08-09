import { useEffect, useRef } from 'react';
import { useBackHandlerContext } from './BackHandlerContext';

export const useBackHandler = (handler) => {
  const { pushBackHandler, popBackHandler } = useBackHandlerContext();
  const handlerId = useRef(Math.random().toString(36).substr(2, 5)); // Unique ID for the hook instance

  useEffect(() => {
    console.log(`[useBackHandler ${handlerId.current}] useEffect RUNNING. Pushing handler.`);
    pushBackHandler(handler);
    return () => {
      console.log(`[useBackHandler ${handlerId.current}] useEffect CLEANUP. Popping handler.`);
      popBackHandler();
    };
  }, [handler, pushBackHandler, popBackHandler]);
};