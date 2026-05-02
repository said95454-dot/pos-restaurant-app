import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Mail, Lock, Store, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Aurora from '@/components/Aurora';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ restaurant_name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Las contraseñas no coinciden'); return; }
    if (form.password.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.restaurant_name);
      toast.success(`¡Bienvenido, ${form.restaurant_name}!`);
      navigate('/pos');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear la cuenta');
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
        <div className="text-center mb-7">
          <motion.div
            initial={{ scale: 0.6, rotate: 20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="inline-flex items-center justify-center h-20 w-20 rounded-3xl mb-5 relative float"
          >
            <div className="absolute inset-0 rounded-3xl conic-border" />
            <div className="absolute inset-1 rounded-[1.4rem] bg-ink-900 flex items-center justify-center">
              <Rocket className="h-9 w-9 text-accent-500" strokeWidth={1.6} />
            </div>
          </motion.div>
          <h1 className="font-heading text-4xl font-black text-gradient mb-2" data-testid="register-title">Crea tu cuenta</h1>
          <p className="text-foreground/50">Empieza a vender en menos de 1 minuto</p>
        </div>

        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="glass-strong rounded-3xl p-6 sm:p-8 shadow-glass"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field icon={Store} label="Nombre del restaurante" name="restaurant_name" placeholder="Mi Restaurante" value={form.restaurant_name} onChange={handleChange} testId="register-restaurant-input" />
            <Field icon={Mail} label="Correo" name="email" type="email" placeholder="tu@restaurante.com" value={form.email} onChange={handleChange} testId="register-email-input" />
            <PasswordField label="Contraseña" name="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} show={showPwd} setShow={setShowPwd} testId="register-password-input" />
            <PasswordField label="Confirmar contraseña" name="confirm" placeholder="Repite tu contraseña" value={form.confirm} onChange={handleChange} show={showPwd} setShow={setShowPwd} testId="register-confirm-input" hideToggle />

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-2">
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-accent-500 hover:bg-accent-400 text-white font-bold text-base shadow-neon-violet"
                disabled={loading}
                data-testid="register-submit-button"
              >
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creando…</> : 'Crear cuenta'}
              </Button>
            </motion.div>
          </form>
          <p className="text-center text-sm text-foreground/50 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-bold text-primary-500 hover:text-glow-cyan" data-testid="login-link">Inicia sesión</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

const Field = ({ icon: Icon, label, testId, ...props }) => (
  <div className="space-y-2">
    <Label className="text-xs font-semibold tracking-widest uppercase text-foreground/60">{label}</Label>
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-500/70" />
      <Input
        required
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
        className="pl-12 h-14 rounded-2xl bg-ink-800/60 border border-white/5 focus:border-primary-500 focus:bg-ink-800 text-foreground placeholder:text-foreground/30"
        data-testid={testId}
      />
    </div>
  </div>
);

const PasswordField = ({ label, name, value, onChange, placeholder, show, setShow, testId, hideToggle = false }) => (
  <div className="space-y-2">
    <Label className="text-xs font-semibold tracking-widest uppercase text-foreground/60">{label}</Label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-500/70" />
      <Input
        name={name}
        type={show ? 'text' : 'password'}
        required
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="new-password"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pl-12 pr-12 h-14 rounded-2xl bg-ink-800/60 border border-white/5 focus:border-primary-500 focus:bg-ink-800 text-foreground placeholder:text-foreground/30"
        data-testid={testId}
      />
      {!hideToggle && (
        <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-primary-500" data-testid="toggle-password-visibility">
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </div>
  </div>
);

export default RegisterPage;
