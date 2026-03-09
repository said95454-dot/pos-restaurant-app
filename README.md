# 🍔 Sistema POS - Point of Sale

Sistema completo de Punto de Venta para restaurantes con gestión de productos, órdenes, cajeros y estadísticas.

## 📱 Stack Tecnológico

- **Backend:** FastAPI + MongoDB (Motor async)
- **Frontend:** React Native + Expo
- **Base de Datos:** MongoDB

## 🚀 Instalación Local

### Prerrequisitos

- Python 3.11+
- Node.js 18+
- MongoDB
- Yarn
- Expo CLI

### 1. Backend Setup

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En macOS/Linux:
source venv/bin/activate
# En Windows:
# venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
# Edita el archivo .env con tus configuraciones:
# MONGO_URL="mongodb://localhost:27017"
# DB_NAME="pos_database"
# CORS_ORIGINS="*"

# Iniciar servidor
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

El backend estará disponible en: `http://localhost:8001`

### 2. MongoDB Setup

```bash
# Instalar MongoDB (macOS con Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Iniciar MongoDB
brew services start mongodb-community

# O manualmente:
mongod --config /usr/local/etc/mongod.conf
```

### 3. Frontend Setup (React Native/Expo)

```bash
cd frontend

# Instalar dependencias
yarn install

# Configurar URL del backend
# Edita utils/api.ts y cambia:
# const API_URL = 'http://TU_IP_LOCAL:8001';
# Ejemplo: const API_URL = 'http://192.168.1.100:8001';

# Iniciar Expo
expo start

# O con yarn:
yarn start
```

### 4. Ejecutar en iPhone/iPad

**Opción A: Expo Go App (Recomendado para desarrollo)**

1. Descarga "Expo Go" desde App Store
2. Ejecuta `expo start` en tu computadora
3. Escanea el QR code con la cámara del iPhone/iPad
4. La app se abrirá en Expo Go

**Opción B: Build nativo**

```bash
# Para iOS
expo build:ios

# Seguir instrucciones de Expo
```

## 📋 Estructura del Proyecto

```
/
├── backend/
│   ├── server.py           # API FastAPI con todos los endpoints
│   ├── requirements.txt    # Dependencias de Python
│   └── .env               # Variables de entorno
│
├── frontend/
│   ├── app/               # Pantallas de la aplicación
│   │   ├── index.tsx      # Pantalla principal
│   │   ├── pos/          # Módulo de Punto de Venta
│   │   │   ├── index.tsx # Pantalla POS
│   │   │   └── login.tsx # Login de cajeros
│   │   └── manager/      # Módulo de Administración
│   │       ├── login.tsx     # Login de manager
│   │       ├── dashboard.tsx # Dashboard principal
│   │       ├── products.tsx  # Gestión de productos
│   │       ├── bebidas.tsx   # Gestión de bebidas
│   │       ├── orders.tsx    # Ver órdenes
│   │       ├── reports.tsx   # Reportes y estadísticas
│   │       ├── cajeros.tsx   # Gestión de cajeros
│   │       ├── corte-caja.tsx # Corte de caja
│   │       └── business.tsx  # Configuración del negocio
│   ├── utils/
│   │   ├── api.ts        # Cliente API
│   │   └── storage.ts    # AsyncStorage helper
│   ├── app.json          # Configuración de Expo
│   └── package.json      # Dependencias de Node
│
└── README.md             # Este archivo
```

## 🔑 Funcionalidades Principales

### 👨‍💼 Panel de Manager

- ✅ Login con usuario/contraseña
- ✅ Dashboard con estadísticas del día
- ✅ Gestión de productos (comida y bebidas)
- ✅ Ver historial de órdenes
- ✅ Reportes y gráficas de ventas
- ✅ Gestión de cajeros (crear, editar, desactivar)
- ✅ Corte de caja con diferencias
- ✅ Configuración del negocio (nombre, logo)

### 💰 Punto de Venta (POS)

- ✅ Login de cajeros con PIN o contraseña
- ✅ Selección de productos con categorías
- ✅ Personalización de órdenes (opciones custom)
- ✅ Carrito de compras
- ✅ Métodos de pago: Efectivo, Tarjeta, Transferencia
- ✅ Historial de órdenes del día
- ✅ Tracking de cajero en cada orden

