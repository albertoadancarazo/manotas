# DECISIONS — Manotas

## D-001 — QR por orden de trabajo
Status: ACCEPTED
Cada QR identifica una orden concreta mediante UUID/token no predecible. El vehículo conserva histórico de múltiples órdenes.

## D-002 — Histórico append-only
Status: ACCEPTED
Los cambios de estado crean eventos; no se sobrescriben eventos anteriores.

## D-003 — Fotografías privadas por defecto
Status: ACCEPTED
Toda fotografía nace como `INTERNAL_ONLY`. La visibilidad pública debe establecerse explícitamente.

## D-004 — Stack Cloudflare
Status: ACCEPTED
Workers + D1 + R2 como primera opción para minimizar coste y simplificar infraestructura.

## D-005 — Separación portal técnico / cliente / aseguradora
Status: ACCEPTED
Los permisos se validan en servidor; ocultar campos en frontend nunca se considera control de acceso.

## D-006 - Autenticación portable y revocable
Status: ACCEPTED
Argon2id sin addon nativo; JWT enlazado a sesión D1, usuario activo y rol actual.
Evita incompatibilidad del addon Node en Workers y permite revocar acceso sin esperar expiración.

## D-007 - Fotos mediante Worker privado
Status: ACCEPTED
Leer R2 por Worker con alcance de orden/audiencia y revalidación del token o sesión.
La firma temporal no sustituye el permiso vigente y no convierte el bucket en público.
