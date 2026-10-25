# Manotas

## Estado verificado — 2026-10-26

Workers + D1 + R2: autenticación revocable, órdenes por técnico, QR por audiencia,
fotos privadas, portales de consulta, dashboard de administración e informes PDF.
La demo comercial vive en `public/demo/index.html`; `/` la sirve mediante ASSETS.
No se ha desplegado esta revisión ni provisionado infraestructura remota.

### Comprobaciones

Requiere Node.js 24 o superior.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:worker
npm audit
```

`npm test` ejecuta la suite de regresión en `tests/regression.test.ts` con SQLite
real en memoria y un bucket de prueba. Los anteriores archivos de pruebas eran
prototipos con mocks y no forman parte del comando de validación actual.
`test:worker` usa el bundle generado y workerd, D1 y R2 locales con datos sintéticos;
no conecta proveedores de notificación ni recursos Cloudflare remotos.
El build usa esbuild en WASM para evitar depender del ejecutable nativo del host.

### Arranque local

1. Ejecutar las migraciones con `npm run db:migrate:local`.
2. Crear `.dev.vars` (ignorado por Git) con `JWT_SECRET` aleatorio de al menos 32 bytes.
3. Establecer `MANOTAS_ADMIN_EMAIL` y `MANOTAS_ADMIN_PASSWORD` en el entorno local.
   La contraseña inicial debe tener al menos 12 caracteres; no hay credenciales por defecto.
4. Ejecutar `npm run admin:sql -- .wrangler/admin-bootstrap.sql` y aplicar el SQL
   a D1 local con `npx wrangler d1 execute manotas-db --local --file .wrangler/admin-bootstrap.sql`.
5. Ejecutar `npm run dev` y abrir `/login.html`; los técnicos acceden a `/taller`
   y administración a `/admin/dashboard`.

Las contraseñas Argon2id con parámetros m=19456,t=2,p=1 mantienen formato PHC.
Se usa una implementación portable para Workers, sin addons nativos de Node.
Las sesiones duran 24 horas y se comprueban contra D1 y el usuario activo.
Cerrar sesión revoca el registro servidor; los JWT anteriores sin sesión D1 dejan de ser válidos.

### QR, fotos y permisos

- Técnico: `/taller/orden/:uuid`, exige sesión y asignación (o administrador).
- Cliente: `/seguimiento/:token`; aseguradora: `/aseguradora/:token`.
- Regenerar QR de consulta rota el token e invalida enlaces anteriores, también para fotos.
- Los usuarios aseguradora se enlazan mediante `users.insurer_id`; aplicar migración 0004
  y asignar la organización correcta. No se asume que el ID de usuario sea el de aseguradora.
- Las fotos se sirven en `/api/photos/:id/content`, comprobando sesión/asignación
  o token/audiencia y visibilidad. No se publican URLs directas del bucket.
- `/api/photos/:id/signed-url` devuelve un enlace de 15 minutos ligado al ID de foto;
  además de la firma se sigue exigiendo una sesión autorizada. Los portales usan su token.
- No se crean miniaturas ficticias. El original se almacena con SHA-256 y MIME limitado.
- Los cambios de estado insertan evento y actualizan orden en un batch transaccional D1.

### PDF

- Técnico/admin: `GET /api/technician/orders/:uuid/pdf`.
- Cuenta aseguradora: `GET /api/insurer/orders/:uuid/pdf`.
- Portal aseguradora: `GET /aseguradora/:token/pdf`.

Los informes de aseguradora excluyen notas internas y fotos no autorizadas.
El PDF actual incluye metadatos de fotografías; no incorpora los binarios de imagen.

### Infraestructura y trabajo pendiente

Antes de un despliegue autorizado hay que sustituir el `database_id` de ejemplo,
configurar D1/R2 y `JWT_SECRET`, aplicar migraciones y validar límites del plan real
(en particular CPU del login Argon2id). La configuración ASSETS ya está incluida.
No se han creado cuentas, dominios ni servicios de pago.

Los proveedores WhatsApp/SMS/email están conservados como módulos opcionales,
con tipos de entorno corregidos. No se activan envíos ni webhooks: falta configurar
proveedores, consentimiento, verificación de firmas y una cola de reintentos.
Quedan pendientes el alta completa de órdenes/vehículos desde interfaz, el formulario
comercial conectado al backend y la validación visual en navegador/móvil real.

Consultar `.ai/STATE.md`, `.ai/NEXT.md` y `.ai/HANDOFF.md` para el relevo vigente.

---

## Descripción inicial

Proyecto digital de Talleres Manotas: web pública + aplicación operativa de seguimiento de reparaciones por QR.

## Objetivos
- Captación local y solicitud de valoración con fotos.
- Gestión interna móvil por orden de trabajo.
- Histórico de estados y fotografías.
- Portal cliente y aseguradora de solo lectura.

## Stack objetivo
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- Frontend responsive

## Estructura
- `.ai/`: contexto y relevo entre agentes.
- `docs/`: especificación funcional y técnica.
- `migrations/`: esquema D1.
- `src/`: API/backend.
- `public/`: frontend/demo.

## Primer arranque previsto
```bash
npm install
npm run dev
```

## Importante
Antes de trabajar, leer `AGENTS.md` y después `.ai/HANDOFF.md`, `.ai/STATE.md`, `.ai/NEXT.md`.

No hay deploy de producción autorizado ni configurado todavía.
