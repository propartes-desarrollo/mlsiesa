# Manual de edición del código

Guía para modificar la aplicación sin tener que leerla completa. Para cada cambio habitual indica el
**archivo**, las **líneas**, el **texto que debe buscar** y **cómo comprobar** que quedó bien.

> Volver al [índice del manual](README.md). Para valores que se cambian desde la pantalla (bodegas,
> códigos, correos…), no edite código: use la [referencia de configuración](02-configuracion.md).

---

## 0. Antes de editar: cómo usar este manual

### Las referencias

Cada cambio se describe así:

| Campo | Significado |
|---|---|
| **Archivo** | Ruta desde la carpeta raíz del proyecto (`mercadolibre-siesa-sync/`). |
| **Líneas** | Números de línea en la versión **1.0.0** (etiqueta `v1.0.0` del repositorio más los ajustes posteriores a esa etiqueta). |
| **Buscar** | Texto exacto que existe en esas líneas. Si alguien editó el archivo y las líneas se movieron, busque este texto (Ctrl+F en el editor). **El texto manda sobre el número.** |

### Las tres reglas

1. **Los valores de negocio no se editan en el código.** Bodegas, códigos de SIESA, correo de respaldo,
   impuestos, clasificación, tiempos de la DIAN… se cambian en **Configuración**. Solo edite el código
   para cambiar el **valor original** de fábrica o para cambiar una **regla**.
2. **Todo texto que se envía a SIESA sale en mayúsculas** automáticamente (salvo correos). No escriba
   mayúsculas a mano en los textos de SIESA: la conversión está en `backend/src/servicios/siesa/plano.js:32-36`.
3. **Después de cada cambio**, compruebe con el procedimiento de la sección 0.3.

### 0.3 Procedimiento para comprobar un cambio

```bash
# 1. Pruebas automáticas del servidor (deben terminar en "fail 0")
cd backend && npm test

# 2. Si cambió algo de las pantallas, compilar el frontend (debe terminar en "built")
cd ../frontend && npx vite build

# 3. Reconstruir la aplicación local y abrir http://localhost:8090 (Ctrl+F5)
cd .. && docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Si cambió una regla del documento que va a SIESA (pedido o cliente), pruébela además contra **SIESA
Pruebas** con el script de la sección 13.

---

## 1. Cómo está construida la aplicación

```
 Navegador (pantallas React)
        │  /api/...
        ▼
 Nginx (contenedor mlsiesa_frontend) ──► sirve las pantallas compiladas
        │  /api/  (nginx.conf:33)
        ▼
 Servidor Node/Express (contenedor mlsiesa_backend, puerto 3001)
        │
        ├──► PostgreSQL (contenedor mlsiesa_db): usuarios, parámetros, municipios,
        │                                         cargues, envíos, auditoría
        ├──► SIESA (web service WSUNOEE, SOAP):   ImportarXML (escribe) y
        │                                         EjecutarConsultaXML (consulta)
        └──► DIAN (página pública MUISCA):        ¿la persona tiene RUT?
