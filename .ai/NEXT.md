# NEXT - Manotas

## Hecho reciente
- [x] Reproducir fallo techs.results y guardar corrección del listado en GitHub (aún no desplegada).
- [x] Publicar hero y fotos de servicios; retirar placeholders y verificar imágenes remotas.
- [x] Corregir QR, fotos privadas, alcance por orden, sesiones revocables y PDF.
- [x] Desplegar manotas-pruebas en workers.dev por autorización del usuario.
- [x] Crear D1 de pruebas y aplicar migraciones 0001 a 0005.
- [x] Configurar JWT y datos sintéticos con tres roles y OT-DEMO-001.
- [x] Probar HTTPS real: logins, dashboard, estados, QR, fotos, PDF y logout.
- [x] 11 regresiones, tipos, build y runtime local pasan.

## P0 - Antes de producción
- [ ] Recuperar ejecución de Work y desplegar corrección de órdenes 40dfb1d; validar filas y filtros reales.
- [ ] Validación visual y cámara/escaneo desde móvil real por el usuario.
- [ ] Completar alta de órdenes/vehículos y formulario comercial conectado.
- [ ] Activar/configurar R2 con autorización si se decide pasar a producción.
- [ ] Separar/provisionar D1 y usuarios definitivos; sustituir configuración de producción de ejemplo.
- [ ] Definir retención/borrado de fotos y datos, y rate limiting de login.
- [ ] Confirmar datos comerciales y completar revisión de permisos con usuarios definitivos.

## P1
- [ ] Integrar notificaciones con consentimiento, firmas de webhook, cola y reintentos.
- [ ] Fotos embebidas y paginación de contenido largo en PDF.
- [ ] Automatizar CI con los comandos documentados.

## P2
- [ ] Firma/autorización digital y métricas por fase.

## Límites de pruebas
- Fotos en D1 con máximo 2 MB por imagen; no se activó R2 ni facturación.
- Datos sintéticos; no se conectaron dominios, mensajería ni pagos.
- Accesos en .wrangler/test-access.json fuera de Git, nunca copiarlos al relevo.
- Worktree original de OpenCode conservado; revisar historia antes de sincronizarlo.
