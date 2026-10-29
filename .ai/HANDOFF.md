# HANDOFF - Manotas

active_agent: none
branch: chatgpt/bootstrap
base_commit: 40dfb1de8b157f5434a4e2393b97433612148939
date: 2026-10-29

## Corrección preparada, pendiente de desplegar
- El listado de órdenes abortaba por techs.results.filter; la API devuelve un array.
- Corregido en GitHub, con referencias enlazadas a /taller/orden/:uuid.
- Búsqueda tolera marca/modelo nulos; tabla muestra errores y estados vacíos.
- Retirada petición redundante status=all y corregido cierre HTML del dashboard.
- Prueba JavaScript simulada: carga, enlace, búsqueda, nulos y estado vacío pasan.
- NO se ha desplegado esta corrección: ejecución local de Work bloqueada.
- Error: sandbox provisioning failed / helper_sandbox_lock_failed / Acceso denegado.
- Recuperar Work, revisar cambios locales, sincronizar rama y ejecutar deploy:test.
- En local se instaló linkedom para reproducir el error; cambios de package/lock no subidos.
- No se ha implementado aún renderizado inicial de órdenes en servidor.

## Entorno publicado
- URL: https://manotas-pruebas.alberto-adan-carazo.workers.dev
- Versión: d866e214-e0d0-4e95-9214-283a08c22e49 (anterior a corrección de órdenes).
- Config: wrangler.test.jsonc; D1 manotas-test-db con migraciones 0001 a 0005.
- Fotos D1 solo pruebas, máximo 2 MB; producción conserva R2.
- Hero y cuatro imágenes públicas locales cargan por HTTPS.
- Orden sintética OT-DEMO-001 sigue en D1; tres roles de prueba.
- Accesos y sesión CLI en .wrangler/, nunca copiarlos a Git ni al relevo.
- Alternativa ya publicada para ver órdenes: /taller con sesión admin/técnico.

## Continuar
- Desplegar corrección y verificar filas visibles y filtros en dashboard/listado.
- Mantener datos existentes; no repetir seed SQL.
- Worktree original OpenCode conservado; no asumir sincronía por nombre de rama.