```

| Pieza | Tecnología | Dónde |
|---|---|---|
| Pantallas | React 19 + Mantine 9 (componentes visuales) + Vite | `frontend/` |
| Servidor | Node.js + Express 5 | `backend/` |
| Base de datos | PostgreSQL 16 | `db/esquema.sql`, `db/migraciones/` |
| Consultas de SIESA | SQL registrado por TI en SIESA | `sql/` |
| Despliegue | Docker Compose + Nginx | `docker-compose.yml`, `Dockerfile.*`, `nginx.conf` |

---

## 2. Mapa de archivos

### Servidor (`backend/src/`)

| Archivo | Qué contiene | Líneas |
|---|---|---|
| `index.js` | Arranque del servidor, registro de rutas (34-38) y arranque del reintento DIAN (48). | 51 |
| `rutas/autenticacion.js` | Inicio de sesión (18-48) y perfil. | 62 |
| `rutas/ventasMl.js` | Subir Excel (60), listar archivos paginados (78), ver archivo (98), archivo técnico (106), enviar una venta (125). | 147 |
| `rutas/envios.js` | Historial con filtros (22), detalle (35), "Consultar en SIESA" (47), habilitar para reenvío (81). | 91 |
| `rutas/parametros.js` | Estado de la barra superior (20), conexión (40), listar/guardar/restaurar parámetros (53, 60, 88), municipios (99, 107). | 124 |
| `rutas/usuarios.js` | Listar, crear y editar usuarios (solo admin). | 83 |
| `middleware/autenticacion.js` | Verifica la sesión (6) y el rol (24). | 34 |
| `servicios/excelMl.js` | Lee el Excel de Mercado Libre y arma las ventas con avisos y bloqueos. | 311 |
| `servicios/procesoVentas.js` | Revisión de cada venta (36) y envío completo a SIESA (119). | 224 |
| `servicios/siesa/documentos.js` | Arma el pedido (96) y el cliente (229) en el formato de SIESA. | 376 |
| `servicios/siesa/layouts.js` | Estructura campo por campo de cada registro de SIESA. | 127 |
| `servicios/siesa/plano.js` | Formato de cada campo (mayúsculas, ceros, decimales) y envoltura XML. | 104 |
| `servicios/siesa/clienteSoap.js` | Comunicación con SIESA: importar (63) y consultas de tercero (110), ítem (128) y pedido (179). | 195 |
| `servicios/dian.js` | Consulta del RUT en la DIAN. | 82 |
| `servicios/reintentosDian.js` | Reintento automático de las ventas "Esperando DIAN". | 55 |
| `servicios/envios.js` | Guardado y consulta de los envíos (historial). | 129 |
| `servicios/parametros.js` | **Todos los valores de Configuración** con su valor original (15-126) y la conexión SIESA (143-154). | 178 |
| `servicios/dane.js` | Códigos DANE de departamentos y municipios. | 226 |
| `servicios/datos/divipola.json` | Lista oficial de los 1.122 municipios. | - |
| `servicios/municipios.js` | Municipios agregados desde la pantalla. | 15 |
| `servicios/auditoria.js`, `logger.js`, `db.js` | Registro de auditoría, mensajes del servidor y conexión a la base. | - |

### Pantallas (`frontend/src/`)

| Archivo | Pantalla o función | Líneas |
|---|---|---|
| `Aplicacion.jsx` | Rutas de la aplicación y permisos por rol (28-36). | 41 |
| `componentes/Plantilla.jsx` | Marco general: barra superior, indicadores (19-37) y menú (12-17). | 88 |
| `paginas/InicioSesion.jsx` | Pantalla de ingreso. | 46 |
| `paginas/CargarVentas.jsx` | **Cargar ventas**: recuadro de carga y lista paginada de archivos. | 98 |
| `paginas/Cargue.jsx` | **Detalle de un archivo**: resumen, tabla de ventas, detalle y envío. | 322 |
| `paginas/Historial.jsx` | **Historial de envíos**: filtros, tabla y detalle del envío. | 246 |
| `paginas/Parametros.jsx` | **Configuración**: pestañas, municipios y conexión. | 212 |
| `paginas/Usuarios.jsx` | **Usuarios**. | 96 |
| `utilidades/formato.js` | Pesos, fechas, dígito de verificación, **estados y sus colores**, textos cortos del Historial. | 71 |
| `api/indice.js` | Todas las llamadas de las pantallas al servidor. | 80 |
| `tema.js` | Colores y tipografía. | 20 |
| `principal.jsx` | Arranque de las pantallas (idioma del calendario). | 27 |

### Otros

| Archivo | Qué contiene |
|---|---|
| `db/esquema.sql` | Tablas: usuarios (21), parametros (41), municipios (56), cargues (68), envios (84), auditoria (114). |
| `db/migraciones/` | Cambios de base de datos posteriores (0001, 0002, 0003). |
| `sql/CONSULTA_ITEM_ML.sql` | Consulta de SIESA: centro de costo y segmento de un producto. |
| `sql/CONSULTA_PEDIDO_ML.sql` | Consulta de SIESA: el pedido creado para una venta. |
| `backend/pruebas/` | Pruebas automáticas y reportes de ejemplo anonimizados. |
| `backend/scripts/` | `crearAdmin.js` y `probarSiesa.js` (sección 13). |

---

## 3. El recorrido de una venta por el código

Seguir este recorrido ayuda a saber dónde está cada regla.

| Paso | Qué pasa | Dónde |
|---|---|---|
| 1. Subir el Excel | La pantalla envía el archivo. | `frontend/src/paginas/CargarVentas.jsx:32-42` |
| 2. Recibirlo | Valida que sea `.xlsx` de hasta 10 MB y lo guarda como "cargue". | `backend/src/rutas/ventasMl.js:26-32`, `:60-74` |
| 3. Leer el Excel | Ubica las columnas por nombre, agrupa paquetes y arma cada venta con sus avisos y bloqueos. | `backend/src/servicios/excelMl.js:178-218` y `:222-307` |
| 4. Revisar cada venta | Aplica bloqueos y avisos con la configuración **actual**. | `backend/src/servicios/procesoVentas.js:36-90` |
| 5. Mostrar el archivo | Tabla, resumen y detalle. | `frontend/src/paginas/Cargue.jsx` |
| 6. Enviar | La pantalla envía las ventas una por una. | `frontend/src/paginas/Cargue.jsx:166-185` |
| 7. Proceso de envío | Bloqueo anti-duplicado, pedido ya existente, productos, cliente, DIAN, pedido, número. | `backend/src/servicios/procesoVentas.js:119-222` |
| 8. Armar documentos | Pedido y cliente en el formato de SIESA. | `backend/src/servicios/siesa/documentos.js:96-168` y `:229-308` |
| 9. Hablar con SIESA | Importar y consultar. | `backend/src/servicios/siesa/clienteSoap.js` |
| 10. Guardar el resultado | Estado, detalle, documentos y pedido. | `backend/src/servicios/envios.js:42-56` |
| 11. Historial | Lista con filtros y detalle. | `backend/src/servicios/envios.js:94-113`, `frontend/src/paginas/Historial.jsx` |

---

## 4. Textos, nombres y apariencia de las pantallas

### 4.1 Cambiar el nombre de la aplicación

| | |
|---|---|
| **Barra superior** | `frontend/src/componentes/Plantilla.jsx`, línea 56. Buscar: `Mercado Libre → SIESA` |
| **Pestaña del navegador** | `frontend/index.html`, línea 7. Buscar: `<title>Mercado Libre a SIESA - Propartes</title>` |
| **Comprobar** | Compilar el frontend y reconstruir (0.3). |

### 4.2 Cambiar los colores o la tipografía

| | |
|---|---|
| **Archivo** | `frontend/src/tema.js` |
| **Color principal** | Líneas 15-18 (`marca`): diez tonos del más claro al más oscuro. El tono 6 (línea 8, `primaryShade: 6`) es el de los botones. |
| **Tipografía** | Líneas 10-13. La fuente se descarga en `frontend/index.html` (enlace a Google Fonts). Si cambia la fuente, cambie ambos lugares. |

### 4.3 Cambiar los textos de "Cargar ventas"

| Texto | Archivo y línea | Buscar |
|---|---|---|
| Título | `frontend/src/paginas/CargarVentas.jsx:47` | `Cargar ventas de Mercado Libre` |
| Descripción | `CargarVentas.jsx:49` | `Suba el archivo de ventas` |
| Recuadro de carga | `CargarVentas.jsx:60-61` | `Arrastre aquí el Excel de ventas` |
| Mensaje de archivo rechazado | `CargarVentas.jsx:53` | `Solo se acepta el archivo de Excel` |
| Título de la lista | `CargarVentas.jsx:68` | `Archivos cargados` |
| Columnas de la lista | `CargarVentas.jsx:75-76` | `<Table.Th>Archivo</Table.Th>` |

### 4.4 Cambiar cuántos archivos se ven por página

| | |
|---|---|
| **Archivo** | `frontend/src/paginas/CargarVentas.jsx`, línea 15. Buscar: `const POR_PAGINA = 10;` |
| **Qué cambiar** | El número. El servidor acepta hasta 100 (`backend/src/rutas/ventasMl.js:80`). |

### 4.5 Cambiar los textos del detalle de un archivo

Todo en `frontend/src/paginas/Cargue.jsx`:

| Texto | Línea | Buscar |
|---|---|---|
| Etiquetas del resumen (Ventas en el archivo, Listas…) | 20-24 | `'Ventas en el archivo'` |
| Siglas del tipo de documento (CC, CE, NIT) | 44 | `const TIPO_DOC` |
| Etiqueta "Cliente nuevo" y su explicación | 53-60 | `function BadgeCliente` |
| Totales bajo la tabla de productos | 87 | `Cobrado en Mercado Libre` |
| "Notas del pedido" | 89 | `Notas del pedido:` |
| "Facturar a:" | 93 | `Facturar a:` |
| "Dirección de Envío" | 103 | `Dirección de Envío` |
| Botones de archivo técnico | 112-113 | `Ver archivo técnico del pedido` |
| Aviso de envío apagado | 200 | `El envío a SIESA está apagado` |
| Aviso de ciudades no reconocidas | 210-211 | `Hay ciudades que la app no reconoce` |
| Filtros (Todas, Listas…) | 218-221 | `<SegmentedControl` |
| Botón "Enviar a SIESA" | 295 | `Enviar a SIESA` |
| Ventana de confirmación | 301-313 | `Confirmar envío a SIESA` |

### 4.6 Cambiar los textos del Historial

Todo en `frontend/src/paginas/Historial.jsx`:

| Texto | Línea | Buscar |
|---|---|---|
| Título y descripción | 190-191 | `Historial de envíos` |
| Buscador | 194 | `# de venta, pedido, comprador o documento` |
| Filtro de fecha | 198-199 | `placeholder="Fecha de envío"` |
| Columnas de la tabla | 206-208 | `<Table.Th># de venta</Table.Th>` |
| Ancho de la ventana de detalle | 237 | `size={900}` |
| Tarjetas del resumen (Pedido SIESA, Estado, Comprador, Total) | 88-95 | `<Dato etiqueta="Pedido SIESA"` |
| Proporción de cada tarjeta | 90-93 | `span={{ base: 6, sm: 2.5 }}` (las cuatro deben sumar 12) |
| "Información técnica" | 107 | `Información técnica` |

