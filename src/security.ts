import { verifySession } from './auth';
import type { Env } from './index';
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function orderAccess(request: Request, env: Env, id: string, byId = false) {
  const session = await verifySession(env, request);
  if (!session) return new Response('Unauthorized', { status: 401 });
  const order = await env.DB.prepare(`SELECT * FROM work_orders WHERE ${byId ? 'id' : 'uuid'} = ? AND active = 1`).bind(id).first();
  if (!order) return new Response('Not found', { status: 404 });
  if (session.role === 'ADMIN') return order;
  if (session.role === 'TECHNICIAN' && order.assigned_technician === session.userId) return order;
  if (session.role === 'INSURER') {
    const user = await env.DB.prepare('SELECT insurer_id FROM users WHERE id = ? AND active = 1').bind(session.userId).first();
    if (user?.insurer_id && user.insurer_id === order.insurer_id) return order;
  }
  return new Response('Forbidden', { status: 403 });
}
