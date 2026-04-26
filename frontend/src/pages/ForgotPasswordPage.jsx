import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Si el email existe, recibirás un código');
    } catch { toast.error('Error al enviar'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950">
      <div className="w-full max-w-md animate-slide-up">
        <Link to="/login" className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-4" data-testid="back-to-login">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-primary-500 shadow-ios-lg mb-4">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground" data-testid="forgot-title">¿Olvidaste tu contraseña?</h1>
          <p className="text-foreground/50 mt-2">Te enviaremos un código por email</p>
        </div>
        <div className="glass-strong rounded-3xl p-6 sm:p-8 shadow-glass">
          {sent ? (
            <div className="text-center py-4" data-testid="forgot-sent">
              <div className="h-12 w-12 rounded-full bg-success/10 text-success border border-success/20 mx-auto flex items-center justify-center mb-3 text-2xl">✓</div>
              <p className="font-semibold text-foreground mb-1">Revisa tu correo</p>
              <p className="text-sm text-foreground/50 mb-4">Si el email existe, recibirás un código de 8 caracteres.</p>
              <Link to="/reset-password">
                <Button className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan px-5" data-testid="go-to-reset">
                  Ya tengo el código
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-foreground">Correo electrónico</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/50" />
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@restaurante.com" className="pl-12 h-14 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500 text-foreground" data-testid="forgot-email-input" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan font-semibold ios-press" data-testid="forgot-submit">
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enviando…</> : 'Enviar código'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