### 4.7 Cambiar los nombres, colores o textos cortos de los estados

| Qué | Archivo y líneas | Buscar |
|---|---|---|
| Nombre y color de cada estado en pantalla | `frontend/src/utilidades/formato.js:24-33` | `export const ESTADOS = {` |
| Correspondencia con los estados guardados | `formato.js:36-42` | `export const ESTADOS_BD = {` |
| Qué estados se pueden seleccionar para enviar | `formato.js:46` | `export const enviable` |
| Frase corta de la columna Detalle del Historial | `formato.js:50-65` | `const DETALLES_CORTOS = [` |

Cada línea de `DETALLES_CORTOS` dice: *si el mensaje completo contiene este texto → mostrar esta frase*.
Si cambia un mensaje del servidor (sección 7.6), revise que su frase corta siga coincidiendo.

Colores disponibles: `blue`, `green`, `red`, `orange`, `yellow`, `cyan`, `teal`, `grape`, `gray`,
`dark`, `marca`.

---

## 5. Menú, roles y permisos

### 5.1 Quién ve cada opción del menú

| | |
|---|---|
| **Archivo** | `frontend/src/componentes/Plantilla.jsx`, líneas 12-17. Buscar: `const MENU = [` |
| **Qué cambiar** | La lista `roles` de cada opción (`'admin'`, `'usuario'`) y la `etiqueta`. |
| **Importante** | Ocultar una opción del menú **no** impide entrar escribiendo la dirección. Para restringir de verdad, cambie también la ruta (5.2) y el servidor (5.3). |

### 5.2 Quién puede abrir cada pantalla

| | |
|---|---|
| **Archivo** | `frontend/src/Aplicacion.jsx`, líneas 30-34. |
| **Qué cambiar** | `roles={['admin']}` en la pantalla correspondiente. |

