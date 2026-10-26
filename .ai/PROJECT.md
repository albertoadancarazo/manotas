---
project: manotas
repo: albertoadancarazo/manotas
base_branch: main
active_stack: cloudflare-workers-d1-r2
skills: [architecture, frontend, seo, cro, qa, documentation]
---
# PROJECT — Manotas

## Propósito
Nueva presencia digital de Talleres Manotas y aplicación operativa de seguimiento de reparaciones por QR.

## Alcance estable
- Web pública responsive orientada a SEO local y captación.
- Solicitud de valoración con fotografías.
- App interna móvil para técnicos mediante QR por orden de trabajo.
- Histórico inmutable de estados y fotografías.
- Portal cliente solo lectura.
- Portal aseguradora solo lectura y limitado por expediente.
- Dashboard de recepción/administración.

## Stack objetivo
- Cloudflare Workers para API/backend.
- Cloudflare D1 para datos relacionales.
- Cloudflare R2 para fotografías/documentos.
- Frontend web responsive sin dependencia de SaaS de pago innecesaria.
- QR con UUID/token no predecible.

## Seguridad
- RBAC server-side.
- Fotos privadas mediante URLs firmadas/temporales.
- Tokens revocables para cliente y aseguradora.
- Nunca exponer IDs incrementales ni datos personales en QR.
- Secrets fuera del repo.

## Diseño
Industrial editorial: grafito, marfil, naranja señalización; titulares condensados; UI técnica robusta, no SaaS genérica.

## Protected
Hereda `ai-hub/AGENTS.md`: merge, deploy, push a main, borrados, migraciones destructivas, gasto, dominios y secretos requieren aprobación humana.

## Definition of Done MVP
1. Técnico escanea QR real y abre orden correcta en móvil.
2. Puede avanzar estado y subir fotos.
3. Eventos y fotos quedan históricos.
4. Cliente ve solo información pública autorizada.
5. Aseguradora ve solo expediente/fotos autorizadas.
6. Fotos privadas no son públicas por URL directa.
7. Dashboard permite filtrar órdenes activas.
8. Build y migraciones documentados.

## Entorno de pruebas
URL: https://manotas-pruebas.alberto-adan-carazo.workers.dev
Config: wrangler.test.jsonc. D1: manotas-test-db. Fotos D1 solo pruebas; R2 para producción.
