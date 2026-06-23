'use client';

import { useOffline } from '@/hooks/use-offline';
import { hydrateFromServer, isDataHydrated } from '@/offline/offline-service';
import { syncManager } from '@/offline/sync-manager';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface OfflineContextValue {
  isOnline: boolean;
  isOffline: boolean;
  isHydrated: boolean;
  isSyncing: boolean;
  pendingCount: number;
  triggerSync: () => Promise<void>;
  triggerHydration: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function useOfflineContext() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
}

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { isOnline, isOffline } = useOffline();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Initial hydration on mount (when online)
  useEffect(() => {
    const initHydration = async () => {
      // Check if already hydrated
      const hydrated = await isDataHydrated();
      if (hydrated) {
        setIsHydrated(true);
        return;
      }

      // Only hydrate when online
      if (navigator.onLine) {
        console.log('🔄 Starting initial data hydration...');
        const result = await hydrateFromServer();
        if (result.success) {
          setIsHydrated(true);
          console.log('✅ Initial hydration complete');
        } else {
          console.warn('⚠️ Initial hydration failed:', result.error);
        }
      }
    };

    initHydration();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      // Small delay to ensure network is stable
      const timer = setTimeout(async () => {
        const count = await syncManager.getPendingCount();
        if (count > 0) {
          console.log('📡 Back online - triggering sync...');
          toast.info(`Syncing ${count} offline change${count > 1 ? 's' : ''}...`);
          await syncManager.pushChanges();
        }

        // Also re-hydrate data to get latest from server
        if (!isHydrated || await isDataHydrated()) {
          await hydrateFromServer();
          setIsHydrated(true);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, isHydrated]);

  // Listen for sync events
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await syncManager.getPendingCount();
      setPendingCount(count);
    };

    const unsubStart = syncManager.on('sync-start', () => setIsSyncing(true));
    const unsubComplete = syncManager.on('sync-complete', () => {
      setIsSyncing(false);
      updatePendingCount();
    });
    const unsubError = syncManager.on('sync-error', () => setIsSyncing(false));

    // Initial count
    updatePendingCount();

    return () => {
      unsubStart();
      unsubComplete();
      unsubError();
    };
  }, []);

  // Periodic sync check (every 30 seconds when online)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(async () => {
      const count = await syncManager.getPendingCount();
      if (count > 0 && !isSyncing) {
        console.log('⏰ Periodic sync check - found pending items');
        await syncManager.pushChanges();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, isSyncing]);

  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    await syncManager.pushChanges();
  }, [isOnline, isSyncing]);

  const triggerHydration = useCallback(async () => {
    if (!isOnline) return;
    const result = await hydrateFromServer();
    if (result.success) {
      setIsHydrated(true);
      toast.success('Data refreshed from server');
    } else {
      toast.error('Failed to refresh data');
    }
  }, [isOnline]);

  const value: OfflineContextValue = {
    isOnline,
    isOffline,
    isHydrated,
    isSyncing,
    pendingCount,
    triggerSync,
    triggerHydration,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}
