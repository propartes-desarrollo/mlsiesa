# Manual de mlsiesa (Mercado Libre → SIESA)

Documentación completa de la aplicación que convierte las ventas de Mercado Libre en pedidos de SIESA.

| Documento | Para quién | Qué encuentra |
|---|---|---|
| [1. Manual de usuario](01-manual-de-usuario.md) | Equipo de comercio electrónico y administradores | Recorrido guiado de Excel a pedido, tareas frecuentes, estados, qué significa cada mensaje y qué hacer, administración de usuarios. |
| [2. Referencia de configuración](02-configuracion.md) | Administradores | Cada valor de la pantalla Configuración: qué controla, valor original, códigos de SIESA y dónde actúa en el código. |
| [3. Manual de edición del código](03-manual-de-edicion.md) | Quien vaya a modificar la aplicación | Mapa de archivos, recorrido de una venta por el código y catálogo "si quiere cambiar X, vaya a este archivo y esta línea". |
| [4. Operación y despliegue](04-operacion-y-despliegue.md) | Sistemas | Instalación, paso a producción, migraciones, consultas de TI, contraseñas, respaldos y solución de problemas. |

## Por dónde empezar

- **Va a usar la aplicación por primera vez:** [Manual de usuario, sección 3](01-manual-de-usuario.md#3-primer-uso-de-excel-a-pedido-en-siesa-recorrido-guiado).
- **Una venta muestra un mensaje que no entiende:** [Manual de usuario, sección 6](01-manual-de-usuario.md#6-mensajes-y-qué-hacer).
- **Quiere cambiar una bodega, un código o un correo:** [Referencia de configuración](02-configuracion.md). No requiere tocar código.
- **Quiere cambiar una regla o un texto de la aplicación:** [Manual de edición, índice de cambios](03-manual-de-edicion.md#4-textos-nombres-y-apariencia-de-las-pantallas).
- **Va a instalar o pasar a producción:** [Operación y despliegue](04-operacion-y-despliegue.md).

## Sobre las referencias a líneas de código

Los números de línea corresponden a la versión **1.0.0** con sus ajustes posteriores. Cada referencia
incluye además un **texto de búsqueda**: si el archivo cambió y la línea se movió, busque ese texto.
Al modificar el código, actualice el manual en la misma entrega.