## 🛠️ API Endpoints

### Business
- `GET /api/business` - Obtener configuración del negocio
- `PUT /api/business` - Actualizar configuración

### Products
- `GET /api/products` - Listar productos
- `POST /api/products` - Crear producto
- `PUT /api/products/{id}` - Actualizar producto
- `DELETE /api/products/{id}` - Eliminar producto

### Orders
- `GET /api/orders` - Listar órdenes (con filtro por fecha/cajero)
- `POST /api/orders` - Crear orden
- `PUT /api/orders/{id}/print` - Marcar como impresa

### Auth
- `POST /api/auth/login` - Login de manager
- `POST /api/auth/register` - Registrar manager
- `GET /api/auth/check-setup` - Verificar si existe manager

### Cashiers
- `GET /api/cashiers` - Listar cajeros
- `POST /api/cashiers` - Crear cajero
- `PUT /api/cashiers/{id}` - Actualizar cajero
- `DELETE /api/cashiers/{id}` - Eliminar cajero
- `POST /api/cashiers/login` - Login de cajero
- `GET /api/cashiers/{id}/sales` - Ventas de cajero

### Statistics
- `GET /api/stats/daily` - Estadísticas del día
- `GET /api/stats/range` - Estadísticas por rango de fechas
- `GET /api/stats/top-products` - Productos más vendidos

### Cash Register Close
- `POST /api/cash-register/close` - Cerrar caja
- `GET /api/cash-register/closes` - Historial de cierres
- `GET /api/cash-register/close/{date}` - Cierre por fecha
- `DELETE /api/cash-register/close/{id}` - Eliminar cierre

## 🔐 Configuración Importante

### Backend URL en Frontend

Edita `frontend/utils/api.ts` línea 2:

```typescript
// Desarrollo local - usa la IP de tu computadora en la red local
const API_URL = 'http://192.168.1.XXX:8001';

// Producción
// const API_URL = 'https://tu-dominio.com';
```

Para encontrar tu IP local:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

### Variables de Entorno

**Backend (.env):**
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="pos_database"
CORS_ORIGINS="*"
```

**Frontend (app.json - extra section):**
```json
"extra": {
  "EXPO_PUBLIC_BACKEND_URL": "http://192.168.1.XXX:8001"
}
```

## 📱 Desarrollo en iPhone/iPad

1. Asegúrate de que tu iPhone/iPad y computadora estén en la **misma red WiFi**
2. Encuentra la IP local de tu computadora
3. Actualiza `API_URL` en `frontend/utils/api.ts` con esa IP
4. Ejecuta el backend: `uvicorn server:app --host 0.0.0.0 --port 8001`
5. Ejecuta el frontend: `expo start`
6. Escanea el QR con Expo Go en tu iPhone/iPad

## 🚨 Troubleshooting

### Error de conexión al backend

- Verifica que el backend esté corriendo en puerto 8001
- Verifica que la IP en `API_URL` sea correcta
- Verifica que no haya firewall bloqueando el puerto 8001
- Usa la IP local, NO `localhost` cuando corras en dispositivo físico

### MongoDB no conecta

```bash
# Verificar si MongoDB está corriendo
mongosh

# Si falla, iniciar MongoDB
brew services start mongodb-community
```

### Expo no inicia

```bash
# Limpiar cache
expo start -c

# Reinstalar dependencias
rm -rf node_modules yarn.lock
yarn install
```

## 🎨 Personalización

### Cambiar colores del tema

Edita los colores en los archivos de componentes en `frontend/app/`:
- Colores principales: `#6366f1` (índigo)
- Colores de bebidas: `#06b6d4` (cyan)

### Agregar nuevas categorías de productos

Actualmente soporta: `comida` y `bebida`. Para agregar más:
1. Actualiza el modelo en `backend/server.py`
2. Ajusta el UI en los componentes del frontend

## 📄 Licencia

Privado - Todos los derechos reservados

## 👤 Autor

Sistema POS para restaurantes

---

**¡Tu sistema POS está listo para desarrollo local!** 🚀
