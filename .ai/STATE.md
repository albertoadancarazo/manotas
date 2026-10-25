# STATE - Manotas

## Código actual
- Rama: chatgpt/bootstrap; corrección consolidada en 143a0e5.
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
- ASSETS configurado para public; / sirve la demo.
- database_id sigue siendo ejemplo; no se ha provisionado ni comprobado infraestructura remota.
- No se han ejecutado despliegues ni migraciones remotas en esta revisión.
- JWT_SECRET y proveedores se configuran fuera del repo; no hay credenciales de prueba por defecto.
- Notificaciones: módulos opcionales conservados y tipos corregidos; no activados en rutas/eventos.

## Validación actual
- npm run typecheck: pasa.
- npm test: 10 pruebas de regresión pasan, SQLite real en memoria y bucket de prueba.
- npm run build: bundle ESM browser/worker generado con esbuild WASM.
- npm run test:worker: workerd/D1/R2 locales, migraciones, login, QR y fotos pasan.
- npm audit: cero vulnerabilidades; undici fijado a 7.30.1 por override.
- Node requerido: 24 o superior.
- Los antiguos tests con mocks no son la suite activa; README lo distingue.
- No realizada revisión visual en navegador/móvil ni validación del plan Cloudflare real.

## Límites de producto
- Pendiente alta integral de órdenes/vehículos desde interfaz y captación comercial conectada.
- Pendiente activación segura de notificaciones y validación de datos comerciales/retención.
