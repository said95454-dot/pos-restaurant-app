import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ShoppingBag, Coffee, CheckCircle2, Heart, CreditCard, Banknote, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { businessApi } from '@/utils/api';
import { useRealtime, onRealtime } from '@/utils/useRealtime';
import Aurora from '@/components/Aurora';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

const PAYMENT_ICONS = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowRightLeft,
};
const PAYMENT_LABELS = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

const IdleScreen = ({ business }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center" data-testid="display-idle">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-8"
    >
      {business?.logo ? (
        <img src={business.logo} alt={business.name} className="max-h-40 max-w-xs object-contain drop-shadow-[0_0_40px_rgba(0,229,255,0.35)]" />
      ) : (
        <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-primary-500/25 to-amber/25 border border-primary-500/40 flex items-center justify-center">
          <Coffee className="h-16 w-16 text-primary-500" />
        </div>
      )}
    </motion.div>
    <motion.h1
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="font-heading text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-3 tracking-tight"
    >
      {business?.name || 'Bienvenido'}
    </motion.h1>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="text-base md:text-lg text-foreground/50 max-w-md"
    >
      Toma asiento — nuestro equipo tomará tu orden en un momento.
    </motion.p>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.3, 1] }}
      transition={{ delay: 0.6, duration: 2.4, repeat: Infinity }}
      className="mt-16 h-1.5 w-24 rounded-full bg-primary-500 shadow-[0_0_20px_rgba(0,229,255,0.7)]"
    />
  </div>
);

