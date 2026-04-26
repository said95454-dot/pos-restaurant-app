import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Mail, Lock, Store, Utensils } from 'lucide-react';
import { toast } from 'sonner';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ restaurant_name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#FBFBFD] via-white to-primary-50">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-accent-500 shadow-ios-lg mb-4">
            <Utensils className="h-8 w-8 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="font-heading text-4xl font-bold text-ios-text" data-testid="register-title">Crea tu cuenta</h1>
          <p className="text-ios-secondary mt-2">Empieza a vender en menos de 1 minuto</p>
        </div>

        <div className="bg-white rounded-3xl shadow-ios p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ios-text">Nombre del restaurante</Label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ios-secondary" />
                <Input
                  name="restaurant_name"
                  type="text"
                  required
                  placeholder="Mi Restaurante"
                  value={form.restaurant_name}
                  onChange={handleChange}
                  className="pl-12 h-14 rounded-2xl bg-ios-gray border-transparent focus:bg-white focus:border-primary-500 text-base"
                  data-testid="register-restaurant-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ios-text">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ios-secondary" />
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="tu@restaurante.com"
                  value={form.email}
                  onChange={handleChange}
                  className="pl-12 h-14 rounded-2xl bg-ios-gray border-transparent focus:bg-white focus:border-primary-500 text-base"
                  data-testid="register-email-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ios-text">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ios-secondary" />
                <Input
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={handleChange}
                  className="pl-12 pr-12 h-14 rounded-2xl bg-ios-gray border-transparent focus:bg-white focus:border-primary-500 text-base"
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ios-secondary"
                  data-testid="toggle-password-visibility"
                >
                  {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ios-text">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ios-secondary" />
                <Input
                  name="confirm"
                  type={showPwd ? 'text' : 'password'}
                  required
                  placeholder="Repite tu contraseña"
                  value={form.confirm}
                  onChange={handleChange}
                  className="pl-12 h-14 rounded-2xl bg-ios-gray border-transparent focus:bg-white focus:border-primary-500 text-base"
                  data-testid="register-confirm-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-base ios-press"
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creando cuenta…</> : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-sm text-ios-secondary mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-600" data-testid="login-link">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
