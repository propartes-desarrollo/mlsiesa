# Manual de usuario

Este manual explica cómo usar la aplicación **Mercado Libre → SIESA** (mlsiesa) en el día a día:
cargar el reporte de ventas de Mercado Libre, revisar cada venta, enviarlas a SIESA como pedidos y
consultar lo enviado.

> Versión de la aplicación: 1.0.0 en adelante. Volver al [índice del manual](README.md).

---

## 1. Qué hace la aplicación

Cada día, el equipo de comercio electrónico descarga de Mercado Libre el reporte **"Ventas CO Mercado
Libre y Mercado Shops"** en Excel. La aplicación:

1. **Lee el Excel** y arma una venta por cada pedido de Mercado Libre. Si la compra trae varios
   productos ("Paquete de N productos"), los junta en una sola venta.
2. **Revisa cada venta** y avisa lo que puede salir mal antes de enviarla: estados que no se envían,
   formas de entrega no permitidas, ciudades que no reconoce, precios distintos, etc.
3. **Envía a SIESA** las ventas que usted seleccione. Por cada una:
   - verifica que los productos existan en SIESA;
   - verifica si el comprador ya es cliente; si no lo es, lo **registra como cliente nuevo** (y, si es
     persona natural con cédula, consulta antes en la DIAN si tiene RUT);
   - crea el **pedido** en SIESA y guarda su número.
4. **Guarda el historial** de todo lo enviado, con el número de pedido que quedó en SIESA.

La aplicación **nunca** envía nada por sí sola, salvo un caso: las ventas que quedaron "Esperando
DIAN" (ver la sección 7), que usted ya había enviado.

---

## 2. Roles: qué puede hacer cada persona

| Acción | Usuario | Administrador |
|---|:---:|:---:|
| Entrar a la aplicación | Sí | Sí |
| Cargar el Excel de ventas | Sí | Sí |
| Revisar las ventas y sus avisos | Sí | Sí |
| Enviar ventas a SIESA | Sí | Sí |
| Ver el Historial y "Consultar en SIESA" | Sí | Sí |
| Ver archivos técnicos del pedido y del cliente | No | Sí (si está activado en Configuración) |
| Habilitar para reenvío una venta "Verificar" | No | Sí |
| Cambiar la Configuración | No | Sí |
| Crear usuarios, cambiar roles, desactivar cuentas | No | Sí |

El menú de la izquierda solo muestra las opciones que su rol permite.

---

## 3. Primer uso: de Excel a pedido en SIESA (recorrido guiado)

Este recorrido toma unos 5 minutos y lo lleva desde el reporte de Mercado Libre hasta ver el número
del pedido en SIESA.

### Paso 1. Entrar

1. Abra la dirección de la aplicación en el navegador (en el equipo de desarrollo:
   `http://localhost:8090`).
2. Escriba su **correo** y **contraseña** y pulse **Entrar**.

Arriba a la derecha verá tres indicadores:

| Indicador | Qué significa |
|---|---|
| **SIESA: PRUEBAS** (amarillo) | Todo lo que envíe queda en el ambiente de pruebas de SIESA, no en el real. En producción dirá el nombre de la conexión real (por ejemplo **SIESA: PROPARTES REAL**, en azul). |
| **ENVÍO ACTIVO** (verde) | Se puede enviar a SIESA. Si dice **SOLO REVISIÓN** (naranja), puede cargar y revisar, pero no enviar: un administrador debe activar el envío. |
| **SIN CONEXIÓN CON SIESA** (rojo) | El servidor no tiene la clave de SIESA. No se puede enviar. Avise a sistemas. |

### Paso 2. Cargar el Excel

1. En el menú, pulse **Cargar ventas**.
2. Arrastre el archivo de Mercado Libre al recuadro **"Arrastre aquí el Excel de ventas"**, o haga
   clic en él para buscarlo.
3. Espere el mensaje verde **"N ventas leídas de …"**. La aplicación abre automáticamente el detalle
   del archivo.

