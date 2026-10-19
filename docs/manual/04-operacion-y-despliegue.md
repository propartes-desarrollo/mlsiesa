# Manual de operación y despliegue

Cómo instalar, poner en producción, mantener y diagnosticar la aplicación. Dirigido a quien administra
el servidor.

> Volver al [índice del manual](README.md).

---

## 1. Componentes

La aplicación corre en tres contenedores Docker (`docker-compose.yml`):

| Contenedor | Qué es | Puerto |
|---|---|---|
| `mlsiesa_frontend` | Nginx con las pantallas compiladas. Reenvía `/api/` al servidor. | 80 (en local se publica en 8090) |
| `mlsiesa_backend` | Servidor Node.js. Habla con la base, con SIESA y con la DIAN. | 3001 (interno) |
| `mlsiesa_db` | PostgreSQL 16. Los datos viven en el volumen `mlsiesa_datos`. | 5432 (interno) |

Salidas a internet que necesita el servidor:

| Destino | Para qué |
|---|---|
| `200.119.85.58:8080` (web service de SIESA) | Crear pedidos y clientes, consultar. **La IP del servidor debe estar en la lista blanca de SIESA.** |
| `muisca.dian.gov.co` (443) | Validar el RUT de las personas naturales. |

---

## 2. Archivos de configuración

| Archivo | Contenido | ¿Va al repositorio? |
|---|---|---|
| `.env` (raíz) | Usuario, contraseña y nombre de la base de datos (`DB_USUARIO`, `DB_CONTRASENA`, `DB_NOMBRE`). | **No** |
| `backend/.env` | Conexión a la base, secreto de sesiones, conexión a SIESA. | **No** |
| `frontend/.env` | `VITE_API_URL` (vacío). | No |
| `*.env.ejemplo` | Plantillas sin datos secretos. | Sí |

Variables de `backend/.env`:

| Variable | Qué es | Ejemplo |
|---|---|---|
| `PUERTO` | Puerto del servidor | `3001` |
| `ENTORNO` | `development` o `production` | `production` |
| `DATABASE_URL` | Conexión a la base. Debe usar el mismo usuario y contraseña que `.env` de la raíz. | `postgres://mlsiesa:CLAVE@mlsiesa_db:5432/mlsiesa` |
| `JWT_SECRETO` | Secreto para firmar las sesiones (mínimo 32 caracteres, aleatorio). | - |
| `JWT_EXPIRACION` | Duración de la sesión | `7d` |
| `URL_FRONTEND` | Dirección pública de la app (en producción restringe quién puede llamar al servidor). | `https://mlsiesa.propartes.com` |
| `SIESA_ENDPOINT` | Web service de SIESA | `http://200.119.85.58:8080/WSUNOEE/WSUNOEE.asmx` |
| `SIESA_CONEXION` | Ambiente de SIESA: `Pruebas` o `Propartes Real` (sección 5) | `Propartes Real` |
| `SIESA_CIA` | Compañía | `1` |
| `SIESA_USUARIO` | Usuario del conector: `ia` en Pruebas, `ml` en producción | `ml` |
| `SIESA_CLAVE` | Clave del usuario del conector. **Nunca va en el repositorio.** | - |
| `SIESA_PROVEEDOR` | Proveedor del conector | `PROPARTES` |
| `SIESA_CONSULTA_TERCEROS` | Nombre de la consulta de terceros | `CONSULTA_TERCERO_ECOMMERCE` |
| `SIESA_CONSULTA_ITEMS` | Nombre de la consulta de ítems | `CONSULTA_ITEM_ML` |
| `SIESA_CONSULTA_PEDIDOS` | Nombre de la consulta de pedidos | `CONSULTA_PEDIDO_ML` |
| `SIESA_TIMEOUT_MS` | Espera máxima por respuesta de SIESA, en milisegundos | `180000` |

---

## 3. Instalar en un equipo local (Docker Desktop)

1. Cree los archivos de configuración:

   ```bash
   cp .env.ejemplo .env
   cp backend/.env.ejemplo backend/.env      # completar DATABASE_URL, JWT_SECRETO y SIESA_CLAVE
   cp frontend/.env.ejemplo frontend/.env
   ```

2. Cree la red compartida (solo la primera vez):

   ```bash
   docker network create proxy_red_compartida
   ```

3. Levante la aplicación:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
   ```

4. Cree el primer administrador:

   ```bash
   docker exec -it mlsiesa_backend node scripts/crearAdmin.js correo@propartes.com "Nombre" 'ContraseñaSegura'
   ```

5. Abra `http://localhost:8090` e ingrese.

**Verificación:** `curl http://localhost:8090/api/salud` debe responder `{"estado":"ok",…}`.

---

## 4. Instalar o actualizar en el servidor

### Primera instalación

1. Clone el repositorio y cree `.env` y `backend/.env` (sección 2) con los valores de producción.
2. `docker compose build && docker compose up -d`
3. Cree el administrador (sección 3, paso 4).
4. En **Nginx Proxy Manager**, cree el Proxy Host del dominio apuntando a `mlsiesa_frontend`, puerto
   `80`, con certificado SSL.
