import React, { useState, useEffect } from 'react';
import { cashRegisterApi, statsApi } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Wallet, TrendingUp, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);

const CashRegisterPage = () => {
  const { restaurant, cashier } = useAuth();
  const [closes, setCloses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openClose, setOpenClose] = useState(false);
  const [todayClose, setTodayClose] = useState(null);
  const [todayStats, setTodayStats] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, todayCloseData, todayStatsData] = await Promise.all([
        cashRegisterApi.list(30),
        cashRegisterApi.getByDate(today()),
        statsApi.daily(today()),
      ]);
      setCloses(list);
      setTodayClose(todayCloseData.closed ? todayCloseData.data : null);
      setTodayStats(todayStatsData);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este corte de caja?')) return;
    try {
      await cashRegisterApi.remove(id);
      toast.success('Corte eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-6" data-testid="cash-register-page">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-wider text-foreground/50 uppercase">Cierre diario</p>
            <h1 className="font-heading text-3xl font-bold text-foreground">Corte de Caja</h1>
          </div>
          {!todayClose && (
            <Button onClick={() => setOpenClose(true)} className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan px-5 ios-press" data-testid="new-close-button">
              <Wallet className="h-5 w-5 mr-1" /> Hacer corte de hoy
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : (
          <>
            {todayClose && (
              <div className="glass rounded-3xl p-5 mb-6" data-testid="today-close-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-2xl bg-success/10 text-success border border-success/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold">Corte realizado hoy</h3>
                    <p className="text-sm text-foreground/50">Cerrado por {todayClose.closed_by || '—'}</p>
                  </div>
                </div>
                <CloseDetail close={todayClose} />
              </div>
            )}

            <div className="glass rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h3 className="font-heading text-lg font-bold">Historial</h3>
              </div>
              {closes.length === 0 ? (
                <p className="p-8 text-center text-foreground/50">Aún no hay cortes registrados</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {closes.map(c => (
                    <div key={c.id} className="p-4 flex items-center gap-3" data-testid={`close-${c.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{c.date}</p>
                          {Math.abs(c.difference) > 0.01 && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.difference < 0 ? 'bg-destructive/15 text-destructive border border-destructive/20' : 'bg-success/10 text-success border border-success/20'}`}>
                              {c.difference < 0 ? 'Faltante' : 'Sobrante'} {formatMoney(Math.abs(c.difference))}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground/50">{c.total_orders} órdenes · Esperado {formatMoney(c.expected_cash)} · Real {formatMoney(c.actual_cash)}</p>
                      </div>
                      <span className="font-heading font-bold text-foreground">{formatMoney(c.total_sales)}</span>
                      <button onClick={() => handleDelete(c.id)} className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center ios-press" data-testid={`delete-close-${c.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <CloseModal open={openClose} onClose={() => setOpenClose(false)} stats={todayStats} cashier={cashier} restaurant={restaurant} onDone={() => { setOpenClose(false); load(); }} />
    </div>
  );
};

const CloseDetail = ({ close }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
    <Mini label="Total ventas" value={formatMoney(close.total_sales)} accent="primary" />
    <Mini label="Efectivo esperado" value={formatMoney(close.expected_cash)} />
    <Mini label="Efectivo real" value={formatMoney(close.actual_cash)} />
    <Mini label="Diferencia" value={formatMoney(close.difference)} accent={Math.abs(close.difference) < 0.01 ? 'success' : (close.difference < 0 ? 'destructive' : 'warning')} />
  </div>
);

const Mini = ({ label, value, accent }) => {
  const colors = {
    primary: 'text-primary-500',
    success: 'text-success',
    warning: 'text-accent-500',
    destructive: 'text-destructive',
  };
  return (
    <div className="bg-ink-800/60 border border-white/5 rounded-2xl p-3">
      <p className="text-[10px] font-semibold tracking-wider text-foreground/50 uppercase">{label}</p>
      <p className={`font-heading font-bold ${colors[accent] || 'text-foreground'}`}>{value}</p>
    </div>
  );
};

const CloseModal = ({ open, onClose, stats, cashier, restaurant, onDone }) => {
  const [initial, setInitial] = useState('');
  const [actual, setActual] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setInitial(''); setActual(''); setNotes(''); } }, [open]);

  if (!open || !stats) return null;

  const initialNum = parseFloat(initial) || 0;
  const actualNum = parseFloat(actual) || 0;
  const expected = initialNum + (stats.cash_sales || 0);
  const diff = actualNum - expected;

  const submit = async () => {
    if (!actual) { toast.error('Ingresa el efectivo real contado'); return; }
    setSaving(true);
    try {
      await cashRegisterApi.close({
        date: today(),
        total_orders: stats.total_orders,
        total_sales: stats.total_sales,
        cash_sales: stats.cash_sales,
        card_sales: stats.card_sales,
        transfer_sales: stats.transfer_sales,
        initial_cash: initialNum,
        actual_cash: actualNum,
        notes,
        closed_by: cashier?.name || restaurant?.restaurant_name || 'Admin',
      });
      toast.success('Corte de caja realizado');
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al cerrar caja');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-md max-h-[92vh] overflow-y-auto" data-testid="close-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Corte de caja - {today()}</DialogTitle>
          <DialogDescription className="text-foreground/50 text-sm">Verifica el efectivo y cierra el día.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 bg-ink-800/60 border border-white/5 rounded-2xl p-3">
            <Mini label="Órdenes" value={stats.total_orders} />
            <Mini label="Ventas totales" value={formatMoney(stats.total_sales)} accent="primary" />
            <Mini label="Efectivo" value={formatMoney(stats.cash_sales)} />
            <Mini label="Tarjeta" value={formatMoney(stats.card_sales)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Fondo inicial (efectivo en caja al abrir)</label>
            <Input type="number" step="0.01" value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="0.00" className="mt-1 h-12 rounded-2xl bg-ink-800/60 border border-white/5 border-transparent" data-testid="close-initial-input" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Efectivo real contado</label>
            <Input type="number" step="0.01" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="0.00" className="mt-1 h-14 rounded-2xl bg-ink-800/60 border border-white/5 border-transparent text-2xl font-heading font-bold text-center" data-testid="close-actual-input" />
          </div>
          <div className="bg-ink-800/60 border border-white/5 rounded-2xl p-3 space-y-1">
            <Row label="Esperado (fondo + ventas efectivo)" value={formatMoney(expected)} />
            <Row label="Real" value={formatMoney(actualNum)} />
            <Row label="Diferencia" value={formatMoney(diff)} accent={Math.abs(diff) < 0.01 ? 'success' : (diff < 0 ? 'destructive' : 'warning')} />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Notas (opcional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." className="mt-1 rounded-2xl bg-ink-800/60 border border-white/5 border-transparent min-h-[80px]" data-testid="close-notes-input" />
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} className="flex-1 h-12 rounded-2xl bg-success hover:bg-success/90 text-white" disabled={saving} data-testid="close-confirm-button">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Cerrar caja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, accent }) => {
  const colors = {
    success: 'text-success',
    warning: 'text-accent-500',
    destructive: 'text-destructive',
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground/50">{label}</span>
      <span className={`font-heading font-bold ${colors[accent] || 'text-foreground'}`}>{value}</span>
    </div>
  );
};

export default CashRegisterPage;
