# mlsiesa: ventas de Mercado Libre a SIESA

Herramienta interna de Propartes. El equipo de comercio electrónico sube el reporte
**"Ventas CO Mercado Libre y Mercado Shops" (.xlsx)**, revisa cada venta y la registra como
**pedido en SIESA** por el Conector UnoEE (SOAP `ImportarXML`). Si el comprador no existe en
SIESA, primero lo crea como tercero y cliente.

Sigue el estándar de `plantilla-app`: **React + Vite + Mantine** en el frontend, **Node +
Express 5** en el backend y **PostgreSQL**, en contenedores detrás de Nginx Proxy Manager.
El orden de implementación está en [`docs/orden_implementacion.md`](docs/orden_implementacion.md).

> Reutiliza el conector validado en `propartes-siesa-sync` (tienda WooCommerce): mismo plano
> de ancho fijo, mismos layouts y mismas lecciones aprendidas sobre lo que SIESA rechaza.

## Flujo

1. **Cargar ventas**: se sube el Excel. El backend lo lee, agrupa los paquetes ("Paquete de N
   productos" + sus filas hijas) y guarda el cargue en la BD.
2. **Revisar**: cada venta muestra sus líneas con el precio de ML (con IVA) y el neto que se
   envía, cómo queda el tercero (nombres y apellidos separados, código DANE de la ciudad), sus
   avisos y bloqueos, y el XML exacto que se enviaría (con la clave oculta).
3. **Enviar**: se seleccionan las ventas y se envían una por una:
   consulta del centro de costo de cada ítem, consulta del tercero, luego creación si no
   existe y está habilitada (0200/0201/0046/0047), y por último el pedido (0430/0431).
4. **Historial**: cada envío queda con su estado, el **número del pedido en SIESA** (`PML-…`)
   con sus líneas, bodega, IVA y total tal como quedaron en el ERP, el documento enviado y la
   respuesta de SIESA. "Consultar en SIESA" vuelve a leer el pedido.

Si un pedido se borra o anula en SIESA, "Consultar en SIESA" lo detecta y deja la venta
habilitada para volver a enviarla.

`ImportarXML` no devuelve el número del pedido creado: después de importar, la app lo busca
con `CONSULTA_PEDIDO_ML` por el documento de referencia. La misma consulta se hace **antes**
de enviar: si la venta ya está en SIESA, no se reenvía.

### Cómo se mapea una venta de ML

| SIESA | Reporte de ML |
|---|---|
| Tercero a facturar (`f430_id_tercero_fact`) | "Tipo y número de documento" (CC / CE / NIT) |
| Ítem (`f431_referencia_item`) | SKU (= `f120_referencia`) |
| Cantidad / precio | Unidades / "Ingresos por productos" ÷ unidades, **pasado a neto** (÷ 1,19) y subido a peso entero |
| Línea `FLETE` | "Ingresos por envío" (solo si el comprador pagó envío), en neto |
| `f430_num_docto_referencia` | Los 15 últimos dígitos del # de venta (tiene 16) |
| Dirección (cliente nuevo y envío) | "Domicilio" (columna AI) hasta el `/`, sin símbolos (`#`, `,`, `-`...) y con la vía abreviada: `Carrera 78A #80-21Sur` → `CR 78A 80 21SUR` (Calle → `CLL`, Carrera → `CR`, Avenida → `AV`, Transversal → `TV`, Diagonal → `DG`). Lo que sigue al `/` va como segundo renglón de la dirección de envío |
| Mayúsculas | **Todo** lo que se envía a SIESA va en MAYÚSCULAS (política del ERP), salvo los correos, que van en minúsculas |
| `f430_notas` | `ML - <# de venta completo> - Mercado Envíos Full` o `- Colecta de Mercado Envíos` |
| Bodega (`f431_id_bodega`) | "Forma de entrega": **Full** → `BC207` (bodega de ML con productos nuestros), **Colecta** → `BP150` (nuestra bodega, donde recoge el carro de ML). Otra forma de entrega bloquea la venta |
| Centro de costo (`f431_id_ccosto_movto`) | El **del ítem en SIESA**, consultado al enviar (`CONSULTA_ITEM_ML`). El flete usa `pedido.ccosto_flete` |
| Vendedor | Tercero MERCADO LIBRE `VEN0600` (en el cliente nuevo: vendedor y cobrador `0600`) |

### Reglas de seguridad del envío

- **`ImportarXML` escribe de verdad en el ERP**: no existe modo de prueba. Por eso el envío
  arranca **desactivado** (`envio.activo`) y solo un admin lo enciende.
- El resultado se lee de `<printTipoError>`: 0 = importado, 1 = rechazado, 3 = usuario no
  habilitado. SIESA responde HTTP 200 aun cuando rechaza.
- **Sin duplicados**: una venta importada no se reenvía. Antes de llamar a SIESA la venta
  queda reservada (`enviando`), así que dos personas no pueden enviarla a la vez.
- Si SIESA **no responde a tiempo**, no se sabe si registró el pedido. La venta queda en
  "Verificar" y un admin la libera desde el Historial solo después de buscarla en SIESA.

## Roles

| Rol | Puede |
|---|---|
| Administrador (`admin`) | Todo: además de lo del usuario, la Configuración, los municipios, los usuarios, ver el archivo técnico enviado a SIESA y habilitar ventas sin confirmar |
| Usuario (`usuario`) | Cargar el Excel, revisar las ventas, enviarlas a SIESA y consultar el Historial |

La migración `db/migraciones/0002_roles_admin_usuario.sql` pasa los antiguos roles
`operador` y `consulta` a `usuario`.

No hay registro público: el admin crea los usuarios en la pantalla **Usuarios**.

## Desarrollo local

```bash
# 1. Variables de entorno
cp .env.ejemplo .env
cp backend/.env.ejemplo backend/.env      # completar DATABASE_URL, JWT_SECRETO y SIESA_CLAVE
cp frontend/.env.ejemplo frontend/.env

# 2. PostgreSQL con el esquema (ejemplo con Docker)
docker run -d --name mlsiesa_db_local -p 5432:5432 \
  -e POSTGRES_USER=mlsiesa -e POSTGRES_PASSWORD=cambia_esta_contrasena -e POSTGRES_DB=mlsiesa \
  -v "$PWD/db/esquema.sql:/docker-entrypoint-initdb.d/01_esquema.sql:ro" postgres:16-alpine
#    y en backend/.env: DATABASE_URL=postgres://mlsiesa:cambia_esta_contrasena@localhost:5432/mlsiesa

# 3. Primer administrador
cd backend && npm install && node scripts/crearAdmin.js admin@propartes.com "Nombre" "contrasena-segura"

# 4. Levantar (dos terminales)
cd backend  && npm run dev     # API en :3001
cd frontend && npm install && npm run dev      # app en :5173
```

### Pruebas

```bash
cd backend && npm test
```

Comprueban, entre otras cosas, que:

- El generador reproduce **carácter a carácter** el ejemplo de TI que sí importa en SIESA.
- Los dos reportes reales (en copias **anonimizadas**, `backend/pruebas/fixtures/`) se leen
  bien, incluido el paquete de 2 productos.
- El flujo de envío funciona con SIESA simulado: tercero activo, tercero nuevo, rechazo y
  reintento, falla de red, tiempo agotado y tercero inactivo.

> Los reportes reales de ML traen datos personales de los compradores: **no se versionan**
> (`.gitignore`). Para pruebas, usar las copias anonimizadas.

## Probar en local con Docker Desktop

`docker-compose.local.yml` publica el frontend en **http://localhost:8090** (del 8080 al 8087
están ocupados por otras apps). Requiere `.env` en la raíz y `backend/.env` con la misma
contraseña de la BD.

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker exec -it mlsiesa_backend node scripts/crearAdmin.js admin@propartes.com "Nombre" "contrasena"
```

## Despliegue (Docker)

```bash
docker network create proxy_red_compartida   # solo la primera vez en local
docker compose build && docker compose up -d
docker exec -it mlsiesa_backend node scripts/crearAdmin.js admin@propartes.com "Nombre" "contrasena"
```

En el servidor: `git pull`, `docker compose build && docker compose up -d`, y en Nginx Proxy
Manager el Proxy Host del dominio apuntando a `mlsiesa_frontend:80`. La IP del servidor debe
estar en la lista blanca del web service de SIESA. Los cambios de esquema van como migraciones
aditivas en `db/migraciones/`.

## Parámetros de Mercado Libre

Confirmados por el equipo (2026-10-06): centro de operación `021`, tipo de documento `PML`,
lista de precios `L04`, condición de pago `C08`, tipo de cliente `6000` (Clientes Ventas
Virtuales, el mismo de B2C), bodegas `BC207` (Full) y `BP150` (Colecta).
El punto de envío va en `000`: es el único que acepta SIESA (con `T01` rechaza el pedido;
hallazgo de `propartes-siesa-sync`).

## Ciudades

La ciudad del comprador se convierte al código DANE con el listado oficial completo
(`backend/src/servicios/datos/divipola.json`, 1.122 municipios de datos.gov.co) más unos
alias para los nombres cortos que usa Mercado Libre (Cali, Cartagena, Cúcuta, Tumaco,
Mompós). Si aun así una ciudad no se reconoce, el administrador la agrega en
Configuración → Municipios.

## Creación de terceros

Si el comprador no existe en SIESA, la app lo crea en un solo documento, antes del pedido:

| Registro | Qué crea |
|---|---|
| `0200` | El tercero (nombres y apellidos separados, ciudad DANE) |
| `0201` | El cliente, sucursal `001`: vendedor/cobrador `0600`, `C08`, tipo `6000`, lista `L04`, calificación `A` (obligatoria), margen máximo `0100.00` |
| `0753` x4 | Facturación electrónica 2.1 (persona natural): régimen `49`, obligación `R-99-PN`, detalle tributario 1 `01`, detalle tributario 2 `ZZ` |
| `0753` x1 | Correo FE del cliente: `tienda.virtual@propartes.com` (ML no entrega el correo del comprador) |
| `0046` / `0047` | Impuestos (IVA) y retenciones (ninguna) |

Probado en Pruebas el 2026-10-06 con terceros ficticios (`999000001` a `999000003`,
"Prueba Mlsiesa Tercero Ficticio"): importa y queda como cliente activo.

## Pendientes antes de enviar pedidos reales

Hay que cerrarlos con TI y contabilidad. Ninguno bloquea la revisión de las ventas.

1. **Terceros empresa**: la creación de terceros (`envio.crear_tercero`) está probada en
   Pruebas para **persona natural**, con facturación electrónica y correo. Para
   empresas faltan sus códigos FE y las retenciones (ver "Creación de terceros").
2. **Precios con IVA**: se asume IVA 19 % para todo producto. Un ítem exento quedaría con el
   neto mal calculado.
3. **Conexión de producción**: hoy `SIESA_CONEXION=Pruebas`.