const CartScreen = ({ cart, business }) => {
  const items = cart?.items || [];
  const PayIcon = PAYMENT_ICONS[cart?.payment_method] || Banknote;
  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden" data-testid="display-cart">
      {/* Left: header + items */}
      <div className="flex-1 flex flex-col p-6 md:p-10 overflow-hidden">
        <div className="flex items-center gap-4 mb-6">
          {business?.logo ? (
            <img src={business.logo} alt={business.name} className="h-14 w-14 rounded-2xl object-contain bg-ink-800/60 border border-white/10 p-1" />
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center">
              <ShoppingBag className="h-7 w-7 text-primary-500" />
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary-500">Tu pedido en vivo</p>
            <h2 className="font-heading text-2xl md:text-3xl font-black text-foreground">{business?.name || 'Mi Restaurante'}</h2>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-foreground/40 text-lg">
            El cajero está listo… agrega productos y aparecerán aquí ✨
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 space-y-3" data-testid="display-items">
            <AnimatePresence>
              {items.map((it, idx) => (
                <motion.div
                  key={`${it.product_name}-${idx}`}
                  initial={{ opacity: 0, x: 20, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="glass rounded-2xl p-4 flex items-center gap-4"
                  data-testid={`display-item-${idx}`}
                >
                  <div className="h-16 w-16 rounded-xl bg-ink-800/60 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {it.image ? (
                      <img src={it.image} alt={it.product_name} className="h-full w-full object-cover" />
                    ) : (
                      <Coffee className="h-7 w-7 text-primary-500/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-lg truncate">{it.product_name}</p>
                    {it.selected_options?.length > 0 && (
                      <p className="text-xs text-foreground/50 mt-0.5 truncate">{it.selected_options.join(', ')}</p>
                    )}
                    <p className="text-xs text-foreground/40 mt-0.5">{formatMoney(it.product_price)} c/u</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-500/15 border border-primary-500/40 text-primary-500 font-mono font-black text-sm mb-1">×{it.quantity}</div>
                    <p className="font-mono font-black text-foreground">{formatMoney(it.subtotal)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Right: totals sticky */}
      <div className="md:w-[380px] md:min-w-[380px] p-6 md:p-8 bg-ink-900/70 backdrop-blur-lg border-l border-white/5 flex flex-col justify-end">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-base text-foreground/70">
            <span>Subtotal</span>
            <span className="font-mono font-bold" data-testid="display-subtotal">{formatMoney(cart?.subtotal)}</span>
          </div>
          {(cart?.tip || 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between text-base text-success"
            >
              <span className="font-bold">+ Propina</span>
              <span className="font-mono font-bold" data-testid="display-tip">{formatMoney(cart.tip)}</span>
            </motion.div>
          )}
          <div className="border-t border-white/10 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Total a pagar</p>
            <motion.p
              key={cart?.total}
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="font-mono font-black text-primary-500 text-5xl md:text-6xl leading-none text-glow-cyan"
              data-testid="display-total"
            >
              {formatMoney(cart?.total)}
            </motion.p>
          </div>
          <div className="flex items-center gap-3 mt-4 p-3 rounded-2xl bg-white/5 border border-white/10">
            <PayIcon className="h-5 w-5 text-amber" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Método de pago</p>
              <p className="text-sm font-bold text-foreground">{PAYMENT_LABELS[cart?.payment_method] || 'Por confirmar'}</p>
            </div>
          </div>
          {cart?.cashier_name && (
            <p className="text-[11px] text-foreground/40 mt-2">Te atiende <span className="text-foreground font-bold">{cart.cashier_name}</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

const ThankYouScreen = ({ order, business }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.94 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
    data-testid="display-thankyou"
  >
    {/* radial glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-success/10 blur-3xl animate-pulse" />
    </div>

    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 14 }}
      className="relative z-10 h-28 w-28 rounded-full bg-success/15 border-2 border-success flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(0,255,163,0.4)]"
    >
      <CheckCircle2 className="h-16 w-16 text-success" strokeWidth={2.5} />
    </motion.div>

    <motion.h1
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative z-10 font-heading text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-4"
    >
      ¡Gracias! <Heart className="inline h-10 w-10 md:h-12 md:w-12 text-amber fill-amber" />
    </motion.h1>

    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="relative z-10 text-lg md:text-xl text-foreground/70 mb-4"
    >
      Tu pago de <span className="font-mono font-black text-primary-500">{formatMoney(order?.total)}</span> fue registrado
    </motion.p>

    {(order?.tip || 0) > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 inline-flex items-center gap-2 bg-success/10 border border-success/40 text-success text-sm font-bold rounded-full px-4 py-2 mb-6"
        data-testid="thankyou-tip"
      >
        <Heart className="h-4 w-4" /> Propina de {formatMoney(order.tip)} — ¡mil gracias!
      </motion.div>
    )}

    {business?.qr_url && (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="relative z-10 mt-4 glass rounded-3xl p-5 flex items-center gap-4"
        data-testid="thankyou-qr"
      >
        <div className="bg-white p-2 rounded-xl">
          <QRCodeSVG value={business.qr_url} size={100} level="M" />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Escanea y</p>
          <p className="font-heading text-lg font-bold text-foreground">{business.qr_label || 'Síguenos'}</p>
        </div>
      </motion.div>
    )}
  </motion.div>
);

const CustomerDisplayPage = () => {
  const { isAuthenticated } = useAuth();
  useRealtime(); // ensure connection is open
  const [business, setBusiness] = useState(null);
  const [cart, setCart] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const idleTimerRef = useRef(null);
  const thankTimerRef = useRef(null);

  // Fullscreen-friendly UX
  useEffect(() => {
    document.body.classList.add('customer-display-mode');
    return () => document.body.classList.remove('customer-display-mode');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    businessApi.get().then(setBusiness).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const offCart = onRealtime('cart.update', (data) => {
      // If a new non-empty cart arrives during thank-you window, snap back to live preview
      if (thankTimerRef.current && (data?.items || []).length > 0) {
        clearTimeout(thankTimerRef.current);
        thankTimerRef.current = null;
        setLastOrder(null);
      }
      if (thankTimerRef.current) return;
      setCart(data);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if ((data?.items || []).length === 0) {
        idleTimerRef.current = setTimeout(() => setCart(null), 90000);
      }
    });
    const offClear = onRealtime('cart.clear', () => setCart(null));
    const offOrder = onRealtime('order.created', (order) => {
      setLastOrder(order);
      if (thankTimerRef.current) clearTimeout(thankTimerRef.current);
      thankTimerRef.current = setTimeout(() => {
        setLastOrder(null);
        setCart(null);
        thankTimerRef.current = null;
      }, 10000);
    });
    return () => { offCart(); offClear(); offOrder(); };
  }, [isAuthenticated]);

  const hasItems = (cart?.items || []).length > 0;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 flex flex-col" data-testid="customer-display-page">
      <Aurora />
      <AnimatePresence mode="wait">
        {lastOrder ? (
          <motion.div key="thank" className="flex-1 flex flex-col relative z-10" exit={{ opacity: 0 }}>
            <ThankYouScreen order={lastOrder} business={business} />
          </motion.div>
        ) : hasItems ? (
          <motion.div key="cart" className="flex-1 flex flex-col relative z-10" exit={{ opacity: 0 }}>
            <CartScreen cart={cart} business={business} />
          </motion.div>
        ) : (
          <motion.div key="idle" className="flex-1 flex flex-col relative z-10" exit={{ opacity: 0 }}>
            <IdleScreen business={business} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerDisplayPage;
