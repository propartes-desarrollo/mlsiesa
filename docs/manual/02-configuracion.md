# Referencia de configuración

Descripción de cada valor de la pantalla **Configuración**: qué controla, su valor original, en qué
pestaña aparece, dónde está definido y en qué parte del código actúa.

> Volver al [índice del manual](README.md). Para editar código, vea el
> [manual de edición](03-manual-de-edicion.md).

---

## Cómo funciona la configuración

- Todos los valores, con su **valor original**, su nombre y su descripción, están definidos en un solo
  lugar: `backend/src/servicios/parametros.js`, en la lista `DEFINICIONES` (desde la línea 15).
- Cuando un administrador cambia un valor desde la pantalla, se guarda **solo ese valor** en la base de
  datos (tabla `parametros`). Los demás siguen tomando el valor original del código.
- "Volver al valor original" borra el valor guardado y la aplicación vuelve a usar el del código.
- Los cambios aplican **de inmediato** a todo lo que se envíe desde ese momento, también a los archivos
  ya cargados. No hace falta reiniciar nada.
- Cada cambio queda registrado en la auditoría (quién, cuándo, valor anterior y nuevo).

Tipos de valor:

| Tipo | Cómo se escribe en la pantalla |
|---|---|
| Interruptor | Encendido / apagado. Se guarda al cambiarlo. |
| Número | Solo números. |
| Texto | Máximo 255 caracteres. |
| Lista | Elementos separados por coma. Ejemplo: `001:01, 002:01, 003:01`. |

La pestaña en la que aparece cada valor depende del inicio de su clave: `envio.` → *Envío a SIESA*,
`pedido.` → *Pedido*, `tercero.` → *Cliente nuevo*, `ml.` → *Mercado Libre*. Los marcados como
técnicos van en *Avanzado*. Esa regla está en `frontend/src/paginas/Parametros.jsx`, líneas 17-23.

Las referencias de este documento son `archivo:línea` sobre la versión 1.0.0. Si una línea se movió,
busque en el archivo la **clave** del valor (por ejemplo `'pedido.co'`).

---

## Pestaña "Envío a SIESA"

| Nombre en pantalla | Clave | Valor original | Qué controla | Definido en | Actúa en |
|---|---|---|---|---|---|
| Envío a SIESA | `envio.activo` | Apagado | Si está apagado, se puede cargar y revisar, pero no enviar. También detiene el reintento automático de la DIAN. | `parametros.js:17` | `rutas/ventasMl.js:129`, `servicios/reintentosDian.js:30` |
| Revisar el comprador antes de enviar | `envio.validar_tercero` | Encendido | Consulta en SIESA si el comprador ya es cliente antes de crear el pedido. Apagado, nunca se crean clientes nuevos. | `parametros.js:19` | `servicios/procesoVentas.js:170` |
| Registrar compradores nuevos | `envio.crear_tercero` | Apagado | Si el comprador no existe en SIESA, lo registra como cliente. Apagado, la venta queda "Comprador no registrado". | `parametros.js:21` | `servicios/procesoVentas.js:175` |
| Validar el RUT en la DIAN | `envio.validar_rut` | Encendido | Consulta en la DIAN si la persona natural con cédula tiene RUT; si lo tiene, la registra con NIT. | `parametros.js:24` | `servicios/procesoVentas.js:24` |
| Página de consulta del RUT en la DIAN | `envio.rut_url` | `https://muisca.dian.gov.co/WebGestionmasiva/DefSelPublicacionesExterna.faces` | Dirección de la página de la DIAN. Cámbiela solo si la DIAN la mueve y el formulario es el mismo. | `parametros.js:26` | `servicios/procesoVentas.js:25`, `servicios/dian.js:56` |
| DIAN: minutos entre reintentos | `envio.rut_reintento_min` | 10 | Cada cuánto se reintenta una venta "Esperando DIAN". | `parametros.js:28` | `servicios/procesoVentas.js:31` |
| DIAN: espera máxima (minutos) | `envio.rut_espera_max_min` | 60 | Pasado este tiempo sin respuesta de la DIAN, se registra con cédula y queda el aviso. | `parametros.js:30` | `servicios/procesoVentas.js:30` |
| Mostrar información técnica | `envio.ver_tecnico` | Encendido | Muestra a los administradores los archivos técnicos y la respuesta de SIESA. | `parametros.js:33` | `rutas/parametros.js:33`, `frontend/.../Cargue.jsx:125`, `frontend/.../Historial.jsx:133` |

