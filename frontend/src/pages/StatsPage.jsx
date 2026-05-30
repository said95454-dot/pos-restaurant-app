import React, { useState, useEffect } from 'react';
import { statsApi } from '@/utils/api';
import { Input } from '@/components/ui/input';
import { Loader2, TrendingUp, Banknote, CreditCard, ArrowRightLeft, Award, Calendar, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import AnimatedNumber from '@/components/AnimatedNumber';
import { downloadCsv } from '@/utils/csv';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

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
      const [d, t, r] = await Promise.all([statsApi.daily(date), statsApi.topProducts(date, 5), statsApi.range(rangeStart, rangeEnd)]);
      setDaily(d);
      setTopProducts(t.top_products || []);
      setRangeData(r.daily_stats || []);
    } catch { toast.error('Error al cargar estadísticas'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [date, rangeStart, rangeEnd]);

  const exportRangeCsv = () => {
    if (!rangeData.length) { toast.error('Sin datos para exportar'); return; }
    const rows = [...rangeData].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      fecha: d.date,
      ordenes: d.total_orders,
      ventas_totales: d.total_sales?.toFixed(2),
      efectivo: d.cash_sales?.toFixed(2),
      tarjeta: d.card_sales?.toFixed(2),
      transferencia: d.transfer_sales?.toFixed(2),
    }));
    downloadCsv(`reporte_${rangeStart}_${rangeEnd}.csv`, rows);
    toast.success('CSV descargado');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-6" data-testid="stats-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-foreground/40">Reportes</p>
            <h1 className="font-heading text-4xl font-black text-gradient">Estadísticas</h1>
          </div>
          <div className="flex items-center gap-2 glass rounded-2xl px-4 py-2">
            <Calendar className="h-4 w-4 text-primary-500" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-0 bg-transparent h-9 p-0 focus-visible:ring-0 w-36 text-foreground" data-testid="stats-date" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : (
          <>
            <motion.div
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
            >
              <BigStat label="Ventas del día" value={daily?.total_sales || 0} format={formatMoney} icon={TrendingUp} color="primary" testId="stat-total-sales" />
              <BigStat label="Órdenes" value={daily?.total_orders || 0} format={(v) => Math.round(v).toString()} icon={Award} color="accent" testId="stat-total-orders" />
              <BigStat label="Ticket promedio" value={daily?.total_orders ? (daily.total_sales / daily.total_orders) : 0} format={formatMoney} icon={TrendingUp} color="success" testId="stat-avg-ticket" />
              <BigStat label="Efectivo" value={daily?.cash_sales || 0} format={formatMoney} icon={Banknote} color="primary" testId="stat-cash" />
            </motion.div>

            <div className="glass rounded-3xl p-5 mb-6">
              <h3 className="font-heading text-lg font-bold mb-4 text-foreground">Métodos de pago</h3>
              <div className="grid grid-cols-3 gap-3">
                <PMStat label="Efectivo" value={daily?.cash_sales || 0} total={daily?.total_sales || 0} icon={Banknote} color="primary" testId="pm-cash" />
                <PMStat label="Tarjeta" value={daily?.card_sales || 0} total={daily?.total_sales || 0} icon={CreditCard} color="accent" testId="pm-card" />
                <PMStat label="Transferencia" value={daily?.transfer_sales || 0} total={daily?.total_sales || 0} icon={ArrowRightLeft} color="success" testId="pm-transfer" />
              </div>
            </div>

            <div className="glass rounded-3xl p-5 mb-6" data-testid="top-products-card">
              <h3 className="font-heading text-lg font-bold mb-4 text-foreground">Top productos del día</h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-foreground/40 text-center py-6">Sin ventas este día</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p, i) => (
                    <motion.div
                      key={p.product_name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl"
                      data-testid={`top-product-${i}`}
                    >
                      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-mono font-black text-ink-950 ${
                        i === 0 ? 'bg-amber shadow-neon-violet' : i === 1 ? 'bg-primary-500 shadow-neon-cyan' : 'bg-ink-700 text-foreground'
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{p.product_name}</p>
                        <p className="text-xs text-foreground/40">{p.quantity_sold} vendidos</p>
                      </div>
                      <span className="font-mono font-bold text-primary-500">{formatMoney(p.total_revenue)}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="font-heading text-lg font-bold text-foreground">Ventas por día</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="h-10 rounded-2xl bg-ink-800 border-white/10 w-40 text-foreground" data-testid="range-start" />
                  <span className="text-foreground/40 text-sm">a</span>
                  <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="h-10 rounded-2xl bg-ink-800 border-white/10 w-40 text-foreground" data-testid="range-end" />
                  <button
                    onClick={exportRangeCsv}
                    className="h-10 px-4 rounded-2xl bg-amber/15 border border-amber/30 text-amber hover:bg-amber/25 inline-flex items-center gap-2 font-bold text-sm"
                    data-testid="export-range-csv-btn"
                  >
                    <Download className="h-4 w-4" /> CSV
                  </button>
                </div>
              </div>
              {rangeData.length === 0 ? (
                <p className="text-sm text-foreground/40 text-center py-12">Sin datos en este rango</p>
              ) : (
                <div className="h-72" data-testid="range-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...rangeData].sort((a, b) => a.date.localeCompare(b.date))}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#B14EFF" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(v) => formatMoney(v)}
                        contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,240,255,0.3)', background: '#0B0E1A', color: '#fff' }}
                        cursor={{ fill: 'rgba(0,240,255,0.05)' }}
                      />
                      <Bar dataKey="total_sales" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
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

const BigStat = ({ label, value, format, icon: Icon, color, testId }) => {
  const colors = {
    primary: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
    accent: 'bg-accent-500/10 text-accent-500 border-accent-500/20',
    success: 'bg-success/10 text-success border-success/20',
  };
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4 }}
      className="glass rounded-3xl p-5"
      data-testid={testId}
    >
      <div className={`h-10 w-10 rounded-2xl border flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-bold tracking-widest uppercase text-foreground/40">{label}</p>
      <p className="font-mono font-black text-3xl text-foreground mt-1">
        <AnimatedNumber value={value} format={format} />
      </p>
    </motion.div>
  );
};

const PMStat = ({ label, value, total, icon: Icon, color, testId }) => {
  const colors = {
    primary: 'bg-primary-500/10 text-primary-500 border-primary-500/30',
    accent: 'bg-accent-500/10 text-accent-500 border-accent-500/30',
    success: 'bg-success/10 text-success border-success/30',
  };
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/5 p-4" data-testid={testId}>
      <div className={`h-9 w-9 rounded-xl border flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold tracking-widest uppercase text-foreground/40">{label}</p>
      <p className="font-mono font-bold text-lg text-foreground"><AnimatedNumber value={value} format={(v) => formatMoney(v)} /></p>
      <p className="text-[11px] text-foreground/30 mt-0.5 font-mono">{pct.toFixed(0)}%</p>
    </div>
  );
};

export default StatsPage;
