# Orden de implementación — apps sobre `plantilla-app`

Checklist ordenado para desarrollar una app nueva a partir de este esqueleto.
Sigue los pasos en orden: cada uno se apoya en el anterior. Los marcados como
**(ya en la plantilla)** vienen resueltos — solo se **ajustan/extienden**, no se
reescriben. Stack: React 19 + Express 5 + PostgreSQL, Docker detrás de Nginx
Proxy Manager. Todo en español y sin emojis.

---

### Paso 1 — Inicializar el proyecto desde la plantilla
Ejecutar `bash inicializar.sh`: pide el nombre de la app y la **URL de un
repositorio de GitHub NUEVO (obligatoria)**, renombra `plantilla`, crea un git
nuevo y fija el remoto. `git push -u origin main`.

### Paso 2 — Configurar entornos y verificar el esqueleto
Crear los `.env` desde los `.ejemplo` (`backend/.env`, `.env` raíz, `frontend/.env`
con `VITE_API_URL=` vacío). Levantar local (`npm run dev` en backend y frontend) o
Docker. Comprobar `/api/salud`, el login demo y el módulo `ejemplo`. **Eliminar el
módulo `ejemplo`** (ruta `rutas/ejemplo.js`, página `Inicio` y tabla `items`) una
vez entendido el patrón.

### Paso 3 — Modelar la base de datos
Definir `db/esquema.sql` con las tablas del dominio: UUIDs, FKs, índices y trigger
`actualizar_timestamp()` para `actualizado_en`. Establecer la convención de
**migraciones aditivas** numeradas en `db/migraciones/` (`ADD COLUMN IF NOT EXISTS`,
`CREATE TABLE IF NOT EXISTS`); nunca destructivas sin respaldo.

### Paso 4 — Autenticación y sesión **(ya en la plantilla)**
Ajustar registro/login/perfil (`rutas/autenticacion.js`), política de contraseñas
(`bcrypt`), expiración de JWT y, si aplica, verificación por correo/OTP y dominio
de correo permitido.

### Paso 5 — RBAC y visibilidad por rol **(base en la plantilla)**
Definir los roles del negocio. Aplicar `requiereRol(...)` en los endpoints y, donde
haya datos por dueño/área, el **filtro de alcance** (que un usuario solo vea/edite
lo que le corresponde). La autorización se valida SIEMPRE en el backend.

### Paso 6 — Auditoría base
Crear tabla de bitácora/historial y un servicio que registre acciones sensibles
(quién, qué, cuándo, antes/después). Invocarlo desde las rutas que cambian estado
o datos críticos, para trazabilidad.

### Paso 7 — Catálogos y maestros del dominio
Implementar las entidades de configuración (equivalente a "departamentos/cargos"):
CRUD en `rutas/`, validación inline con `express-validator`, y sus pantallas de
administración en el frontend. Base para el resto de módulos.

### Paso 8 — Gestión de usuarios y activación
Sobre la auth: alta de usuarios, activar/desactivar cuentas, asignar rol/área y
gestionar el perfil. Recordar la regla del PUT: **actualización parcial** (no
borrar campos no enviados).

### Paso 9 — Entidades centrales del dominio (el "core")
Modelar e implementar las entidades principales del negocio siguiendo el patrón de
la plantilla por cada dominio: `rutas/<dominio>.js` (lógica + validación) +
función en `api/indice.js` + página en `paginas/`. Respuesta siempre `{ exito }`.

### Paso 10 — Flujos y estados de negocio
Definir ciclos de vida y transiciones de estado (con sus reglas y permisos por
rol). Cada cambio relevante registra en auditoría (Paso 6).

### Paso 11 — Reglas de negocio y cálculos
Implementar validaciones avanzadas y lógica calculada del dominio (plazos, puntajes,
SLA, montos, etc.) en `servicios/`, reutilizable y con pruebas manuales de los casos
límite.

### Paso 12 — Notificaciones
Correo transaccional y/o notificaciones in-app según el negocio (servicio dedicado;
los fallos de correo no deben bloquear la respuesta principal).

### Paso 13 — Archivos y adjuntos (si aplica)
Almacenar en un **volumen** servido por Nginx (con control de acceso en el backend)
o en **MinIO** (S3 compatible) si se requiere almacenamiento tipo objeto; registrar
metadatos en la BD.

### Paso 14 — Panel operativo, métricas y reportes
Dashboard con indicadores, listados con filtros/paginación y exportación (CSV).
Restringir por rol lo que cada perfil puede ver.

### Paso 15 — Pulido de la UI
Tema de Mantine (`tema.js`), layout (`AppShell`), navegación por rol, responsividad,
estados de carga y vacío, y avisos con `@mantine/notifications`. Iconos con
`lucide-react`; sin emojis.

### Paso 16 — Pruebas end-to-end y revisión
Recorrer el flujo completo (registro → login → operación → reportes) en un entorno
de staging con su propia BD. Revisar seguridad: autorización por rol en cada
endpoint, consultas parametrizadas, y que ningún dato sensible se filtre.

### Paso 17 — Despliegue a producción
`git pull` en el servidor → `docker compose build && docker compose up -d`. Crear el
Proxy Host en Nginx Proxy Manager (dominio → contenedor `<app>_frontend:80`). Correr
la migración **aditiva** en la BD de producción. Verificar salud, logs y el flujo en
el navegador.

---

## Checklist rápido de "listo para producción"

- [ ] Inicializado con `inicializar.sh` y su propio repositorio de GitHub.
- [ ] `.env` fuera de git; `.env.ejemplo` completos.
- [ ] Módulo `ejemplo` eliminado; esquema del dominio definido.
- [ ] RBAC y filtros de alcance aplicados en el backend.
- [ ] Auditoría registrando acciones sensibles.
- [ ] PUT de usuarios con actualización parcial.
- [ ] BD en contenedor propio con volumen y healthcheck; migraciones aditivas.
- [ ] Frontend llama a `/api` (relativo); DB no expuesta al host.
- [ ] Pruebas end-to-end en staging superadas.
- [ ] Proxy Host en NPM y despliegue por `git pull` documentado en el README.
- [ ] Español y sin emojis en todo el proyecto.
