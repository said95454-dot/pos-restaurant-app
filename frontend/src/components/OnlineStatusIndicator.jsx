import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { pendingCount } from '@/utils/offlineQueue';
import { syncPendingOrders } from '@/utils/offlineSync';

const OnlineStatusIndicator = () => {
  const { t } = useTranslation();
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    try { setPending(await pendingCount()); } catch { /* ignore */ }
  }, []);

  const runSync = useCallback(async (silent = false) => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncPendingOrders();
      const { synced = 0, failed = 0, skipped = false } = result || {};
      if (skipped) return; // another indicator instance is handling it
      if (synced > 0) toast.success(t('offline.synced', { count: synced }), { id: 'sync-ok', duration: 6000 });
      if (failed > 0 && !silent) toast.error(t('common.error'));
    } finally {
      setSyncing(false);
      refreshPending();
    }
  }, [refreshPending, t]);

  useEffect(() => {
    refreshPending();
    const handleOnline = () => {
      setOnline(true);
      toast.success(t('offline.connection_restored'), { id: 'net-status' });
      runSync(true);
    };
    const handleOffline = () => {
      setOnline(false);
      toast.warning(t('offline.connection_lost'), { id: 'net-status' });
    };
    const handleQueueUpdated = () => refreshPending();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pos-queue-updated', handleQueueUpdated);
    // Initial sync attempt + periodic retry while pending
    if (navigator.onLine) runSync(true);
    const interval = setInterval(() => {
      if (navigator.onLine) refreshPending().then(() => {
        pendingCount().then((c) => { if (c > 0) runSync(true); });
      });
    }, 30000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pos-queue-updated', handleQueueUpdated);
      clearInterval(interval);
    };
  }, [refreshPending, runSync]);

  const showSyncBadge = pending > 0;
  const offlineColor = !online ? 'bg-amber/15 border-amber/40 text-amber' : 'bg-success/10 border-success/30 text-success';

  return (
    <AnimatePresence>
      <motion.div
        key="status"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
        data-testid="online-status-indicator"
      >
        <div
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${offlineColor}`}
          data-testid={online ? 'status-online' : 'status-offline'}
        >
          {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {online ? t('offline.online') : t('offline.offline')}
        </div>
        {showSyncBadge && (
          <button
            onClick={() => runSync(false)}
            disabled={!online || syncing}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-primary-500/10 border-primary-500/30 text-primary-500 hover:bg-primary-500/20 disabled:opacity-60"
            title={t('common.confirm')}
            data-testid="sync-pending-button"
          >
            {syncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {pending} {pending === 1 ? t('offline.pending_one') : t('offline.pending_many')}
          </button>
        )}
        {!showSyncBadge && online && !syncing && (
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-medium text-foreground/40">
            <CheckCircle2 className="h-3 w-3" /> {t('offline.no_pending')}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default OnlineStatusIndicator;
