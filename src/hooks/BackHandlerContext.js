import React, { createContext, useContext } from 'react';

export const BackHandlerContext = createContext();

export const useBackHandlerContext = () => {
  const context = useContext(BackHandlerContext);
  if (!context) {
    throw new Error('useBackHandlerContext must be used within a BackHandlerProvider');
  }
  return context;
};