## Pestaña "Pedido"

| Nombre en pantalla | Clave | Valor original | Qué controla | Definido en | Actúa en |
|---|---|---|---|---|---|
| Centro de operación | `pedido.co` | 021 | Centro de operación del pedido. | `parametros.js:37` | `siesa/documentos.js:112`, `:117`, `:140` |
| Tipo de documento | `pedido.tipo_docto` | PML | Tipo de documento de los pedidos de ML. **También lo usa la consulta `CONSULTA_PEDIDO_ML`** (ver nota). | `parametros.js:38` | `siesa/documentos.js:112`, `:140` |
| Vendedor | `pedido.vendedor` | VEN0600 | Vendedor del pedido (MERCADO LIBRE). | `parametros.js:39` | `siesa/documentos.js:124` |
| Lista de precios | `pedido.lista_precio` | L04 | Lista de precios del pedido y del cliente nuevo. | `parametros.js:40` | `siesa/documentos.js:145`, `:261` |
| Condición de pago | `pedido.cond_pago` | C08 | Condición de pago del pedido. | `parametros.js:41` | `siesa/documentos.js:123` |
| Tipo de cliente | `pedido.tipo_cli` | 6000 | Tipo de cliente del pedido y del cliente nuevo (Clientes Ventas Virtuales). | `parametros.js:42` | `siesa/documentos.js:117`, `:260` |
| Bodega para ventas Full | `pedido.bodega_full` | BC207 | Bodega de las ventas *Mercado Envíos Full*. | `parametros.js:43` | `siesa/documentos.js:36` |
| Bodega para ventas Colecta | `pedido.bodega_colecta` | BP150 | Bodega de las ventas *Colecta*. | `parametros.js:44` | `siesa/documentos.js:37` |
| Referencia del flete | `pedido.ref_flete` | FLETE | Producto con el que se registra el envío pagado por el comprador. Vacío = el envío no se registra. | `parametros.js:45` | `siesa/documentos.js:50-54` |
| Días de entrega | `pedido.dias_entrega` | 1 | Fecha de entrega = fecha de la venta + estos días. | `parametros.js:47` | `siesa/documentos.js:101` |
| IVA de los productos (%) | `pedido.iva_pct` | 19 | Con este porcentaje se pasa el precio de ML (con IVA) a precio sin IVA. | `parametros.js:48` | `siesa/documentos.js:47`, `procesoVentas.js:64` |
| IVA del envío (%) | `pedido.iva_flete_pct` | 19 | Igual, para el flete. | `parametros.js:49` | `siesa/documentos.js:53` |

> **Nota sobre el tipo de documento.** La consulta que busca los pedidos en SIESA
> (`sql/CONSULTA_PEDIDO_ML.sql`, línea 36) filtra por `'PML'` escrito en la consulta. Si cambia el tipo
> de documento, TI debe cambiar también la consulta y volver a registrarla.

## Pestaña "Cliente nuevo"

