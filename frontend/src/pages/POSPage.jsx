import React, { useState, useEffect, useMemo } from 'react';
import { productsApi, ordersApi, cashRegisterApi, statsApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Minus, Trash2, Search, ShoppingBag, Utensils, Coffee, Banknote, CreditCard, ArrowRightLeft, Loader2, X, Check, Receipt } from 'lucide-react';
import { toast } from 'sonner';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

const POSPage = () => {
  const { restaurant, cashier } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // [{product, quantity, selected_options}]
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOptionsFor, setShowOptionsFor] = useState(null); // product
  const [tempOptions, setTempOptions] = useState([]);
  const [customer, setCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false); // mobile

  const loadProducts = async () => {
    try {
      const list = await productsApi.list();
      setProducts(list);
    } catch (e) {
      toast.error('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadProducts(); }, []);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const catMatch = activeCategory === 'todos' || p.category === activeCategory;
      const sMatch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return catMatch && sMatch;
    });
  }, [products, activeCategory, search]);

  const total = useMemo(() => cart.reduce((sum, it) => sum + it.subtotal, 0), [cart]);
  const change = useMemo(() => {
    const recv = parseFloat(amountReceived) || 0;
    return Math.max(0, recv - total);
  }, [amountReceived, total]);

  const addToCart = (product, opts = []) => {
    setCart(prev => {
      // If has custom options, treat each combination as unique
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
    if (product.custom_options && product.custom_options.length > 0) {
      setShowOptionsFor(product);
      setTempOptions([]);
    } else {
      addToCart(product);
    }
  };

  const confirmOptions = () => {
    addToCart(showOptionsFor, tempOptions);
    setShowOptionsFor(null);
    setTempOptions([]);
  };

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
      const recv = parseFloat(amountReceived) || 0;
      if (recv < total) { toast.error('El monto recibido es menor al total'); return; }
    }
    setSubmitting(true);
    try {
      const order = {
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
      await ordersApi.create(order);
      toast.success(`Venta registrada: ${formatMoney(total)}`);
      setCart([]);
      setCustomer('');
      setAmountReceived('');
      setShowCheckout(false);
      setShowCart(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al registrar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'todos', label: 'Todos', icon: ShoppingBag },
    { id: 'comida', label: 'Comida', icon: Utensils },
    { id: 'bebida', label: 'Bebida', icon: Coffee },
  ];

  const itemCount = cart.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="flex-1 flex h-full overflow-hidden" data-testid="pos-page">
      {/* Products area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-white/70 glass border-b border-ios-border">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-ios-secondary uppercase">Punto de Venta</p>
              <h1 className="font-heading text-2xl font-bold text-ios-text truncate" data-testid="pos-restaurant-name">
                {restaurant?.restaurant_name}
              </h1>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ios-secondary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto…"
                className="pl-11 h-11 rounded-full bg-ios-gray border-transparent focus:bg-white focus:border-primary-500"
                data-testid="pos-search-input"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {categories.map(c => {
              const Icon = c.icon;
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  data-testid={`pos-category-${c.id}`}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ios-press ${
                    isActive ? 'bg-ios-text text-white' : 'bg-ios-gray text-ios-text'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16" data-testid="pos-empty-state">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-ios-gray mb-4">
                <ShoppingBag className="h-10 w-10 text-ios-secondary" />
              </div>
              <h3 className="font-heading text-xl font-bold text-ios-text mb-2">
                {products.length === 0 ? 'Aún no tienes productos' : 'Sin resultados'}
              </h3>
              <p className="text-ios-secondary mb-6">
                {products.length === 0 ? 'Agrega productos en la sección "Productos"' : 'Intenta con otra búsqueda'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 animate-fade-in">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="group bg-white rounded-3xl overflow-hidden shadow-ios-sm border border-ios-border/50 ios-press text-left"
                  data-testid={`pos-product-${p.id}`}
                >
                  <div className="aspect-square bg-ios-gray relative">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {p.category === 'bebida' ? <Coffee className="h-10 w-10 text-ios-tertiary" /> : <Utensils className="h-10 w-10 text-ios-tertiary" />}
                      </div>
                    )}
                    {p.custom_options?.length > 0 && (
                      <span className="absolute top-2 right-2 bg-accent-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">+ opciones</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-ios-text line-clamp-1">{p.name}</p>
                    <p className="font-heading font-bold text-primary-500 text-base mt-0.5">{formatMoney(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-96 bg-white border-l border-ios-border shadow-ios-cart">
        <CartContent cart={cart} updateQty={updateQty} removeItem={removeItem} clearCart={clearCart} total={total} onCheckout={() => setShowCheckout(true)} cashier={cashier} />
      </aside>

      {/* Mobile cart bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-[72px] left-0 right-0 px-4 z-30 safe-bottom">
          <button
            onClick={() => setShowCart(true)}
            className="w-full h-14 rounded-2xl bg-ios-text text-white flex items-center justify-between px-5 shadow-ios-lg ios-press"
            data-testid="mobile-cart-trigger"
          >
            <span className="flex items-center gap-3 font-semibold">
              <span className="bg-white text-ios-text rounded-full h-7 w-7 flex items-center justify-center text-sm font-bold">{itemCount}</span>
              Ver carrito
            </span>
            <span className="font-heading font-bold text-lg">{formatMoney(total)}</span>
          </button>
        </div>
      )}

      {/* Mobile cart drawer */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="lg:hidden p-0 max-w-full h-[85vh] rounded-t-3xl rounded-b-none top-auto bottom-0 translate-y-0 data-[state=open]:slide-in-from-bottom" data-testid="mobile-cart-drawer">
          <CartContent cart={cart} updateQty={updateQty} removeItem={removeItem} clearCart={clearCart} total={total} onCheckout={() => { setShowCart(false); setShowCheckout(true); }} cashier={cashier} />
        </DialogContent>
      </Dialog>

      {/* Options modal */}
      <Dialog open={!!showOptionsFor} onOpenChange={(v) => !v && setShowOptionsFor(null)}>
        <DialogContent className="rounded-3xl max-w-md" data-testid="product-options-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{showOptionsFor?.name}</DialogTitle>
            <p className="text-ios-secondary text-sm">Selecciona las opciones</p>
          </DialogHeader>
          <div className="space-y-2 my-2 max-h-72 overflow-y-auto">
            {showOptionsFor?.custom_options?.map(opt => {
              const checked = tempOptions.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => setTempOptions(prev => checked ? prev.filter(o => o !== opt) : [...prev, opt])}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ios-press ${
                    checked ? 'border-primary-500 bg-primary-50' : 'border-ios-border bg-white'
                  }`}
                  data-testid={`option-${opt}`}
                >
                  <span className="font-medium text-ios-text">{opt}</span>
                  {checked && <Check className="h-5 w-5 text-primary-500" />}
                </button>
              );
            })}
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setShowOptionsFor(null)}>Cancelar</Button>
            <Button className="flex-1 h-12 rounded-2xl bg-primary-500 hover:bg-primary-600" onClick={confirmOptions} data-testid="confirm-options-button">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="rounded-3xl max-w-md" data-testid="checkout-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Cobrar venta</DialogTitle>
            <p className="text-ios-secondary text-sm">Total: <span className="font-bold text-ios-text">{formatMoney(total)}</span></p>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ios-text">Cliente</label>
              <Input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Nombre del cliente"
                className="h-12 rounded-2xl bg-ios-gray border-transparent focus:bg-white focus:border-primary-500"
                data-testid="checkout-customer-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ios-text">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Efectivo', icon: Banknote },
                  { id: 'card', label: 'Tarjeta', icon: CreditCard },
                  { id: 'transfer', label: 'Transfer.', icon: ArrowRightLeft },
                ].map(pm => {
                  const Icon = pm.icon;
                  const active = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      data-testid={`payment-${pm.id}`}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ios-press ${
                        active ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-ios-border bg-white text-ios-text'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-semibold">{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {paymentMethod === 'cash' && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-sm font-semibold text-ios-text">Monto recibido</label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="h-14 rounded-2xl bg-ios-gray border-transparent focus:bg-white focus:border-primary-500 text-2xl font-heading font-bold text-center"
                  data-testid="checkout-amount-input"
                />
                {amountReceived && parseFloat(amountReceived) >= total && (
                  <div className="bg-success/10 rounded-2xl p-3 flex items-center justify-between" data-testid="checkout-change">
                    <span className="text-sm font-semibold text-ios-text">Cambio</span>
                    <span className="font-heading font-bold text-success text-xl">{formatMoney(change)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setShowCheckout(false)}>Cancelar</Button>
            <Button className="flex-1 h-12 rounded-2xl bg-success hover:bg-success/90 text-white" onClick={handleCheckout} disabled={submitting} data-testid="confirm-checkout-button">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Receipt className="h-4 w-4 mr-1" /> Cobrar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CartContent = ({ cart, updateQty, removeItem, clearCart, total, onCheckout, cashier }) => {
  return (
    <div className="flex flex-col h-full" data-testid="cart-content">
      <div className="px-5 py-4 border-b border-ios-border flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-ios-text">Carrito</h2>
          {cashier && <p className="text-xs text-primary-500 font-medium">Cajero: {cashier.name}</p>}
        </div>
        {cart.length > 0 && (
          <button onClick={clearCart} className="text-sm font-semibold text-destructive ios-press" data-testid="cart-clear-button">
            Vaciar
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-ios-tertiary mx-auto mb-3" />
            <p className="text-ios-secondary">Aún no hay productos</p>
            <p className="text-xs text-ios-tertiary mt-1">Toca un producto para agregarlo</p>
          </div>
        ) : (
          cart.map((it, idx) => (
            <div key={idx} className="bg-ios-gray rounded-2xl p-3" data-testid={`cart-item-${idx}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ios-text text-sm truncate">{it.product.name}</p>
                  <p className="text-xs text-ios-secondary">{formatMoney(it.product.price)} c/u</p>
                  {it.selected_options?.length > 0 && (
                    <p className="text-[11px] text-primary-500 mt-1">{it.selected_options.join(', ')}</p>
                  )}
                </div>
                <button onClick={() => removeItem(idx)} className="text-ios-tertiary hover:text-destructive ios-press" data-testid={`cart-remove-${idx}`}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 bg-white rounded-full p-1">
                  <button onClick={() => updateQty(idx, -1)} className="h-8 w-8 rounded-full bg-ios-gray flex items-center justify-center ios-press" data-testid={`cart-decrease-${idx}`}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-ios-text px-3 min-w-[28px] text-center">{it.quantity}</span>
                  <button onClick={() => updateQty(idx, 1)} className="h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center ios-press" data-testid={`cart-increase-${idx}`}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="font-heading font-bold text-ios-text">{formatMoney(it.subtotal)}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-5 py-4 border-t border-ios-border space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <span className="text-ios-secondary font-medium">Total</span>
          <span className="font-heading font-bold text-3xl text-ios-text" data-testid="cart-total">{formatMoney(total)}</span>
        </div>
        <Button
          className="w-full h-14 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-base ios-press"
          disabled={cart.length === 0}
          onClick={onCheckout}
          data-testid="cart-checkout-button"
        >
          Cobrar {cart.length > 0 && formatMoney(total)}
        </Button>
      </div>
    </div>
  );
};

export default POSPage;
