# Manotas

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
