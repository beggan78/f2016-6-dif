/**
 * useSessionDetection Hook
 * 
 * React hook for integrating session detection with components
 * Provides clean API for session type detection and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  detectSessionType, 
  shouldCleanupSession, 
  shouldShowRecoveryModal,
  DETECTION_TYPES,
  TIMING_CONSTANTS
} from '../services/sessionDetectionService';
import { validateDetectionResult } from '../utils/sessionDetectionUtils';

/**
 * Hook for session detection and management
 */
export function useSessionDetection() {
  const [detectionResult, setDetectionResult] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(null);
  
  // Track if detection has been performed to avoid duplicates
  const hasDetectedRef = useRef(false);
  const detectionTimeoutRef = useRef(null);

  /**
   * Perform session detection
   */
  const performDetection = useCallback(async () => {
    // Prevent multiple simultaneous detections
    if (isDetecting || hasDetectedRef.current) {
      return detectionResult;
    }

    setIsDetecting(true);
    hasDetectedRef.current = true;

    try {
      // Small delay to ensure all browser APIs are ready
      await new Promise(resolve => setTimeout(resolve, TIMING_CONSTANTS.API_READY_DELAY_MS));
      
      const result = detectSessionType();
      
      // Validate the result
      if (!validateDetectionResult(result)) {
        throw new Error('Invalid detection result structure');
      }

      setDetectionResult(result);
      setLastDetectionTime(Date.now());
      
      return result;
    } catch (error) {
      console.error('Session detection failed:', error);
      
      // Create fallback result
      const fallbackResult = {
        type: DETECTION_TYPES.PAGE_REFRESH,
        confidence: 0,
        scores: {},
        signals: {},
        error: error.message,
        timestamp: Date.now()
      };
      
      setDetectionResult(fallbackResult);
      return fallbackResult;
    } finally {
      setIsDetecting(false);
    }
  }, [isDetecting, detectionResult]);

  /**
   * Reset detection state (for testing or re-detection)
   */
  const resetDetection = useCallback(() => {
    hasDetectedRef.current = false;
    setDetectionResult(null);
    setLastDetectionTime(null);
    setIsDetecting(false);
    
    // Clear any pending timeout
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
      detectionTimeoutRef.current = null;
    }
  }, []);

  /**
   * Check if cleanup should be performed based on detection
   */
  const shouldCleanup = useCallback(() => {
    if (!detectionResult) return false;
    return shouldCleanupSession(detectionResult);
  }, [detectionResult]);

  /**
   * Check if recovery modal should be shown based on detection
   */
  const shouldShowRecovery = useCallback(() => {
    if (!detectionResult) return false;
    return shouldShowRecoveryModal(detectionResult);
  }, [detectionResult]);

  /**
   * Get human-readable detection summary
   */
  const getDetectionSummary = useCallback(() => {
    if (!detectionResult) return null;
    
    return {
      type: detectionResult.type,
      confidence: detectionResult.confidence,
      shouldCleanup: shouldCleanup(),
      shouldShowRecovery: shouldShowRecovery(),
      timestamp: detectionResult.timestamp,
      isReliable: detectionResult.confidence > TIMING_CONSTANTS.RELIABLE_CONFIDENCE_THRESHOLD
    };
  }, [detectionResult, shouldCleanup, shouldShowRecovery]);

  /**
   * Automatic detection on mount (with delay)
   */
  useEffect(() => {
    // Only auto-detect once per component lifecycle
    if (hasDetectedRef.current) return;

    // Delay detection slightly to ensure DOM is fully ready
    detectionTimeoutRef.current = setTimeout(() => {
      performDetection();
    }, TIMING_CONSTANTS.DOM_READY_DELAY_MS);

    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
        detectionTimeoutRef.current = null;
      }
    };
  }, [performDetection]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    detectionResult,
    isDetecting,
    lastDetectionTime,
    hasDetected: hasDetectedRef.current,
    
    // Actions
    performDetection,
    resetDetection,
    
    // Computed values
    shouldCleanup: shouldCleanup(),
    shouldShowRecovery: shouldShowRecovery(),
    
    // Detection type checks
    isNewSignIn: detectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN,
    isPageRefresh: detectionResult?.type === DETECTION_TYPES.PAGE_REFRESH,
    
    // Summary
    summary: getDetectionSummary()
  };
}

/**
 * Simplified hook for basic detection needs
 */
export function useSimpleSessionDetection() {
  const { detectionResult, isDetecting, isNewSignIn, isPageRefresh } = useSessionDetection();
  
  return {
    detectionType: detectionResult?.type || null,
    isDetecting,
    isNewSignIn,
    isPageRefresh,
    confidence: detectionResult?.confidence || 0
  };
}