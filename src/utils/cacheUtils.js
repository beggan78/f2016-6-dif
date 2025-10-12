/**
 * Local Storage Cache Utilities
 * Provides caching functionality for user data during auth recovery
 *
 * ⚠️ DIRECT LOCALSTORAGE ACCESS JUSTIFICATION:
 * This file intentionally uses direct localStorage access instead of PersistenceManager because:
 * 1. TTL-based expiration: Implements time-to-live (TTL) with automatic cleanup
 * 2. Quota management: Special handling for quota exceeded errors with auto-cleanup
 * 3. Metadata tracking: Maintains separate metadata structure for cache entries
 * 4. Size limits: Enforces per-item size restrictions to prevent cache bloat
 * 5. Specialized cache layer: This is a cache abstraction layer, not application state
 *
 * PersistenceManager is designed for application state persistence, while this is
 * designed specifically for temporary caching of Supabase API responses with
 * automatic expiration and cleanup.
 */

import { STORAGE_KEYS } from '../constants/storageKeys';

// Cache configuration
const CACHE_CONFIG = {
  PREFIX: STORAGE_KEYS.CACHE_PREFIX,
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_STORAGE_SIZE: 4 * 1024 * 1024, // 4MB limit (localStorage is ~5-10MB)
};

// Cache keys for different data types
export const CACHE_KEYS = {
  AUTH_USER: 'authUser',
  USER_PROFILE: 'userProfile',
  CURRENT_TEAM: 'currentTeam',
  USER_TEAMS: 'userTeams', 
  TEAM_PLAYERS: 'teamPlayers',
  USER_CLUBS: 'userClubs',
  PENDING_REQUESTS: 'pendingRequests',
  CACHE_META: 'cacheMeta',
};

/**
 * Get the full cache key with prefix
 */
const getCacheKey = (key) => `${CACHE_CONFIG.PREFIX}${key}`;

/**
 * Check if cache is available and working
 */
export const isCacheAvailable = () => {
  try {
    const test = '__cache_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    console.warn('Cache not available:', error);
    return false;
  }
};

/**
 * Get cache metadata (timestamps, version info)
 */
export const getCacheMeta = () => {
  if (!isCacheAvailable()) return null;
  
  try {
    const meta = localStorage.getItem(getCacheKey(CACHE_KEYS.CACHE_META));
    return meta ? JSON.parse(meta) : {};
  } catch (error) {
    console.warn('Error reading cache metadata:', error);
    return {};
  }
};

/**
 * Update cache metadata
 */
export const updateCacheMeta = (updates) => {
  if (!isCacheAvailable()) return;
  
  try {
    const currentMeta = getCacheMeta() || {};
    const newMeta = {
      ...currentMeta,
      ...updates,
      lastUpdated: Date.now(),
    };
    
    localStorage.setItem(getCacheKey(CACHE_KEYS.CACHE_META), JSON.stringify(newMeta));
  } catch (error) {
    console.warn('Error updating cache metadata:', error);
  }
};

/**
 * Check if cached data is still valid based on TTL
 */
export const isCacheValid = (key, customTTL = null) => {
  const meta = getCacheMeta();
  if (!meta || !meta[key]) return false;
  
  const ttl = customTTL || CACHE_CONFIG.DEFAULT_TTL;
  const age = Date.now() - meta[key].timestamp;
  
  return age < ttl;
};

/**
 * Get data from cache
 */
export const getFromCache = (key) => {
  if (!isCacheAvailable()) return null;
  
  try {
    // Check if cache is valid first
    if (!isCacheValid(key)) {
      removeFromCache(key);
      return null;
    }
    
    const cachedData = localStorage.getItem(getCacheKey(key));
    if (!cachedData) return null;
    
    const parsed = JSON.parse(cachedData);

    return parsed;
  } catch (error) {
    console.warn(`Error reading from cache for key ${key}:`, error);
    removeFromCache(key); // Remove corrupted cache
    return null;
  }
};

/**
 * Save data to cache with automatic metadata tracking
 */
export const saveToCache = (key, data) => {
  if (!isCacheAvailable()) return false;
  
  try {
    // Estimate data size
    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;
    
    if (size > CACHE_CONFIG.MAX_STORAGE_SIZE / 10) { // Don't use more than 10% for single item
      console.warn(`Data too large for cache key ${key}:`, { size, maxAllowed: CACHE_CONFIG.MAX_STORAGE_SIZE / 10 });
      return false;
    }
    
    // Save the data
    localStorage.setItem(getCacheKey(key), serialized);
    
    // Update metadata
    updateCacheMeta({
      [key]: {
        timestamp: Date.now(),
        size: size,
      }
    });
    
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('Cache storage quota exceeded, clearing old cache');
      clearExpiredCache();
      // Try once more after clearing
      try {
        localStorage.setItem(getCacheKey(key), JSON.stringify(data));
        updateCacheMeta({
          [key]: {
            timestamp: Date.now(),
            size: new Blob([JSON.stringify(data)]).size,
          }
        });
        return true;
      } catch (retryError) {
        console.error('Cache save failed even after cleanup:', retryError);
        return false;
      }
    } else {
      console.warn(`Error saving to cache for key ${key}:`, error);
      return false;
    }
  }
};

