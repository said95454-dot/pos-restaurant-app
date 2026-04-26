import React, { useState, useEffect } from 'react';
import { statsApi } from '@/utils/api';
import { Input } from '@/components/ui/input';
import { Loader2, TrendingUp, Banknote, CreditCard, ArrowRightLeft, Award, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const StatsPage = () => {
  const [date, setDate] = useState(today());
  const [daily, setDaily] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [rangeStart, setRangeStart] = useState(daysAgo(6));
  const [rangeEnd, setRangeEnd] = useState(today());
  const [rangeData, setRangeData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [d, t, r] = await Promise.all([
        statsApi.daily(date),
        statsApi.topProducts(date, 5),
        statsApi.range(rangeStart, rangeEnd),
      ]);
      setDaily(d);
      setTopProducts(t.top_products || []);
      setRangeData(r.daily_stats || []);
    } catch { toast.error('Error al cargar estadísticas'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [date, rangeStart, rangeEnd]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-6" data-testid="stats-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-wider text-ios-secondary uppercase">Reportes</p>
            <h1 className="font-heading text-3xl font-bold text-ios-text">Estadísticas</h1>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-ios-border px-4 py-2">
            <Calendar className="h-4 w-4 text-ios-secondary" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-0 h-9 p-0 focus-visible:ring-0 w-36" data-testid="stats-date" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : (
          <>
            {/* Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <BigStat label="Ventas del día" value={formatMoney(daily?.total_sales)} icon={TrendingUp} color="primary" testId="stat-total-sales" />
              <BigStat label="Órdenes" value={daily?.total_orders || 0} icon={Award} color="accent" testId="stat-total-orders" />
              <BigStat label="Ticket promedio" value={daily?.total_orders ? formatMoney(daily.total_sales / daily.total_orders) : '$0.00'} icon={TrendingUp} color="success" testId="stat-avg-ticket" />
              <BigStat label="Efectivo" value={formatMoney(daily?.cash_sales)} icon={Banknote} color="primary" testId="stat-cash" />
            </div>

            {/* Payment breakdown */}
            <div className="bg-white rounded-3xl border border-ios-border p-5 mb-6">
              <h3 className="font-heading text-lg font-bold mb-4">Métodos de pago</h3>
              <div className="grid grid-cols-3 gap-3">
                <PMStat label="Efectivo" value={daily?.cash_sales || 0} total={daily?.total_sales || 0} icon={Banknote} color="bg-primary-50 text-primary-500" testId="pm-cash" />
                <PMStat label="Tarjeta" value={daily?.card_sales || 0} total={daily?.total_sales || 0} icon={CreditCard} color="bg-accent-500/10 text-accent-500" testId="pm-card" />
                <PMStat label="Transferencia" value={daily?.transfer_sales || 0} total={daily?.total_sales || 0} icon={ArrowRightLeft} color="bg-success/10 text-success" testId="pm-transfer" />
              </div>
            </div>

            {/* Top products */}
            <div className="bg-white rounded-3xl border border-ios-border p-5 mb-6" data-testid="top-products-card">
              <h3 className="font-heading text-lg font-bold mb-4">Top productos del día</h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-ios-secondary text-center py-6">Sin ventas este día</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => (
                    <div key={p.product_name} className="flex items-center gap-3 p-3 bg-ios-gray rounded-2xl" data-testid={`top-product-${i}`}>
                      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-heading font-bold text-white ${i === 0 ? 'bg-accent-500' : i === 1 ? 'bg-ios-text' : 'bg-ios-secondary'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ios-text truncate">{p.product_name}</p>
                        <p className="text-xs text-ios-secondary">{p.quantity_sold} vendidos</p>
                      </div>
                      <span className="font-heading font-bold text-primary-500">{formatMoney(p.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Range chart */}
            <div className="bg-white rounded-3xl border border-ios-border p-5">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="font-heading text-lg font-bold">Ventas por día</h3>
                <div className="flex items-center gap-2">
                  <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="h-10 rounded-2xl bg-ios-gray border-transparent w-40" data-testid="range-start" />
                  <span className="text-ios-secondary text-sm">a</span>
                  <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="h-10 rounded-2xl bg-ios-gray border-transparent w-40" data-testid="range-end" />
                </div>
              </div>
              {rangeData.length === 0 ? (
                <p className="text-sm text-ios-secondary text-center py-12">Sin datos en este rango</p>
              ) : (
                <div className="h-72" data-testid="range-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...rangeData].sort((a, b) => a.date.localeCompare(b.date))}>
                      <CartesianGrid stroke="#F2F2F7" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E5E5EA' }} />
                      <Bar dataKey="total_sales" fill="#007AFF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const BigStat = ({ label, value, icon: Icon, color, testId }) => {
  const colors = { primary: 'bg-primary-50 text-primary-500', accent: 'bg-accent-500/10 text-accent-500', success: 'bg-success/10 text-success' };
  return (
    <div className="bg-white rounded-3xl border border-ios-border p-5" data-testid={testId}>
      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold tracking-wider text-ios-secondary uppercase">{label}</p>
      <p className="font-heading font-bold text-2xl text-ios-text mt-1">{value}</p>
    </div>
  );
};

const PMStat = ({ label, value, total, icon: Icon, color, testId }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="rounded-2xl bg-ios-gray p-4" data-testid={testId}>
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-semibold text-ios-secondary">{label}</p>
      <p className="font-heading font-bold text-lg text-ios-text">{formatMoney(value)}</p>
      <p className="text-[11px] text-ios-tertiary mt-0.5">{pct.toFixed(0)}%</p>
    </div>
  );
};

export default StatsPage;
