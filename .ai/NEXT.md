# NEXT - Manotas

## Hecho reciente
- [x] Corregir QR y portales con tokens rotables.
- [x] Servir fotos privadas reales, filtrar por audiencia y orden.
- [x] Revocar sesiones y comprobar usuarios activos en servidor.
- [x] Corregir relación usuario/aseguradora y acceso por expediente.
- [x] Integrar PDF, login y dashboard; recuperar tipos y build.
- [x] Añadir regresión SQLite y smoke workerd/D1/R2; dependencias sin avisos de auditoría.
- [x] Documentar arranque y relevo reproducibles.

## P0 - Antes de producción
- [ ] Identificar/configurar D1 y R2 reales y sustituir database_id de ejemplo.
- [ ] Configurar JWT_SECRET real y aplicar migraciones con autorización de publicación.
- [ ] Vincular usuarios aseguradora existentes a su organización mediante migración 0004.
- [ ] Crear primer administrador sin credenciales por defecto; README incluye generador SQL.
- [ ] Validar límites CPU/memoria del login Argon2id en el plan de Cloudflare elegido.
- [ ] Validar navegación, cámara/escaneo y fotos desde móvil real.
- [ ] Completar alta de órdenes/vehículos y formulario comercial conectado al backend.

## P1
- [ ] Activar proveedores de notificación solo con configuración y autorización; implementar firmas de webhook, consentimiento, cola y reintentos.
- [ ] Rate limiting de login y política de expiración/retención antes de exposición pública.
- [ ] Completar fotos embebidas y paginación de contenido largo en PDF.
- [ ] Confirmar teléfonos, horarios, servicios y aseguradoras reales.
- [ ] Automatizar CI con los comandos documentados y renovar pruebas si cambian permisos.

## P2
- [ ] Firma/autorización digital.
- [ ] Métricas de tiempos por fase.

## Bloqueos
- La revisión autorizó correcciones y subida de rama, no despliegue ni gasto.
- Sin configuración remota verificable no se declara producción operativa.
- El worktree original se conservó; sincronizarlo desde GitHub para continuar allí.
