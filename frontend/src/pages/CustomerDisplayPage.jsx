import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ShoppingBag, Coffee, CheckCircle2, Heart, CreditCard, Banknote, ArrowRightLeft, Sparkles, ChefHat } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

const IdleScreen = ({ business }) => {
  const { t } = useTranslation();
  const [taglineIdx, setTaglineIdx] = useState(0);
  const taglines = [
    t('customer_display.presentation.tagline_1'),
    t('customer_display.presentation.tagline_2'),
    t('customer_display.presentation.tagline_3'),
    t('customer_display.presentation.tagline_4'),
  ];

  // Rotate through taglines every 5s
  useEffect(() => {
    const int = setInterval(() => {
      setTaglineIdx((i) => (i + 1) % taglines.length);
    }, 5000);
    return () => clearInterval(int);
  }, [taglines.length]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative" data-testid="display-idle">
      {/* Floating decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[15%] left-[10%] h-40 w-40 rounded-full bg-primary-500/10 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[20%] right-[15%] h-56 w-56 rounded-full bg-amber/10 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[50%] left-[70%] h-32 w-32 rounded-full bg-accent-500/10 blur-3xl"
          animate={{ x: [0, -20, 20, 0], y: [0, 20, -10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Logo with pulsing halo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-10 relative"
      >
        {/* Pulsing halo */}
        <motion.div
          className="absolute inset-0 rounded-3xl bg-primary-500/30 blur-2xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative">
          {business?.logo ? (
            <img src={business.logo} alt={business.name} className="max-h-40 max-w-xs object-contain drop-shadow-[0_0_40px_rgba(0,229,255,0.5)]" />
          ) : (
            <div className="h-40 w-40 rounded-3xl bg-gradient-to-br from-primary-500/25 to-amber/25 border border-primary-500/40 flex items-center justify-center">
              <ChefHat className="h-20 w-20 text-primary-500" />
            </div>
          )}
        </div>
      </motion.div>

      {/* Restaurant name */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="font-heading text-5xl md:text-7xl lg:text-8xl font-black text-foreground mb-4 tracking-tight relative z-10"
      >
        {business?.name || t('customer_display.welcome_default')}
      </motion.h1>

      {/* Rotating taglines */}
      <div className="h-16 md:h-20 flex items-center justify-center relative z-10 mb-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={taglineIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6 }}
            className="text-xl md:text-2xl lg:text-3xl font-medium text-foreground/70 max-w-2xl"
            data-testid="display-tagline"
          >
            {taglines[taglineIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Open now badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 inline-flex items-center gap-2 rounded-full px-5 py-2 bg-success/10 border border-success/40 text-success mb-8"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-success pulse-dot" />
        <span className="text-sm font-bold uppercase tracking-widest">{t('customer_display.presentation.hours_hint')}</span>
      </motion.div>

      {/* CTA */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ delay: 0.6, duration: 3, repeat: Infinity }}
        className="relative z-10 text-sm md:text-base font-bold uppercase tracking-[0.3em] text-primary-500 flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {t('customer_display.presentation.cta')}
        <Sparkles className="h-4 w-4" />
      </motion.p>
    </div>
  );
};

const CartScreen = ({ cart, business }) => {
  const { t } = useTranslation();
  const items = cart?.items || [];
  const PayIcon = PAYMENT_ICONS[cart?.payment_method] || Banknote;
  const isCash = cart?.payment_method === 'cash';
  const cashReceived = Number(cart?.amount_received || 0);
  const changeDue = Number(cart?.change || 0);
  const total = Number(cart?.total || 0);
  const showLiveChange = cart?.is_checkout_open && isCash && cashReceived >= total && total > 0;
  const paymentLabel = cart?.payment_method
    ? t(`checkout.${cart.payment_method}`, cart.payment_method)
    : t('customer_display.to_confirm');
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary-500">{t('customer_display.your_order')}</p>
            <h2 className="font-heading text-2xl md:text-3xl font-black text-foreground">{business?.name || t('customer_display.welcome_default')}</h2>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-foreground/40 text-lg">
            {t('customer_display.waiting')}
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
            <span>{t('common.subtotal')}</span>
            <span className="font-mono font-bold" data-testid="display-subtotal">{formatMoney(cart?.subtotal)}</span>
          </div>
          {(cart?.tip || 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between text-base text-success"
            >
              <span className="font-bold">+ {t('common.tip')}</span>
              <span className="font-mono font-bold" data-testid="display-tip">{formatMoney(cart.tip)}</span>
            </motion.div>
          )}
          <div className="border-t border-white/10 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">{t('customer_display.total_pay')}</p>
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

          {/* LIVE change during checkout — pulses in when cashier types amount received */}
          <AnimatePresence>
            {showLiveChange && (
              <motion.div
                key="live-change"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="mt-4 rounded-3xl bg-gradient-to-br from-amber/25 to-amber/5 border-2 border-amber/60 p-5 shadow-[0_0_60px_rgba(255,193,7,0.35)]"
                data-testid="display-live-change"
              >
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-amber/80 mb-1">
                  <span>{t('customer_display.received')}</span>
                  <span className="font-mono text-foreground text-sm" data-testid="display-live-received">{formatMoney(cashReceived)}</span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber mb-1 mt-3">{t('customer_display.your_change')}</p>
                <motion.p
                  key={changeDue}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  className="font-mono font-black text-amber text-5xl md:text-6xl leading-none drop-shadow-[0_0_20px_rgba(255,193,7,0.6)]"
                  data-testid="display-live-change-amount"
                >
                  {formatMoney(changeDue)}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-3 mt-4 p-3 rounded-2xl bg-white/5 border border-white/10">
            <PayIcon className="h-5 w-5 text-amber" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{t('customer_display.payment_method')}</p>
              <p className="text-sm font-bold text-foreground">{paymentLabel}</p>
            </div>
          </div>
          {cart?.cashier_name && (
            <p className="text-[11px] text-foreground/40 mt-2">{t('customer_display.served_by', { name: '' }).replace('{{name}}', '')}<span className="text-foreground font-bold">{cart.cashier_name}</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

const ThankYouScreen = ({ order, business }) => {
  const { t } = useTranslation();
  const isCash = order?.payment_method === 'cash';
  const changeDue = Number(order?.change || 0);
  const amountReceived = Number(order?.amount_received || 0);
  const showChangeHero = isCash && changeDue > 0;
  const paymentLabel = order?.payment_method
    ? t(`checkout.${order.payment_method}`, order.payment_method)
    : t('common.confirm');
  return (
  <motion.div
    initial={{ opacity: 0, scale: 0.94 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
    data-testid="display-thankyou"
  >
    {/* radial glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full blur-3xl animate-pulse ${showChangeHero ? 'bg-amber/15' : 'bg-success/10'}`} />
    </div>

    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 14 }}
      className="relative z-10 h-24 w-24 rounded-full bg-success/15 border-2 border-success flex items-center justify-center mb-5 shadow-[0_0_60px_rgba(0,255,163,0.4)]"
    >
      <CheckCircle2 className="h-14 w-14 text-success" strokeWidth={2.5} />
    </motion.div>

    <motion.h1
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative z-10 font-heading text-4xl md:text-5xl font-black text-foreground mb-2"
    >
      {t('customer_display.thank_you')} <Heart className="inline h-8 w-8 md:h-10 md:w-10 text-amber fill-amber" />
    </motion.h1>

    {/* CAMBIO HERO — shown huge for cash payments with change > 0 */}
    {showChangeHero && (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 18 }}
        className="relative z-10 mt-4 mb-6 px-10 py-6 rounded-3xl bg-gradient-to-br from-amber/20 to-amber/5 border-2 border-amber/50 shadow-[0_0_80px_rgba(255,193,7,0.35)]"
        data-testid="thankyou-change-hero"
      >
        <p className="text-xs md:text-sm font-bold uppercase tracking-[0.3em] text-amber/80 mb-2">{t('customer_display.your_change')}</p>
        <p className="font-mono font-black text-amber text-7xl md:text-8xl lg:text-9xl leading-none drop-shadow-[0_0_30px_rgba(255,193,7,0.7)]" data-testid="thankyou-change-amount">
          {formatMoney(changeDue)}
        </p>
      </motion.div>
    )}

    {/* Payment summary row — always shown */}
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="relative z-10 mt-2 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full"
      data-testid="thankyou-summary"
    >
      <div className="glass rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">{t('customer_display.total')}</p>
        <p className="font-mono font-black text-2xl text-primary-500 text-glow-cyan" data-testid="thankyou-total">{formatMoney(order?.total)}</p>
      </div>
      {isCash ? (
        <>
          <div className="glass rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">{t('customer_display.received')}</p>
            <p className="font-mono font-black text-2xl text-foreground" data-testid="thankyou-received">{formatMoney(amountReceived)}</p>
          </div>
          <div className={`rounded-2xl p-4 ${changeDue > 0 ? 'bg-amber/10 border border-amber/40' : 'glass'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber/80 mb-1">{t('customer_display.change')}</p>
            <p className={`font-mono font-black text-2xl ${changeDue > 0 ? 'text-amber' : 'text-foreground/60'}`}>{formatMoney(changeDue)}</p>
          </div>
        </>
      ) : (
        <div className="glass rounded-2xl p-4 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">{t('customer_display.payment_method')}</p>
          <p className="font-bold text-lg text-foreground">{paymentLabel}</p>
        </div>
      )}
    </motion.div>

    {(order?.tip || 0) > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="relative z-10 inline-flex items-center gap-2 bg-success/10 border border-success/40 text-success text-sm font-bold rounded-full px-4 py-2 mb-4"
        data-testid="thankyou-tip"
      >
        <Heart className="h-4 w-4" /> {t('customer_display.tip_message', { tip: Number(order.tip || 0).toFixed(2) })}
      </motion.div>
    )}

    {business?.qr_url && (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="relative z-10 mt-2 glass rounded-3xl p-4 flex items-center gap-4"
        data-testid="thankyou-qr"
      >
        <div className="bg-white p-2 rounded-xl">
          <QRCodeSVG value={business.qr_url} size={80} level="M" />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">{t('customer_display.scan')}</p>
          <p className="font-heading text-base font-bold text-foreground">{business.qr_label || t('customer_display.follow_us')}</p>
        </div>
      </motion.div>
    )}
  </motion.div>
  );
};

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
        if (typeof thankTimerRef.current !== 'boolean') clearTimeout(thankTimerRef.current);
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
    const offClear = onRealtime('cart.clear', () => {
      // Don't dismiss the thank-you screen when POS clears its cart after checkout
      if (thankTimerRef.current) return;
      setCart(null);
    });
    const offOrder = onRealtime('order.created', (order) => {
      setLastOrder(order);
      // Keep the thank-you screen visible for 15s OR until the next sale begins
      // (whichever comes first — cart.update with items > 0 also dismisses it).
      if (thankTimerRef.current && typeof thankTimerRef.current !== 'boolean') {
        clearTimeout(thankTimerRef.current);
      }
      thankTimerRef.current = setTimeout(() => {
        setLastOrder(null);
        setCart(null);
        thankTimerRef.current = null;
      }, 15000);
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