5. Confirme con TI que la IP del servidor está en la lista blanca de SIESA.

### Actualizar a una versión nueva

```bash
git pull
docker compose build && docker compose up -d
```

Antes de actualizar, revise si la versión trae **migraciones nuevas** en `db/migraciones/` y aplíquelas
(sección 6). Las versiones se marcan con etiquetas en el repositorio (`v1.0.0`, …).

---

## 5. Pasar de pruebas a producción

### Los dos ambientes

| Ambiente | `SIESA_CONEXION` | `SIESA_USUARIO` | Qué pasa con lo enviado |
|---|---|---|---|
| **Pruebas** | `Pruebas` | `ia` | Queda en el ambiente de pruebas, que se sobrescribe cada día a las 19:00 con producción. |
| **Producción** | `Propartes Real` | `ml` | Crea pedidos y clientes reales. |

La clave de cada usuario va en `SIESA_CLAVE` y la entrega TI. Nunca se escribe en archivos del
repositorio. Las dos conexiones usan el mismo servicio (`SIESA_ENDPOINT`) y la misma compañía (`SIESA_CIA=1`).
El nombre de la conexión debe ser exacto: con `Propartes` a secas, SIESA responde *"No existe
configuración"*.

### Cambiar de ambiente

En `backend/.env` hay dos bloques, uno por ambiente: deje sin `#` el que quiera usar y ponga `#` al
inicio de las tres líneas del otro.

```
# --- Producción (ACTIVO) ---
SIESA_CONEXION=Propartes Real
SIESA_USUARIO=ml
SIESA_CLAVE=<clave de ml>
# --- Pruebas ---
# SIESA_CONEXION=Pruebas
# SIESA_USUARIO=ia
# SIESA_CLAVE=<clave de ia>
```

Después recree el servidor (un `restart` no vuelve a leer el archivo):

```bash
docker compose up -d --force-recreate mlsiesa_backend
```

Compruebe en **Configuración → Conexión con SIESA** el ambiente y el usuario, o en la barra superior
(**SIESA: PRUEBAS** en amarillo, **SIESA: PROPARTES REAL** en azul).

### Lista de verificación para el primer paso a producción

En este orden:

1. **TI registra las consultas** de la carpeta `sql/` en el ambiente de producción, con su versión
   actual (sección 7), y las habilita para el usuario de producción.
2. **TI entrega el usuario de producción** con su clave, con permiso para importar pedidos (registros
   0430/0431) y clientes (0200, 0201, 0207, 0753, 0046, 0047).
3. En `backend/.env` del servidor cambie:

   ```
   SIESA_CONEXION=Propartes Real
   SIESA_USUARIO=ml
   SIESA_CLAVE=<clave>
   ```

4. Recree el contenedor del servidor para que lea el archivo: `docker compose up -d --force-recreate mlsiesa_backend`. (Un `restart` no vuelve a leer `backend/.env`.)
5. En la app, **Configuración → Conexión con SIESA** debe mostrar el ambiente de producción (etiqueta
   roja "Producción") y "Clave: Configurada". La barra superior dirá **SIESA: <NOMBRE>** en azul.
6. Revise **Configuración → Pedido y Cliente nuevo**: los códigos (bodegas, vendedor, listas) deben
   existir en producción.
7. Active **Envío a SIESA** y **Registrar compradores nuevos** en Configuración → Envío a SIESA.
8. Envíe **una sola venta** y verifíquela en SIESA antes de enviar el resto.

---

## 6. Aplicar una migración

Las migraciones están en `db/migraciones/`, numeradas. Aplíquelas en orden, una sola vez cada una:

```bash
docker exec -i mlsiesa_db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/migraciones/0003_espera_dian.sql
```

Debe terminar en `COMMIT`. Migraciones de la versión 1.0.0:

| Migración | Qué hace |
|---|---|
| `0001_pedido_siesa.sql` | Columnas para guardar el pedido consultado en SIESA. |
| `0002_roles_admin_usuario.sql` | Deja solo los roles `admin` y `usuario`. |
| `0003_espera_dian.sql` | Estado "Esperando DIAN" y columnas del reintento. |

Una base creada desde cero con `db/esquema.sql` ya trae todo: no necesita las migraciones.

---

## 7. Consultas que TI registra en SIESA

| Consulta | Archivo | Parámetro | Para qué |
|---|---|---|---|
| `CONSULTA_TERCERO_ECOMMERCE` | (registrada por TI, compartida con la tienda) | `documento` | Saber si el comprador es cliente y está activo. |
| `CONSULTA_ITEM_ML` | `sql/CONSULTA_ITEM_ML.sql` | `referencia` (SKU) | Centro de costo de venta del producto y su **segmento** (para la división del cliente). |
| `CONSULTA_PEDIDO_ML` | `sql/CONSULTA_PEDIDO_ML.sql` | `referencia` (15 últimos dígitos de la venta) | Número, estado y líneas del pedido creado. Lo busca por las notas del pedido. |

