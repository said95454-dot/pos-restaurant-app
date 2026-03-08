# Instrucciones de Setup Local - Backend

## Requisitos
- Python 3.11 o superior
- MongoDB instalado y corriendo

## Instalación

1. **Crear entorno virtual:**
   ```bash
   python -m venv venv
   ```

2. **Activar entorno virtual:**
   - macOS/Linux: `source venv/bin/activate`
   - Windows: `venv\Scripts\activate`

3. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Edita .env con tus configuraciones
   ```

5. **Iniciar servidor:**
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

## Verificar que funciona

```bash
curl http://localhost:8001/api/
# Respuesta: {"message":"Food POS API"}
```

## Documentación API

Una vez iniciado el servidor, visita:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
