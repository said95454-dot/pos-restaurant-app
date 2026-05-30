import React, { useState, useEffect } from 'react';
import { businessApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X, Save, LogOut, Smartphone, QrCode, ExternalLink, Copy, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import { getMuted, setMuted, playCheckout } from '@/utils/sound';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { restaurant, logout } = useAuth();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [muted, setMutedState] = useState(getMuted());

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playCheckout(); // play a sample when re-enabling
  };

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
      await businessApi.update({
        name: business.name,
        logo: business.logo,
        logo_size: business.logo_size || 'md',
        qr_url: business.qr_url || '',
        qr_label: business.qr_label || '',
      });
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

                {business?.logo && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Tamaño del logo en el POS</label>
                    <p className="text-xs text-foreground/50 mb-2">Elige cómo se verá el logo arriba del Punto de Venta</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'sm', label: 'Pequeño', size: 32 },
                        { id: 'md', label: 'Mediano', size: 48 },
                        { id: 'lg', label: 'Grande', size: 64 },
                        { id: 'xl', label: 'Enorme', size: 80 },
                      ].map(opt => {
                        const isActive = (business?.logo_size || 'md') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setBusiness({ ...business, logo_size: opt.id })}
                            data-testid={`logo-size-${opt.id}`}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ios-press ${
                              isActive
                                ? 'border-primary-500 bg-primary-500/10 text-primary-500 shadow-neon-cyan'
                                : 'border-white/10 bg-white/5 text-foreground hover:bg-white/10'
                            }`}
                          >
                            <div className="bg-ink-900 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center" style={{ width: opt.size, height: opt.size }}>
                              <img src={business.logo} alt="" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xs font-bold">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-foreground">Nombre del restaurante</label>
                  <Input value={business?.name || ''} onChange={(e) => setBusiness({ ...business, name: e.target.value })} className="mt-1 h-12 rounded-2xl bg-ink-800/60 border border-white/10" data-testid="business-name-input" />
                </div>
                <Button onClick={save} className="h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan px-5" disabled={saving} data-testid="save-business-button">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Guardar cambios
                </Button>
              </div>
            </div>

            {/* QR on receipts */}
            <div className="glass rounded-3xl p-5" data-testid="qr-config-card">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-amber/15 border border-amber/30 text-amber flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">QR en cada ticket</h3>
                  <p className="text-sm text-foreground/50">Imprime un QR único en cada nota para que tu cliente deje propina, reseña o vea tu menú.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-foreground">URL del QR</label>
                  <p className="text-xs text-foreground/50 mb-1">Pega aquí tu link de Google Reviews, Instagram, WhatsApp, menú online, etc.</p>
                  <Input
                    value={business?.qr_url || ''}
                    onChange={(e) => setBusiness({ ...business, qr_url: e.target.value })}
                    placeholder="https://g.page/r/tu-restaurante/review"
                    className="mt-1 h-12 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500 text-foreground"
                    data-testid="qr-url-input"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground">Texto sobre el QR (opcional)</label>
                  <Input
                    value={business?.qr_label || ''}
                    onChange={(e) => setBusiness({ ...business, qr_label: e.target.value })}
                    placeholder="¡Déjanos tu reseña!"
                    maxLength={32}
                    className="mt-1 h-12 rounded-2xl bg-ink-800 border-white/10 focus:border-primary-500 text-foreground"
                    data-testid="qr-label-input"
                  />
                </div>

                {business?.qr_url && (
                  <div className="bg-ink-800/60 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4" data-testid="qr-preview">
                    <div className="bg-white p-3 rounded-2xl flex-shrink-0">
                      <QRCodeCanvas value={business.qr_url} size={120} level="M" />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      {business?.qr_label && (
                        <p className="font-bold text-foreground mb-1">{business.qr_label}</p>
                      )}
                      <p className="text-xs text-foreground/50 break-all">{business.qr_url}</p>
                      <div className="flex gap-2 mt-3 flex-wrap justify-center sm:justify-start">
                        <a href={business.qr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-glow-cyan">
                          <ExternalLink className="h-3 w-3" /> Probar
                        </a>
                        <button
                          onClick={() => { navigator.clipboard.writeText(business.qr_url); toast.success('Copiado'); }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-foreground/60 hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-amber/5 border border-amber/20 rounded-2xl p-3 text-xs text-foreground/70 leading-relaxed">
                  <b className="text-amber">💡 Tip:</b> Para Google Reviews, ve a <b>Google Business Profile → Pedir reseñas → Compartir formulario</b>. Para Instagram, usa <code className="text-primary-500">https://instagram.com/tu_negocio</code>. Para WhatsApp, <code className="text-primary-500">https://wa.me/52TUTELÉFONO</code>.
                </div>

                <Button onClick={save} className="h-12 rounded-2xl bg-amber hover:bg-amber/90 text-ink-950 font-bold px-5" disabled={saving} data-testid="save-qr-button">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />} Guardar QR
                </Button>
              </div>
            </div>

            {/* Sound preferences */}
            <div className="glass rounded-3xl p-5" data-testid="sound-card">
              <div className="flex items-start gap-3 mb-3">
                <div className={`h-10 w-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${muted ? 'bg-ink-700 border-white/10 text-foreground/40' : 'bg-primary-500/15 border-primary-500/30 text-primary-500'}`}>
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-lg font-bold text-foreground">Sonidos</h3>
                  <p className="text-sm text-foreground/50">Sonido "cha-ching" al cobrar y celebración al cerrar caja sin diferencias</p>
                </div>
                <button
                  onClick={toggleSound}
                  className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ${muted ? 'bg-ink-700' : 'bg-primary-500 shadow-neon-cyan'}`}
                  data-testid="sound-toggle"
                  aria-label={muted ? 'Activar sonidos' : 'Desactivar sonidos'}
                >
                  <span className={`absolute top-0.5 h-6 w-6 bg-white rounded-full shadow transition-transform ${muted ? 'translate-x-0.5' : 'translate-x-5'}`} />
                </button>
              </div>
              <button
                onClick={() => { if (muted) { toast.error('Activa los sonidos primero'); return; } playCheckout(); }}
                className="text-xs font-bold uppercase tracking-wider text-primary-500 hover:text-glow-cyan"
                data-testid="test-sound-btn"
              >
                ▶ Probar sonido de cobro
              </button>
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
