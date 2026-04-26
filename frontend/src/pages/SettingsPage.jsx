import React, { useState, useEffect } from 'react';
import { businessApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X, Save, LogOut, Smartphone, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { restaurant, logout } = useAuth();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setBusiness(await businessApi.get()); }
    catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) { toast.error('Imagen máx 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setBusiness(b => ({ ...b, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      await businessApi.update({ name: business.name, logo: business.logo });
      toast.success('Cambios guardados');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 md:pb-6" data-testid="settings-page">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-wider text-foreground/50 uppercase">Configuración</p>
          <h1 className="font-heading text-3xl font-bold text-foreground">Ajustes</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
        ) : (
          <div className="space-y-4">
            <div className="glass rounded-3xl p-5">
              <h3 className="font-heading text-lg font-bold mb-4">Restaurante</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground">Logo</label>
                  <label className="block mt-1 cursor-pointer">
                    <div className="aspect-video bg-ink-800/60 border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative max-w-xs">
                      {business?.logo ? (
                        <>
                          <img src={business.logo} alt="" className="w-full h-full object-contain" />
                          <button type="button" onClick={(e) => { e.preventDefault(); setBusiness(b => ({ ...b, logo: null })); }} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center" data-testid="remove-logo-button">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-foreground/50">Subir logo</p>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogo} className="hidden" data-testid="logo-input" />
                  </label>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground">Nombre del restaurante</label>
                  <Input value={business?.name || ''} onChange={(e) => setBusiness({ ...business, name: e.target.value })} className="mt-1 h-12 rounded-2xl bg-ink-800/60 border border-white/5 border-transparent" data-testid="business-name-input" />
                </div>
                <Button onClick={save} className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan px-5" disabled={saving} data-testid="save-business-button">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Guardar cambios
                </Button>
              </div>
            </div>

            <div className="glass rounded-3xl p-5">
              <h3 className="font-heading text-lg font-bold mb-3">Cuenta</h3>
              <div className="space-y-1 mb-4">
                <Row label="Email" value={restaurant?.email} />
                <Row label="Restaurante" value={restaurant?.restaurant_name} />
                <Row label="ID" value={restaurant?.id?.slice(0, 8) + '…'} />
              </div>
              <Button variant="outline" onClick={() => { logout(); navigate('/login'); }} className="h-12 rounded-2xl text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" data-testid="settings-logout-button">
                <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
              </Button>
            </div>

            <div className="glass rounded-3xl border border-primary-500/30 shadow-neon-cyan p-5" data-testid="install-pwa-card">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold">Instala como app en tu Apple</h3>
                  <p className="text-sm text-foreground/50">Funciona en iPhone, iPad y Mac sin App Store</p>
                </div>
              </div>
              {isStandalone ? (
                <div className="bg-success/10 text-success border border-success/20 rounded-2xl p-3 text-sm font-semibold" data-testid="pwa-installed-msg">
                  ✓ App instalada — estás usándola en modo nativo
                </div>
              ) : (
                <ol className="space-y-2 text-sm text-foreground">
                  <li className="flex gap-2"><span className="font-bold text-primary-500">1.</span> Abre esta página en <b>Safari</b> en tu iPhone, iPad o Mac.</li>
                  <li className="flex gap-2"><span className="font-bold text-primary-500">2.</span> Toca el botón <b>Compartir</b> (cuadrado con flecha).</li>
                  <li className="flex gap-2"><span className="font-bold text-primary-500">3.</span> Selecciona <b>"Añadir a pantalla de inicio"</b> (iOS) o <b>"Añadir al Dock"</b> (Mac).</li>
                  <li className="flex gap-2"><span className="font-bold text-primary-500">4.</span> ¡Listo! Tu POS aparece como app nativa.</li>
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-0 border-white/5">
    <span className="text-sm text-foreground/50">{label}</span>
    <span className="text-sm font-semibold text-foreground">{value}</span>
  </div>
);

export default SettingsPage;
