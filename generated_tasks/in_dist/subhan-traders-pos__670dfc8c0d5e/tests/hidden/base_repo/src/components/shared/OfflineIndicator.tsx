'use client';

import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOffline } from '@/hooks/use-offline';
import { getPendingSyncCount } from '@/offline/offline-service';
import { syncManager } from '@/offline/sync-manager';
import { Cloud, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const { isOnline, isOffline } = useOffline();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };

    updateCount();

    const unsubComplete = syncManager.on('sync-complete', updateCount);
    const unsubStart = syncManager.on('sync-start', () => setIsSyncing(true));
    const unsubEnd = syncManager.on('sync-complete', () => setIsSyncing(false));
    const unsubError = syncManager.on('sync-error', () => setIsSyncing(false));

    return () => {
      unsubComplete();
      unsubStart();
      unsubEnd();
      unsubError();
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing || !navigator.onLine) return;
    await syncManager.pushChanges();
  };

  // Online with no pending items - green cloud
  if (isOnline && pendingCount === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
              <Cloud className="h-4 w-4" />
              <span className="text-xs font-medium">Online</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connected to server</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Online with pending items - yellow with sync button
  if (isOnline && pendingCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CloudOff className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">
                {isSyncing ? 'Syncing...' : `${pendingCount} pending`}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isSyncing
                ? 'Syncing offline changes...'
                : `${pendingCount} change${pendingCount > 1 ? 's' : ''} waiting to sync. Click to sync now.`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Offline - red/orange indicator
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <WifiOff className="h-4 w-4" />
            <span className="text-xs font-medium">Offline</span>
            {pendingCount > 0 && (
              <span className="text-xs bg-orange-500/20 px-1.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Working offline.
            {pendingCount > 0 && ` ${pendingCount} change${pendingCount > 1 ? 's' : ''} will sync when online.`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
