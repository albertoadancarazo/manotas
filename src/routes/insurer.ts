import { verifySession } from "../auth";
import { json } from "../utils/response";
import type { Env } from "../index";

async function requireInsurerAuth(request: Request, env: Env): Promise<{ userId: string; role: string } | Response> {
  const session = await verifySession(env, request);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (session.role !== "INSURER") {
    return json({ error: "forbidden" }, 403);
  }
  return session;
}

export const insurerRoutes = {
  async getAssignedOrders(request: Request, env: Env) {
    const auth = await requireInsurerAuth(request, env);
    if (auth instanceof Response) return auth;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    let sql = `SELECT wo.uuid, wo.reference, wo.current_status, wo.entry_date, wo.estimated_delivery_date, v.plate, v.make, v.model FROM work_orders wo JOIN vehicles v ON v.id = wo.vehicle_id WHERE wo.insurer_id = (SELECT insurer_id FROM users WHERE id = ? AND active = 1) AND wo.active = 1`;
    const args: any[] = [auth.userId];
    if (status) {
      sql += ` AND wo.current_status = ?`;
      args.push(status);
    }
    sql += ` ORDER BY wo.entry_date DESC`;
    const orders = await env.DB.prepare(sql).bind(...args).all();
    return json(orders.results);
  },

  async getOrderDetails(request: Request, env: Env, uuid: string) {
    const auth = await requireInsurerAuth(request, env);
    if (auth instanceof Response) return auth;
    const order = await env.DB.prepare(`
      SELECT wo.id, wo.uuid, wo.reference, wo.current_status, wo.entry_date, wo.estimated_delivery_date, wo.claim_number, v.plate, v.make, v.model, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON v.id = wo.vehicle_id
      WHERE wo.uuid = ? AND wo.insurer_id = (SELECT insurer_id FROM users WHERE id = ? AND active = 1) AND wo.active = 1
    `).bind(uuid, auth.userId).first();
    if (!order) return json({ error: "not_found" }, 404);
    const [events, photos] = await Promise.all([
      env.DB.prepare(`
        SELECT new_status, note_public, created_at
        FROM work_order_events
        WHERE work_order_id = ?
        ORDER BY created_at ASC
      `).bind(order.id).all(),
      env.DB.prepare(`
        SELECT id, category, uploaded_at, thumbnail_key
        FROM photos
        WHERE work_order_id = ? AND visibility IN ('INSURER_VISIBLE','CLIENT_AND_INSURER')
        ORDER BY uploaded_at ASC
      `).bind(order.id).all()
    ]);
    return json({ order, timeline: events.results, photos: photos.results });
  }
};
