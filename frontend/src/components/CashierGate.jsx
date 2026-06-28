import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cashiersApi } from '@/utils/api';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, UserPlus, KeyRound, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/**
 * CashierGate — guards the POS sales screen. The user MUST log in as a cashier
 * before they can sell. If no cashiers exist, prompts to create one.
 */
const CashierGate = ({ children }) => {
  const { cashier, setActiveCashier } = useAuth();
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('pin');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await cashiersApi.list();
      setCashiers(list.filter(c => c.active));
    } catch { toast.error('Error al cargar cajeros'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!cashier) load(); }, [cashier]);

  if (cashier) return children;

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      const payload = mode === 'pin' ? { pin } : { password, cashier_id: selected.id };
      const r = await cashiersApi.login(payload);
      // Look up extra props (default_tip_percent) from the list we already fetched
      const full = cashiers.find(c => c.id === r.cashier_id);
      setActiveCashier({ id: r.cashier_id, name: r.name, default_tip_percent: full?.default_tip_percent ?? null });
      toast.success(`Hola, ${r.name}`);
      setSelected(null); setPin(''); setPassword('');
    } catch (e) { toast.error(e.response?.data?.detail || 'Credenciales incorrectas'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center" data-testid="cashier-gate">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center h-20 w-20 rounded-3xl mb-4 relative"
          >
            <div className="absolute inset-0 rounded-3xl conic-border" />
            <div className="absolute inset-1 rounded-[1.4rem] bg-ink-900 flex items-center justify-center">
              <Lock className="h-9 w-9 text-amber" strokeWidth={1.6} />
            </div>
          </motion.div>
          <h1 className="font-heading text-3xl font-black text-gradient mb-2">Inicia sesión de cajero</h1>
          <p className="text-foreground/50">Para registrar ventas necesitas un cajero activo</p>
        </div>

        <div className="glass-strong rounded-3xl p-6 shadow-glass">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-primary-500" /></div>
          ) : cashiers.length === 0 ? (
            <div className="text-center py-2">
              <UserPlus className="h-12 w-12 text-amber mx-auto mb-3" />
              <h3 className="font-heading text-lg font-bold mb-1 text-foreground">Aún no hay cajeros</h3>
              <p className="text-sm text-foreground/50 mb-4">Crea al menos un cajero para empezar a vender</p>
              <Link to="/cashiers">
                <Button className="h-12 rounded-2xl bg-amber hover:bg-amber/90 text-ink-950 font-bold px-6" data-testid="gate-create-cashier-btn">
                  <UserPlus className="h-4 w-4 mr-1" /> Crear cajero
                </Button>
              </Link>
            </div>
          ) : !selected ? (
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-widest uppercase text-foreground/60 mb-1">Selecciona tu usuario</p>
              {cashiers.map(c => (
                <motion.button
                  key={c.id}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelected(c); setMode(c.has_pin ? 'pin' : 'password'); }}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-primary-500/30 transition-all"
                  data-testid={`gate-cashier-${c.id}`}
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center font-heading font-black text-primary-500 text-glow-cyan">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-bold text-foreground truncate">{c.name}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      {c.has_pin && <span className="text-[10px] font-bold uppercase bg-white/5 text-foreground/60 px-2 py-0.5 rounded-full">PIN</span>}
                      {c.has_password && <span className="text-[10px] font-bold uppercase bg-white/5 text-foreground/60 px-2 py-0.5 rounded-full">Contraseña</span>}
                    </div>
                  </div>
                </motion.button>
              ))}
              <Link to="/cashiers" className="block pt-2">
                <Button variant="outline" className="w-full h-11 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground" data-testid="gate-manage-cashiers-btn">
                  <UserPlus className="h-4 w-4 mr-1" /> Gestionar cajeros
                </Button>
              </Link>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelected(null); setPin(''); setPassword(''); }} className="text-foreground/60 hover:text-foreground" data-testid="gate-back-btn">
                    ← Atrás
                  </button>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-3xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center font-heading font-black text-2xl text-primary-500 text-glow-cyan mb-2">
                    {selected.name[0]?.toUpperCase()}
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground">{selected.name}</h3>
                </div>
                {selected.has_pin && selected.has_password && (
                  <div className="grid grid-cols-2 gap-1 bg-ink-800 rounded-2xl p-1">
                    <button onClick={() => setMode('pin')} className={`h-10 rounded-xl text-sm font-bold ${mode === 'pin' ? 'bg-primary-500 text-ink-950 shadow-neon-cyan' : 'text-foreground/60'}`} data-testid="gate-mode-pin">PIN</button>
                    <button onClick={() => setMode('password')} className={`h-10 rounded-xl text-sm font-bold ${mode === 'password' ? 'bg-primary-500 text-ink-950 shadow-neon-cyan' : 'text-foreground/60'}`} data-testid="gate-mode-password">Contraseña</button>
                  </div>
                )}
                {mode === 'pin' ? (
                  <Input
                    autoFocus
                    maxLength={4} inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && pin.length === 4 && handleLogin()}
                    placeholder="0000"
                    className="h-16 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500 text-center text-3xl tracking-[0.5em] font-mono font-bold text-foreground"
                    data-testid="gate-pin-input"
                  />
                ) : (
                  <Input
                    autoFocus
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && password && handleLogin()}
                    placeholder="Contraseña"
                    className="h-12 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500 text-foreground"
                    data-testid="gate-password-input"
                  />
                )}
                <Button
                  onClick={handleLogin}
                  className="w-full h-14 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-black shadow-neon-cyan"
                  disabled={submitting || (mode === 'pin' ? pin.length !== 4 : !password)}
                  data-testid="gate-submit-btn"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (<><Sparkles className="h-4 w-4 mr-2" /> Entrar</>)}
                </Button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CashierGate;