| Nombre en pantalla | Clave | Valor original | Qué controla | Definido en | Actúa en |
|---|---|---|---|---|---|
| Correo de los clientes nuevos | `tercero.email_respaldo` | tienda.virtual@propartes.com | ML no entrega el correo del comprador: se usa este, también para la factura electrónica y en la dirección de envío del pedido. | `parametros.js:76` | `siesa/documentos.js:130`, `:220`, `:360` |
| Teléfono de los clientes nuevos | `tercero.telefono_respaldo` | (vacío) | Teléfono del cliente y del envío. Vacío = sin teléfono. | `parametros.js:78` | `siesa/documentos.js:129`, `:220` |
| Vendedor y cobrador | `tercero.vendedor` | 0600 | Vendedor y cobrador del cliente nuevo. | `parametros.js:79` | `siesa/documentos.js:259`, `:268` |
| Condición de pago | `tercero.cond_pago` | C08 | Condición de pago del cliente nuevo. | `parametros.js:80` | `siesa/documentos.js:260` |
| Centro de operación de ventas | `tercero.co_movto` | 040 | Centro de operación de "Parámetros default movimiento de ventas" del cliente. | `parametros.js:81` | `siesa/documentos.js:269` |
| Nota del cliente nuevo | `tercero.notas` | Creado en Mercadolibre | Observación del cliente en SIESA (llega en mayúsculas). | `parametros.js:82` | `siesa/documentos.js:268` |
| Margen máximo (%) | `tercero.porc_max_margen` | 100 | Margen máximo del cliente (llega como 0100.00). | `parametros.js:84` | `siesa/documentos.js:262` |
| Factura electrónica: régimen | `tercero.fe_regimen_natural` | 49 | Régimen de la persona natural (49 = No responsable de IVA). | `parametros.js:85` | `siesa/documentos.js:355` |
| Factura electrónica: obligación | `tercero.fe_obligacion_natural` | R-99-PN | Obligación de la persona natural. | `parametros.js:86` | `siesa/documentos.js:356` |
| Factura electrónica: detalle tributario 1 | `tercero.fe_detalle1_natural` | ZZ | Detalle tributario 1 de la persona natural (ZZ = No aplica). | `parametros.js:87` | `siesa/documentos.js:357` |
| Factura electrónica: detalle tributario 2 | `tercero.fe_detalle2_natural` | (vacío) | Vacío = no se envía. | `parametros.js:88` | `siesa/documentos.js:358` |
| Factura electrónica empresa: régimen | `tercero.fe_regimen_juridica` | 48 | Régimen de la empresa (48 = Responsable de IVA). | `parametros.js:89` | `siesa/documentos.js:355` |
| Factura electrónica empresa: obligación | `tercero.fe_obligacion_juridica` | R-99-PN | Obligación de la empresa. | `parametros.js:90` | `siesa/documentos.js:356` |
| Factura electrónica empresa: detalle tributario 1 | `tercero.fe_detalle1_juridica` | 01 | Detalle tributario 1 de la empresa (01 = IVA). | `parametros.js:91` | `siesa/documentos.js:357` |
| Factura electrónica empresa: detalle tributario 2 | `tercero.fe_detalle2_juridica` | (vacío) | Vacío = no se envía. | `parametros.js:92` | `siesa/documentos.js:358` |

## Pestaña "Mercado Libre"

| Nombre en pantalla | Clave | Valor original | Qué controla | Definido en | Actúa en |
|---|---|---|---|---|---|
| Estados que no se envían | `ml.estados_excluidos` | cancelada, devuelta, devolucion, reembolso, no concretada | Si el estado de la venta en ML **contiene** alguna de estas palabras, la venta queda bloqueada. No distingue mayúsculas ni tildes. | `parametros.js:124` | `rutas/ventasMl.js:64`, `servicios/excelMl.js:212-214` |

> Este valor se aplica **al cargar** el Excel. Si lo cambia, vuelva a subir los archivos que quiera
> reevaluar.

## Pestaña "Avanzado"

Valores técnicos que exige SIESA. Un valor equivocado hace que SIESA rechace los pedidos o los
clientes. Cámbielos solo con indicación de sistemas.

### Pedido