Cada vez que cambie un archivo de `sql/`, TI debe **volver a registrar** la consulta en Pruebas y en
producción. La app lee las columnas por su nombre: no cambie los alias (`AS …`).

Para confirmar que la consulta de ítems registrada trae el segmento:

```bash
docker exec mlsiesa_backend node -e "const s=require('./src/servicios/siesa/clienteSoap');const c=require('./src/servicios/parametros').armar();s.consultar(c.siesa.consultaItems,{referencia:'LM21119'},c.siesa).then(r=>console.log(r[0]))"
```

La respuesta debe incluir `segmento`.

---

## 8. Tareas de mantenimiento

### Cambiar la contraseña de un usuario

**Administradores** (también sirve para crear uno o reactivarlo):

```bash
docker exec -it mlsiesa_backend node scripts/crearAdmin.js correo@propartes.com "Nombre" 'NuevaContraseña'
```

> Este comando deja la cuenta con rol **administrador**. No lo use para usuarios con rol "Usuario".

**Cualquier usuario** (conserva su rol):

```bash
docker exec mlsiesa_backend node -e "const b=require('bcryptjs');const {consulta,pool}=require('./src/servicios/db');const [clave,correo]=process.argv.slice(1);b.hash(clave,12).then((h)=>consulta('UPDATE usuarios SET contrasena = \$1 WHERE correo = \$2',[h,correo.toLowerCase()])).then((r)=>{console.log(r.rowCount ? 'Contraseña cambiada' : 'No existe ese correo');return pool.end();})" 'NuevaContraseña' 'correo@propartes.com'
```

Responde *Contraseña cambiada* o *No existe ese correo*. La contraseña debe tener al menos 8 caracteres.

### Copia de seguridad de la base de datos

```bash
docker exec mlsiesa_db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > respaldo_mlsiesa_$(date +%F).sql
```

Restaurar (sobre una base vacía):

```bash
docker exec -i mlsiesa_db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < respaldo_mlsiesa_AAAA-MM-DD.sql
```

### Ver los registros del servidor

```bash
docker logs mlsiesa_backend --tail 100        # últimos 100
docker logs mlsiesa_backend --since 30m       # últimos 30 minutos
```

Líneas útiles: `Envío venta …: enviada`, `Reintento DIAN venta …`, `[ERROR] …`.

La auditoría completa (quién cargó, envió, cambió configuración) está en la tabla `auditoria`:

```bash
docker exec mlsiesa_db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT creado_en, accion, entidad_id FROM auditoria ORDER BY creado_en DESC LIMIT 30"'
```

### Borrar los datos de prueba (solo en un ambiente de pruebas)

Borra todos los archivos cargados y el historial de envíos. Conserva usuarios y configuración. **No se
puede deshacer.**

```bash
docker exec mlsiesa_db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM envios; DELETE FROM cargues;"'
```

---

## 9. Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Barra superior: **SIN CONEXIÓN CON SIESA** | Falta `SIESA_CLAVE` en `backend/.env`. | Completarla y recrear el servidor: `docker compose up -d --force-recreate mlsiesa_backend`. |
| Todas las ventas "Sin conexión con SIESA" | El servidor no llega al web service, o su IP no está en la lista blanca. | Probar conectividad; confirmar con TI. |
| Muchas ventas "Esperando DIAN" | La DIAN está caída o cambió su página. | Si es caída, esperar: se reenvían solas. Si persiste, ver el [manual de edición, 14.2](03-manual-de-edicion.md#142-la-dian-cambió-su-página). |
| "Esperando DIAN" no avanza aunque la DIAN responde | El envío está apagado (el reintento no envía con el envío apagado) o el servidor se detuvo. | Activar el envío; revisar `docker logs mlsiesa_backend`. |
| Todos los clientes nuevos quedan con división 50/52 | La consulta `CONSULTA_ITEM_ML` registrada no trae `segmento`. | Pedir a TI que la registre de nuevo (sección 7). |
| "Pedido creado en SIESA. El número se puede consultar…" sin número | `CONSULTA_PEDIDO_ML` no encontró el pedido (consulta desactualizada o notas cambiadas). | Revisar la consulta registrada; usar "Consultar en SIESA". |
| "SIESA rechazó el pedido / el cliente" | Un código no existe en SIESA o un campo obligatorio está vacío. SIESA no dice cuál. | Revisar Configuración; probar con `scripts/probarSiesa.js` en Pruebas. |
| Ventas en "Verificar" | SIESA no respondió a tiempo. | "Consultar en SIESA" y, si no está, habilitar para reenvío (manual de usuario, sección 4). |
| No se puede entrar: "Credenciales incorrectas" | Correo o contraseña errados. | Cambiar la contraseña (sección 8). |
| No se puede entrar: "Cuenta desactivada" | Un administrador la desactivó. | Activarla en Usuarios. |
| Los cambios no se ven en la pantalla | El navegador guarda la versión anterior. | Ctrl+F5. |
| Tras actualizar, un error de base de datos | Falta una migración. | Aplicarla (sección 6). |
