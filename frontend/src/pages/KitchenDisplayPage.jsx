import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, CheckCircle2, Flame, PlayCircle, Undo2, ArrowRight, Bell } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime, onRealtime } from '@/utils/useRealtime';
import { Button } from '@/components/ui/button';
import Aurora from '@/components/Aurora';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_META = {
  new:        { label: 'Nueva',          key: 'amber',   icon: Bell,        next: 'preparing', nextLabel: 'Iniciar' },
  preparing:  { label: 'En preparación', key: 'cyan',    icon: Flame,       next: 'ready',     nextLabel: 'Lista' },
  ready:      { label: 'Lista',          key: 'success', icon: CheckCircle2, next: 'completed', nextLabel: 'Entregar' },
};

// Static Tailwind class maps (JIT-friendly)
const COLORS = {
  amber: {
    icon: 'bg-amber/15 border-amber/30 text-amber',
    dot: 'bg-amber shadow-[0_0_12px_currentColor]',
    pill: 'bg-amber/15 border-amber/30 text-amber',
    btn: 'bg-amber hover:bg-amber/90 text-ink-950',
  },
  cyan: {
    icon: 'bg-primary-500/15 border-primary-500/30 text-primary-500',
    dot: 'bg-primary-500 shadow-[0_0_12px_currentColor]',
    pill: 'bg-primary-500/15 border-primary-500/30 text-primary-500',
    btn: 'bg-primary-500 hover:bg-primary-500/90 text-ink-950',
  },
  success: {
    icon: 'bg-success/15 border-success/30 text-success',
    dot: 'bg-success shadow-[0_0_12px_currentColor]',
    pill: 'bg-success/15 border-success/30 text-success',
    btn: 'bg-success hover:bg-success/90 text-ink-950',
  },
};

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

const authHeaders = () => {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// Beep sound on new order — Web Audio API, no external file
let audioCtx = null;
const beep = () => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const play = (freq, at, dur = 0.15) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.001, now + at);
      g.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + at + dur);
      o.start(now + at); o.stop(now + at + dur);
    };
    play(880, 0);
    play(1175, 0.18);
  } catch { /* noop */ }
};

const elapsedMinutes = (isoDate) => {
  if (!isoDate) return 0;
  const d = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
};