| Nombre en pantalla | Clave | Valor original | Campo de SIESA / efecto | Definido en | Actúa en |
|---|---|---|---|---|---|
| Versión del documento | `pedido.version` | 04 | Versión de los registros del pedido. | `parametros.js:52` | `siesa/documentos.js:110`, `:139` |
| Clase de documento | `pedido.clase_docto` | 502 | 502 = pedido directo. | `parametros.js:53` | `siesa/documentos.js:113` |
| Estado inicial del pedido | `pedido.ind_estado` | 2 | 2 = aprobado. | `parametros.js:54` | `siesa/documentos.js:114` |
| Pendientes del pedido | `pedido.ind_backorder` | 1 | Manejo de pendientes del encabezado. | `parametros.js:55` | `siesa/documentos.js:114` |
| Pendientes por producto | `pedido.ind_backorder_linea` | 5 | SIESA solo acepta 5. | `parametros.js:56` | `siesa/documentos.js:148` |
| Sucursal del cliente | `pedido.sucursal` | 001 | Sucursal a la que se factura. | `parametros.js:57` | `siesa/documentos.js:115-116` |
| Punto de envío | `pedido.punto_envio` | 000 | SIESA rechaza T01. | `parametros.js:60` | `siesa/documentos.js:124` |
| Moneda | `pedido.moneda` | COP | Moneda del pedido y del cliente. | `parametros.js:61` | `siesa/documentos.js:121-122`, `:259` |
| Moneda de conversión | `pedido.moneda_conv` | USD | Moneda de conversión. | `parametros.js:62` | `siesa/documentos.js:121` |
| Concepto | `pedido.concepto` | 501 | 501 = ventas. | `parametros.js:63` | `siesa/documentos.js:142` |
| Motivo | `pedido.motivo` | 01 | Motivo de cada producto. | `parametros.js:64` | `siesa/documentos.js:142` |
| Centro de operación del movimiento | `pedido.co_movto` | 040 | Centro de operación de cada producto. | `parametros.js:65` | `siesa/documentos.js:143` |
| Centro de costo de respaldo | `pedido.ccosto` | (vacío) | Solo si SIESA no responde con el centro de costo del producto. Vacío = esa venta no se envía. | `parametros.js:68` | `siesa/documentos.js:48`, `procesoVentas.js:106-107` |
| Centro de costo del flete | `pedido.ccosto_flete` | 5059 | Centro de costo de la línea FLETE. | `parametros.js:70` | `siesa/documentos.js:53` |
| Unidad de medida | `pedido.unidad` | UND | Unidad de los productos. | `parametros.js:71` | `siesa/documentos.js:145` |
| Enviar el detalle de impuestos | `pedido.enviar_impuestos` | Apagado | Envía el IVA de cada producto (registro 0432). Apagado = SIESA lo calcula. | `parametros.js:72` | `siesa/documentos.js:154-164` |
| Llave de impuesto | `pedido.llave_impuesto` | (vacío) | Solo si se envía el detalle de impuestos. | `parametros.js:73` | `siesa/documentos.js:160` |

### Cliente nuevo

| Nombre en pantalla | Clave | Valor original | Campo de SIESA / efecto | Definido en | Actúa en |
|---|---|---|---|---|---|
| Sucursal | `tercero.sucursal` | 001 | Sucursal del cliente nuevo. | `parametros.js:95` | `siesa/documentos.js:257`, `:276`, `:289`, `:302` |
| Calificación | `tercero.calificacion` | A | Obligatoria: vacía, SIESA rechaza el cliente. | `parametros.js:97` | `siesa/documentos.js:259` |
| País | `tercero.pais` | 169 | 169 = Colombia. | `parametros.js:98` | `siesa/documentos.js:219` |
| Actualizar datos tributarios | `tercero.actualiza` | 1 | Si el dato ya existe, se actualiza. | `parametros.js:99` | `siesa/documentos.js:275`, `:283`, `:301` |
| Clasificación del cliente | `tercero.criterios` | CCO:NO, CLM:01, CMV:N, COM:NO, D01:50, D02:52, NIC:NO, PCO:05, PRO:NO, RED:01, ZON:0207 | Un criterio por plan, como `plan:criterio`. D01 y D02 se reemplazan según los productos. | `parametros.js:101` | `siesa/documentos.js:319` |
| División según los productos | `tercero.division_por_segmento` | AU01:50:52, CO01:50:52, MO01:70:71, NA01:70:71, BI01:80:80 | `segmento del producto:división:segmento del cliente`. Gana el grupo con más valor en la compra. | `parametros.js:104` | `siesa/documentos.js:321-335` |
| Impuestos persona natural | `tercero.impuestos_natural` | 001:01, 002:01, 003:01 | `clase:valor`. 001 IVA, 002 ICA, 003 INC; 01 = le aplica. | `parametros.js:110` | `siesa/documentos.js:295` |
| Retenciones persona natural | `tercero.retenciones_natural` | 001:00 … 025:01, 030:00 | `clase:valor`. Solo AUTRENTA (025) como retenedor. | `parametros.js:112` | `siesa/documentos.js:296` |
| Impuestos empresa | `tercero.impuestos_juridica` | 001:01, 002:01, 003:01 | Igual que persona natural. | `parametros.js:114` | `siesa/documentos.js:295` |
| Retenciones empresa | `tercero.retenciones_juridica` | 001:00 … 025:01, 030:01 | AUTRENTA (025) y RETNEDOR (030) como retenedor. | `parametros.js:116` | `siesa/documentos.js:296` |
| Validar bloqueo | `tercero.bloqueado` | 1 | En los clientes reales va en 1 aunque estén activos. | `parametros.js:119` | `siesa/documentos.js:263` |
| Validar cupo | `tercero.bloqueo_cupo` | 1 | Igual. | `parametros.js:120` | `siesa/documentos.js:263` |
| Validar mora | `tercero.bloqueo_mora` | 1 | Igual. | `parametros.js:121` | `siesa/documentos.js:264` |