/**
 * Remove data from cache
 */
export const removeFromCache = (key) => {
  if (!isCacheAvailable()) return;
  
  try {
    localStorage.removeItem(getCacheKey(key));
    
    // Update metadata to remove the key
    const meta = getCacheMeta();
    if (meta && meta[key]) {
      delete meta[key];
      localStorage.setItem(getCacheKey(CACHE_KEYS.CACHE_META), JSON.stringify(meta));
    }
    
  } catch (error) {
    console.warn(`Error removing cache for key ${key}:`, error);
  }
};

/**
 * Clear all app cache data
 */
export const clearAllCache = () => {
  if (!isCacheAvailable()) return;
  
  try {
    // Get all cache keys and remove them
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(getCacheKey(key));
    });
    
  } catch (error) {
    console.warn('Error clearing all cache:', error);
  }
};

/**
 * Clear only expired cache entries
 */
export const clearExpiredCache = () => {
  if (!isCacheAvailable()) return;
  
  const meta = getCacheMeta();
  if (!meta) return;
  
  // let clearedCount = 0;
  
  Object.keys(meta).forEach(key => {
    if (key === 'lastUpdated') return; // Skip meta fields
    
    if (!isCacheValid(key)) {
      removeFromCache(key);
      // clearedCount++;
    }
  });
  
};

/**
 * Get cache storage statistics
 */
export const getCacheStats = () => {
  if (!isCacheAvailable()) return null;
  
  const meta = getCacheMeta();
  if (!meta) return { totalEntries: 0, totalSize: 0 };
  
  let totalSize = 0;
  let totalEntries = 0;
  let validEntries = 0;
  
  Object.entries(meta).forEach(([key, value]) => {
    if (key === 'lastUpdated') return;
    
    totalEntries++;
    if (value.size) totalSize += value.size;
    if (isCacheValid(key)) validEntries++;
  });
  
  return {
    totalEntries,
    validEntries,
    expiredEntries: totalEntries - validEntries,
    totalSize,
    availableSpace: CACHE_CONFIG.MAX_STORAGE_SIZE - totalSize,
  };
};

/**
 * Cache user profile specifically
 */
export const cacheUserProfile = (profile) => {
  return saveToCache(CACHE_KEYS.USER_PROFILE, profile);
};

/**
 * Cache authenticated user data for fast refresh recovery
 */
export const cacheAuthUser = (user) => {
  if (!user) {
    removeFromCache(CACHE_KEYS.AUTH_USER);
    return false;
  }
  return saveToCache(CACHE_KEYS.AUTH_USER, user);
};

/**
 * Get cached authenticated user data
 */
export const getCachedAuthUser = () => {
  return getFromCache(CACHE_KEYS.AUTH_USER);
};

/**
 * Get cached user profile
 */
export const getCachedUserProfile = () => {
  return getFromCache(CACHE_KEYS.USER_PROFILE);
};

/**
 * Cache team data
 */
export const cacheTeamData = (data) => {
  const { currentTeam, userTeams, userClubs, teamPlayers, pendingRequests } = data;
  
  const results = {};
  
  if (currentTeam !== undefined) {
    results.currentTeam = saveToCache(CACHE_KEYS.CURRENT_TEAM, currentTeam);
  }
  
  if (userTeams !== undefined) {
    results.userTeams = saveToCache(CACHE_KEYS.USER_TEAMS, userTeams);
  }
  
  if (userClubs !== undefined) {
    results.userClubs = saveToCache(CACHE_KEYS.USER_CLUBS, userClubs);
  }
  
  if (teamPlayers !== undefined) {
    results.teamPlayers = saveToCache(CACHE_KEYS.TEAM_PLAYERS, teamPlayers);
  }
  
  if (pendingRequests !== undefined) {
    results.pendingRequests = saveToCache(CACHE_KEYS.PENDING_REQUESTS, pendingRequests);
  }
  
  return results;
};

/**
 * Get all cached team data
 */
export const getCachedTeamData = () => {
  return {
    currentTeam: getFromCache(CACHE_KEYS.CURRENT_TEAM),
    userTeams: getFromCache(CACHE_KEYS.USER_TEAMS),
    userClubs: getFromCache(CACHE_KEYS.USER_CLUBS), 
    teamPlayers: getFromCache(CACHE_KEYS.TEAM_PLAYERS),
    pendingRequests: getFromCache(CACHE_KEYS.PENDING_REQUESTS),
  };
};
