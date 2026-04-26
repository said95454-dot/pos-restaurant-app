# PRD - POS Restaurante (PWA Futurista)

## Problema Original
Usuario clonó https://github.com/said95454-dot/pos-restaurant-app y pidió compilar/arreglar errores y hacer una app válida para iPhone, iPad y Mac. Tras explicar opciones, eligió Opción A: PWA. Después pidió un rediseño "más futurista, espectacular con animaciones, no básico".

## Estado Actual (Enero 2026)

### Implementado ✅

#### Backend (FastAPI + MongoDB + JWT) — `/app/backend/server.py` — sin cambios
- Auth multi-restaurante, productos, órdenes, cajeros, stats, corte de caja
- 23/23 tests pytest (100%)

#### Frontend (React 19 + Tailwind + framer-motion + shadcn/ui)
**Look futurista premium**:
- 🌑 Tema oscuro espacial (#06070D) con neón cian (#00F0FF) y violeta (#B14EFF)
- 🌌 **Aurora animada** de fondo (gradientes radiales con animación 22s)
- 💎 **Glassmorphism profundo** (blur 28-40px, saturate 180%)
- ✨ **Ícono con conic-border giratorio** y glow neón
- 🎬 **Splash screen cinematográfico** al iniciar (1.4s)
- 🔢 **Contadores animados** (framer-motion useSpring) en totales y stats
- 🎯 **Active-pill animado** en navegación con `layoutId` (transición fluida entre tabs)
- 💫 **Page transitions** suaves entre rutas
- 🎨 Productos con hover `-translate-y-1` + glow cian al pasar el cursor
- ⚡ Botones primarios con `shadow-neon-cyan` (glow real)
- 📊 Gráficos recharts con gradiente cyan→violeta
- 🌟 Pulse-dot en indicadores "live" (cajero activo)
- ✨ Shimmer skeletons en lugar de spinners
- 🔠 Tipografía: **Outfit** (headings) + **Manrope** (body) + **JetBrains Mono** (números)
- 🌫 Grain texture sutil en fondos para profundidad

**Páginas**: Login, Register, ForgotPassword, ResetPassword, POS, Productos, Órdenes, Estadísticas, Corte de Caja, Cajeros, Ajustes — todas re-skineadas a tema futurista oscuro.

**PWA**: manifest.json con `theme_color: #06070D`, `apple-mobile-web-app-status-bar-style: black-translucent`, íconos generados con glow neón.

### Tecnologías nuevas agregadas
- **framer-motion 12.38** (animaciones, page transitions, layoutId, AnimatePresence)
- JetBrains Mono para números

### Testing
- Iteración 4: 14/14 tests pasados (100%) — todas las funcionalidades preservadas tras el redesign
- Sin errores de consola, sin contraste roto, sin regresiones
- Validado en desktop (1280x800) y móvil (390x844)

### Credenciales demo
- Email: demo@restaurant.com
- Pwd: demo1234

## Próximos Pasos / Backlog

### P0
- Configurar `RESEND_API_KEY` para emails de recuperación

### P1
- Service Worker para offline básico
- Impresión de tickets vía AirPrint
- Sonido de "cha-ching" al cobrar
- Confeti animado al cerrar caja con cero diferencia

### P2
- App nativa Expo para App Store
- Modo "presentación" para pantalla pública del menú
- Reportes exportables (CSV/PDF)
- Multi-idioma (ES/EN)

## Arquitectura
- 1 backend FastAPI multi-tenant
- 1 frontend React PWA (instalable en iPhone, iPad, Mac via Safari)
- MongoDB
- JWT en localStorage
- framer-motion para animaciones, recharts para gráficos
