# Battery Cell Logistic

Sistema industrial de trazabilidad para el reempaquetado de celdas de batería. Controla el ciclo completo de una celda desde que llega en un palet del proveedor hasta que sale en una caja (Handling Unit) hacia el cliente, y sincroniza el resultado con SILENA (el sistema del cliente/almacén).

## Arquitectura

El proyecto se compone de tres servicios (orquestados con Docker Compose) más una utilidad standalone:

- **`backend/`** — API en FastAPI + SQLAlchemy sobre PostgreSQL. Expone routers para operarios de línea, almacén, administración, configuración, consultas y gestión de defectuosas (`backend/routers/`).
- **`frontend-operarios/`** — SPA en React + Vite usada por los operarios (reempaquetado, almacén, panel de admin).
- **`backend/sync_silena/`** — Worker en segundo plano que exporta las cajas ya cerradas a ficheros CSV que SILENA recoge de una carpeta compartida (NAS). Se ejecuta como un servicio Docker aparte (`worker-silena`) que reutiliza la imagen del backend.
- **`multimetro/`** — Script/ejecutable independiente (PyInstaller) para la lectura del multímetro usado en la medición de voltaje de celdas.

### Modelo de datos (resumen)

- `PaletEntrada` — palet recibido del proveedor (HU proveedor, fecha de caducidad, etc.).
- `CajaReempaque` — la caja de salida (normalmente 180 celdas). Tiene `tipo_caja` (`NORMAL` / `DEFECTUOSA` / `CADUCIDAD_PROXIMA`) y `estado_sync` (`PENDIENTE` / `EXPORTADO` / `ERROR` / `NO_APLICA`) que controla su ciclo de vida hacia SILENA.
- `Celda` — la pieza individual, vinculada tanto al palet de origen como a la caja de destino.
- `Configuracion` — parámetros ajustables por modelo (`MODELO1`/`MODELO2`): límites de caja, días de caducidad próxima, longitud del DMC, etc. Incluye también los interruptores globales de sincronización (`box_rules.py`).

## Puesta en marcha

Requiere Docker y Docker Compose. La configuración de entorno (usuario/clave de Postgres, `SECRET_KEY`, carpeta de salida de SILENA) vive en `.env` en la raíz.

### Desarrollo

```bash
docker-compose -f docker-compose.dev.yml up --build
```

- Backend con recarga en caliente en `http://localhost:8888` (montado desde `./backend`).
- Frontend con HMR en `http://localhost:8080` (montado desde `./frontend-operarios`).
- Postgres expuesto en el puerto `5433` (para no chocar con una instancia de producción en local).
- El worker de SILENA usa `./nas_test` como carpeta de salida simulada (ver más abajo).

### Producción

```bash
docker-compose -f docker-compose.yml up -d --build
```

- Backend en el puerto `8000`, frontend servido en el puerto `80`.
- El worker de SILENA monta el NAS real vía bind-mount (ver más abajo).

### Migraciones de base de datos

Las migraciones SQL viven en `backend/migrations/` y se aplican a mano contra el contenedor de la base de datos, por ejemplo:

```bash
docker compose exec -T db psql -U postgres -d trazabilidad < backend/migrations/<carpeta>/<archivo>.sql
```

Para entrar directamente a una sesión `psql`:

```bash
docker exec -it battery_cell_logistic-db-1 psql -U postgres -d trazabilidad
```

### Empaquetado del multímetro

El script de lectura del multímetro se distribuye como ejecutable standalone:

```bash
python -m PyInstaller --onefile program_multimetro.py
```

## Worker de SILENA

`backend/sync_silena/` es un proceso independiente (`python -m sync_silena.worker`) que corre en bucle: busca cajas con `estado_sync = PENDIENTE` (por lotes de `LOTE` cajas, configurable en `sync_silena/config.py`), genera un CSV por caja (`generador.py`) y lo deja en la carpeta de salida mediante escritura atómica (`.tmp` + `rename`), para que SILENA nunca lea un fichero a medias.

Puntos clave:

- El worker se puede pausar/reanudar desde la pantalla de administración (interruptor `sync_activo` en `box_rules.py`) sin tocar el contenedor; las cajas pendientes simplemente se acumulan y se drenan al reanudar.
- **Ese mismo interruptor bloquea la edición.** Con `sync_activo` encendido no se puede modificar ni borrar ninguna caja (`verificar_caja_editable` en `routers/admin.py`): a partir del envío es SILENA quien gestiona modificaciones y bajas. Es un único flag a propósito — si el worker pudiera exportar mientras un admin edita, el CSV saldría con los datos viejos y la caja quedaría en `EXPORTADO` sin reexportarse nunca. Con un solo flag, worker y edición no coinciden en el tiempo.
- Una caja en `EXPORTADO` queda congelada **para siempre**, aunque se pause la sincronización: su fichero ya viajó. Con el interruptor apagado solo se corrigen las que aún no han salido (`PENDIENTE` y `ERROR`).
- Tras `MAX_INTENTOS` fallos consecutivos, una caja pasa a `ERROR` y deja de reintentarse, para no bloquear la cola con un fallo permanente. Si se corrige desde la pantalla de admin, vuelve a `PENDIENTE` con el contador de intentos a cero.
- El formato del fichero (separador `;`, fin de línea `\r\n`, encoding `utf-8`) está aislado en `config.py` porque queda pendiente de confirmar byte a byte contra un fichero de ejemplo del proceso manual.

### Configurar la carpeta del worker (NAS)

La carpeta de salida se controla con la variable de entorno `SILENA_OUTPUT_DIR` (por defecto `/nas` dentro del contenedor). Lo que cambia entre entornos es **qué se monta** en esa ruta:

**Desarrollo** (`docker-compose.dev.yml`): se monta una carpeta local del repo como si fuera el NAS.

1. Crea la carpeta si no existe: `mkdir nas_test` en la raíz del proyecto (ya está en `.gitignore`, así que no se versiona).
2. El servicio `worker-silena` ya la monta como volumen:
   ```yaml
   volumes:
     - ./nas_test:/nas
   ```
3. Los CSV generados aparecerán directamente en `./nas_test` en tu máquina.

**Producción** (`docker-compose.yml`): se monta la carpeta real del NAS (Synology por SMB), ya montada en el host:

```yaml
volumes:
  - /mnt/nas/repacking:/nas
```

Para cambiar la ruta del NAS en el host, edita esa línea del bind-mount (parte izquierda) — la parte derecha (`/nas`) debe coincidir con `SILENA_OUTPUT_DIR` del `.env`. Si en algún momento se sirve desde otra ruta dentro del contenedor, basta con cambiar `SILENA_OUTPUT_DIR` en `.env`, sin tocar código.
