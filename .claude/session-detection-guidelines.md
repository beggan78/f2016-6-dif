# Session Detection System - Claude Guidelines

## Critical Rule: Single Source of Truth
**ONLY AuthContext performs session detection. Never call `detectSessionType()` or `useSessionDetection()` elsewhere.**

## How to Use

### ✅ Correct Pattern
```javascript
// Get detection result from AuthContext
const { sessionDetectionResult } = useAuth();

// Use the result
if (sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN) {
  // Handle new sign-in
}
```

### ❌ Never Do This
```javascript
// DON'T create additional detection instances
const { detectionResult } = useSessionDetection(); // WRONG
const result = detectSessionType(); // WRONG
```

## Detection Types
- `NEW_SIGN_IN`: User actively signed in (cleanup localStorage, show pending matches)
- `PAGE_REFRESH`: User refreshed page (use cached data, skip expensive operations)

## Key Files
- `src/services/sessionDetectionService.js` - Core detection logic
- `src/contexts/AuthContext.js` - Single detection source, exposes `sessionDetectionResult`
- `src/hooks/useSessionDetection.js` - **Do not use directly in components**

## Common Patterns
```javascript
// Wait for detection result before acting
useEffect(() => {
  if (sessionDetectionResult?.type === DETECTION_TYPES.NEW_SIGN_IN && currentTeam?.id) {
    checkForPendingMatches(currentTeam.id);
  }
}, [sessionDetectionResult, currentTeam?.id]);

// Use helper functions
if (shouldCleanupSession(sessionDetectionResult)) {
  cleanupPreviousSession();
}
```

## Debug
Development only: `window.clearAllSessionData()` to reset detection state.

## Why This Matters
Multiple detection calls pollute sessionStorage, causing wrong detection results (NEW_SIGN_IN becomes PAGE_REFRESH).