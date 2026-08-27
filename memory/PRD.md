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


## v2.3 (Feb 2026) — Cambio en Pantalla del Cliente

### Nuevo
- 💵 **Pantalla del Cliente ahora muestra el CAMBIO en grande**:
  - Al cerrar una venta en efectivo con cambio > 0, la Pantalla del Cliente (`/display`) muestra un panel enorme en color ámbar con el monto de cambio a devolver.
  - Siempre muestra el resumen final: **Total pagado · Recibido · Cambio** (para pagos en efectivo) o **Total · Método de pago** (para tarjeta/transferencia).
  - La pantalla de "Gracias" **permanece visible** hasta que inicie la siguiente venta (ya no se cierra a los 10s). Al recibir un nuevo `cart.update` con items > 0, hace snap-back al preview en vivo.
- 🔌 **Backend WS event `order.created`** ahora incluye `amount_received` y `change`.
- 📶 **Modo offline**: el POS también emite `order.created` localmente al finalizar una venta offline, así el display muestra el cambio incluso sin backend.

Files: `/app/backend/server.py`, `/app/frontend/src/pages/POSPage.jsx`, `/app/frontend/src/pages/CustomerDisplayPage.jsx`.

## Backlog — Pagos con tarjeta (cuando se empaque como app iOS nativa)

Decisión (Feb 2026): NO integrar pagos con tarjeta mientras la app siga siendo solo PWA. Se hará cuando toque empaquetar como app nativa iOS con Capacitor/Tauri. Mientras tanto, el flujo "Tarjeta" en el POS solo registra manualmente el pago (el cajero cobra en su terminal externa).

**Cuando toque empaquetar como iOS nativa, integrar:**
- 🇺🇸 **Stripe Terminal SDK** (US/EU): lector BBPOS WisePad 3 (~$59) o Stripe Reader S700 (~$349). SDK oficial iOS con soporte para plugin Capacitor.
- 🇲🇽 **Mercado Pago Point SDK** (México/LatAm): lector Point Mini (~$399 MXN) o Point Smart (~$1.5k MXN). SDK iOS oficial, funciona por Bluetooth desde Capacitor.

**Arquitectura recomendada**: capa de abstracción `paymentGateway.charge(amount, method)` para que el resto del POS no dependa del proveedor. Cada negocio elige en Ajustes qué gateway usa (Stripe / MP / manual).

**Opción intermedia descartada** (por ahora): Stripe Payment Links + QR — funcionaba en ambos países sin hardware, pero el usuario prefiere esperar al empaque nativo para tener el flujo con lector físico (mejor UX en restaurante).



## v2.4 (Feb 2026) — i18n Fase 2 + Modo Presentación

### Nuevo
- 🌐 **Traducciones completas (i18n Fase 2)**: POSPage, TablesPage, KitchenDisplayPage, CustomerDisplayPage, CashierGate, OnlineStatusIndicator y RealtimeIndicator ahora consumen `t()`. Toggle en Ajustes → Idioma cambia inmediatamente todos los headers, botones, toasts y labels sin recargar.
- 🎨 **Modo Presentación** en la pantalla del cliente (IdleScreen): logo con halo pulsante, 3 orbes flotantes animados (cyan/ámbar/violeta), tagline rotante que cambia cada 5 segundos (4 mensajes distintos), badge verde "Abiertos ahora" con dot pulsante, y CTA parpadeante "Acércate a la barra para ordenar". Nuevas keys `customer_display.presentation.*` en es/en.
- ⏱️ **ThankYou con auto-timer**: la pantalla de gracias con el cambio ahora se cierra en 15s O al iniciar una nueva venta (lo que ocurra primero).

### Testing
- Iteración 17: 100% frontend en el scope solicitado (POS/Tables/KDS/Display + Modo Presentación). Sub-scope leak detectado (CashierGate/Offline/Realtime chrome) — corregido en la misma iteración.

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

### Implementado en v2.11 (Feb 2026)
- ✅ **Reabrir mesa carga el ticket existente**:
  - `TableTicketItem` ampliado con `product_id`, `product_price`, `selected_options`, `image`
  - POSPage al abrir con `?table=<id>` hidrata el carrito desde `open_ticket.items`
  - Toast informativo "Ticket cargado — N artículo(s), $XXX"
  - El cajero puede seguir agregando/quitando productos, o pasar directo a Cobrar
  - El sync sigue funcionando: cada cambio actualiza `open_ticket` en el backend + broadcast WS
  - Al cobrar exitosamente, la mesa se libera y el ticket se limpia automáticamente

### Implementado en v2.10 (Feb 2026)
- ✅ **Ticket en vivo por mesa**:
  - Nuevo campo `Table.open_ticket = {items, item_count, subtotal, updated_at}`
  - Endpoint `PUT /api/tables/{id}/ticket` sincroniza el carrito
  - POSPage envía el ticket al backend con debounce 400ms cuando hay `activeTable`
  - TablesPage muestra preview compacto ("TICKET EN VIVO · N artículos · $XXX") con los primeros 4 items en cada card ocupada/con cuenta
  - Se limpia automáticamente al liberar la mesa (`table.close`)
  - Broadcast WS `table.ticket_updated` — múltiples iPads en `/tables` se actualizan en tiempo real
  - data-testids: `table-ticket-preview-{id}`, `table-ticket-item-{id}-{i}`

