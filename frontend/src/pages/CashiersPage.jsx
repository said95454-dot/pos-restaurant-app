import React, { useState, useEffect } from 'react';
import { cashiersApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Plus, Edit2, Trash2, Users, KeyRound, LogIn, UserCheck, Power } from 'lucide-react';
import { toast } from 'sonner';

const CashiersPage = () => {
  const { cashier: activeCashier, setActiveCashier } = useAuth();
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [loginFor, setLoginFor] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCashiers(await cashiersApi.list()); }
    catch { toast.error('Error al cargar cajeros'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const tipPct = form.default_tip_percent === '' || form.default_tip_percent === null || form.default_tip_percent === undefined
        ? null
        : parseFloat(form.default_tip_percent);
      if (editing.id) {
        const payload = { name: form.name, active: form.active, default_tip_percent: tipPct };
        if (form.pin) payload.pin = form.pin;
        if (form.password) payload.password = form.password;
        await cashiersApi.update(editing.id, payload);
        toast.success('Cajero actualizado');
      } else {
        await cashiersApi.create({ name: form.name, pin: form.pin || null, password: form.password || null, default_tip_percent: tipPct });
        toast.success('Cajero creado');
      }
      setEditing(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cajero?')) return;
    try {
      await cashiersApi.remove(id);
      if (activeCashier?.id === id) setActiveCashier(null);
      toast.success('Cajero eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-6" data-testid="cashiers-page">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold tracking-wider text-foreground/50 uppercase">Equipo</p>
            <h1 className="font-heading text-3xl font-bold text-foreground">Cajeros</h1>
            {activeCashier && (
              <p className="text-sm text-primary-500 font-medium mt-1">
                Sesión activa: <span className="font-bold">{activeCashier.name}</span>
                <button onClick={() => { setActiveCashier(null); toast.success('Sesión de cajero cerrada'); }} className="ml-2 underline text-destructive" data-testid="logout-cashier-button">cerrar</button>
              </p>
            )}
          </div>
          <Button onClick={() => setEditing({ name: '', pin: '', password: '', active: true })} className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan px-5 ios-press" data-testid="add-cashier-button">
            <Plus className="h-5 w-5 mr-1" /> Nuevo cajero
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : cashiers.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center" data-testid="cashiers-empty">
            <Users className="h-12 w-12 text-foreground/30 mx-auto mb-3" />
            <h3 className="font-heading text-xl font-bold text-foreground">Sin cajeros aún</h3>
            <p className="text-foreground/50">Agrega cajeros para registrar las ventas con su nombre</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cashiers.map(c => (
              <div key={c.id} className={`glass rounded-3xl border p-4 flex items-center gap-3 ${activeCashier?.id === c.id ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-white/5'}`} data-testid={`cashier-${c.id}`}>
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-heading font-bold ${c.active ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20' : 'bg-ink-800/60 border border-white/5 text-foreground/50'}`}>
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-foreground/50 mt-0.5 flex-wrap">
                    {c.has_pin && <span className="bg-ink-800/60 border border-white/5 px-2 py-0.5 rounded-full">PIN</span>}
                    {c.has_password && <span className="bg-ink-800/60 border border-white/5 px-2 py-0.5 rounded-full">Contraseña</span>}
                    {c.default_tip_percent != null && (
                      <span className="bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-full font-bold" data-testid={`cashier-tip-badge-${c.id}`}>Propina {c.default_tip_percent}%</span>
                    )}
                    {!c.active && <span className="bg-destructive/15 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {c.active && activeCashier?.id !== c.id && (
                    <button onClick={() => setLoginFor(c)} className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center ios-press" title="Iniciar sesión" data-testid={`login-cashier-${c.id}`}>
                      <LogIn className="h-4 w-4 text-success" />
                    </button>
                  )}
                  <button onClick={() => setEditing({ ...c, pin: '', password: '' })} className="h-8 w-8 rounded-full bg-ink-800/60 border border-white/5 flex items-center justify-center ios-press" data-testid={`edit-cashier-${c.id}`}>
                    <Edit2 className="h-4 w-4 text-foreground" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center ios-press" data-testid={`delete-cashier-${c.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CashierForm editing={editing} onClose={() => setEditing(null)} onSave={handleSave} saving={saving} />
      <CashierLoginModal cashier={loginFor} onClose={() => setLoginFor(null)} onSuccess={(c) => { setActiveCashier(c); setLoginFor(null); toast.success(`Hola, ${c.name}`); }} cashiers={cashiers} />
    </div>
  );
};

const CashierForm = ({ editing, onClose, onSave, saving }) => {
  const [form, setForm] = useState(editing || {});
  useEffect(() => { setForm(editing || {}); }, [editing]);
  if (!editing) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error('Nombre requerido'); return; }
    if (!editing.id && !form.pin && !form.password) { toast.error('Define un PIN o contraseña'); return; }
    if (form.pin && !/^\d{4}$/.test(form.pin)) { toast.error('El PIN debe ser de 4 dígitos'); return; }
    onSave(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-md bg-ink-900 border-white/10 text-foreground" data-testid="cashier-form-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{editing.id ? 'Editar cajero' : 'Nuevo cajero'}</DialogTitle>
          <DialogDescription className="text-foreground/50 text-sm">Define un PIN o contraseña para el cajero.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground">Nombre</label>
            <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del cajero" className="mt-1 h-12 rounded-2xl bg-ink-800/60 border border-white/10" data-testid="cashier-name-input" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">PIN de 4 dígitos {editing.id && <span className="text-foreground/50 text-xs">(dejar vacío para no cambiar)</span>}</label>
            <Input maxLength={4} inputMode="numeric" value={form.pin || ''} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} placeholder="0000" className="mt-1 h-12 rounded-2xl bg-ink-800/60 border border-white/10 text-center text-2xl tracking-widest font-bold" data-testid="cashier-pin-input" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Contraseña <span className="text-foreground/50 text-xs">(opcional, alternativa al PIN)</span></label>
            <Input type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" className="mt-1 h-12 rounded-2xl bg-ink-800/60 border border-white/10" data-testid="cashier-password-input" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Propina sugerida por defecto <span className="text-foreground/50 text-xs">(opcional, sobreescribe el % global)</span></label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.default_tip_percent ?? ''}
                onChange={(e) => setForm({ ...form, default_tip_percent: e.target.value })}
                placeholder="Usar global"
                className="mt-1 h-12 rounded-2xl bg-ink-800/60 border border-white/10 w-32"
                data-testid="cashier-tip-input"
              />
              <span className="text-foreground/60 font-semibold">%</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, default_tip_percent: '' })}
                className="text-xs font-bold px-2 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-foreground/70"
                data-testid="cashier-tip-clear"
              >Usar global</button>
            </div>
          </div>
          {editing.id && (
            <div className="flex items-center justify-between bg-ink-800/60 border border-white/5 rounded-2xl p-3">
              <div>
                <p className="font-semibold text-foreground">Activo</p>
                <p className="text-xs text-foreground/50">Permite usar este cajero</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, active: !form.active })} className={`h-7 w-12 rounded-full transition-colors ${form.active ? 'bg-success' : 'bg-ios-tertiary'}`} data-testid="cashier-active-toggle">
                <div className={`h-6 w-6 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan" disabled={saving} data-testid="save-cashier-button">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CashierLoginModal = ({ cashier, onClose, onSuccess, cashiers = [] }) => {
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('pin');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPin(''); setPassword(''); setMode('pin'); }, [cashier?.id]);

  if (!cashier) return null;

  const submit = async () => {
    setLoading(true);
    try {
      const payload = mode === 'pin' ? { pin } : { password, cashier_id: cashier.id };
      const r = await cashiersApi.login(payload);
      const full = cashiers.find(c => c.id === r.cashier_id);
      onSuccess({ id: r.cashier_id, name: r.name, default_tip_percent: full?.default_tip_percent ?? null });
    } catch (e) { toast.error(e.response?.data?.detail || 'Credenciales incorrectas'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-sm bg-ink-900 border-white/10 text-foreground" data-testid="cashier-login-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-center">Iniciar sesión: {cashier.name}</DialogTitle>
          <DialogDescription className="text-foreground/50 text-sm text-center">Ingresa el PIN o contraseña del cajero.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 bg-ink-800/60 border border-white/5 rounded-2xl p-1">
            <button onClick={() => setMode('pin')} className={`h-10 rounded-xl text-sm font-semibold ${mode === 'pin' ? 'bg-white shadow-ios-sm' : 'text-foreground/50'}`} data-testid="cashier-login-mode-pin">PIN</button>
            <button onClick={() => setMode('password')} className={`h-10 rounded-xl text-sm font-semibold ${mode === 'password' ? 'bg-white shadow-ios-sm' : 'text-foreground/50'}`} data-testid="cashier-login-mode-password">Contraseña</button>
          </div>
          {mode === 'pin' ? (
            <Input maxLength={4} inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="0000" className="h-16 rounded-2xl bg-ink-800/60 border border-white/10 text-center text-3xl tracking-widest font-bold" data-testid="cashier-login-pin-input" />
          ) : (
            <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="h-12 rounded-2xl bg-ink-800/60 border border-white/10" data-testid="cashier-login-password-input" />
          )}
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button variant="outline" className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan" onClick={submit} disabled={loading || (mode === 'pin' ? pin.length !== 4 : !password)} data-testid="cashier-login-submit">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashiersPage;
