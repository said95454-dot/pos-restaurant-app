import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token.trim().toUpperCase(), password);
      toast.success('Contraseña actualizada');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.detail || 'Código inválido o expirado'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950">
      <div className="w-full max-w-md animate-slide-up">
        <Link to="/login" className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-accent-500 shadow-ios-lg mb-4">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Nueva contraseña</h1>
          <p className="text-foreground/50 mt-2">Ingresa el código que recibiste</p>
        </div>
        <div className="glass-strong rounded-3xl p-6 sm:p-8 shadow-glass">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-foreground">Código de recuperación</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value.toUpperCase())} placeholder="XXXXXXXX" maxLength={8} className="mt-1 h-14 rounded-2xl bg-ink-800/60 border border-white/10 text-center text-2xl tracking-widest font-bold uppercase" data-testid="reset-token-input" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground">Nueva contraseña</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/50" />
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="pl-12 h-14 rounded-2xl bg-ink-800/60 border border-white/10" data-testid="reset-password-input" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan font-semibold ios-press" data-testid="reset-submit">
              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Actualizando…</> : 'Cambiar contraseña'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
