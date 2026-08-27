import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import CrossedUtensils from '@/components/CrossedUtensils';
import Aurora from '@/components/Aurora';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('¡Bienvenido de regreso!');
      navigate('/pos');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-ink-950">
      <Aurora />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center justify-center h-32 w-32 rounded-[2rem] mb-5 relative float"
          >
            <div className="absolute inset-0 rounded-[2rem] conic-border" />
            <div className="absolute inset-1 rounded-[1.8rem] bg-ink-900 flex items-center justify-center">
              <CrossedUtensils size={104} />
            </div>
          </motion.div>
          <motion.h1
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-heading text-5xl font-black text-gradient leading-none mb-2"
            data-testid="login-title"
          >Bienvenido</motion.h1>
          <motion.p
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-foreground/50"
          >Inicia sesión en tu POS</motion.p>
        </div>

        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative glass-strong rounded-3xl p-6 sm:p-8 shadow-glass login-card-glow"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold tracking-widest uppercase text-foreground/60">Correo</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-500/70" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="tu@restaurante.com"
                  value={form.email}
                  onChange={handleChange}
                  className="pl-12 h-14 rounded-2xl bg-ink-800/60 border border-white/5 focus:border-primary-500 focus:bg-ink-800 text-base text-foreground placeholder:text-foreground/30"
                  data-testid="login-email-input" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold tracking-widest uppercase text-foreground/60">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-500/70" />
                <Input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="pl-12 pr-12 h-14 rounded-2xl bg-ink-800/60 border border-white/5 focus:border-primary-500 focus:bg-ink-800 text-base text-foreground placeholder:text-foreground/30"
                  data-testid="login-password-input" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-primary-500 transition-colors"
                  data-testid="toggle-password-visibility"
                >
                  {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-semibold text-primary-500 hover:text-glow-cyan transition-all" data-testid="forgot-password-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold text-base shadow-neon-cyan transition-all"
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Entrando…</> : 'Entrar'}
              </Button>
            </motion.div>
          </form>

          <p className="text-center text-sm text-foreground/50 mt-6">
            ¿Aún no tienes cuenta?{' '}
            <Link to="/register" className="font-bold text-accent-500 hover:text-glow-violet transition-all" data-testid="register-link">
              Regístrate
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
