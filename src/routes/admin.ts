import { verifySession } from "../auth";
import { queries } from "../db/queries";
import { json } from "../utils/response";
import type { Env } from "../index";

async function requireAdminAuth(request: Request, env: Env): Promise<{ userId: string; role: string } | Response> {
  const session = await verifySession(env, request);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (session.role !== "ADMIN") {
    return json({ error: "forbidden" }, 403);
  }
  return session;
}

export const adminRoutes = {
  async getUsers(_request: Request, env: Env) {
    const auth = await requireAdminAuth(_request, env);
    if (auth instanceof Response) return auth;
    const users = await env.DB.prepare("SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC").all();
    return json(users.results);
  },

  async getAllOrders(_request: Request, env: Env) {
    const auth = await requireAdminAuth(_request, env);
    if (auth instanceof Response) return auth;
    const url = new URL(_request.url);
    const status = url.searchParams.get("status") || undefined;
    let sql = `SELECT wo.*, v.plate, v.make, v.model FROM work_orders wo JOIN vehicles v ON v.id = wo.vehicle_id WHERE wo.active = 1`;
    const args: any[] = [];
    if (status) {
      sql += ` AND wo.current_status = ?`;
      args.push(status);
    }
    sql += ` ORDER BY wo.entry_date DESC`;
    const orders = await env.DB.prepare(sql).bind(...args).all();
    return json(orders.results);
  },

  async getStats(_request: Request, env: Env) {
    const auth = await requireAdminAuth(_request, env);
    if (auth instanceof Response) return auth;
    const [totalOrders, activeOrders, byStatus, totalUsers] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) as count FROM work_orders WHERE active = 1").first(),
      env.DB.prepare("SELECT COUNT(*) as count FROM work_orders WHERE active = 1 AND current_status NOT IN ('ENTREGADO','BLOQUEADO')").first(),
      env.DB.prepare("SELECT current_status, COUNT(*) as count FROM work_orders WHERE active = 1 GROUP BY current_status").all(),
      env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE active = 1").first()
    ]);
    return json({
      totalOrders: totalOrders?.count || 0,
      activeOrders: activeOrders?.count || 0,
      byStatus: byStatus.results,
      totalUsers: totalUsers?.count || 0
    });
  }
};