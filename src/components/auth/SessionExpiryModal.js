import React, { useState, useEffect } from 'react';
import { Button } from '../shared/UI';

export function SessionExpiryModal({ 
  isOpen, 
  onExtend, 
  onDismiss, 
  onSignOut,
  sessionExpiry,
  loading 
}) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  // Update countdown timer
  useEffect(() => {
    if (!isOpen || !sessionExpiry) return;

    const updateTimer = () => {
      const now = Date.now();
      const expiry = sessionExpiry.getTime();
      const remaining = expiry - now;

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      if (minutes > 0) {
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining(`${seconds} seconds`);
      }
    };

    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, sessionExpiry]);

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      const success = await onExtend();
      if (!success) {
        // If extension failed, show error state but keep modal open
        console.error('Session extension failed');
      }
    } catch (error) {
      console.error('Error extending session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const handleSignOut = () => {
    onSignOut();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-slate-900/75 transition-opacity"
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-slate-800 rounded-lg border border-slate-600 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* Warning icon */}
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-amber-900/50 sm:mx-0 sm:h-10 sm:w-10">
                <svg 
                  className="h-6 w-6 text-amber-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              
              {/* Content */}
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 className="text-lg leading-6 font-semibold text-slate-100">
                  Session Expiring Soon
                </h3>
                
                <div className="mt-3">
                  <p className="text-sm text-slate-300 mb-3">
                    Your session will expire in <span className="font-semibold text-amber-400">{timeRemaining}</span>. 
                    Would you like to extend your session to continue working?
                  </p>
                  
                  <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-slate-400">
                        Your work will be saved automatically when you extend your session.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleExtend}
              disabled={isExtending || loading}
              variant="primary"
              className="w-full sm:w-auto sm:ml-3"
            >
              {isExtending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Extending...
                </span>
              ) : (
                'Extend Session'
              )}
            </Button>
            
            <Button
              onClick={onDismiss}
              disabled={isExtending || loading}
              variant="secondary"
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Continue Without Extending
            </Button>
            
            <Button
              onClick={handleSignOut}
              disabled={isExtending || loading}
              variant="secondary"
              className="mt-3 w-full sm:mt-0 sm:w-auto sm:mr-3 text-rose-300 hover:text-rose-200 hover:bg-rose-900/50"
            >
              Sign Out Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}