### 5.3 Quién puede hacer cada acción en el servidor

El permiso real está en el servidor, con `requiereRol(...)`:

| Acción | Archivo y línea |
|---|---|
| Subir Excel | `backend/src/rutas/ventasMl.js:60` |
| Ver archivo técnico | `backend/src/rutas/ventasMl.js:106` |
| Enviar a SIESA | `backend/src/rutas/ventasMl.js:125` |
| Consultar en SIESA | `backend/src/rutas/envios.js:47` |
| Habilitar para reenvío | `backend/src/rutas/envios.js:81` |
| Ver la conexión | `backend/src/rutas/parametros.js:40` |
| Ver, guardar y restaurar Configuración | `backend/src/rutas/parametros.js:53`, `:60`, `:88` |
| Agregar municipios | `backend/src/rutas/parametros.js:107` |
| Todo lo de usuarios | `backend/src/rutas/usuarios.js:15` |

### 5.4 Agregar un rol nuevo

Un rol nuevo toca cinco lugares:

1. `db/esquema.sql:26` y una **migración nueva** en `db/migraciones/` (sección 11.2) que reemplace la
   restricción `usuarios_rol_check` (vea como ejemplo `db/migraciones/0002_roles_admin_usuario.sql`).
2. `backend/src/rutas/usuarios.js:17`: `const ROLES = ['admin', 'usuario'];`
3. `frontend/src/paginas/Usuarios.jsx:12-17`: nombre y color del rol.
4. Los `requiereRol(...)` de la tabla 5.3.
5. `frontend/src/componentes/Plantilla.jsx:12-17` y `frontend/src/Aplicacion.jsx:30-34`.

### 5.5 Cambiar el mínimo de caracteres de la contraseña

| | |
|---|---|
| **Servidor** | `backend/src/rutas/usuarios.js:32` (crear) y `:54` (editar). Buscar: `isLength({ min: 8 })` |
| **Pantalla** | `frontend/src/paginas/Usuarios.jsx:28`. Buscar: `v.length >= 8` |
| **Script** | `backend/scripts/crearAdmin.js`, línea 12. Buscar: `contrasena.length < 8` |

### 5.6 Agregar "cambiar contraseña" en la pantalla de Usuarios

El servidor ya lo permite (`backend/src/rutas/usuarios.js:68-71`, campo `contrasena` del `PUT`). Falta
la pantalla: en `frontend/src/paginas/Usuarios.jsx` agregue en cada fila (líneas 67-76) un botón que
abra una ventana con un `PasswordInput` y llame a `actualizar(u.id, { contrasena })` (función en las
líneas 45-50).

### 5.7 Cambiar la duración de la sesión

| | |
|---|---|
| **Archivo** | `backend/.env`, variable `JWT_EXPIRACION` (por defecto `7d`, siete días). Se lee en `backend/src/rutas/autenticacion.js:40`. |

---

## 6. Lectura del Excel de Mercado Libre

Todo en `backend/src/servicios/excelMl.js`.

### 6.1 Mercado Libre cambió el nombre de una columna

| | |
|---|---|
| **Líneas** | 22-50. Buscar: `const COLUMNAS = {` |
| **Qué cambiar** | El texto entre comillas es el encabezado **exacto** del reporte. El número es su aparición: algunos encabezados se repiten (por ejemplo `'Estado'` aparece dos veces: la 1 es el estado de la venta, la 2 el departamento del envío). |
| **Columnas obligatorias** | Líneas 51-52 (`OBLIGATORIAS`). Si falta una, la carga se rechaza con el mensaje de la línea 152. |
| **Comprobar** | Pruebas (0.3) y cargar un Excel real en la app local. |

La app no depende de la letra de la columna (A, B, AI…), sino del nombre del encabezado.

### 6.2 Reconocer un tipo de documento nuevo

| | |
|---|---|
| **Línea** | 54. Buscar: `const TIPOS_DOC` |
| **Qué cambiar** | Agregue la sigla como la escribe ML y su letra en SIESA (`C` cédula, `E` extranjería, `N` NIT, `P` pasaporte). |
| **Pantalla** | Agregue la misma letra en `frontend/src/paginas/Cargue.jsx:44` (`TIPO_DOC`). |

### 6.3 Cuándo una venta se considera de empresa

| | |
|---|---|
| **Línea** | 290. Buscar: `juridica: tipoDoc === 'N' \|\| negocio` |
| **Regla actual** | Es empresa si el documento es NIT o si la columna "Negocio" dice "Sí". |

### 6.4 Formas de entrega (Full, Colecta, Acuerdo con el comprador)

| Qué | Línea | Buscar |
|---|---|---|
| Cómo se reconoce Full y Colecta | 74-79 | `function logistica` |
| Formas de entrega bloqueadas y su mensaje | 60-72 | `const ACUERDO_COMPRADOR` y `function bloqueoFormaEntrega` |
| Texto en las notas del pedido | `backend/src/servicios/siesa/documentos.js:33` | `const FORMA_ENTREGA` |
| Bodega de cada una | Configuración → Pedido (no requiere código) |

Para **agregar una forma de entrega nueva** (por ejemplo una tercera bodega): agregue el caso en
`logistica` (74-79), su texto en `FORMA_ENTREGA` (`documentos.js:33`), su bodega en `bodega`
(`documentos.js:35-39`), un parámetro de bodega nuevo (sección 10.1) y su nombre en
`frontend/src/paginas/Cargue.jsx:42` (`LOGISTICA`).