const OrderCard = ({ order, onAdvance, onRegress, index }) => {
  const meta = STATUS_META[order.kds_status] || STATUS_META.new;
  const c = COLORS[meta.key];
  const Icon = meta.icon;
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick(v => v + 1), 15000);
    return () => clearInterval(t);
  }, []);
  const mins = elapsedMinutes(order.created_at);
  const isStale = mins >= 15 && order.kds_status !== 'ready';
  const isVeryStale = mins >= 25 && order.kds_status !== 'ready';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: index * 0.03 }}
      className={`glass rounded-3xl p-5 border ${isVeryStale ? 'border-destructive/60 shadow-[0_0_30px_rgba(255,72,72,0.25)]' : isStale ? 'border-amber/50' : 'border-white/10'}`}
      data-testid={`kds-card-${order.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${c.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono font-black text-lg text-foreground leading-none">#{order.id.slice(0, 6).toUpperCase()}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mt-0.5">{order.customer_name || 'Sin nombre'}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${isVeryStale ? 'bg-destructive/15 text-destructive border border-destructive/30' : isStale ? 'bg-amber/15 text-amber border border-amber/30' : 'bg-white/5 text-foreground/50 border border-white/10'}`}>
          <Clock className="h-3 w-3" /> {mins}m
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        {order.items?.map((it, i) => (
          <div key={i} className="flex items-start gap-2 text-sm" data-testid={`kds-item-${order.id}-${i}`}>
            <span className="font-mono font-black text-primary-500 flex-shrink-0 w-8 text-right">×{it.quantity}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate">{it.product_name}</p>
              {it.selected_options?.length > 0 && (
                <p className="text-[11px] text-foreground/50 mt-0.5">
                  {it.selected_options.map(o => o.name || o).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {order.cashier_name && (
        <p className="text-[10px] text-foreground/40 mb-3">Cobrado por <span className="text-foreground/70 font-bold">{order.cashier_name}</span></p>
      )}

      <div className="flex items-center gap-2">
        {order.kds_status !== 'new' && (
          <button
            type="button"
            onClick={() => onRegress(order)}
            className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-foreground/50 hover:text-foreground flex items-center justify-center transition"
            title="Regresar estado"
            data-testid={`kds-regress-${order.id}`}
          >
            <Undo2 className="h-4 w-4" />
          </button>
        )}
        <Button
          onClick={() => onAdvance(order)}
          className={`flex-1 h-10 rounded-xl font-bold text-sm ${c.btn}`}
          data-testid={`kds-advance-${order.id}`}
        >
          {meta.nextLabel} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
};

const Column = ({ title, status, orders, onAdvance, onRegress, colorKey }) => {
  const c = COLORS[colorKey];
  return (
    <div className="flex-1 min-w-0 flex flex-col" data-testid={`kds-column-${status}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
          <h2 className="font-heading text-xl font-black text-foreground uppercase tracking-wide">{title}</h2>
        </div>
        <span className={`inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-full border text-xs font-black ${c.pill}`} data-testid={`kds-count-${status}`}>
          {orders.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {orders.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground/30 text-sm">
            Sin órdenes
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {orders.map((o, i) => (
              <OrderCard key={o.id} order={o} index={i} onAdvance={onAdvance} onRegress={onRegress} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

const KitchenDisplayPage = () => {
  const { isAuthenticated } = useAuth();
  useRealtime();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('kds_sound') !== 'false');
  const knownIdsRef = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const r = await axios.get(`${API_URL}/orders/kds/board`, { headers: authHeaders() });
      const rows = r.data || [];
      setOrders(rows);
      knownIdsRef.current = new Set(rows.map(o => o.id));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    document.body.classList.add('customer-display-mode');
    return () => document.body.classList.remove('customer-display-mode');
  }, []);

  useEffect(() => { localStorage.setItem('kds_sound', String(soundOn)); }, [soundOn]);
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  // Realtime: new order arrives → prepend & beep, kds status change → reload
  useEffect(() => {
    const offNew = onRealtime('order.created', (data) => {
      // Fetch fresh (data payload doesn't include full items)
      load();
      if (soundOn && data?.id && !knownIdsRef.current.has(data.id)) {
        beep();
        toast.success(`Orden #${(data.id || '').slice(0, 6).toUpperCase()} — ${data.customer_name || 'Sin nombre'}`, { id: `kds-${data.id}` });
      }
    });
    const offStatus = onRealtime('order.kds_status', () => load());
    return () => { offNew(); offStatus(); };
  }, [load, soundOn]);

  const byStatus = useMemo(() => ({
    new: orders.filter(o => (o.kds_status || 'new') === 'new'),
    preparing: orders.filter(o => o.kds_status === 'preparing'),
    ready: orders.filter(o => o.kds_status === 'ready'),
  }), [orders]);

  const advance = async (order) => {
    const next = STATUS_META[order.kds_status || 'new']?.next;
    if (!next) return;
    // Optimistic update
    setOrders(prev => next === 'completed' ? prev.filter(o => o.id !== order.id) : prev.map(o => o.id === order.id ? { ...o, kds_status: next } : o));
    try {
      await axios.put(`${API_URL}/orders/${order.id}/kds-status`, { kds_status: next }, { headers: authHeaders() });
    } catch { toast.error('No se pudo actualizar'); load(); }
  };

  const regress = async (order) => {
    const map = { preparing: 'new', ready: 'preparing' };
    const prev = map[order.kds_status];
    if (!prev) return;
    setOrders(cur => cur.map(o => o.id === order.id ? { ...o, kds_status: prev } : o));
    try {
      await axios.put(`${API_URL}/orders/${order.id}/kds-status`, { kds_status: prev }, { headers: authHeaders() });
    } catch { toast.error('No se pudo actualizar'); load(); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 flex flex-col" data-testid="kitchen-display-page">
      <Aurora />
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6 border-b border-white/5 backdrop-blur-xl bg-ink-950/40">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-amber/15 border border-amber/40 text-amber flex items-center justify-center shadow-[0_0_20px_rgba(255,193,7,0.3)]">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber">Kitchen Display System</p>
            <h1 className="font-heading text-2xl md:text-3xl font-black text-foreground">Comandas de Cocina</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundOn(s => !s)}
            className={`inline-flex items-center gap-2 h-10 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition ${soundOn ? 'bg-primary-500/15 border-primary-500/40 text-primary-500' : 'bg-white/5 border-white/10 text-foreground/50'}`}
            data-testid="kds-sound-toggle"
            title="Sonido de nueva orden"
          >
            {soundOn ? <PlayCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {soundOn ? 'Sonido ON' : 'Sonido OFF'}
          </button>
          <div className="hidden md:flex items-center gap-1 h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-foreground/60">
            <span className="font-mono">{orders.length}</span> pendientes
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-hidden p-4 md:p-6">
        {loading ? (
          <div className="h-full flex items-center justify-center text-foreground/40">Cargando…</div>
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Column title="Nuevas" status="new" orders={byStatus.new} onAdvance={advance} onRegress={regress} colorKey="amber" />
            <Column title="En preparación" status="preparing" orders={byStatus.preparing} onAdvance={advance} onRegress={regress} colorKey="cyan" />
            <Column title="Listas" status="ready" orders={byStatus.ready} onAdvance={advance} onRegress={regress} colorKey="success" />
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenDisplayPage;
