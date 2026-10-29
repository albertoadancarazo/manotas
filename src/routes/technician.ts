import { orderAccess, escapeHtml } from '../security';
import { verifySession } from "../auth";
import { queries } from "../db/queries";
import { json } from "../utils/response";
import type { Env } from "../index";

async function requireTechnicianAuth(request: Request, env: Env): Promise<{ userId: string; role: string } | Response> {
  const session = await verifySession(env, request);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!["TECHNICIAN", "ADMIN"].includes(session.role)) {
    return json({ error: "forbidden" }, 403);
  }
  return session;
}

export const technicianRoutes = {
  async getOrders(request: Request, env: Env) {
    const auth = await requireTechnicianAuth(request, env);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const orders = await queries.getTechnicianOrders(env.DB, auth.userId, status ? { status } : undefined);
    return json(orders.results);
  },

  async getOrder(request: Request, env: Env, uuid: string) {
    const access = await orderAccess(request, env, uuid);
    if (access instanceof Response) return access;
    const auth = await requireTechnicianAuth(request, env);
    if (auth instanceof Response) return auth;
    const order = await queries.getOrderWithDetails(env.DB, uuid);
    if (!order) return json({ error: "not_found" }, 404);
    return json(order);
  },

  async createEvent(request: Request, env: Env, uuid: string) {
    const access = await orderAccess(request, env, uuid);
    if (access instanceof Response) return access;
    const auth = await requireTechnicianAuth(request, env);
    if (auth instanceof Response) return auth;
    const body = await request.json() as { newStatus: string; noteInternal?: string; notePublic?: string };
    if (!['RECEPCIONADO','PENDIENTE_PERITACION','PERITACION_REALIZADA','PENDIENTE_AUTORIZACION','AUTORIZADO','PENDIENTE_PIEZAS','EN_DESMONTAJE','CHAPA','PREPARACION_PINTURA','MECANICA','LIMPIEZA','PINTURA','MONTAJE','CONTROL_CALIDAD','LISTO_PARA_ENTREGA','ENTREGADO','BLOQUEADO','ESPERA_CLIENTE','ESPERA_ASEGURADORA','ESPERA_RECAMBIO','RETRABAJO'].includes(body.newStatus)) return json({ error: 'invalid_status' }, 400);
    const result = await queries.createEvent(env.DB, {
      workOrderUuid: uuid,
      newStatus: body.newStatus,
      technicianId: auth.userId,
      noteInternal: body.noteInternal,
      notePublic: body.notePublic
    });
    if (!result) return json({ error: "not_found" }, 404);
    return json({ eventId: result.eventId }, 201);
  },

  async updateOrder(request: Request, env: Env, uuid: string) {
    const access = await orderAccess(request, env, uuid);
    if (access instanceof Response) return access;
    const auth = await requireTechnicianAuth(request, env);
    if (auth instanceof Response) return auth;
    const body = await request.json() as { estimated_delivery_date?: string; assigned_technician?: string };
    if (body.assigned_technician && auth.role !== 'ADMIN') return json({ error: 'forbidden' }, 403);
    const ok = await queries.updateOrder(env.DB, uuid, body);
    if (!ok) return json({ error: "not_found" }, 404);
    return json({ ok: true });
  }
};