### 6.5 Paquetes de varios productos

| | |
|---|---|
| **Líneas** | 196-214. Buscar: `paquete de (\d+) productos?` |
| **Regla** | Una fila "Paquete de N productos" trae el comprador y el total; las N filas siguientes traen cada producto. |

### 6.6 Fechas

| | |
|---|---|
| **Líneas** | 16-19 (meses) y 108-113. Buscar: `function parseFecha` |
| **Formato reconocido** | `27 de septiembre de 2026 16:14 hs.` |

### 6.7 Precio de cada producto

| | |
|---|---|
| **Líneas** | 226-243. Buscar: `Lo que realmente pagó el comprador` |
| **Regla** | Si la venta tiene un solo producto, se usa lo cobrado (ingresos ÷ unidades) y se avisa si difiere del precio de la publicación. En paquetes, el precio unitario de cada producto. |

---

## 7. Revisión de las ventas (bloqueos y avisos)

### 7.1 Dónde está cada regla

| Regla | Tipo | Archivo y línea |
|---|---|---|
| Estado excluido en ML | Bloqueo | `backend/src/servicios/excelMl.js:212-214` (palabras en Configuración) |
| Paquete incompleto | Bloqueo | `excelMl.js:209-211` |
| Sin SKU, cantidad o precio inválido | Bloqueo | `excelMl.js:245-249` |
| Anulaciones o reembolsos | Bloqueo | `excelMl.js:256` |
| Descuentos y bonificaciones | Aviso | `excelMl.js:257` |
| Suma del paquete distinta | Aviso | `excelMl.js:253-255` |
| Precio distinto de lo cobrado | Aviso | `excelMl.js:234-236` |
| Sin documento / tipo no reconocido | Bloqueo / Aviso | `excelMl.js:261-266` |
| Fecha no reconocida | Bloqueo | `excelMl.js:270` |
| Forma de entrega | Bloqueo | `excelMl.js:63-72`, aplicado en `procesoVentas.js:39-42` |
| Ciudad no registrada | Aviso | `backend/src/servicios/procesoVentas.js:46-48` |
| Comprador empresa | Aviso | `procesoVentas.js:49` |
| Archivo de versión anterior | Bloqueo | `procesoVentas.js:51-52` |
| Sin bodega configurada | Bloqueo | `procesoVentas.js:53-55` |
| Total con IVA distinto | Aviso | `procesoVentas.js:62-68` |

**Diferencia importante:** las reglas de `excelMl.js` se evalúan **al cargar** el archivo (un archivo ya
cargado conserva el resultado). Las de `procesoVentas.js` se evalúan **cada vez que se abre** el archivo,
así que aplican también a lo ya cargado.

### 7.2 Convertir un aviso en bloqueo (o al revés)

Cambie `alertas.push(` por `bloqueos.push(` (o al revés) en la línea de la tabla 7.1.

### 7.3 Cambiar la tolerancia del aviso "total con IVA distinto"

| | |
|---|---|
| **Archivo** | `backend/src/servicios/procesoVentas.js`, línea 66. Buscar: `> detalle.length * 2` |
| **Regla actual** | Avisa si la diferencia supera 2 pesos por línea. |

### 7.4 Cambiar el redondeo del precio sin IVA

| | |
|---|---|
| **Archivo** | `backend/src/servicios/siesa/documentos.js`, línea 25. Buscar: `const neto =` |
| **Regla actual** | Precio con IVA ÷ (1 + IVA), subido al peso entero siguiente (SIESA rechaza fracciones). |

### 7.5 Agregar una regla nueva

- Si depende solo del Excel: agréguela en `construirVenta`, `backend/src/servicios/excelMl.js:222-307`.
- Si depende de la configuración o debe aplicar a archivos ya cargados: agréguela en `vistaPrevia`,
  `backend/src/servicios/procesoVentas.js:36-90`.
- Agregue una prueba en `backend/pruebas/ventas.test.js` (sección 15).

### 7.6 Mensajes del resultado del envío

Todos en `backend/src/servicios/procesoVentas.js`:

| Mensaje | Línea |
|---|---|
| Ya estaba en SIESA como pedido… | 162 |
| El producto … no existe en SIESA / Sin datos del producto | 105, 111 |
| El comprador está inactivo en SIESA… | 173 |
| El comprador no está registrado en SIESA… | 176 |
| La DIAN no respondió para validar el RUT… | 181 |
| Aviso "no se pudo validar el RUT" | 33 |
| SIESA no aceptó el registro del comprador… | 191 |
| SIESA no aceptó el pedido… | 198 |
| Pedido … creado en SIESA. | 205, 208 |
| SIESA no respondió a tiempo… | 218 |
| No fue posible comunicarse con SIESA… | 220 |

Si cambia uno, revise su frase corta en `frontend/src/utilidades/formato.js:50-65`.

---

## 8. El pedido que se crea en SIESA

Todo en `backend/src/servicios/siesa/documentos.js`, función `pedidoLineas` (líneas 96-168).

### 8.1 Qué campo lleva cada dato

