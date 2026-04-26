# PRD - POS Restaurante (PWA)

## Problema Original
Usuario clonó https://github.com/said95454-dot/pos-restaurant-app — repositorio multi-tenant con backend completo (FastAPI) pero frontend incompleto. Pidió compilar/arreglar errores y hacer una app válida para iPhone, iPad y Mac. Tras explicar opciones, eligió **Opción A: PWA (Progressive Web App)**.

## Estado Actual (Enero 2026)

### Implementado ✅

#### Backend (FastAPI + MongoDB + JWT) — `/app/backend/server.py`
- Auth multi-restaurante (`/api/auth/restaurant/register`, `/api/auth/restaurant/login`, `/api/auth/me`)
- Recuperación de contraseña con código (Resend) — funcional pero sin API key configurada
- Productos CRUD (multi-tenant) con imágenes base64, categorías (comida/bebida) y opciones personalizadas
- Órdenes (crear, listar con filtros por fecha y cajero, marcar como impreso)
- Cajeros CRUD con login por PIN o contraseña
- Estadísticas: ventas diarias, rango, top productos
- Corte de caja: fondo inicial, esperado, real, diferencia
- Configuración del negocio (nombre, logo)

#### Frontend (React 19 + Tailwind + shadcn/ui) — Diseño iOS premium
- `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`
- `POSPage` — pantalla de ventas con grid de productos, carrito (sidebar desktop / drawer mobile), checkout con efectivo/tarjeta/transferencia y cálculo de cambio
- `ProductsPage` — CRUD con upload de imagen, opciones personalizadas
- `OrdersPage` — historial con filtro de fecha y detalles expandibles
- `StatsPage` — ventas diarias, top productos, gráfico de rango con recharts
- `CashRegisterPage` — corte de caja con cálculo de diferencias
- `CashiersPage` — CRUD + login por PIN/contraseña
- `SettingsPage` — branding del restaurante + instrucciones para instalar PWA

#### PWA — Instalable en iPhone, iPad y Mac
- `manifest.json` con `display: standalone`, theme color iOS
- `apple-touch-icon`, `apple-mobile-web-app-capable`
- Iconos 192/512/180 generados
- Safe-area insets (notch, home indicator)
- Fuentes Outfit + Manrope (no Inter/Roboto)
- Layout adaptativo: sidebar en desktop/iPad, bottom nav en iPhone

### Tecnologías
- **Backend**: FastAPI, MongoDB (motor), JWT, bcrypt/passlib, Resend
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, lucide-react, recharts, sonner, axios

### Testing
- Backend: 23/23 tests pytest pasados (100%)
- Frontend: Todos los flujos validados (100%)
- Issue crítico (badge bloqueando botón Cobrar) resuelto y verificado

### Credenciales demo
- Email: demo@restaurant.com
- Pwd: demo1234

## Próximos Pasos / Backlog

### P0 (siguientes)
- Configurar `RESEND_API_KEY` en backend/.env para que la recuperación de contraseña envíe emails reales
- Agregar la app a iPhone/iPad/Mac (Safari → Compartir → "Añadir a pantalla de inicio")

### P1
- Soporte offline básico (Service Worker para cache de productos)
- Impresión de tickets via Bluetooth/AirPrint
- Multimoneda y configuración de impuestos
- Notificaciones push (web push)

### P2
- App nativa con Expo (React Native) para distribución en App Store
- Sincronización offline-first con conflict resolution
- Reportes exportables (CSV/PDF)
- Programa de lealtad y descuentos por cliente

## Arquitectura
- 1 backend FastAPI multi-tenant (los datos de cada restaurante están aislados por `restaurant_id`)
- 1 frontend React PWA (un solo build sirve a iPhone, iPad y Mac vía Safari)
- MongoDB como base de datos principal
- JWT en localStorage del navegador para sesiones