### Implementado en v2.9 (Feb 2026) — Rediseño visual
- ✅ **Fondo "Deli Futurista Premium"**:
  - Base negro carbón profundo (#0A0A0D) tipo Michelin
  - Gradiente radial cobre cálido desde el centro superior + hint cyan desde abajo
  - Grilla de puntos sutil (fintech tech texture) con máscara radial
  - 2 orbes gigantes (cobre + cyan) muy borrosos moviéndose lentísimo — aurora refinada
  - 4 watermarks gastronómicos SVG en las esquinas (cuchillo, tenedor, copa, cloche) — line-art muy tenue
  - Scanner line horizontal barre cada 15s (efecto cyberpunk sutil)
  - Vignette + grano fino (feel Apple/Rolls Royce)
  - `prefers-reduced-motion`: desactiva animaciones automáticamente
  - Aurora antigua guardada como `Aurora.legacy.jsx` (1-línea rollback disponible)

### Implementado en v2.8 (Feb 2026)
- ✅ **Mesas + Sala (Fase A)**:
  - Modelo `Table` con id, number único por restaurant, capacity, status (free/occupied/billed/reserved), waiter_id, waiter_name, current_order_id, opened_at, reserved_for
  - CRUD + máquina de estados: `POST/GET/PUT/DELETE /api/tables`, `PUT /api/tables/{id}/{open|close|bill|reserve|unreserve}`
  - Order.table_id + Order.table_number; al crear orden con table_id, la mesa se marca automáticamente como `billed` con current_order_id (rollback + 400 si la mesa no existe/no pertenece al tenant)
  - Broadcasts WS: `table.{created,updated,deleted,opened,closed,billed,reserved,unreserved}`
  - Página `/tables` visual: cards por mesa con badge de estado, contador tiempo, botones Abrir/Continuar/Liberar/Reservar/Sentar/Cancelar, modales para abrir con mesero (dropdown de cajeros) y reservar
  - Sidebar entrada "Sala" (nav-tables) entre Vender y Productos
  - POSPage lee `?table=<id>`, muestra banner de mesa activa (número, capacidad, mesero) y auto-cierra la mesa + navega a /tables tras checkout online
  - Stats por estado (Libres/Ocupadas/Cuenta/Reservadas) en el header de Sala
  - Realtime: multi-tab de /tables se sincroniza automáticamente
  - Cobertura pytest: `/app/backend/tests/test_tables_feature.py` (11/11 green)
  - **Fase B (Backlog)**: split de cuenta + integración fina con KDS/Customer Display para mostrar mesa

### Implementado en v2.7 (Feb 2026)
- ✅ **KDS — Kitchen Display System** para cocina:
  - Ruta `/kitchen` fullscreen (bypasa AppLayout y CashierGate; requiere restaurant auth)
  - Modelo `Order.kds_status` (`new` | `preparing` | `ready` | `completed`) + `kds_updated_at`
  - `GET /api/orders/kds/board` — órdenes de hoy no completadas (con backfill legacy)
  - `PUT /api/orders/{id}/kds-status` — valida enum, emite WS `order.kds_status`
  - UI 3 columnas: Nuevas / En preparación / Listas con contadores en vivo
  - Botones Iniciar → Lista → Entregar (avanza) y Regresar (retrocede)
  - Tiempo transcurrido por card: amber ≥15min, destructivo ≥25min
  - Sonido de campana (Web Audio API) al llegar nueva orden — toggle en header, persist localStorage
  - Audio context desbloqueado en primer pointerdown (iOS-safe)
  - Realtime: nueva orden aparece automáticamente + toast; cambios de estado sincronizan multi-tab
  - Cobertura pytest: `/app/backend/tests/test_kds_feature.py` (8/8 green)

### Implementado en v2.6 (Feb 2026)
- ✅ **Pantalla del cliente (Customer Display)**:
  - Ruta `/display` fullscreen sin gate de cajero
  - 3 estados: `IdleScreen` (bienvenida con logo), `CartScreen` (carrito en vivo a la izquierda + totales sticky a la derecha), `ThankYouScreen` (agradecimiento + propina + QR)
  - Backend WS acepta client-relayed events `cart.update` / `cart.clear` y los rebroadcastea al mismo tenant excluyendo al remitente
  - POSPage transmite el carrito completo (items, subtotal, tip, total, payment_method, cashier_name) con debounce 120ms
  - Auto-snap desde thank-you a live si arriba un nuevo cart no vacío
  - Link "Pantalla del cliente" en sidebar (target=_blank) — 2do iPad se abre limpio

### Implementado en v2.5 (Feb 2026)
- ✅ **Sincronización en tiempo real (WebSockets)** para múltiples iPads:
  - Backend: endpoint `@app.websocket('/api/ws?token=<JWT>')` con `RealtimeManager` multi-tenant
  - Broadcasts: `order.created`, `product.{created,updated,deleted}`, `cashier.{created,updated,deleted}`, `cash-register.closed`, `presence`
  - Tenancy estricta — cada restaurante recibe solo sus eventos
  - Frontend: hook `useRealtime` con WS compartido (refcount), reconexión exponencial (cap 30s), ping cada 25s
  - `RealtimeIndicator` en sidebar (data-testid `realtime-indicator`, `realtime-online`, `realtime-presence-count`) muestra "En vivo" + contador de iPads conectados
  - Toast "Nueva orden de X" cuando otro iPad cobra (auto-skip self via `cashier_name`)
  - OrdersPage, ProductsPage, POSPage, StatsPage refrescan automáticamente vía `onRealtime()`
  - Cobertura pytest: `/app/backend/tests/test_realtime_ws.py` (7/7 green)
  - Auth gating: token JWT inválido → close 4401

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