| Dato | Líneas | Origen |
|---|---|---|
| Centro de operación, tipo de documento, clase, estado | 112-114 | Configuración → Pedido / Avanzado |
| Cliente (facturar a y remitir a) | 115-117 | Documento del comprador |
| Fecha de entrega | 101-103, 118 | Fecha de la venta + días de entrega |
| Referencia y Número O.C. (vacíos) | 119-120 | Fijo |
| Moneda, condición de pago | 121-123 | Configuración |
| Notas | 123 | Función `notas` (92-94) |
| Vendedor y punto de envío | 124 | Configuración |
| Dirección de envío | 125-130 | "Domicilio" del Excel |
| Productos (una línea por producto) | 135-152 | Excel + centro de costo de SIESA |
| Detalle de impuestos (opcional) | 154-164 | Solo con "Enviar el detalle de impuestos" |

### 8.2 Cambiar el texto de las notas del pedido

| | |
|---|---|
| **Líneas** | 91-94. Buscar: `function notas(venta)` |
| **Formato actual** | `ML - <número de venta> - <forma de entrega>` |
| **Atención** | La consulta `sql/CONSULTA_PEDIDO_ML.sql` (línea 38) **busca el pedido por estas notas** (`'ML - %' + número`). Si cambia el inicio `ML - `, cambie también la consulta y pida a TI que la registre de nuevo. Si no, la app dejará de encontrar los pedidos (y podría duplicarlos). |

### 8.3 Llenar de nuevo la Referencia o el Número O.C.

| | |
|---|---|
| **Líneas** | 119-120. Buscar: `f430_num_docto_referencia: ''` |
| **Qué cambiar** | Para el Número O.C. use `referenciaMl(venta.numero)` (los 15 últimos dígitos: el campo admite 15). Para la Referencia, un texto de hasta 10 caracteres. |

### 8.4 Cambiar las abreviaturas de la dirección (Calle → CLL…)

| | |
|---|---|
| **Líneas** | 62-68. Buscar: `const VIAS = [` |
| **Qué cambiar** | Cada línea: a la izquierda las formas en que puede venir (en minúsculas, separadas por `\|`), a la derecha la abreviatura. Ejemplo para agregar Autopista: `[/^(autopista\|autop)$/, 'AUT'],` |
| **Regla de símbolos** | Línea 71: se quitan `#`, comas, guiones y cualquier símbolo. Lo que va después de `/` pasa al segundo renglón (79-82). |

### 8.5 Cambiar la regla del barrio de Bogotá

| | |
|---|---|
| **Líneas** | 84-89. Buscar: `function barrioBogota` |
| **Regla actual** | Si el departamento es Bogotá, el barrio es la columna "Ciudad" del Excel (Mercado Libre pone allí la localidad). Se usa en el pedido (línea 128) y en el cliente (líneas 199-204). |

### 8.6 Cambiar la descripción de la línea del flete

| | |
|---|---|
| **Línea** | 52. Buscar: `'Envío pagado por el comprador'` |

### 8.7 Agregar un campo nuevo al pedido

1. Busque el campo en `backend/src/servicios/siesa/layouts.js` (registro 0430: líneas 9-29; 0431:
   líneas 30-44). Si no existe, el formato de SIESA no lo tiene.
2. Agréguelo con su valor en `pedidoLineas` (líneas 108-131 para el encabezado, 137-149 para cada
   producto). Use el nombre del campo tal como está en `layouts.js`.
3. Si el valor debe ser configurable, cree un parámetro (sección 10.1).
4. Compruebe (0.3) y pruebe en SIESA Pruebas (sección 13).

**No cambie** el tamaño ni el orden de los campos en `layouts.js`: cada registro debe medir exactamente
lo que dice `LARGOS` (`layouts.js:125`). Un solo carácter de más invalida todo el archivo.

---

## 9. El cliente nuevo en SIESA

Todo en `backend/src/servicios/siesa/documentos.js`.

### 9.1 Qué se envía y dónde

| Registro | Contenido | Líneas |
|---|---|---|
| 0200 | Tercero: documento, dígito de verificación, tipo, nombres, dirección, ciudad, barrio | 238-253 |
| 0201 | Cliente: sucursal, vendedor, condición, lista, calificación, margen, bloqueos, nota, centro de operación | 254-270 |
| 0207 | Clasificación (un registro por plan) | 272-279 |
| 0753 | Facturación electrónica y correo | 281-291 |
| 0046 / 0047 | Impuestos y retenciones | 293-304 |

### 9.2 Cómo se separan nombres y apellidos

| | |
|---|---|
| **Líneas** | 182-190. Buscar: `function partirNombre` |
| **Regla actual** | 2 palabras: nombre + apellido. 3: nombre + 2 apellidos. 4 o más: las 2 primeras son nombres, la tercera el primer apellido y el resto el segundo. |

### 9.3 Cálculo del dígito de verificación

| | |
|---|---|
| **Servidor** | Líneas 172-180. Buscar: `function digitoVerificacion` |
| **Pantalla** | `frontend/src/utilidades/formato.js:5-12` (mismo cálculo, para el Historial). |
| **Regla** | Módulo 11 de la DIAN con pesos primos (3, 7, 13, 17, 19…). Si corrige uno, corrija el otro. |

### 9.4 Cuándo se registra como NIT (tipo N)

| | |
|---|---|
| **Tipo de identificación** | Línea 214. Buscar: `tipoIdent: juridica ? 'N'` |
| **Persona natural con RUT** | `backend/src/servicios/procesoVentas.js:27` cambia el tipo a `N` cuando la DIAN confirma el RUT. |

### 9.5 Regla de división y segmento (Automotriz, Motos, Bicicletas)

