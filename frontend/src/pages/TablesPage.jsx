import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, UtensilsCrossed, Clock, Plus, Trash2, Pencil, CheckCircle2,
  CalendarClock, X, Receipt, ChefHat, ShoppingBag
} from 'lucide-react';
import { tablesApi, cashiersApi } from '@/utils/api';
import { onRealtime } from '@/utils/useRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STATUS_META = {
  free:     { label: 'Libre',        colorClass: 'bg-success/10 border-success/30 text-success',        dot: 'bg-success',      icon: CheckCircle2 },
  occupied: { label: 'Ocupada',      colorClass: 'bg-amber/10 border-amber/40 text-amber',              dot: 'bg-amber',        icon: UtensilsCrossed },
  billed:   { label: 'Cuenta',       colorClass: 'bg-primary-500/10 border-primary-500/40 text-primary-500', dot: 'bg-primary-500', icon: Receipt },
  reserved: { label: 'Reservada',    colorClass: 'bg-violet-400/10 border-violet-400/40 text-violet-400', dot: 'bg-violet-400', icon: CalendarClock },
};

const openMinutes = (openedAt) => {
  if (!openedAt) return 0;
  const t = new Date(openedAt);
  return Math.max(0, Math.floor((Date.now() - t.getTime()) / 60000));
};

