# STATE — Manotas

## Actual
- Repo inicializado el 2026-10-20.
- Rama de trabajo: `chatgpt/bootstrap`.
- Existe demo comercial previa fuera del repo con web pública, dashboard de propuesta y carrusel antes/después.
- Arquitectura objetivo: Cloudflare Workers + D1 + R2.
- Módulo prioritario definido: seguimiento de reparaciones por QR.

## Producto
- QR identifica una orden de trabajo, no simplemente el vehículo.
- Un vehículo puede tener múltiples órdenes históricas.
- Roles previstos: admin, técnico, cliente, aseguradora.
- Fotos con visibilidad: INTERNAL_ONLY, CLIENT_VISIBLE, INSURER_VISIBLE, CLIENT_AND_INSURER.
- Timeline de eventos append-only a nivel de aplicación.

## Infraestructura
- No hay deploy configurado todavía.
- No hay D1/R2 creados todavía.
- No hay dominio conectado todavía.
- No hay secretos en repo.

## Datos pendientes de validar antes de producción
- Teléfono principal y horarios.
- Servicios exactos y aseguradoras colaboradoras.
- Política de retención de fotos/documentación.
- Usuarios iniciales del taller.