| | |
|---|---|
| **Líneas** | 315-337. Buscar: `function clasificacionCliente` |
| **Regla actual** | Suma el valor (cantidad × precio) de los productos de cada grupo; gana el de mayor valor. |
| **Para decidir por unidades** | Línea 328: cambie `it.cantidad * it.precioIva` por `it.cantidad`. |
| **Los códigos** | Se configuran en Configuración → Avanzado (no requiere código). |

### 9.6 Facturación electrónica

| | |
|---|---|
| **Líneas** | 348-362. Buscar: `function entidadesFe` |
| **Qué contiene** | Grupo, entidad, atributo y maestro de SIESA de cada dato (régimen, obligación, detalle tributario 1 y 2, correo). Los **valores** están en Configuración. |

---

## 10. Configuración

### 10.1 Agregar un parámetro nuevo a la pantalla de Configuración

1. Agregue una línea en `backend/src/servicios/parametros.js`, dentro de `DEFINICIONES` (líneas 15-126),
   en el grupo que corresponda:

   ```js
   ['pedido.mi_valor', 'X', 'texto', 'Nombre en pantalla', 'Descripción para el administrador.'],
   ```

   - Primera parte: la clave. Su inicio decide la pestaña (`envio.`, `pedido.`, `tercero.`, `ml.`).
   - Tipo: `'texto'`, `'numero'`, `'booleano'` o `'lista'`.
   - Agregue `, true` al final para que vaya en la pestaña Avanzado.
2. Úselo en el código como `cfg.pedido.mi_valor` (o `t.mi_valor` dentro de `terceroLineas`).
3. No hace falta tocar la base de datos ni la pantalla: aparece solo.

### 10.2 Cambiar el valor original de fábrica de un parámetro

Edite el segundo valor de su línea en `backend/src/servicios/parametros.js` (tabla completa con
números de línea en la [referencia de configuración](02-configuracion.md)). Si un administrador ya lo
había cambiado desde la pantalla, se seguirá usando el valor guardado hasta que pulse "Volver al valor
original".

### 10.3 Agregar o cambiar una pestaña de Configuración

| | |
|---|---|
| **Archivo** | `frontend/src/paginas/Parametros.jsx`, líneas 17-23. Buscar: `const GRUPOS = [` |
| **Qué cambiar** | Cada línea: identificador, título de la pestaña y regla de qué claves muestra. |

---

## 11. Base de datos

### 11.1 Tablas

| Tabla | Qué guarda | Definición |
|---|---|---|
| `usuarios` | Cuentas, rol y si están activas | `db/esquema.sql:21-34` |
| `parametros` | Solo los valores de Configuración modificados | `db/esquema.sql:41-50` |
| `municipios` | Municipios agregados por el administrador | `db/esquema.sql:56-63` |
| `cargues` | Cada Excel subido, con sus ventas ya leídas | `db/esquema.sql:68-76` |
| `envios` | Una fila por venta enviada: estado, detalle, documentos, respuesta, pedido | `db/esquema.sql:84-106` |
| `auditoria` | Quién hizo qué y cuándo | `db/esquema.sql:114-124` |

### 11.2 Hacer un cambio en la base de datos

