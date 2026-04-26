import React, { useState, useEffect } from 'react';
import { ordersApi } from '@/utils/api';
import { Input } from '@/components/ui/input';
import { Loader2, Receipt, Banknote, CreditCard, ArrowRightLeft, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);

const PM_ICONS = { cash: Banknote, card: CreditCard, transfer: ArrowRightLeft };
const PM_LABELS = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };

const OrdersPage = () => {
  const [date, setDate] = useState(today());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setOrders(await ordersApi.list({ date_filter: date })); }
    catch { toast.error('Error al cargar órdenes'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [date]);

  const total = orders.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-6" data-testid="orders-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-wider text-ios-secondary uppercase">Historial</p>
            <h1 className="font-heading text-3xl font-bold text-ios-text">Órdenes</h1>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-ios-border px-4 py-2">
            <Calendar className="h-4 w-4 text-ios-secondary" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-0 h-9 p-0 focus-visible:ring-0 w-36"
              data-testid="orders-date-filter"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Stat label="Órdenes" value={orders.length} accent="primary" testId="stat-orders-count" />
          <Stat label="Ventas totales" value={formatMoney(total)} accent="success" testId="stat-orders-total" />
          <Stat label="Promedio" value={orders.length > 0 ? formatMoney(total / orders.length) : '$0.00'} accent="accent" testId="stat-orders-avg" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-ios-border p-12 text-center" data-testid="orders-empty">
            <Receipt className="h-12 w-12 text-ios-tertiary mx-auto mb-3" />
            <h3 className="font-heading text-xl font-bold text-ios-text">Sin órdenes este día</h3>
            <p className="text-ios-secondary">Las ventas aparecerán aquí</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-ios-border overflow-hidden divide-y divide-ios-border">
            {orders.map((o, i) => {
              const Icon = PM_ICONS[o.payment_method] || Banknote;
              return (
                <button
                  key={o.id}
                  onClick={() => setSelected(selected === o.id ? null : o.id)}
                  className="w-full p-4 flex items-center gap-4 text-left hover:bg-ios-gray transition-colors"
                  data-testid={`order-${i}`}
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-ios-text truncate">{o.customer_name}</p>
                      <span className="font-heading font-bold text-ios-text text-lg">{formatMoney(o.total)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ios-secondary mt-0.5">
                      <span>{PM_LABELS[o.payment_method]}</span>
                      <span>•</span>
                      <span>{o.items?.length || 0} item(s)</span>
                      {o.cashier_name && <><span>•</span><span className="flex items-center gap-1"><User className="h-3 w-3" />{o.cashier_name}</span></>}
                      <span>•</span>
                      <span>{new Date(o.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {selected === o.id && (
                      <div className="mt-3 space-y-1.5 animate-fade-in">
                        {o.items?.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-ios-gray rounded-xl p-2">
                            <span>
                              <span className="font-semibold">{it.quantity}x</span> {it.product_name}
                              {it.selected_options?.length > 0 && <span className="text-primary-500 ml-1">({it.selected_options.join(', ')})</span>}
                            </span>
                            <span className="font-semibold">{formatMoney(it.subtotal)}</span>
                          </div>
                        ))}
                        {o.payment_method === 'cash' && o.amount_received != null && (
                          <div className="flex justify-between text-sm pt-1">
                            <span className="text-ios-secondary">Recibido / Cambio</span>
                            <span>{formatMoney(o.amount_received)} / <span className="text-success font-semibold">{formatMoney(o.change)}</span></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, accent = 'primary', testId }) => {
  const colors = {
    primary: 'text-primary-500',
    success: 'text-success',
    accent: 'text-accent-500',
  };
  return (
    <div className="bg-white rounded-3xl border border-ios-border p-4" data-testid={testId}>
      <p className="text-xs font-semibold tracking-wider text-ios-secondary uppercase">{label}</p>
      <p className={`font-heading font-bold text-2xl mt-1 ${colors[accent]}`}>{value}</p>
    </div>
  );
};

export default OrdersPage;