Solo se acepta el Excel (`.xlsx`) tal como lo descarga Mercado Libre, de máximo 10 MB.

### Paso 3. Revisar las ventas

En el detalle del archivo verá:

- **Una franja de resumen** con: *Ventas en el archivo*, *Listas (con avisos)*, *Bloqueadas o
  rechazadas*, *Enviadas a SIESA* y, si las hay, *Esperando la DIAN*.
- **Filtros**: *Todas*, *Listas*, *Con avisos*, *Enviadas / con problemas*.
- **La tabla de ventas**: número de venta, fecha, comprador y documento, productos, total y estado.

Haga clic en una fila para abrir su detalle:

- **Recuadro rojo**: bloqueos. La venta **no se puede enviar** mientras exista alguno.
- **Recuadro amarillo**: avisos. La venta **sí se puede enviar**, pero conviene revisarlos.
- **Tabla de productos**: referencia (SKU), descripción, cantidad, precio con IVA, precio sin IVA
  (el que va a SIESA) y tipo de envío con su bodega (por ejemplo *Colecta - BP150*).
- **Facturar a**: cómo quedaría el cliente en SIESA (persona natural o empresa, nombres y apellidos
  separados, dirección).
- **Dirección de Envío**: la dirección del comprador, la ciudad, la guía y el tipo de envío.

### Paso 4. Enviar a SIESA

1. Marque la casilla de las ventas que quiere enviar. La casilla del encabezado marca todas las que
   se pueden enviar en el filtro actual.
2. En la barra inferior pulse **Enviar a SIESA**.
3. Lea la confirmación y pulse **Sí, enviar**.

Las ventas se envían **una por una y en orden**. En cada fila verá el estado cambiar a *Enviando* y
luego al resultado (*Enviada*, *Rechazada*, *Con error*, *Esperando DIAN*…). Al terminar aparece
**"N de M venta(s) enviadas a SIESA"**.

Si el comprador no existía en SIESA y se registró, la fila muestra la etiqueta **Cliente nuevo**
(o **Cliente nuevo - NIT** si tenía RUT en la DIAN).

### Paso 5. Ver el pedido en el Historial

1. En el menú, pulse **Historial de envíos**.
2. Busque la venta. La columna **Pedido SIESA** muestra el número (por ejemplo **PML-3285**).
3. Haga clic en la fila para ver el detalle: estado en SIESA, comprador con su dígito de verificación,
   total, productos tal como quedaron en SIESA y notas del pedido.

Con esto completó el ciclo. El pedido ya existe en SIESA.

---

## 4. Tareas frecuentes

### Cómo encontrar un archivo cargado hace días

En **Cargar ventas**, la lista **Archivos cargados** muestra 10 archivos por página, del más reciente
al más antiguo. Arriba a la derecha indica cuántos hay (por ejemplo *1-10 de 47*); use los números de
página al final de la lista para ir a días anteriores. La columna **Enviadas** muestra cuántas ventas
de cada archivo ya están en SIESA (por ejemplo *30 / 32*).

### Cómo buscar un envío por fecha, comprador o pedido

En **Historial de envíos**:

- **Buscador**: escriba el número de venta, el número de pedido (PML-…), el nombre del comprador o su
  documento.
- **Estado**: elija *Enviada*, *Rechazada*, *Con error*, *Verificar* o *Esperando DIAN*.
- **Fecha de envío**: abra el calendario y elija un día o un rango (desde-hasta). Se borra con la "x".

Sin filtros, el Historial muestra los **200 envíos más recientes**. Para ver más antiguos, use el
filtro de fecha.

### Cómo reenviar una venta que falló

Las ventas **Rechazada** y **Con error** se pueden volver a seleccionar y enviar desde su archivo
cargado. Antes, corrija la causa (vea la tabla de mensajes en la sección 6). Las ventas
**Enviada** nunca se reenvían: la aplicación lo impide para no duplicar pedidos.

### Cómo confirmar si un pedido quedó en SIESA

En el detalle de la venta en el **Historial**, pulse **Consultar en SIESA**. La aplicación busca el
pedido en SIESA y:

- si existe, actualiza número, estado y productos, y la venta queda **Enviada**;
- si la venta figuraba como enviada pero el pedido **ya no existe** en SIESA (lo borraron o anularon),
  la venta queda **Con error** y se puede volver a enviar desde su archivo;
- si hay **más de un pedido** para la misma venta, avisa en naranja para que el administrador revise
  los duplicados.

### Qué hacer con una venta en estado "Verificar"

Significa que SIESA no respondió a tiempo y **no se sabe** si el pedido quedó creado.

1. Abra la venta en el **Historial** y pulse **Consultar en SIESA**.
2. Si el pedido aparece, la venta queda **Enviada**. Fin.
3. Si no aparece, **un administrador** pulsa **"Confirmo que no está en SIESA: habilitar para volver a
   enviar"** y luego se reenvía desde su archivo.

No reenvíe una venta en "Verificar" sin consultarla primero: podría duplicar el pedido.

---

## 5. Estados de una venta

| Estado | Color | Qué significa | ¿Se puede enviar? |
|---|---|---|:---:|
| **Lista** | Verde | Sin bloqueos. Puede tener avisos. | Sí |
| **Bloqueada** | Rojo | Tiene al menos un bloqueo (recuadro rojo en el detalle). | No |
| **Enviando** | Gris | Se está enviando en este momento. | No |
| **Enviada** | Azul | El pedido quedó creado en SIESA. | No (nunca se reenvía) |
| **Rechazada** | Rojo | SIESA no aceptó el pedido o el cliente. | Sí, después de corregir |
| **Con error** | Naranja | No se pudo completar (producto inexistente, comprador inactivo, sin conexión…). | Sí, después de corregir |
| **Verificar** | Morado | SIESA no respondió y no se sabe si el pedido quedó. | No, hasta consultar (sección 4) |
| **Esperando DIAN** | Cian | La DIAN no respondió al validar el RUT. Se reintenta sola. | Sí (adelanta el reintento) |

Etiquetas adicionales:

- **Cliente nuevo**: el comprador se registró en SIESA con este envío.
- **Cliente nuevo - NIT**: se registró con NIT porque tiene RUT en la DIAN.
- **N avisos** (amarillo): la venta tiene avisos para revisar.
- **+ flete**: la venta incluye el envío pagado por el comprador, que va como un producto más
  (referencia FLETE).

---

## 6. Mensajes y qué hacer

### Bloqueos (la venta no se puede enviar)

| Mensaje | Causa | Qué hacer |
|---|---|---|
| La venta está "Cancelada…" en Mercado Libre: no se envía a SIESA. | El estado de ML contiene una palabra excluida (cancelada, devuelta, reembolso…). | Nada. Es correcto que no se envíe. |
| Venta con entrega "Acuerdo con el comprador": se gestiona por fuera de esta app… | Forma de entrega acordada con el comprador. | Gestionarla por el proceso manual. |
| La forma de entrega "…" no es Full ni Colecta… | No se sabe de qué bodega sale. | Revisar la venta en ML; si es un caso nuevo, avisar al administrador. |
| La publicación "…" no tiene SKU… | La publicación de ML no tiene SKU. | Corregir el SKU en ML, descargar de nuevo el reporte y volver a cargarlo. |
| La cantidad no es válida / el precio está en cero. | Datos incompletos en el reporte. | Revisar la venta en ML. |
| La venta tiene anulaciones o reembolsos. | Hubo devolución parcial o total. | Gestionar por fuera de la app. |
| El comprador no tiene documento de identidad en el reporte. | ML no trajo el documento. | Completar en ML o crear el pedido manualmente. |
| El paquete dice tener N productos, pero en el archivo hay M. | El reporte está incompleto. | Descargar de nuevo el reporte. |
| Fecha de venta no reconocida. | Formato de fecha inesperado. | Descargar de nuevo el reporte; si persiste, avisar a sistemas. |
| No hay bodega configurada para las ventas Full/Colecta. | Falta la bodega en Configuración. | El administrador la completa en Configuración → Pedido. |
| Este archivo se cargó con una versión anterior de la app: vuelva a subirlo. | El archivo se cargó antes de una actualización. | Volver a subir el Excel. |

