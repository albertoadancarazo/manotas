# HANDOFF — Manotas

active_agent: chatgpt
branch: chatgpt/bootstrap
base_commit: 412d7ad1ff352fdf5c020ed63fb28b14601221da
date: 2026-10-20

## Estado inmediato
- Repo inicializado con AGENTS.md en `main` por autorización explícita del usuario.
- Todo el trabajo posterior vive en `chatgpt/bootstrap`.
- `.ai/PROJECT.md`, STATE, NEXT y DECISIONS creados.
- Arquitectura objetivo: Workers + D1 + R2.
- Migración inicial: `migrations/0001_initial.sql`.
- Worker base: `src/index.ts`.
- Config Cloudflare plantilla: `wrangler.jsonc`.
- Especificación QR: `docs/QR-TRACKING-SPEC.md`.

## Decisiones clave
- QR identifica orden de trabajo, no vehículo.
- Eventos históricos no se sobrescriben.
- Fotos privadas por defecto.
- No exponer endpoints privados sin RBAC real.

## Siguiente trabajo recomendado
1. Implementar auth/RBAC.
2. Crear endpoints técnicos de órdenes/eventos/fotos.
3. Implementar subida R2 privada.
4. Construir UI móvil del técnico y lector QR.
5. Incorporar demo visual existente al repo.

## Bloqueos
- No crear D1/R2 ni desplegar sin aprobación humana.
- `database_id` sigue como placeholder.