#### Códigos de impuestos y retenciones (verificados en SIESA Pruebas, 2026-10-14)

| Tipo | Código | Clase en SIESA |
|---|---|---|
| Impuesto | 001 | IVA |
| Impuesto | 002 | ICA |
| Impuesto | 003 | INC (Impoconsumo) |
| Retención | 001 | RENTA |
| Retención | 002 | RIVA |
| Retención | 003 | R.ICA |
| Retención | 004 | R.ICA.T |
| Retención | 021 | RHON |
| Retención | 022 | RCIM |
| Retención | 023 | RSER |
| Retención | 024 | RCOM |
| Retención | 025 | AUTRENTA |
| Retención | 030 | RETNEDOR |

Valores: `00` = no aplica / no retiene; `01` = le aplica / retenedor (en R.ICA.T aparece como
"Retiene"). Opcionalmente se puede agregar una tercera parte con la llave: `clase:valor:llave`.

#### Segmentos de producto (plan S01 del ítem en SIESA)

| Segmento | Grupo | División (D01) | Segmento del cliente (D02) |
|---|---|---|---|
| AU01 Automóviles | Automotriz | 50 | 52 |
| CO01 Comercial diésel | Automotriz | 50 | 52 |
| MO01 Motos | Motos | 70 | 71 |
| NA01 Marine | Motos | 70 | 71 |
| BI01 Bicicletas | Bicicletas | 80 | 80 |

El segmento de cada producto lo devuelve la consulta `CONSULTA_ITEM_ML`. Si la consulta registrada en
SIESA no trae la columna `segmento`, todos los clientes quedan con los D01/D02 de *Clasificación del
cliente* (50/52).

---

## Pestaña "Municipios"

Ciudades que la aplicación no reconoce por sí sola. Se guardan en la tabla `municipios` y se consultan
antes que la lista incorporada. Código: pantalla en `frontend/src/paginas/Parametros.jsx:66-108`,
servidor en `backend/src/rutas/parametros.js:99-122`, uso en `backend/src/servicios/dane.js:218-227`.

## Pestaña "Conexión con SIESA"

Solo lectura. Los datos salen del archivo `backend/.env` del servidor:

| En pantalla | Variable en `backend/.env` |
|---|---|
| Ambiente (conexión) | `SIESA_CONEXION` (`Pruebas` o `Propartes Real`) |
| Usuario de SIESA | `SIESA_USUARIO` (`ia` en Pruebas, `ml` en producción) |
| Clave | `SIESA_CLAVE` (nunca se muestra) |
| Compañía | `SIESA_CIA` |
| Proveedor del conector | `SIESA_PROVEEDOR` |
| Consultas | `SIESA_CONSULTA_TERCEROS`, `SIESA_CONSULTA_ITEMS`, `SIESA_CONSULTA_PEDIDOS` |
| Dirección del servicio | `SIESA_ENDPOINT` |

Los valores por defecto de estas variables están en `backend/src/servicios/parametros.js:143-154`.
Cómo cambiarlas: [manual de operación](04-operacion-y-despliegue.md#5-pasar-de-pruebas-a-producción).