### Avisos (la venta sí se puede enviar)

| Mensaje | Qué revisar |
|---|---|
| El precio de la publicación es distinto de lo cobrado por unidad; se usa lo cobrado. | Hubo descuento o promoción. Normalmente no requiere acción. |
| Tiene descuentos y bonificaciones ($ …). | Confirmar que el valor sea el esperado. |
| La suma de los productos no coincide con el total del paquete. | Revisar la venta en ML antes de enviar. |
| La ciudad "…" no está registrada en la app… | Si el comprador es nuevo, quedaría sin ciudad en SIESA. El administrador puede agregar el municipio en Configuración → Municipios. |
| El comprador es una empresa… | Revisar sus datos tributarios antes de enviar. |
| El total con IVA en SIESA es distinto de lo cobrado en ML. | Diferencia de redondeo o de IVA. Revisar si es grande. |
| No se reconoce el tipo de documento del comprador; se toma como cédula. | Confirmar el documento. |

### Resultados del envío

| En el Historial (resumen) | Mensaje completo | Qué hacer |
|---|---|---|
| Pedido creado | Pedido PML-… creado en SIESA. | Nada. |
| Ya estaba en SIESA | Esta venta ya estaba en SIESA como pedido PML-…; no se vuelve a enviar. | Nada. No se duplicó. |
| Encontrado al consultar | Pedido encontrado en SIESA al consultarlo: PML-… | Nada. |
| Pedido creado - revisar RUT | …La DIAN no respondió y no se pudo validar si el comprador tiene RUT: se registró con cédula… | Revisar en la DIAN si el comprador tiene RUT; si lo tiene, actualizar el cliente en SIESA. |
| Producto no existe en SIESA | El producto … no existe en SIESA. Revise el SKU… | Corregir el SKU en ML o crear el ítem en SIESA, y reenviar. |
| Sin datos del producto | No se pudo obtener la información del producto… | Reintentar en unos minutos. |
| Comprador inactivo | El comprador está inactivo en SIESA… | Pedir a cartera que lo active y reenviar. |
| Comprador no registrado | El comprador no está registrado en SIESA… | Registrarlo, o pedir al administrador que active "Registrar compradores nuevos". |
| SIESA rechazó el cliente | SIESA no aceptó el registro del comprador como cliente. | Avisar al administrador. |
| SIESA rechazó el pedido | SIESA no aceptó el pedido… | Avisar al administrador. |
| Esperando la DIAN | La DIAN no respondió para validar el RUT… La venta se enviará sola a las … | Esperar. Se reenvía sola. |
| Sin respuesta de SIESA | SIESA no respondió a tiempo y no se sabe si el pedido quedó creado… | Ver "Qué hacer con una venta en estado Verificar". |
| Sin conexión con SIESA | No fue posible comunicarse con SIESA… | Reintentar en unos minutos. |
| Pedido borrado en SIESA | El pedido ya no está en SIESA (fue borrado o anulado)… | Reenviar desde su archivo si corresponde. |
| Habilitada para reenviar | Habilitada por un administrador para volver a enviar. | Reenviar desde su archivo. |

---

## 7. Cómo funciona el envío por dentro (explicación)

### Qué datos lleva el pedido

| En SIESA | De dónde sale |
|---|---|
| Centro de operación, tipo de documento (PML), lista de precios, condición de pago, vendedor | Configuración → Pedido |
| Bodega | *Full* → BC207 (bodega de Mercado Libre); *Colecta* → BP150 (bodega principal) |
| Productos | El SKU de la publicación, con el precio **sin IVA** (lo cobrado ÷ 1,19) |
| Flete | Si el comprador pagó envío, va como el producto FLETE |
| Notas | `ML - <número de venta> - Mercado Envíos Full` o `- Colecta de Mercado Envíos` |
| Referencia y Número O.C. | Vacíos |
| Dirección de envío | La del "Domicilio" del reporte, sin símbolos, con la vía abreviada (Calle → CLL, Carrera → CR) |
| Barrio | Solo en Bogotá: la localidad (Suba, Kennedy…) |