1. Cree un archivo nuevo en `db/migraciones/` con el número siguiente: `0004_descripcion.sql`.
2. Use sentencias que no borren datos: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`.
3. Refleje el mismo cambio en `db/esquema.sql` (para instalaciones nuevas).
4. Aplíquelo en cada base existente (vea el [manual de operación](04-operacion-y-despliegue.md#6-aplicar-una-migración)).

`db/esquema.sql` solo se aplica cuando la base se crea desde cero. Sin la migración, las bases
existentes no reciben el cambio.

### 11.3 Cambiar cuántos envíos muestra el Historial sin filtros

| | |
|---|---|
| **Archivo** | `backend/src/servicios/envios.js`, línea 94. Buscar: `limite = 200` |

---

## 12. Ciudades y códigos DANE

| Qué | Dónde |
|---|---|
| Departamentos y sus códigos | `backend/src/servicios/dane.js:17-51` (`const DEPTOS`) |
| Lista oficial de municipios | `backend/src/servicios/datos/divipola.json` |
| Nombres alternos que usa ML (Cali, Cartagena, Cúcuta…) | `dane.js:64-209` (`const ALIAS`) |
| Otros nombres alternos (Mompox, Tumaco, Buga…) | `dane.js:56-60` (`const ALIAS_EXTRA`) |
| Orden de búsqueda | `dane.js:218-227`: primero los de la pantalla, luego `ALIAS`, `ALIAS_EXTRA` y la lista oficial |
| Bogotá | `dane.js:221`: cualquier localidad de Bogotá se toma como 11-001 |

Para una ciudad puntual, **no edite código**: agréguela en Configuración → Municipios. Edite
`ALIAS_EXTRA` solo si quiere que el nombre alterno quede de fábrica para todas las instalaciones.

Ejemplo: Mercado Libre escribe "Buga" y el nombre oficial es "Guadalajara de Buga" (76-111). Quedó de
fábrica en `ALIAS_EXTRA` con la línea `'76': { 'buga': '111' },`. Para hacer lo mismo desde la pantalla:
Configuración → Municipios → departamento *76 - valle del cauca*, municipio *Buga*, código *111*.

---

## 13. Conexión con SIESA y consultas

### 13.1 Cambiar usuario, clave o ambiente de SIESA

No es código: es el archivo `backend/.env` del servidor. Vea el
[manual de operación](04-operacion-y-despliegue.md#5-pasar-de-pruebas-a-producción).

### 13.2 Cambiar el tiempo de espera de SIESA

| | |
|---|---|
| **Dónde** | `backend/.env`, variable `SIESA_TIMEOUT_MS` (180000 = 3 minutos). Se usa en `backend/src/servicios/siesa/clienteSoap.js:42`. |
| **Pantalla** | El tiempo que la pantalla espera cada envío está en `frontend/src/api/indice.js:54` (400000) y el de "Consultar en SIESA" en la línea 61. Deben ser mayores que el de SIESA. |

### 13.3 Cambiar una consulta de SIESA

1. Edite el archivo en `sql/` (`CONSULTA_ITEM_ML.sql` o `CONSULTA_PEDIDO_ML.sql`).
2. **Conserve los nombres de las columnas** después de `AS` (por ejemplo `AS ccosto_venta`): la app lee
   por esos nombres (`clienteSoap.js:137-139` para ítems, `:149-176` para pedidos).
3. Envíe el archivo a TI para que lo registre en SIESA (Pruebas y producción).

### 13.4 Nombres de los estados del pedido en SIESA

| | |
|---|---|
| **Archivo** | `backend/src/servicios/siesa/clienteSoap.js`, línea 144. Buscar: `const ESTADOS_PEDIDO` |

### 13.5 Cuándo se considera que un comprador es cliente activo

| | |
|---|---|
| **Archivo** | `backend/src/servicios/siesa/clienteSoap.js`, líneas 110-124. Buscar: `async function consultarTercero` |
| **Regla actual** | Activo si tiene sucursal y `estado_activo = 1`. Si existe sin sucursal, se trata como no registrado. |

### 13.6 Probar contra SIESA Pruebas sin usar la app

`backend/scripts/probarSiesa.js` (instrucciones en sus líneas 1-20):

```bash
cd backend
node scripts/probarSiesa.js <reporte.xlsx>                                   # solo consultas
node scripts/probarSiesa.js <reporte.xlsx> --crear-tercero <venta> 999000020    # muestra el cliente sin enviarlo
node scripts/probarSiesa.js <reporte.xlsx> --crear-tercero <venta> 999000020 --enviar            # lo crea (persona natural)
node scripts/probarSiesa.js <reporte.xlsx> --crear-tercero <venta> 999000021 --enviar --empresa  # lo crea (empresa)
node scripts/probarSiesa.js <reporte.xlsx> --pedido <venta>                  # consulta el pedido de una venta
```

El script **se niega a escribir** si la conexión no es Pruebas. Use documentos ficticios (999…) y
recuerde que Pruebas se sobrescribe a las 19:00.

---

## 14. Validación del RUT en la DIAN

### 14.1 Dónde está

| Qué | Archivo y líneas |
|---|---|
| Consulta a la página de la DIAN | `backend/src/servicios/dian.js:56-80` |
| Cómo se lee la respuesta (empresa: razón social; persona: nombres y apellidos; sin RUT: "no es válido") | `dian.js:28-40` |
| Cuándo se consulta y qué se hace con la respuesta | `backend/src/servicios/procesoVentas.js:18-34` |
| Reintento automático | `backend/src/servicios/reintentosDian.js` (revisa cada minuto: línea 19) |
| Estado `espera_dian` en la base | `db/migraciones/0003_espera_dian.sql` |

### 14.2 La DIAN cambió su página

Síntoma: las ventas quedan "Esperando DIAN" y en los pasos técnicos aparece *"La respuesta de la DIAN
no se pudo interpretar"* o *"La página de la DIAN cambió o está en mantenimiento"*.

1. Si solo cambió la dirección: Configuración → Envío a SIESA → "Página de consulta del RUT en la DIAN".
2. Si cambió el formulario: ajuste en `dian.js` el identificador del formulario (línea 17, `FORM`) y
   los campos que se leen (líneas 31-33).
3. Agregue el caso a la prueba "respuesta de la DIAN" en `backend/pruebas/ventas.test.js`.

### 14.3 Cambiar el tiempo máximo de cada consulta a la DIAN

| | |
|---|---|
| **Archivo** | `backend/src/servicios/dian.js`, línea 56. Buscar: `timeoutMs = 20000` (20 segundos). |

### 14.4 Validar también a extranjeros o empresas

| | |
|---|---|
| **Archivo** | `backend/src/servicios/procesoVentas.js`, línea 24. Buscar: `(c.tipoDoc \|\| 'C') !== 'C'` |
| **Regla actual** | Solo personas naturales con cédula (`C`). |

---

## 15. Pruebas automáticas

| Archivo | Qué prueba |
|---|---|
| `backend/pruebas/plano.test.js` | Que cada registro tenga el tamaño exacto y coincida carácter a carácter con el ejemplo de TI. |
| `backend/pruebas/ventas.test.js` | Lectura del Excel, revisión, pedido, cliente, clasificación, impuestos, DIAN y el envío completo con SIESA simulado. |
| `backend/pruebas/fixtures/` | Dos reportes reales **anonimizados** y el ejemplo de TI. Nunca agregue reportes con datos reales de compradores. |

Ejecutar: `cd backend && npm test`. El resultado debe terminar en `# fail 0`.

Al cambiar una regla, la prueba que la cubre fallará con el valor anterior: actualice la prueba al
nuevo comportamiento esperado, no la borre.