const TableCard = ({ table, onOpen, onClose, onBill, onReserve, onUnreserve, onEdit, onDelete }) => {
  const meta = STATUS_META[table.status] || STATUS_META.free;
  const Icon = meta.icon;
  const [, tick] = useState(0);
  useEffect(() => {
    if (table.status !== 'occupied' && table.status !== 'billed') return;
    const t = setInterval(() => tick(v => v + 1), 30000);
    return () => clearInterval(t);
  }, [table.status]);
  const mins = openMinutes(table.opened_at);

  const canDelete = table.status === 'free' || table.status === 'reserved';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      className={`glass rounded-3xl p-5 border ${meta.colorClass} relative overflow-hidden group cursor-pointer`}
      data-testid={`table-card-${table.id}`}
      onClick={() => {
        if (table.status === 'free' || table.status === 'reserved') onOpen(table);
        else if (table.status === 'occupied' || table.status === 'billed') onOpen(table); // continue existing
      }}
    >
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onEdit(table)}
          className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-foreground/50 hover:text-foreground flex items-center justify-center"
          data-testid={`table-edit-${table.id}`}
          title="Editar mesa"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(table)}
            className="h-8 w-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center"
            data-testid={`table-delete-${table.id}`}
            title="Eliminar mesa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`h-14 w-14 rounded-2xl border-2 flex items-center justify-center ${meta.colorClass}`}>
            <span className="font-mono font-black text-2xl">{table.number}</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Mesa</p>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${meta.colorClass} mt-1`}>
              <Icon className="h-3 w-3" /> {meta.label}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-foreground/60 mb-4">
        <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {table.capacity}</div>
        {(table.status === 'occupied' || table.status === 'billed') && (
          <>
            <span className="text-foreground/20">·</span>
            <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {mins}m</div>
          </>
        )}
      </div>

      {table.waiter_name && (
        <p className="text-xs text-foreground/50 mb-3">
          Mesero <span className="font-bold text-foreground">{table.waiter_name}</span>
        </p>
      )}
      {table.status === 'reserved' && table.reserved_for && (
        <p className="text-xs text-foreground/60 mb-3">Reserva: <span className="font-bold text-foreground">{table.reserved_for}</span></p>
      )}

      <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
        {table.status === 'free' && (
          <>
            <Button onClick={() => onOpen(table)} className="h-9 flex-1 rounded-xl bg-success hover:bg-success/90 text-ink-950 font-bold text-xs" data-testid={`table-open-${table.id}`}>
              Abrir
            </Button>
            <Button variant="outline" onClick={() => onReserve(table)} className="h-9 rounded-xl border-violet-400/40 bg-violet-400/10 hover:bg-violet-400/20 text-violet-400 text-xs" data-testid={`table-reserve-${table.id}`}>
              Reservar
            </Button>
          </>
        )}
        {(table.status === 'occupied' || table.status === 'billed') && (
          <>
            <Button onClick={() => onOpen(table)} className="h-9 flex-1 rounded-xl bg-primary-500 hover:bg-primary-500/90 text-ink-950 font-bold text-xs" data-testid={`table-continue-${table.id}`}>
              <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Continuar
            </Button>
            <Button variant="outline" onClick={() => onClose(table)} className="h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground text-xs" data-testid={`table-free-${table.id}`}>
              Liberar
            </Button>
          </>
        )}
        {table.status === 'reserved' && (
          <>
            <Button onClick={() => onOpen(table)} className="h-9 flex-1 rounded-xl bg-success hover:bg-success/90 text-ink-950 font-bold text-xs" data-testid={`table-open-${table.id}`}>
              Sentar
            </Button>
            <Button variant="outline" onClick={() => onUnreserve(table)} className="h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground text-xs" data-testid={`table-unreserve-${table.id}`}>
              Cancelar
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
};

const OpenTableModal = ({ table, cashiers, onCancel, onConfirm }) => {
  const [waiterId, setWaiterId] = useState('');
  const active = cashiers.filter(c => c.active !== false);
  const selected = active.find(c => c.id === waiterId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-3xl p-6 max-w-md w-full"
        data-testid="open-table-modal"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-success">Abrir mesa</p>
            <h2 className="font-heading text-2xl font-black text-foreground">Mesa {table.number} — {table.capacity} personas</h2>
          </div>
          <button onClick={onCancel} className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center" data-testid="open-table-close"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-foreground">Mesero <span className="text-foreground/50 text-xs">(opcional)</span></label>
            <select
              value={waiterId}
              onChange={(e) => setWaiterId(e.target.value)}
              className="mt-1 w-full h-12 rounded-2xl bg-ink-800/60 border border-white/10 px-3 text-foreground"
              data-testid="open-table-waiter-select"
            >
              <option value="">Sin asignar</option>
              {active.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => onConfirm({ waiter_id: waiterId || null, waiter_name: selected?.name || null })}
            className="w-full h-12 rounded-2xl bg-success hover:bg-success/90 text-ink-950 font-bold"
            data-testid="open-table-confirm"
          >
            Abrir mesa <UtensilsCrossed className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

const ReserveTableModal = ({ table, onCancel, onConfirm }) => {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-3xl p-6 max-w-md w-full"
        data-testid="reserve-table-modal"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Reservar</p>
            <h2 className="font-heading text-2xl font-black text-foreground">Mesa {table.number}</h2>
          </div>
          <button onClick={onCancel} className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <label className="text-sm font-semibold text-foreground">Nombre de la reserva</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Familia López — 20:00" className="mt-1 h-12 rounded-2xl bg-ink-800/60 border-white/10" data-testid="reserve-name-input" />
        <Button onClick={() => onConfirm({ reserved_for: name.trim() || null })} className="w-full mt-4 h-12 rounded-2xl bg-violet-400 hover:bg-violet-400/90 text-ink-950 font-bold" data-testid="reserve-confirm">
          Reservar mesa
        </Button>
      </motion.div>
    </div>
  );
};

const EditTableModal = ({ table, onCancel, onConfirm }) => {
  const isNew = !table.id;
  const [number, setNumber] = useState(table.number ?? '');
  const [capacity, setCapacity] = useState(table.capacity ?? 4);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-3xl p-6 max-w-md w-full"
        data-testid={isNew ? 'add-table-modal' : 'edit-table-modal'}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-2xl font-black text-foreground">{isNew ? 'Nueva mesa' : `Editar mesa ${table.number}`}</h2>
          <button onClick={onCancel} className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-foreground">Número de mesa</label>
            <Input type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1 h-12 rounded-2xl bg-ink-800/60 border-white/10" data-testid="table-number-input" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Capacidad (personas)</label>
            <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1 h-12 rounded-2xl bg-ink-800/60 border-white/10" data-testid="table-capacity-input" />
          </div>
          <Button
            onClick={() => onConfirm({ number: parseInt(number), capacity: parseInt(capacity) })}
            disabled={!number || !capacity || parseInt(number) <= 0 || parseInt(capacity) <= 0}
            className="w-full h-12 rounded-2xl bg-primary-500 hover:bg-primary-500/90 text-ink-950 font-bold"
            data-testid="table-save-button"
          >
            {isNew ? 'Crear mesa' : 'Guardar cambios'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

const TablesPage = () => {
  const navigate = useNavigate();
  const { cashier } = useAuth();
  const [tables, setTables] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingTable, setOpeningTable] = useState(null);
  const [reservingTable, setReservingTable] = useState(null);
  const [editingTable, setEditingTable] = useState(null);

  const load = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([tablesApi.list(), cashiersApi.list()]);
      setTables(t);
      setCashiers(c);
    } catch { toast.error('No se pudieron cargar las mesas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime refresh
  useEffect(() => {
    const events = ['table.created', 'table.updated', 'table.deleted', 'table.opened', 'table.closed', 'table.billed', 'table.reserved', 'table.unreserved', 'order.created'];
    const offs = events.map(e => onRealtime(e, load));
    return () => offs.forEach(fn => fn && fn());
  }, [load]);

  const handleOpen = (table) => {
    if (table.status === 'occupied' || table.status === 'billed') {
      // Continue existing table — go to POS with table context
      navigate(`/pos?table=${table.id}`);
      return;
    }
    setOpeningTable(table);
  };

  const confirmOpen = async (payload) => {
    try {
      // If no waiter selected but a cashier is active, use cashier as waiter
      const finalPayload = (!payload.waiter_id && cashier)
        ? { waiter_id: cashier.id, waiter_name: cashier.name }
        : payload;
      const opened = await tablesApi.open(openingTable.id, finalPayload);
      setOpeningTable(null);
      toast.success(`Mesa ${opened.number} abierta`);
      navigate(`/pos?table=${opened.id}`);
    } catch (e) { toast.error(e.response?.data?.detail || 'No se pudo abrir la mesa'); }
  };

  const handleClose = async (table) => {
    if (!window.confirm(`¿Liberar la mesa ${table.number}? Esta acción no cobra la orden.`)) return;
    try {
      await tablesApi.close(table.id);
      toast.success(`Mesa ${table.number} liberada`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const handleReserve = (table) => setReservingTable(table);
  const confirmReserve = async (payload) => {
    try {
      await tablesApi.reserve(reservingTable.id, payload);
      setReservingTable(null);
      toast.success(`Mesa ${reservingTable.number} reservada`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const handleUnreserve = async (table) => {
    try {
      await tablesApi.unreserve(table.id);
      toast.success('Reserva cancelada');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const handleEdit = (table) => setEditingTable(table);
  const handleAdd = () => {
    const next = (tables.reduce((m, t) => Math.max(m, t.number), 0) || 0) + 1;
    setEditingTable({ number: next, capacity: 4 });
  };
  const confirmEdit = async (payload) => {
    try {
      if (editingTable.id) {
        await tablesApi.update(editingTable.id, payload);
        toast.success('Mesa actualizada');
      } else {
        await tablesApi.create(payload);
        toast.success('Mesa creada');
      }
      setEditingTable(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (table) => {
    if (!window.confirm(`¿Eliminar la mesa ${table.number}? Esta acción es permanente.`)) return;
    try {
      await tablesApi.remove(table.id);
      toast.success('Mesa eliminada');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const stats = useMemo(() => ({
    free: tables.filter(t => t.status === 'free').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    billed: tables.filter(t => t.status === 'billed').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  }), [tables]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6" data-testid="tables-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-10 w-10 rounded-2xl bg-primary-500/15 border border-primary-500/30 text-primary-500 flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-black text-foreground">Sala</h1>
          </div>
          <p className="text-xs text-foreground/50 ml-12">Vista de mesas en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => navigate('/pos?walk=1')} variant="outline" className="h-11 rounded-2xl border-white/10 bg-white/5 text-foreground" data-testid="pos-walkin-button">
            <ShoppingBag className="h-4 w-4 mr-2" /> Para llevar
          </Button>
          <Button onClick={handleAdd} className="h-11 rounded-2xl bg-primary-500 hover:bg-primary-500/90 text-ink-950 font-bold" data-testid="add-table-button">
            <Plus className="h-4 w-4 mr-2" /> Nueva mesa
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'free', label: 'Libres', value: stats.free, cls: 'text-success bg-success/10 border-success/20' },
          { key: 'occupied', label: 'Ocupadas', value: stats.occupied, cls: 'text-amber bg-amber/10 border-amber/20' },
          { key: 'billed', label: 'Cuenta', value: stats.billed, cls: 'text-primary-500 bg-primary-500/10 border-primary-500/20' },
          { key: 'reserved', label: 'Reservadas', value: stats.reserved, cls: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
        ].map(s => (
          <div key={s.key} className={`glass rounded-2xl p-4 border ${s.cls}`} data-testid={`stat-${s.key}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{s.label}</p>
            <p className="font-mono font-black text-3xl mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-foreground/40 py-16">Cargando mesas…</div>
      ) : tables.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center border border-white/5" data-testid="tables-empty">
          <ChefHat className="h-14 w-14 text-primary-500/50 mx-auto mb-3" />
          <h3 className="font-heading text-xl font-bold text-foreground mb-1">Aún no tienes mesas</h3>
          <p className="text-sm text-foreground/50 mb-4">Crea tu primera mesa para empezar a operar la sala.</p>
          <Button onClick={handleAdd} className="h-11 rounded-2xl bg-primary-500 hover:bg-primary-500/90 text-ink-950 font-bold">
            <Plus className="h-4 w-4 mr-2" /> Crear primera mesa
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" data-testid="tables-grid">
          <AnimatePresence mode="popLayout">
            {tables.map(t => (
              <TableCard
                key={t.id}
                table={t}
                onOpen={handleOpen}
                onClose={handleClose}
                onBill={() => {}}
                onReserve={handleReserve}
                onUnreserve={handleUnreserve}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {openingTable && <OpenTableModal table={openingTable} cashiers={cashiers} onCancel={() => setOpeningTable(null)} onConfirm={confirmOpen} />}
        {reservingTable && <ReserveTableModal table={reservingTable} onCancel={() => setReservingTable(null)} onConfirm={confirmReserve} />}
        {editingTable && <EditTableModal table={editingTable} onCancel={() => setEditingTable(null)} onConfirm={confirmEdit} />}
      </AnimatePresence>
    </div>
  );
};

export default TablesPage;