Todo lo que se envía a SIESA va en **MAYÚSCULAS**, salvo los correos, que van en minúsculas.

### Qué datos lleva el cliente nuevo

- Persona natural o empresa, con nombres y apellidos separados (o razón social).
- Dirección, ciudad (código DANE) y, en Bogotá, la localidad como barrio.
- Vendedor y cobrador 0600, condición C08, tipo de cliente 6000, lista L04, calificación A,
  centro de operación de ventas 040, nota *CREADO EN MERCADOLIBRE*.
- Facturación electrónica, impuestos, retenciones y clasificación (ZON 0207, división y segmento
  según lo que compra: Automotriz, Motos o Bicicletas). Detalle en la
  [referencia de configuración](02-configuracion.md).

### La validación del RUT en la DIAN

Antes de registrar a un comprador **persona natural con cédula**, la aplicación consulta en la página
pública de la DIAN si tiene RUT:

| Respuesta de la DIAN | Cómo se registra |
|---|---|
| Tiene RUT | Con **NIT** (tipo N) y su dígito de verificación, como persona natural |
| No tiene RUT | Con **cédula** |
| No responde | La venta queda **Esperando DIAN** y no se escribe nada en SIESA |

Si la DIAN no responde, la aplicación reintenta sola cada 10 minutos. Si a los 60 minutos sigue sin
responder, registra al comprador con cédula y deja el aviso *"revisar RUT"*. Ambos tiempos se cambian
en Configuración. Las empresas y los compradores que ya existen en SIESA no se consultan.

### Ambiente de pruebas

Mientras el indicador diga **SIESA: PRUEBAS**, todo queda en el ambiente de pruebas de SIESA. Ese
ambiente se **sobrescribe todos los días a las 19:00** con la información de producción, así que lo
enviado a pruebas desaparece al día siguiente. El historial de la aplicación sí se conserva.

---

## 8. Administración (solo administradores)

### Usuarios

En **Usuarios**:

- **Nuevo usuario**: nombre, correo, contraseña inicial (mínimo 8 caracteres) y rol.
- **Cambiar el rol**: en la columna Rol, elija *Usuario* o *Administrador*.
- **Desactivar** una cuenta: apague el interruptor **Activo**. La persona ya no podrá entrar.
- No puede quitarse a sí mismo el rol de administrador ni desactivarse.

La pantalla no tiene, por ahora, una opción para **cambiar la contraseña** de un usuario existente.
Mientras se agrega, sistemas puede hacerlo (vea el [manual de operación](04-operacion-y-despliegue.md#cambiar-la-contraseña-de-un-usuario)).

### Configuración

En **Configuración** hay siete pestañas: *Envío a SIESA*, *Pedido*, *Cliente nuevo*, *Mercado Libre*,
*Avanzado*, *Municipios* y *Conexión con SIESA*.

- Para cambiar un valor, escríbalo y pulse el botón de guardar que aparece al lado. Los interruptores
  se guardan al cambiarlos.
- Si un valor fue modificado, al lado aparece un botón para **volver al valor original** (el de
  fábrica). Los valores originales están en la [referencia de configuración](02-configuracion.md).
- La pestaña **Avanzado** tiene valores técnicos que exige SIESA: cámbielos solo con indicación del
  equipo de sistemas.
- La pestaña **Conexión con SIESA** es de solo lectura: el usuario, la clave y el ambiente se cambian
  en el servidor.

La descripción completa de cada valor está en la [referencia de configuración](02-configuracion.md).

### Municipios

Si una venta llega de una ciudad que la aplicación no reconoce, agréguela en **Configuración →
Municipios**: elija el departamento, escriba el municipio tal como lo trae Mercado Libre y su código
DANE de 3 dígitos. Desde ese momento las ventas de esa ciudad se reconocen, también las ya cargadas.
