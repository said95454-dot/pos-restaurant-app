# 🚀 INSTRUCCIONES PARA EXPORTAR A GITHUB

## ✅ Estado Actual del Proyecto

Tu sistema POS está **completamente migrado** y listo para desarrollo local:

### Backend (/app/backend/)
- ✅ `server.py` - API completa con 17+ endpoints
- ✅ `requirements.txt` - Todas las dependencias
- ✅ `.env` - Variables de entorno (configurado para producción)
- ✅ `.env.example` - Template para desarrollo local
- ✅ `README.md` - Instrucciones de setup

### Frontend (/app/frontend/)
- ✅ Toda la estructura de React Native/Expo
- ✅ 13 pantallas completas (.tsx)
- ✅ `app.json` - Configuración de Expo
- ✅ `package.json` - Dependencias
- ✅ `utils/api.ts` - Cliente API
- ✅ `utils/storage.ts` - AsyncStorage helper
- ✅ `SETUP.md` - Instrucciones de setup

### Documentación
- ✅ `README.md` principal con instrucciones completas
- ✅ `.gitignore` configurado

---

## 📤 PASO 1: Guardar en GitHub

Usa la función **"Save to GitHub"** de Emergent:

1. En el chat de Emergent, busca el botón **"Save to GitHub"** (generalmente en la parte inferior del chat o en el menú)
2. Haz clic en él
3. Se te pedirá:
   - **Nombre del repositorio** (ejemplo: `pos-restaurant-system`)
   - **Descripción** (ejemplo: "Sistema POS para restaurantes con React Native y FastAPI")
   - **Visibilidad**: Privado o Público (recomiendo **Privado**)
4. Confirma y espera a que se cree el repositorio
5. **Copia la URL del repositorio** que se genera (algo como: `https://github.com/tu-usuario/pos-restaurant-system`)

---

## 💻 PASO 2: Clonar en tu Computadora Local

Una vez que tengas la URL del repositorio de GitHub:

```bash
# Clonar el repositorio
git clone https://github.com/TU-USUARIO/TU-REPOSITORIO.git

# Entrar al directorio
cd TU-REPOSITORIO
```

---

## 🛠️ PASO 3: Setup del Backend

```bash
cd backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate  # macOS/Linux
# O en Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar y configurar variables de entorno
cp .env.example .env
# Edita .env si necesitas cambiar configuraciones

# Iniciar MongoDB (si no está corriendo)
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Windows: net start MongoDB

# Iniciar servidor backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Verificar que funciona:**
```bash
curl http://localhost:8001/api/
# Respuesta: {"message":"Food POS API"}
```

---

## 📱 PASO 4: Setup del Frontend

**En otra terminal:**

```bash
cd frontend

# Instalar dependencias
yarn install

# IMPORTANTE: Configurar URL del backend
# Edita utils/api.ts línea 2:
# const API_URL = 'http://TU_IP_LOCAL:8001';

# Para encontrar tu IP local:
# macOS/Linux: ifconfig | grep "inet "
# Windows: ipconfig
# Busca algo como: 192.168.1.XXX

# Iniciar Expo
expo start
```

---

## 📲 PASO 5: Ejecutar en iPhone/iPad

1. **Descarga "Expo Go"** desde App Store en tu iPhone/iPad
2. Asegúrate de que tu **iPhone/iPad y computadora estén en la misma red WiFi**
3. Con `expo start` corriendo, verás un **QR code** en la terminal
4. **Escanea el QR** con la cámara de tu iPhone/iPad
5. La app se abrirá en **Expo Go**

---

## 🎯 Próximos Pasos

### Primera vez que corras la app:

1. **Registrar Manager:**
   - Abre la app
   - Selecciona "ADMINISTRACIÓN"
   - Como no hay manager, te pedirá crear uno
   - Usuario y contraseña para acceder al panel de manager

2. **Configurar Negocio:**
   - Login como manager
   - Ve a "Configuración" o "Business"
   - Cambia el nombre de "Mi Negocio" al nombre de tu restaurante
   - Opcionalmente sube un logo

3. **Agregar Productos:**
   - En el panel de manager, ve a "Productos" o "Bebidas"
   - Agrega tus productos con precios e imágenes
   - Para comidas, puedes agregar opciones personalizadas (ej: "con cebolla", "sin cilantro")

4. **Crear Cajeros:**
   - Ve a "Cajeros"
   - Crea cajeros con PIN de 4 dígitos o contraseña
   - Los cajeros podrán acceder al POS

5. **Usar el POS:**
   - Vuelve al inicio
   - Selecciona "PUNTO DE VENTA"
   - Login con el PIN del cajero
   - ¡Empieza a tomar órdenes!

---

## 🔍 Estructura de Archivos para Referencia

```
tu-repositorio/
├── README.md                    # Documentación principal
├── .gitignore                   # Archivos a ignorar
├── backend/
│   ├── server.py               # API completa
│   ├── requirements.txt        # Dependencias Python
│   ├── .env.example           # Template de configuración
│   └── README.md              # Instrucciones backend
├── frontend/
│   ├── app/                   # Código de las pantallas
│   │   ├── index.tsx         # Pantalla principal
│   │   ├── pos/              # Módulo POS
│   │   └── manager/          # Módulo Manager
│   ├── utils/
│   │   ├── api.ts            # Cliente API
│   │   └── storage.ts        # Storage helper
│   ├── app.json              # Config de Expo
│   ├── package.json          # Dependencias Node
│   └── SETUP.md              # Instrucciones frontend
└── tests/                     # Tests (opcional)
```

---

## ❓ Troubleshooting Común

### No puedo conectar al backend desde el iPhone

- ✅ Verifica que backend esté corriendo: `curl http://localhost:8001/api/`
- ✅ Verifica que usaste tu **IP local** (no localhost) en `utils/api.ts`
- ✅ Verifica que iPhone/iPad y computadora estén en la **misma red WiFi**
- ✅ Verifica que tu firewall no bloquee el puerto 8001

### MongoDB no conecta

```bash
# Verificar estado
mongosh

# Si falla, iniciar MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Expo no muestra el QR code

```bash
# Limpiar cache
expo start -c
```

---

## 📞 Soporte

Para más detalles, consulta:
- `README.md` - Documentación completa
- `backend/README.md` - Setup del backend
- `frontend/SETUP.md` - Setup del frontend

---

**¡Tu Sistema POS está listo! 🎉**

Una vez que hagas "Save to GitHub" y clones el repositorio, sigue estos pasos y tendrás tu sistema corriendo localmente en tu computadora y iPhone/iPad.
