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
