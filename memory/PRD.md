# PRD - POS Restaurante (PWA Futurista v2.1)

## Problema Original
POS Restaurante PWA. Multi-tenant FastAPI + React. Usuario pidió en orden:
1. Compilar el repo y arreglar errores
2. Que sea instalable en iPhone, iPad y Mac (PWA)
3. Diseño futurista espectacular con animaciones
4. **5 mejoras finales (esta iteración)**:
   - Bloquear venta sin cajero activo
   - Fondo temático restaurante
   - Imprimir pedido (universal)
   - Inputs con texto visible
   - Editor de imagen al agregar productos

## Estado Actual (Enero 2026) — v2.2

### Implementado y Validado ✅

**Backend** — 26/26 tests pasados (incluye 3 nuevos QR tests)

**Frontend** — 100% tests pasados (iteración 6)

#### Nuevas funciones de v2.2
- 📧 **Resend integrado**: API key configurada (`re_cr9PFRPF…`). Recuperación de contraseña funcional. ⚠️ **Nota Resend free tier**: solo envía a `said95454@gmail.com` (tu email verificado). Para enviar a otros, verifica un dominio en resend.com/domains.
- 📱 **QR único en cada ticket impreso**:
  - Configurable desde **Ajustes → "QR en cada ticket"**
  - URL configurable (Google Reviews, Instagram, WhatsApp, menú online, etc.)
  - Label personalizable ("¡Déjanos tu reseña!", etc.)
  - Live preview en Settings (con QRCodeCanvas)
  - Cada QR incluye `?ref={order_id}` para tracking de qué orden lo generó
  - Renderizado en el ticket impreso vía `qrcode.react`
  - Persistente en MongoDB en `business.qr_url` y `business.qr_label`
  - Demo account viene pre-configurado con un QR de ejemplo

#### Nuevas funciones de esta versión
- 🔒 **CashierGate**: el POS está bloqueado hasta que un cajero inicie sesión. Si no hay cajeros, redirige a crearlos. Cada cajero entra con PIN o contraseña.
- 🪧 **Lock badge** en el tab "Vender" mientras no haya cajero activo.
- 🍽️ **Fondo temático restaurante**: aurora con tonos cálidos (naranja, ámbar, rojo) + violeta/cian + patrón punteado sutil tipo cocina.
- 🖨️ **Impresión universal de tickets**:
  - Compatible con AirPrint (iOS/Mac), Bluetooth, USB, red, impresoras térmicas (80mm)
  - `Receipt.jsx` renderiza un ticket con logo, fecha, folio, productos, opciones, total, método de pago, cambio
  - Auto-impresión opcional al cobrar (toggle `auto-print-toggle`)
  - Botón "reimprimir último" en el header del POS
  - Botón de imprimir en cada orden del historial `/orders`
  - Estilos `@media print` con `@page size: 80mm auto`
- ✏️ **Inputs visibles**: corregido el bug de `focus:bg-white` que volvía el texto invisible. Ahora `text-foreground` siempre + `caret-color: cyan`.
- 📸 **Editor de imagen** (`ImageEditor.jsx`): al subir foto de producto se abre canvas con zoom (slider + botones), pan (arrastrar), rotación 90°, reset, y guarda como JPEG 600×600 base64.

#### Funciones existentes (preservadas)
- Auth multi-restaurante
- Productos CRUD con opciones personalizadas
- Órdenes con filtros + reimpresión
- Estadísticas con animated counters + chart
- Corte de caja
- Cajeros CRUD con PIN/contraseña + sesión activa
- Configuración + branding del negocio
- PWA: manifest, íconos con glow, theme dark, instalable en iPhone/iPad/Mac

### Tecnologías
- React 19, FastAPI, MongoDB, JWT
- framer-motion, recharts, shadcn/ui, lucide-react, sonner
- Canvas-based image cropper (sin deps adicionales)

### Tests
- Iteración 5: 7/7 grupos de tests pasados (100% frontend)
- Backend: 100% (sin cambios desde iter 3)
- Cero errores de consola

### Credenciales demo
- Email: demo@restaurant.com
- Pwd: demo1234
- Cajeros existentes: "siko" (PIN 1234), "TestCashier1" (PIN 1234)

## Backlog (siguiente)

### Implementado en v2.4 (Feb 2026)
- ✅ **Propinas configurables por cajero**:
  - Campo global `default_tip_percent` en Settings (data-testid `tips-config-card`, presets 0/10/15/20%)
  - Override por cajero `default_tip_percent` en /cashiers (data-testid `cashier-tip-input`, badge `cashier-tip-badge-{id}`)
  - Selector de propina en checkout POS: modo % (presets + libre) y modo $ (data-testid `tip-mode-percent`, `tip-mode-custom`, `tip-percent-{0,10,15,20}`, `tip-custom-input`)
  - Auto-inicializa con la propina del cajero o el global cuando se abre el checkout
  - Desglose subtotal / propina / total en checkout y en el ticket impreso
  - Nuevo endpoint `GET /api/stats/cashier-tips` — ranking por cajero
  - StatsPage muestra tarjeta de propinas del día + ranking de cajeros
  - Orders CSV ahora incluye columnas `subtotal` y `propina`
  - Compatibilidad backwards: legacy/offline POST /api/orders sin subtotal lo auto-deriva (total - tip)
  - Cobertura pytest: `/app/backend/tests/test_tips_feature.py` (16/16 green)

### Implementado en v2.3 (Feb 2026)
- ✅ **Modo Offline (Fase 2-A)**:
  - Service Worker (`/sw.js`) cachea el app shell — la app carga sin internet
  - Cola IndexedDB (`offlineQueue.js`) — las ventas se guardan localmente si no hay red
  - Auto-sincronización (`offlineSync.js`) al recuperar conexión + cada 30s
  - Indicador visual `OnlineStatusIndicator` con badge "En línea / Sin conexión" y contador de pendientes (data-testid `status-online`, `status-offline`, `sync-pending-button`)
  - POSPage detecta `navigator.onLine` y encola si offline o ante error de red
  - Evento `pos-queue-updated` propagado a todas las instancias del indicador

### P1 (siguiente)
- Sincronización en tiempo real (WebSockets) para múltiples iPads simultáneos
- Modo "Pantalla del cliente" (segunda pantalla mostrando el pedido)
- Precachear bundles JS/CSS hasheados en SW (cold-offline boot 100% seguro)
- Refactor de POSPage (>500 líneas, extraer CartContent, ProductCard a archivos)

### P2
- App nativa Expo
- Reportes CSV/PDF avanzados

## Arquitectura
- Backend FastAPI multi-tenant (datos aislados por `restaurant_id`)
- Frontend PWA (1 build → iPhone, iPad, Mac vía Safari)
- MongoDB
- JWT en localStorage
- Print via window.print() universal
