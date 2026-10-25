export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  JWT_SECRET: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const notFound = () => json({ error: 'not_found' }, 404);

async function getPublicOrder(env: Env, token: string) {
  return env.DB.prepare(`
    SELECT wo.id, wo.reference, wo.current_status, wo.entry_date,
           wo.estimated_delivery_date, v.plate, v.make, v.model
    FROM work_orders wo
    JOIN vehicles v ON v.id = wo.vehicle_id
    WHERE wo.public_token = ? AND wo.active = 1
  `).bind(token).first();
}

async function getPublicTimeline(env: Env, workOrderId: string) {
  return env.DB.prepare(`
    SELECT new_status, note_public, created_at
    FROM work_order_events
    WHERE work_order_id = ? AND note_public IS NOT NULL
    ORDER BY created_at ASC
  `).bind(workOrderId).all();
}

async function getPublicPhotos(env: Env, workOrderId: string) {
  return env.DB.prepare(`
    SELECT id, category, uploaded_at
    FROM photos
    WHERE work_order_id = ?
      AND visibility IN ('CLIENT_VISIBLE','CLIENT_AND_INSURER')
    ORDER BY uploaded_at ASC
  `).bind(workOrderId).all();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'manotas', version: '0.1.0' });
    }

    const publicMatch = url.pathname.match(/^\/api\/public\/tracking\/([^/]+)$/);
    if (request.method === 'GET' && publicMatch) {
      const order = await getPublicOrder(env, publicMatch[1]);
      if (!order) return notFound();
      const [timeline, photos] = await Promise.all([
        getPublicTimeline(env, String(order.id)),
        getPublicPhotos(env, String(order.id)),
      ]);
      return json({
        order: {
          reference: order.reference,
          status: order.current_status,
          entryDate: order.entry_date,
          estimatedDeliveryDate: order.estimated_delivery_date,
          vehicle: {
            plate: order.plate,
            make: order.make,
            model: order.model,
          },
        },
        timeline: timeline.results,
        photos: photos.results,
      });
    }

    // Private technician/admin and insurer endpoints are intentionally not exposed
    // until authentication/RBAC middleware is implemented.
    return notFound();
  },
};
