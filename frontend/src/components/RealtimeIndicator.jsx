import React, { useEffect, useState } from 'react';
import { Radio, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRealtime, onRealtime } from '@/utils/useRealtime';
import { useAuth } from '@/contexts/AuthContext';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

const RealtimeIndicator = () => {
  const { t } = useTranslation();
  const { isAuthenticated, cashier } = useAuth();
  const { connected, presenceCount } = useRealtime();
  const [recentOrder, setRecentOrder] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Toast when *another* iPad creates an order (skip self)
    const off = onRealtime('order.created', (data) => {
      const isSelf = cashier && data?.cashier_name === cashier.name;
      if (isSelf) return; // don't notify the device that just made the sale
      const who = data?.cashier_name || '';
      toast.success(`${data?.customer_name || ''}${who ? ' · ' + who : ''} — ${formatMoney(data?.total)}`, {
        id: `order-${data?.id}`,
        duration: 4500,
      });
      setRecentOrder({ ...data, _at: Date.now() });
    });
    return off;
  }, [isAuthenticated, cashier]);

  if (!isAuthenticated) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
        data-testid="realtime-indicator"
      >
        <div
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${connected ? 'bg-primary-500/10 border-primary-500/30 text-primary-500' : 'bg-foreground/5 border-white/10 text-foreground/40'}`}
          data-testid={connected ? 'realtime-online' : 'realtime-offline'}
          title={connected ? t('realtime.online') : t('realtime.reconnecting')}
        >
          <Radio className={`h-3 w-3 ${connected ? 'animate-pulse' : ''}`} />
          {connected ? t('realtime.online') : t('realtime.reconnecting')}
        </div>
        {connected && (
          <div
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border bg-amber/10 border-amber/30 text-amber"
            title={`${presenceCount} ${presenceCount === 1 ? t('realtime.screens_singular') : t('realtime.screens_plural')}`}
            data-testid="realtime-presence-count"
          >
            <Users className="h-3 w-3" /> {presenceCount} {presenceCount === 1 ? t('realtime.screens_singular') : t('realtime.screens_plural')}
          </div>
        )}
        {recentOrder && Date.now() - (recentOrder._at || 0) < 6000 && (
          <span className="hidden md:inline text-[10px] font-mono text-success animate-pulse">+{formatMoney(recentOrder.total)}</span>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default RealtimeIndicator;
