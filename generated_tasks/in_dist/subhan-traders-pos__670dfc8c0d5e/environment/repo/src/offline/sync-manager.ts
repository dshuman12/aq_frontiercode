import { toast } from 'sonner';
import { db, SyncQueueItem } from './db';

type SyncEventType = 'sync-start' | 'sync-complete' | 'sync-error' | 'sync-progress';
type SyncEventListener = (data: { pending?: number; synced?: number; error?: string }) => void;

export class SyncManager {
  private isSyncing = false;
  private listeners: Map<SyncEventType, Set<SyncEventListener>> = new Map();
  private maxRetries = 3;

  // Event emitter methods
  on(event: SyncEventType, listener: SyncEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: SyncEventType, listener: SyncEventListener) {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: SyncEventType, data: { pending?: number; synced?: number; error?: string } = {}) {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  get syncing() {
    return this.isSyncing;
  }

  async pushChanges(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (this.isSyncing) return { success: false, synced: 0, failed: 0 };
    if (!navigator.onLine) return { success: false, synced: 0, failed: 0 };

    this.isSyncing = true;
    this.emit('sync-start');
    console.log('🔄 Starting sync...');

    let synced = 0;
    let failed = 0;

    try {
      const queue = await db.syncQueue.toArray();

      if (queue.length === 0) {
        console.log('✅ Nothing to sync');
        this.isSyncing = false;
        this.emit('sync-complete', { synced: 0 });
        return { success: true, synced: 0, failed: 0 };
      }

      this.emit('sync-progress', { pending: queue.length });

      // Sort queue by dependency order to prevent FK violations
      // Categories must sync before Items, Items before Orders
      const tablePriority: Record<string, number> = {
        'categories': 1,
        'suppliers': 2,
        'customers': 3,
        'employees': 4,
        'items': 5,
        'purchaseOrders': 6,
        'orders': 7,
      };

      const sortedQueue = [...queue].sort((a, b) => {
        const priorityA = tablePriority[a.table] || 99;
        const priorityB = tablePriority[b.table] || 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        // Within same table, maintain timestamp order
        return a.timestamp - b.timestamp;
      });

      // Process queue sequentially to maintain order
      for (const item of sortedQueue) {
        let retries = 0;
        let success = false;

        while (retries < this.maxRetries && !success) {
          try {
            await this.processQueueItem(item);
            success = true;
            synced++;

            // Remove from queue if successful
            if (item.id) {
              await db.syncQueue.delete(item.id);
            }

            // If it's an order, mark it as synced in local DB
            if (item.table === 'orders' && item.data?.id) {
              await db.orders.update(item.data.id, { synced: true });
            }
          } catch (error) {
            retries++;
            console.error(`❌ Sync attempt ${retries} failed for item ${item.id}:`, error);

            if (retries >= this.maxRetries) {
              failed++;
              // Move to end of queue for later retry
              if (item.id) {
                await db.syncQueue.update(item.id, { 
                  timestamp: Date.now(),
                });
              }
            } else {
              // Exponential backoff
              await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            }
          }
        }
      }

      console.log(`✅ Sync completed: ${synced} synced, ${failed} failed`);
      
      if (synced > 0) {
        toast.success(`Synced ${synced} offline change${synced > 1 ? 's' : ''}`);
      }
      if (failed > 0) {
        toast.warning(`${failed} item${failed > 1 ? 's' : ''} failed to sync. Will retry later.`);
      }

      this.emit('sync-complete', { synced });
      return { success: true, synced, failed };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      toast.error('Sync failed');
      this.emit('sync-error', { error: String(error) });
      return { success: false, synced, failed };
    } finally {
      this.isSyncing = false;
    }
  }

  private async processQueueItem(item: SyncQueueItem) {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Sync API error');
    }

    return response.json();
  }

  // Helper to queue changes
  async queueChange(table: string, action: 'CREATE' | 'UPDATE' | 'DELETE', data: any) {
    await db.syncQueue.add({
      table,
      action,
      data,
      timestamp: Date.now(),
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      // Use setTimeout to avoid blocking
      setTimeout(() => this.pushChanges(), 100);
    }
  }

  // Get pending sync count
  async getPendingCount(): Promise<number> {
    return db.syncQueue.count();
  }
}

export const syncManager = new SyncManager();

