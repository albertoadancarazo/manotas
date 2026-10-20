# NEXT — Manotas

## P0
- [ ] Añadir demo comercial actual al repo como referencia visual.
- [x] Crear modelo D1 y migración inicial.
- [~] Implementar API base: pública creada; faltan privadas con RBAC.
- [ ] Implementar flujo técnico móvil `/taller/orden/:uuid`.
- [ ] Implementar generación/lectura QR.
- [ ] Implementar subida R2 con control de visibilidad.
- [ ] Implementar autenticación y RBAC antes de exponer endpoints privados.

## P1
- [ ] Dashboard recepción/administración.
- [ ] Portal cliente mediante token revocable.
- [ ] Portal aseguradora limitado a expediente.
- [ ] Timeline público vs interno.
- [ ] Datos demo y pruebas de permisos.
- [ ] Tests de aislamiento entre expedientes/tokens.

## P2
- [ ] Notificaciones WhatsApp/SMS/email.
- [ ] Exportación PDF para aseguradora.
- [ ] Firma/autorización digital.
- [ ] Métricas operativas y tiempos por fase.

## Bloqueos
- Crear D1/R2 reales y deploy requiere configuración Cloudflare y aprobación humana para publicar.
- `wrangler.jsonc` necesita `database_id` real.
- Falta confirmar datos comerciales reales antes de producción.
