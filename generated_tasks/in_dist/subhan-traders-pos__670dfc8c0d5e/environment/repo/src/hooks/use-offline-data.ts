'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseOfflineDataOptions {
  /** Skip initial fetch on mount */
  skipInitialFetch?: boolean;
  /** Refresh data on reconnect */
  refreshOnOnline?: boolean;
  /** Time in ms before data is considered stale (default: 0 = always refetch) */
  staleTime?: number;
  /** Unique cache key for this data - enables cross-navigation caching */
  cacheKey?: string;
}

interface UseOfflineDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Simple in-memory cache for cross-navigation performance
const dataCache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Hook for offline-first data fetching.
 * Tries server fetcher first, falls back to offline fetcher if network fails.
 * Supports staleTime to prevent unnecessary refetches.
 */
export function useOfflineData<T>(
  serverFetcher: () => Promise<T>,
  offlineFetcher: () => Promise<T>,
  options: UseOfflineDataOptions = {}
): UseOfflineDataResult<T> {
  const [data, setData] = useState<T | null>(() => {
    // Initialize from cache if available and not stale
    if (options.cacheKey) {
      const cached = dataCache.get(options.cacheKey);
      if (cached && options.staleTime) {
        const age = Date.now() - cached.timestamp;
        if (age < options.staleTime) {
          return cached.data as T;
        }
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    // Skip loading state if we have fresh cached data
    if (options.cacheKey && options.staleTime) {
      const cached = dataCache.get(options.cacheKey);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < options.staleTime) {
          return false;
        }
      }
    }
    return true;
  });
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number>(0);

  const fetchData = useCallback(async (force = false) => {
    // Check if data is still fresh (skip refetch if not stale)
    if (!force && options.staleTime && lastFetchTime.current > 0) {
      const age = Date.now() - lastFetchTime.current;
      if (age < options.staleTime) {
        return; // Data is still fresh, skip refetch
      }
    }

    setIsLoading(true);
    setError(null);
    
    // Check network status
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    if (!online) {
      // Definitely offline - use local data
      try {
        setIsOffline(true);
        const offlineData = await offlineFetcher();
        setData(offlineData);
        lastFetchTime.current = Date.now();
      } catch (err) {
        setError('Failed to load offline data');
        console.error('Offline fetch error:', err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Try server first
    try {
      setIsOffline(false);
      const serverData = await serverFetcher();
      setData(serverData);
      lastFetchTime.current = Date.now();
      
      // Cache the data if cache key is provided
      if (options.cacheKey) {
        dataCache.set(options.cacheKey, { 
          data: serverData, 
          timestamp: Date.now() 
        });
      }
    } catch (err) {
      console.warn('Server fetch failed, falling back to offline:', err);
      // Server failed - try offline
      try {
        setIsOffline(true);
        const offlineData = await offlineFetcher();
        setData(offlineData);
        lastFetchTime.current = Date.now();
      } catch (offlineErr) {
        setError('Failed to load data (offline and server unavailable)');
        console.error('Both fetches failed:', offlineErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [serverFetcher, offlineFetcher, options.staleTime, options.cacheKey]);

  // Initial fetch
  useEffect(() => {
    if (!options.skipInitialFetch) {
      fetchData();
    }
  }, [fetchData, options.skipInitialFetch]);

  // Refresh on coming back online
  useEffect(() => {
    if (!options.refreshOnOnline) return;

    const handleOnline = () => {
      console.log('📶 Back online - refreshing data');
      fetchData(true); // Force refresh when coming back online
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchData, options.refreshOnOnline]);

  return {
    data,
    isLoading,
    isOffline,
    error,
    refetch: () => fetchData(true), // Force refetch on manual refresh
  };
}

/**
 * Simple hook to track online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true); // Always start true for hydration

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
