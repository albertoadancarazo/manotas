# STATE — Manotas

## Actual
- Repo inicializado el 2026-10-20.
- Rama de trabajo: `chatgpt/bootstrap`.
- Arquitectura base en repo: Cloudflare Workers + D1 + R2.
- Módulo prioritario: seguimiento de reparaciones por QR.
- Esquema D1 inicial creado en `migrations/0001_initial.sql`.
- Worker API inicial creado en `src/index.ts`.
- Configuración Cloudflare plantilla creada en `wrangler.jsonc`.
- Especificación funcional en `docs/QR-TRACKING-SPEC.md`.

## Producto
- QR identifica una orden de trabajo, no simplemente el vehículo.
- Un vehículo puede tener múltiples órdenes históricas.
- Roles previstos: admin, técnico, cliente, aseguradora.
- Fotos con visibilidad: INTERNAL_ONLY, CLIENT_VISIBLE, INSURER_VISIBLE, CLIENT_AND_INSURER.
- Timeline de eventos append-only a nivel de aplicación.
- API pública actual: `/api/health` y `/api/public/tracking/:token`.
- Endpoints privados aún no expuestos hasta implementar autenticación/RBAC.

## Infraestructura
- No hay deploy configurado todavía.
- No hay D1/R2 creados todavía.
- `wrangler.jsonc` contiene placeholder de `database_id`.
- No hay dominio conectado todavía.
- No hay secretos en repo.

## Datos pendientes de validar antes de producción
- Teléfono principal y horarios.
- Servicios exactos y aseguradoras colaboradoras.
- Política de retención de fotos/documentación.
- Usuarios iniciales del taller.
