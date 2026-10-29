# STATE - Manotas

## Código actual
- Rama: chatgpt/bootstrap; corrección visual de la demo en 6d7ae3e.
- Stack: Workers + D1 + R2; demo comercial en public/demo/index.html.
- Autenticación Argon2id portable, cookies HttpOnly/Secure, JWT con sesión D1 de 24 horas.
- Logout revoca sesión; usuarios inactivos y cambios de rol se consultan en servidor.
- Usuarios aseguradora enlazados por users.insurer_id (migración 0004).
- Lectura/mutación de órdenes y fotos exige asignación o rol ADMIN.
- Generación QR SVG sin canvas; rutas de consulta usan token y regeneración lo rota.
- Fotos privadas servidas por Worker según orden, audiencia y visibilidad.
- URLs firmadas de 15 minutos siguen exigiendo sesión autorizada.
- Fotos nuevas INTERNAL_ONLY por defecto; SHA-256 guardado; sin miniaturas ficticias.
- Eventos y cambio de estado se guardan en batch transaccional D1.
- Portales muestran estados históricos y fotos autorizadas sin notas internas.
- Escape HTML en portales, móvil y dashboard; rechazo de Origin ajeno en mutaciones.
- Dashboard de administración, creación de usuarios, login y listado técnico presentes.
- PDF por técnico/admin, cuenta aseguradora o token; filtro de notas y fotos por audiencia.
- El PDF incluye metadatos de fotos, no sus binarios.

## Infraestructura
- Pruebas: https://manotas-pruebas.alberto-adan-carazo.workers.dev
- Worker manotas-pruebas, configuración wrangler.test.jsonc, D1 manotas-test-db.
- Migraciones 0001 a 0005 aplicadas y datos sintéticos OT-DEMO-001 inicializados.
- JWT_SECRET configurado como secreto; tres cuentas de pruebas activas.
- Credenciales/enlaces de consulta fuera de Git en .wrangler/test-access.json.
- Sesión CLI del despliegue en .wrangler/auth-config, fuera de Git.
- R2 no está activado en la cuenta; no se modificó facturación.
- Fotos de pruebas almacenadas en D1, explícitamente PHOTO_STORAGE=d1-test; máximo 2 MB.
- El modo producción sigue usando R2; wrangler.jsonc conserva database_id de ejemplo.
- Demo: hero original y cuatro imágenes de servicios locales, sin SVG de relleno.
- Fotografías ilustrativas con fuentes en docs/DEMO-IMAGE-SOURCES.md.
- Imágenes verificadas por HTTPS (200, MIME y bytes); acceso técnico del hero apunta al login real.
- ASSETS sirve demo y login; noindex en todas las respuestas de pruebas.
- Versión Cloudflare: d866e214-e0d0-4e95-9214-283a08c22e49.
- Proveedores de notificación conservados pero sin envíos activados.

## Validación actual
- npm run typecheck: pasa.
- npm test: 11 pruebas de regresión pasan, SQLite real en memoria y bucket de prueba.
- npm run build: bundle ESM browser/worker generado con esbuild WASM.
- npm run test:worker: workerd/D1/R2 locales, migraciones, login, QR y fotos pasan.
- npm audit: cero vulnerabilidades; undici fijado a 7.30.1 por override.
- Node requerido: 24 o superior.
- Los antiguos tests con mocks no son la suite activa; README lo distingue.
- HTTPS remoto: tres logins, dashboard, técnico, aseguradora/PDF, eventos, QR, fotos y logout pasan.
- No realizada revisión visual en navegador/móvil real; el login funciona en la cuenta desplegada.

## Límites de producto
- Pendiente alta integral de órdenes/vehículos desde interfaz y captación comercial conectada.
- Pendiente activación segura de notificaciones y validación de datos comerciales/retención.
