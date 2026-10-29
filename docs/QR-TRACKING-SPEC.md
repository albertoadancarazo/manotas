# Especificación — Seguimiento de reparaciones por QR

## Flujo técnico
1. Técnico inicia sesión.
2. Escanea QR de la orden.
3. Abre `/taller/orden/{uuid}`.
4. Ve vehículo, matrícula, estado actual e incidencias.
5. Avanza estado, añade comentario y fotos.
6. El backend crea evento histórico y guarda fotos en R2.

## Estados
`RECEPCIONADO`, `PENDIENTE_PERITACION`, `PERITACION_REALIZADA`, `PENDIENTE_AUTORIZACION`, `AUTORIZADO`, `PENDIENTE_PIEZAS`, `EN_DESMONTAJE`, `CHAPA`, `PREPARACION_PINTURA`, `PINTURA`, `MONTAJE`, `MECANICA`, `CONTROL_CALIDAD`, `LIMPIEZA`, `LISTO_PARA_ENTREGA`, `ENTREGADO`.

Excepciones: `BLOQUEADO`, `ESPERA_CLIENTE`, `ESPERA_ASEGURADORA`, `ESPERA_RECAMBIO`, `RETRABAJO`.

## Fotos
Visibilidad: `INTERNAL_ONLY`, `CLIENT_VISIBLE`, `INSURER_VISIBLE`, `CLIENT_AND_INSURER`.

Toda foto se crea como `INTERNAL_ONLY` y guarda: orden, evento, técnico, categoría, clave R2, miniatura, visibilidad y timestamp.

## Cliente
Ruta conceptual: `/seguimiento/{public_token}`.
Solo lectura. Estado, hitos públicos, fecha estimada, mensaje público y fotos autorizadas.

## Aseguradora
Ruta conceptual: `/aseguradora/{insurer_token}` o cuenta autenticada.
Solo expediente asignado y fotos/documentos autorizados.

## Seguridad
- UUID/token aleatorios no secuenciales.
- RBAC en backend.
- Tokens revocables.
- Objetos R2 privados; acceso mediante endpoint autorizado o URL firmada temporal.
- MIME/tamaño de uploads validados.
- Audit log para acciones internas relevantes.
- QR sin datos personales.

## UX técnico
Objetivo: menos de 10 segundos desde escaneo hasta actualización. Botón principal de siguiente estado, cámara directa, incidencias y timeline secundario. Touch targets >= 44 px.

## Métricas
Tiempo por fase, trabajos retrasados, fecha prometida vs real, incidencias activas, número de llamadas evitables, reseñas generadas y carga por técnico.
