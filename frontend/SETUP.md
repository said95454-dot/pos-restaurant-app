# Instrucciones de Setup Local - Frontend

## Requisitos
- Node.js 18 o superior
- Yarn (recomendado) o npm
- Expo CLI
- iPhone/iPad con Expo Go app instalada

## Instalación

1. **Instalar Expo CLI globalmente (si no lo tienes):**
   ```bash
   npm install -g expo-cli
   # O con yarn:
   yarn global add expo-cli
   ```

2. **Instalar dependencias:**
   ```bash
   yarn install
   # O con npm:
   npm install
   ```

3. **Configurar URL del Backend:**
   
   Edita `utils/api.ts` línea 2:
   ```typescript
   const API_URL = 'http://TU_IP_LOCAL:8001';
   ```
   
   **Importante:** NO uses `localhost`. Usa la IP local de tu computadora en la red.
   
   Para encontrar tu IP:
   - macOS/Linux: `ifconfig | grep "inet "`
   - Windows: `ipconfig`
   
   Ejemplo: `const API_URL = 'http://192.168.1.100:8001';`

4. **Iniciar Expo:**
   ```bash
   expo start
   # O con yarn:
   yarn start
   ```

## Ejecutar en iPhone/iPad

### Opción 1: Expo Go (Desarrollo - Recomendado)

1. Descarga "Expo Go" desde App Store
2. Asegúrate de que tu iPhone/iPad y computadora estén en la **misma red WiFi**
3. Ejecuta `expo start` en tu computadora
4. Escanea el QR code que aparece en la terminal con la cámara de tu iPhone/iPad
5. La app se abrirá automáticamente en Expo Go

### Opción 2: Build Nativo (Producción)

```bash
# Para iOS
eas build --platform ios

# Seguir instrucciones de Expo
```

## Troubleshooting

### No puedo conectar al backend

- Verifica que el backend esté corriendo: `curl http://localhost:8001/api/`
- Verifica que usaste la IP correcta en `utils/api.ts`
- Verifica que tu iPhone/iPad y computadora estén en la misma red WiFi
- Verifica que tu firewall no bloquee el puerto 8001

### Expo no inicia

```bash
# Limpiar cache
expo start -c

# Reinstalar node_modules
rm -rf node_modules
yarn install
```

### Error al instalar dependencias

```bash
# Limpiar cache de yarn
yarn cache clean

# Reinstalar
rm -rf node_modules yarn.lock
yarn install
```

## Estructura de Pantallas

- `/` - Pantalla de inicio (selección POS o Manager)
- `/pos/login` - Login de cajeros
- `/pos/` - Pantalla de Punto de Venta
- `/manager/login` - Login de manager
- `/manager/dashboard` - Dashboard del manager
- `/manager/products` - Gestión de productos (comida)
- `/manager/bebidas` - Gestión de bebidas
- `/manager/orders` - Ver órdenes
- `/manager/reports` - Reportes y estadísticas
- `/manager/cajeros` - Gestión de cajeros
- `/manager/corte-caja` - Corte de caja
- `/manager/business` - Configuración del negocio

## Personalización

### Cambiar colores

Los colores principales están definidos en cada componente:
- Color principal: `#6366f1` (índigo)
- Color secundario: `#4f46e5` (índigo oscuro)
- Color de bebidas: `#06b6d4` (cyan)
- Color de éxito: `#10b981` (verde)

### Cambiar nombre del negocio por defecto

El nombre se obtiene del backend (`GET /api/business`).
