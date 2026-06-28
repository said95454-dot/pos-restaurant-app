import React, { useState, useEffect, useMemo, useRef } from 'react';
import { productsApi, ordersApi, businessApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Minus, Search, ShoppingBag, Utensils, Coffee, Banknote, CreditCard, ArrowRightLeft, Loader2, X, Check, Receipt as ReceiptIcon, Sparkles, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedNumber from '@/components/AnimatedNumber';
import CashierGate from '@/components/CashierGate';
import Receipt, { printOrder } from '@/components/Receipt';
import { playCheckout, playError, playTap } from '@/utils/sound';
import { enqueueOrder } from '@/utils/offlineQueue';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

const POSPage = () => {
  return (
    <CashierGate>
      <POSContent />
    </CashierGate>
  );
};

const POSContent = () => {
  const { restaurant, cashier } = useAuth();
  const [products, setProducts] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('comida');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOptionsFor, setShowOptionsFor] = useState(null);
  const [tempOptions, setTempOptions] = useState([]);
  const [customer, setCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('auto_print') !== 'false');

  const loadProducts = async () => {
    try {
      const [p, b] = await Promise.all([productsApi.list(), businessApi.get()]);
      setProducts(p);
      setBusiness(b);
    } catch { toast.error('No se pudieron cargar los productos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadProducts(); }, []);

  useEffect(() => { localStorage.setItem('auto_print', String(autoPrint)); }, [autoPrint]);

  const filtered = useMemo(() => products.filter(p => {
    const catMatch = p.category === activeCategory;
    const sMatch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return catMatch && sMatch;
  }), [products, activeCategory, search]);

  const total = useMemo(() => cart.reduce((sum, it) => sum + it.subtotal, 0), [cart]);
  const change = useMemo(() => Math.max(0, (parseFloat(amountReceived) || 0) - total), [amountReceived, total]);

  const addToCart = (product, opts = []) => {
    setCart(prev => {
      const key = product.id + '|' + opts.join('|');
      const idx = prev.findIndex(it => (it.product.id + '|' + (it.selected_options || []).join('|')) === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1, subtotal: (next[idx].quantity + 1) * product.price };
        return next;
      }
      return [...prev, { product, quantity: 1, selected_options: opts, subtotal: product.price }];
    });
  };

  const handleProductClick = (product) => {
    if (product.custom_options?.length > 0) { setShowOptionsFor(product); setTempOptions([]); }
    else addToCart(product);
  };
  const confirmOptions = () => { addToCart(showOptionsFor, tempOptions); setShowOptionsFor(null); setTempOptions([]); };

  const updateQty = (idx, delta) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[idx].quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== idx);
      next[idx] = { ...next[idx], quantity: newQty, subtotal: newQty * next[idx].product.price };
      return next;
    });
  };
  const removeItem = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));
  const clearCart = () => setCart([]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!customer.trim()) { toast.error('Ingresa el nombre del cliente'); return; }
    if (paymentMethod === 'cash') {
      if ((parseFloat(amountReceived) || 0) < total) { toast.error('El monto recibido es menor al total'); return; }
    }
    setSubmitting(true);
    const orderPayload = {
      customer_name: customer.trim(),
      items: cart.map(it => ({
        product_id: it.product.id,
        product_name: it.product.name,
        product_price: it.product.price,
        quantity: it.quantity,
        selected_options: it.selected_options || [],
        subtotal: it.subtotal,
      })),
      total,
      payment_method: paymentMethod,
      amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) : null,
      change: paymentMethod === 'cash' ? change : null,
      cashier_id: cashier?.id || null,
      cashier_name: cashier?.name || null,
    };

    const finishLocal = (orderForReceipt, message) => {
      toast.success(message);
      playCheckout();
      setLastOrder(orderForReceipt);
      setCart([]); setCustomer(''); setAmountReceived(''); setShowCheckout(false); setShowCart(false);
      if (autoPrint) printOrder();
    };

    try {
      if (!navigator.onLine) {
        const queued = await enqueueOrder(orderPayload, localStorage.getItem('token'));
        window.dispatchEvent(new Event('pos-queue-updated'));
        const offlineOrder = {
          ...orderPayload,
          id: queued.localId,
          status: 'pending-sync',
          created_at: queued.createdAt,
          offline: true,
        };
        finishLocal(offlineOrder, `Venta guardada offline (${formatMoney(total)})`);
      } else {
        const order = await ordersApi.create(orderPayload);
        finishLocal(order, `Venta registrada: ${formatMoney(total)}`);
      }
    } catch (e) {
      // Network error after passing the online check → queue locally
      const isNetwork = !e.response;
      if (isNetwork) {
        try {
          const queued = await enqueueOrder(orderPayload, localStorage.getItem('token'));
          window.dispatchEvent(new Event('pos-queue-updated'));
          const offlineOrder = {
            ...orderPayload,
            id: queued.localId,
            status: 'pending-sync',
            created_at: queued.createdAt,
            offline: true,
          };
          finishLocal(offlineOrder, `Venta guardada offline (${formatMoney(total)})`);
        } catch (qe) {
          toast.error('No se pudo registrar ni encolar la venta');
        }
      } else {
        toast.error(e.response?.data?.detail || 'Error al registrar la venta');
      }
    } finally { setSubmitting(false); }
  };

  const handleManualPrint = () => {
    if (!lastOrder) { toast.error('No hay venta reciente para imprimir'); return; }
    printOrder();
  };

  const categories = [
    { id: 'comida', label: 'Comida', icon: Utensils },
    { id: 'bebida', label: 'Bebida', icon: Coffee },
  ];
  const itemCount = cart.reduce((s, it) => s + it.quantity, 0);

  const LOGO_SIZE_MAP = { sm: 48, md: 72, lg: 100, xl: 140 };
  const logoSize = LOGO_SIZE_MAP[business?.logo_size || 'md'];

  return (
    <div className="flex-1 flex h-full overflow-hidden" data-testid="pos-page">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 glass-strong border-b border-white/5 relative z-10">
          {/* Centered logo + restaurant name */}
          {business?.logo && (
            <div className="flex flex-col items-center mb-3" data-testid="pos-header-logo">
              <div
                className="relative rounded-2xl overflow-hidden border border-primary-500/30 shadow-neon-cyan bg-ink-900"
                style={{ width: logoSize, height: logoSize }}
              >
                <img src={business.logo} alt="" className="w-full h-full object-contain" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest uppercase text-foreground/40">Punto de Venta</p>
              <h1 className="font-heading text-2xl font-black text-gradient truncate" data-testid="pos-restaurant-name">
                {business?.name || restaurant?.restaurant_name}
              </h1>
            </div>
            <div className="relative w-full max-w-xs flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto…"
                  className="pl-11 h-11 rounded-full bg-ink-800/60 border border-white/5 focus:border-primary-500 text-foreground placeholder:text-foreground/30"
                  data-testid="pos-search-input"
                />
              </div>
              {lastOrder && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleManualPrint}
                  className="h-11 w-11 rounded-full bg-amber/15 border border-amber/30 text-amber hover:bg-amber/25 flex items-center justify-center flex-shrink-0"
                  title="Reimprimir último ticket"
                  data-testid="reprint-last-button"
                >
                  <Printer className="h-5 w-5" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 snap-x-mandatory">
            {categories.map(c => {
              const Icon = c.icon;
              const isActive = activeCategory === c.id;
              return (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setActiveCategory(c.id)}
                  data-testid={`pos-category-${c.id}`}
                  className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap snap-start transition-colors ${
                    isActive ? 'text-ink-950' : 'text-foreground/60 bg-white/5 border border-white/5 hover:bg-white/10'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-cat-pill"
                      className="absolute inset-0 rounded-full bg-primary-500 shadow-neon-cyan"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className="relative h-4 w-4" strokeWidth={2.2} />
                  <span className="relative">{c.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 lg:pb-6">
          {loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState empty={products.length === 0} />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
            >
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p)} />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Cart Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-96 glass-strong border-l border-white/5 relative z-10">
        <CartContent cart={cart} updateQty={updateQty} removeItem={removeItem} clearCart={clearCart} total={total} onCheckout={() => setShowCheckout(true)} cashier={cashier} />
      </aside>

      {/* Mobile cart bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="lg:hidden fixed bottom-[80px] left-0 right-0 px-4 z-30 safe-bottom"
          >
            <button
              onClick={() => setShowCart(true)}
              className="w-full h-16 rounded-2xl bg-primary-500 text-ink-950 flex items-center justify-between px-5 shadow-neon-cyan ios-press"
              data-testid="mobile-cart-trigger"
            >
              <span className="flex items-center gap-3 font-bold">
                <span className="bg-ink-950 text-primary-500 rounded-full h-8 w-8 flex items-center justify-center text-sm font-black">{itemCount}</span>
                Ver carrito
              </span>
              <span className="font-heading font-black text-xl"><AnimatedNumber value={total} format={(v) => formatMoney(v)} /></span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile cart drawer */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="lg:hidden p-0 max-w-full h-[85vh] rounded-t-3xl rounded-b-none top-auto bottom-0 translate-y-0 bg-ink-900 border-white/5" data-testid="mobile-cart-drawer">
          <DialogHeader className="sr-only">
            <DialogTitle>Carrito</DialogTitle>
            <DialogDescription>Lista de productos a cobrar</DialogDescription>
          </DialogHeader>
          <CartContent cart={cart} updateQty={updateQty} removeItem={removeItem} clearCart={clearCart} total={total} onCheckout={() => { setShowCart(false); setShowCheckout(true); }} cashier={cashier} />
        </DialogContent>
      </Dialog>

      {/* Options modal */}
      <Dialog open={!!showOptionsFor} onOpenChange={(v) => !v && setShowOptionsFor(null)}>
        <DialogContent className="rounded-3xl max-w-md bg-ink-900 border-white/5" data-testid="product-options-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{showOptionsFor?.name}</DialogTitle>
            <DialogDescription className="text-foreground/50 text-sm">Selecciona las opciones</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-2 max-h-72 overflow-y-auto">
            {showOptionsFor?.custom_options?.map(opt => {
              const checked = tempOptions.includes(opt);
              return (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTempOptions(prev => checked ? prev.filter(o => o !== opt) : [...prev, opt])}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    checked ? 'border-primary-500 bg-primary-500/10 text-primary-500 shadow-neon-cyan' : 'border-white/10 bg-white/5 text-foreground hover:bg-white/10'
                  }`}
                  data-testid={`option-${opt}`}
                >
                  <span className="font-medium">{opt}</span>
                  {checked && <Check className="h-5 w-5" />}
                </motion.button>
              );
            })}
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setShowOptionsFor(null)}>Cancelar</Button>
            <Button className="flex-1 h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan" onClick={confirmOptions} data-testid="confirm-options-button">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="rounded-3xl max-w-md bg-ink-900 border-white/5" data-testid="checkout-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Cobrar venta</DialogTitle>
            <DialogDescription className="text-foreground/50 text-sm">
              Total: <span className="font-mono font-bold text-primary-500 text-glow-cyan">{formatMoney(total)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase text-foreground/60">Cliente</label>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Nombre del cliente"
                className="h-12 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500"
                data-testid="checkout-customer-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase text-foreground/60">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Efectivo', icon: Banknote },
                  { id: 'card', label: 'Tarjeta', icon: CreditCard },
                  { id: 'transfer', label: 'Transfer.', icon: ArrowRightLeft },
                ].map(pm => {
                  const Icon = pm.icon;
                  const active = paymentMethod === pm.id;
                  return (
                    <motion.button
                      key={pm.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setPaymentMethod(pm.id)}
                      data-testid={`payment-${pm.id}`}
                      className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                        active ? 'border-primary-500 bg-primary-500/10 text-primary-500 shadow-neon-cyan' : 'border-white/10 bg-white/5 text-foreground hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-bold">{pm.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <AnimatePresence>
              {paymentMethod === 'cash' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-bold tracking-widest uppercase text-foreground/60">Monto recibido</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0.00"
                    className="h-16 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500 text-3xl font-mono font-bold text-center text-primary-500"
                    data-testid="checkout-amount-input"
                  />
                  {amountReceived && parseFloat(amountReceived) >= total && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-success/10 border border-success/30 rounded-2xl p-3 flex items-center justify-between"
                      data-testid="checkout-change"
                    >
                      <span className="text-sm font-bold text-success">Cambio</span>
                      <span className="font-mono font-black text-success text-2xl"><AnimatedNumber value={change} format={(v) => formatMoney(v)} /></span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10" onClick={() => setShowCheckout(false)}>Cancelar</Button>
            <Button className="flex-1 h-12 rounded-2xl bg-success hover:bg-success/90 text-ink-950 font-bold" onClick={handleCheckout} disabled={submitting} data-testid="confirm-checkout-button">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ReceiptIcon className="h-4 w-4 mr-1" /> Cobrar</>}
            </Button>
          </DialogFooter>
          <button
            type="button"
            onClick={() => setAutoPrint(!autoPrint)}
            className={`flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              autoPrint ? 'bg-amber/15 text-amber border border-amber/30' : 'bg-white/5 text-foreground/50 border border-white/10'
            }`}
            data-testid="auto-print-toggle"
          >
            <Printer className="h-3.5 w-3.5" /> {autoPrint ? 'Imprimir automáticamente: ON' : 'Imprimir automáticamente: OFF'}
          </button>
        </DialogContent>
      </Dialog>

      {/* Hidden print receipt (rendered when there's a last order) */}
      {lastOrder && <Receipt order={lastOrder} business={business} restaurant={restaurant} />}
    </div>
  );
};

const ProductCard = ({ product, onClick }) => (
  <motion.button
    variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="group relative bg-ink-800/60 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/5 hover:border-primary-500/40 hover:shadow-neon-cyan transition-all text-left"
    data-testid={`pos-product-${product.id}`}
  >
    <div className="aspect-square bg-ink-900 relative overflow-hidden">
      {product.image ? (
        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ink-800 to-ink-900">
          {product.category === 'bebida'
            ? <Coffee className="h-12 w-12 text-primary-500/40" strokeWidth={1.4} />
            : <Utensils className="h-12 w-12 text-accent-500/40" strokeWidth={1.4} />}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
      {product.custom_options?.length > 0 && (
        <span className="absolute top-2 right-2 bg-accent-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-neon-violet">
          + opciones
        </span>
      )}
    </div>
    <div className="p-3">
      <p className="font-bold text-sm text-foreground line-clamp-1">{product.name}</p>
      <p className="font-mono font-bold text-primary-500 text-base mt-0.5 group-hover:text-glow-cyan transition-all">${product.price.toFixed(2)}</p>
    </div>
  </motion.button>
);

const SkeletonGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="bg-ink-800/60 rounded-3xl overflow-hidden border border-white/5">
        <div className="aspect-square shimmer bg-ink-700" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-3/4 shimmer bg-ink-700 rounded" />
          <div className="h-3 w-1/2 shimmer bg-ink-700 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ empty }) => (
  <div className="text-center py-16" data-testid="pos-empty-state">
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 border border-white/5 mb-4 relative"
    >
      <div className="absolute inset-0 rounded-3xl conic-border opacity-40" />
      <ShoppingBag className="h-12 w-12 text-primary-500/60 relative" strokeWidth={1.5} />
    </motion.div>
    <h3 className="font-heading text-xl font-bold text-foreground mb-2">
      {empty ? 'Aún no tienes productos' : 'Sin resultados'}
    </h3>
    <p className="text-foreground/50 mb-6">
      {empty ? 'Agrega productos en la sección "Productos"' : 'Intenta con otra búsqueda'}
    </p>
  </div>
);

const CartContent = ({ cart, updateQty, removeItem, clearCart, total, onCheckout, cashier }) => (
  <div className="flex flex-col h-full" data-testid="cart-content">
    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-foreground/40">Orden actual</p>
        <h2 className="font-heading text-xl font-black text-foreground">Carrito</h2>
        {cashier && (
          <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-primary-500">
            <span className="block h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
            <Sparkles className="h-3 w-3" /> {cashier.name}
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <button onClick={clearCart} className="text-xs font-bold uppercase tracking-wider text-destructive hover:text-glow-violet ios-press" data-testid="cart-clear-button">
          Vaciar
        </button>
      )}
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <AnimatePresence initial={false}>
        {cart.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 border border-white/5 mb-3">
              <ShoppingBag className="h-7 w-7 text-foreground/30" />
            </div>
            <p className="text-foreground/50 font-medium">Aún no hay productos</p>
            <p className="text-xs text-foreground/30 mt-1">Toca un producto para agregarlo</p>
          </motion.div>
        ) : (
          cart.map((it, idx) => (
            <motion.div
              key={`${it.product.id}-${(it.selected_options || []).join(',')}`}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-white/5 border border-white/5 rounded-2xl p-3"
              data-testid={`cart-item-${idx}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{it.product.name}</p>
                  <p className="text-xs text-foreground/40 font-mono">${it.product.price.toFixed(2)} c/u</p>
                  {it.selected_options?.length > 0 && (
                    <p className="text-[11px] text-accent-500 mt-1 font-medium">{it.selected_options.join(' · ')}</p>
                  )}
                </div>
                <button onClick={() => removeItem(idx)} className="text-foreground/30 hover:text-destructive ios-press" data-testid={`cart-remove-${idx}`}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 bg-ink-900 rounded-full p-1 border border-white/5">
                  <button onClick={() => updateQty(idx, -1)} className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center ios-press text-foreground" data-testid={`cart-decrease-${idx}`}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-mono font-bold text-foreground px-3 min-w-[28px] text-center">{it.quantity}</span>
                  <button onClick={() => updateQty(idx, 1)} className="h-8 w-8 rounded-full bg-primary-500 text-ink-950 flex items-center justify-center ios-press shadow-neon-cyan" data-testid={`cart-increase-${idx}`}>
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  </button>
                </div>
                <span className="font-mono font-black text-foreground">${it.subtotal.toFixed(2)}</span>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
    <div className="px-5 py-4 pb-24 lg:pb-20 border-t border-white/5 space-y-3 bg-ink-900/80 safe-bottom">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest uppercase text-foreground/40">Total</span>
        <span className="font-mono font-black text-3xl text-primary-500 text-glow-cyan" data-testid="cart-total">
          <AnimatedNumber value={total} format={(v) => formatMoney(v)} />
        </span>
      </div>
      <motion.div whileHover={{ scale: cart.length > 0 ? 1.02 : 1 }} whileTap={{ scale: 0.98 }}>
        <Button
          className="w-full h-14 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-black text-base shadow-neon-cyan disabled:bg-ink-700 disabled:text-foreground/30 disabled:shadow-none transition-all"
          disabled={cart.length === 0}
          onClick={onCheckout}
          data-testid="cart-checkout-button"
        >
          Cobrar {cart.length > 0 && formatMoney(total)}
        </Button>
      </motion.div>
    </div>
  </div>
);

export default POSPage;
