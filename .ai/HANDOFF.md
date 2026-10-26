# HANDOFF - Manotas

active_agent: none
branch: chatgpt/bootstrap
base_commit: ef080ffd849b8515da38148e3e5e6927dce70563
date: 2026-10-26

## Despliegue autorizado y operativo
- URL: https://manotas-pruebas.alberto-adan-carazo.workers.dev
- Worker: manotas-pruebas. Config: wrangler.test.jsonc.
- D1: manotas-test-db; migraciones 0001 a 0005 aplicadas.
- R2 no activado en la cuenta; no se activó facturación.
- Fotos privadas provisionales en D1 (solo PHOTO_STORAGE=d1-test), máximo 2 MB.
- Producción mantiene adaptador R2 y su configuración independiente.
- JWT_SECRET configurado; usuarios sintéticos admin/técnico/aseguradora y OT-DEMO-001.
- Credenciales y enlaces tokenizados solo en .wrangler/test-access.json, fuera de Git.
- Versión desplegada: 557a3ae8-0ac7-4243-b8ce-7427e7e9a562.

## Verificación
- 11 regresiones pasan; tipos y build pasan.
- Workerd/D1 local con adaptador de fotos de pruebas pasa.
- HTTPS real: 3 logins, dashboard, técnico, aseguradora/PDF, estados, QR, fotos y logout pasan.
- Noindex configurado para el entorno de pruebas.
- No hay notificaciones ni cobros conectados.

## Continuar
- README explica despliegue reproducible y límites; NEXT contiene lo pendiente para producción.
- scripts/cloudflare.mjs utiliza esbuild portable y sesión local ignorada por Git.
- El worktree original de OpenCode sigue intacto y conserva hashes anteriores a la subida API.
- La copia de reparación sigue la rama remota; conservar el historial original antes de sincronizar otros worktrees.
