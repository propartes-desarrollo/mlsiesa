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
   consulta del tercero, luego creación si no existe y está habilitada (0200/0201/0046/0047),
   y por último el pedido (0430/0431).
4. **Historial**: cada envío queda con su estado, el documento enviado y la respuesta de SIESA.

### Cómo se mapea una venta de ML

| SIESA | Reporte de ML |
|---|---|
| Tercero a facturar (`f430_id_tercero_fact`) | "Tipo y número de documento" (CC / CE / NIT) |
| Ítem (`f431_referencia_item`) | SKU (= `f120_referencia`) |
| Cantidad / precio | Unidades / "Ingresos por productos" ÷ unidades, **pasado a neto** (÷ 1,19) y subido a peso entero |
| Línea `FLETE` | "Ingresos por envío" (solo si el comprador pagó envío), en neto |
| `f430_num_docto_referencia` | Los 15 últimos dígitos del # de venta (tiene 16) |
| `f430_notas` | `Venta Mercado Libre #<número completo> \| comprador \| ciudad \| Guía` |
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
| `admin` | Todo, más los parámetros SIESA, los municipios, los usuarios y liberar envíos |
| `operador` | Cargar reportes, revisar y enviar a SIESA |
| `consulta` | Ver cargues e historial |

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

## Pendientes antes de enviar pedidos reales

Hay que cerrarlos con TI y contabilidad. Ninguno bloquea la revisión de las ventas.

1. **El pedido de la tienda B2C todavía es rechazado por SIESA** (`printTipoError=1`) con
   estos mismos layouts. El ejemplo de TI sí importa, así que falta revisar el `0430` campo
   por campo (ver `propartes-siesa-sync/docs/conectores/CAMPOS-QUE-RECHAZA-SIESA.md`).
   Esta app hereda ese diagnóstico.
2. **Parámetros de Mercado Libre**: confirmar los marcados "confirmar con TI" en Parámetros
   SIESA (CO, tipo de documento, lista de precios, condición de pago, bodega, punto de envío,
   centro de costo, tipo de cliente).
3. **`CONSULTA_TERCERO_ECOMMERCE`**: TI debe registrarla. Sin ella todo tercero sale como
   "desconocido" y se envía el pedido sin crear el tercero.
4. **Creación de terceros** (`envio.crear_tercero`): nunca probada contra SIESA. Faltan los
   registros de facturación electrónica (0753) y definir el **email** del tercero, porque ML
   no lo entrega (`tercero.email_respaldo`).
5. **Precios con IVA**: se asume IVA 19 % para todo producto. Un ítem exento quedaría con el
   neto mal calculado.
6. **Códigos de ciudad**: confirmar que el maestro de SIESA usa DIVIPOLA/DANE.
7. **Conexión de producción**: hoy `SIESA_CONEXION=Pruebas`.
