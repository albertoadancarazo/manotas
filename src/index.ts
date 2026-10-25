import { verifySession } from './auth';
import { authRoutes } from './routes/auth';
import { qrRoutes } from './routes/qr';
const { technicianRoutes } = await import('./routes/technician');
const { adminRoutes } = await import('./routes/admin');
const { adminDashboardRoutes } = await import('./routes/admin-dashboard');
const { insurerRoutes } = await import('./routes/insurer');
const { uploadRoutes } = await import('./routes/upload');
const { mobileRoutes } = await import('./routes/mobile');
import { json } from './utils/response';
const { queries } = await import('./db/queries');

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  JWT_SECRET: string;
  ASSETS: Fetcher;
}

const notFound = () => json({ error: 'not_found' }, 404);

async function serveStatic(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  let pathname = url.pathname;
  
  if (pathname === '/') pathname = '/index.html';
  if (pathname.startsWith('/demo/')) {
    const assetPath = pathname.replace('/demo/', '/');
    try {
      const assetRequest = new Request(new URL(assetPath, request.url), request);
      const response = await env.ASSETS.fetch(assetRequest);
      if (response.status !== 404) return response;
    } catch {}
  }
  if (pathname.startsWith('/public/')) {
    const assetPath = pathname.replace('/public/', '/');
    try {
      const assetRequest = new Request(new URL(assetPath, request.url), request);
      const response = await env.ASSETS.fetch(assetRequest);
      if (response.status !== 404) return response;
    } catch {}
  }
  return null;
}

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

async function requireTechnicianAuth(request: Request, env: Env) {
  const session = await verifySession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (!['TECHNICIAN', 'ADMIN'].includes(session.role)) {
    return json({ error: 'forbidden' }, 403);
  }
  return session;
}

async function requireAdminAuth(request: Request, env: Env) {
  const session = await verifySession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (session.role !== 'ADMIN') return json({ error: 'forbidden' }, 403);
  return session;
}

async function requireInsurerAuth(request: Request, env: Env) {
  const session = await verifySession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (session.role !== 'INSURER') return json({ error: 'forbidden' }, 403);
  return session;
}

async function requireTechAdminAuth(request: Request, env: Env) {
  const session = await verifySession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (!['TECHNICIAN', 'ADMIN'].includes(session.role)) {
    return json({ error: 'forbidden' }, 403);
  }
  return session;
}

export async function customerPortal(request: Request, env: Env, token: string) {
  const order = await getPublicOrder(env, token);
  if (!order) return new Response('Orden no encontrada', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' }});
  const [timeline, photos] = await Promise.all([
    getPublicTimeline(env, String(order.id)),
    getPublicPhotos(env, String(order.id)),
  ]);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Seguimiento ${order.reference}</title><style>body{font-family:system-ui;padding:20px;max-width:600px;margin:0 auto}.card{background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0}h1{color:#1a1a1a}</style></head><body><h1>${order.reference}</h1><div class="card"><strong>Estado:</strong> ${order.current_status}</div><div class="card"><strong>Vehículo:</strong> ${order.plate} ${order.make} ${order.model}</div><div class="card"><strong>Entrada:</strong> ${order.entry_date}</div><div class="card"><strong>Entrega est.:</strong> ${order.estimated_delivery_date || '—'}</div><h2>Timeline</h2>${timeline.results.map(t => `<div class="card"><strong>${new Date(String(t.created_at)).toLocaleString('es-ES')}</strong><br>${t.new_status}${t.note_public ? ': ' + t.note_public : ''}</div>`).join('')}<h2>Fotos</h2>${photos.results.map(p => `<div class="card">${p.category} - ${new Date(String(p.uploaded_at)).toLocaleString('es-ES')}</div>`).join('')}</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' }});
}

export async function insurerPortal(request: Request, env: Env, token: string) {
  const order = await env.DB.prepare(`
    SELECT wo.*, v.plate, v.make, v.model FROM work_orders wo
    JOIN vehicles v ON v.id = wo.vehicle_id
    WHERE wo.insurer_token = ? AND wo.active = 1
  `).bind(token).first();
  if (!order) return new Response('Expediente no encontrado', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' }});
  const [events, photos] = await Promise.all([
    env.DB.prepare(`SELECT new_status, note_public, created_at FROM work_order_events WHERE work_order_id = ? AND note_public IS NOT NULL ORDER BY created_at ASC`).bind(order.id).all(),
    env.DB.prepare(`SELECT id, category, uploaded_at FROM photos WHERE work_order_id = ? AND visibility IN ('INSURER_VISIBLE','CLIENT_AND_INSURER') ORDER BY uploaded_at ASC`).bind(order.id).all()
  ]);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Expediente ${order.reference}</title><style>body{font-family:system-ui;padding:20px;max-width:800px;margin:0 auto}.card{background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0}h1{color:#1a1a1a}</style></head><body><h1>Expediente ${order.reference}</h1><div class="card"><strong>Vehículo:</strong> ${order.plate} ${order.make} ${order.model}</div><div class="card"><strong>Estado:</strong> ${order.current_status}</div><h2>Timeline</h2>${events.results.map(e => `<div class="card"><strong>${new Date(String(e.created_at)).toLocaleString('es-ES')}</strong><br>${e.new_status}${e.note_public ? ': ' + e.note_public : ''}</div>`).join('')}<h2>Fotos/Documentos</h2>${photos.results.map(p => `<div class="card">${p.category} - ${new Date(String(p.uploaded_at)).toLocaleString('es-ES')}</div>`).join('')}</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' }});
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'manotas', version: '0.1.0' });
    }

    // Public tracking endpoint
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
          vehicle: { plate: order.plate, make: order.make, model: order.model },
        },
        timeline: timeline.results,
        photos: photos.results,
      });
    }

    // Auth routes
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      return authRoutes.login(request, env);
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      return authRoutes.logout(request, env);
    }
    if (url.pathname === '/api/auth/me' && request.method === 'GET') {
      return authRoutes.me(request, env);
    }

    // QR routes
    if (url.pathname === '/api/qr/generate' && request.method === 'POST') {
      const auth = await requireTechAdminAuth(request, env);
      if (auth instanceof Response) return auth;
      return qrRoutes.generate(request, env);
    }
    const qrVerifyMatch = url.pathname.match(/^\/api\/qr\/verify\/([^/]+)$/);
    if (request.method === 'GET' && qrVerifyMatch) {
      return qrRoutes.verify(request, env, qrVerifyMatch[1]);
    }

    // Technician routes (require TECHNICIAN or ADMIN)
    const techAuth = await requireTechnicianAuth(request, env);
    if (!(techAuth instanceof Response)) {
      if (url.pathname === '/api/technician/orders' && request.method === 'GET') {
        return technicianRoutes.getOrders(request, env);
      }
      const techOrderMatch = url.pathname.match(/^\/api\/technician\/orders\/([^/]+)$/);
      if (techOrderMatch && request.method === 'GET') {
        return technicianRoutes.getOrder(request, env, techOrderMatch[1]);
      }
      const techEventMatch = url.pathname.match(/^\/api\/technician\/orders\/([^/]+)\/events$/);
      if (techEventMatch && request.method === 'POST') {
        return technicianRoutes.createEvent(request, env, techEventMatch[1]);
      }
      const techUpdateMatch = url.pathname.match(/^\/api\/technician\/orders\/([^/]+)$/);
      if (techUpdateMatch && request.method === 'PATCH') {
        return technicianRoutes.updateOrder(request, env, techUpdateMatch[1]);
      }
    }

    // Admin routes (require ADMIN)
    const adminAuth = await requireAdminAuth(request, env);
    if (!(adminAuth instanceof Response)) {
      if (url.pathname === '/api/admin/users' && request.method === 'GET') {
        return adminRoutes.getUsers(request, env);
      }
      if (url.pathname === '/api/admin/orders' && request.method === 'GET') {
        return adminRoutes.getAllOrders(request, env);
      }
      if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
        return adminRoutes.getStats(request, env);
      }
      if (url.pathname === '/api/admin/users' && request.method === 'POST') {
        return adminDashboardRoutes.createUser(request, env);
      }
    }

    // Admin dashboard routes (require ADMIN)
    if (!(adminAuth instanceof Response)) {
      if (url.pathname === '/admin/dashboard' && request.method === 'GET') {
        return adminDashboardRoutes.dashboard(request, env);
      }
      if (url.pathname === '/admin/dashboard/orders' && request.method === 'GET') {
        return adminDashboardRoutes.orders(request, env);
      }
      if (url.pathname === '/admin/dashboard/users' && request.method === 'GET') {
        return adminDashboardRoutes.users(request, env);
      }
    }

    // Insurer routes (require INSURER)
    const insurerAuth = await requireInsurerAuth(request, env);
    if (!(insurerAuth instanceof Response)) {
      if (url.pathname === '/api/insurer/orders' && request.method === 'GET') {
        return insurerRoutes.getAssignedOrders(request, env);
      }
      const insurerOrderMatch = url.pathname.match(/^\/api\/insurer\/orders\/([^/]+)$/);
      if (insurerOrderMatch && request.method === 'GET') {
        return insurerRoutes.getOrderDetails(request, env, insurerOrderMatch[1]);
      }
    }

    // Upload routes (require TECHNICIAN or ADMIN)
    if (!(techAuth instanceof Response)) {
      if (url.pathname === '/api/photos/upload' && request.method === 'POST') {
        return uploadRoutes.upload(request, env);
      }
      const photoSignedMatch = url.pathname.match(/^\/api\/photos\/([^/]+)\/signed-url$/);
      if (photoSignedMatch && request.method === 'GET') {
        return uploadRoutes.signedUrl(request, env, photoSignedMatch[1]);
      }
    }

    // Mobile technician page
    const mobileMatch = url.pathname.match(/^\/taller\/orden\/([^/]+)$/);
    if (mobileMatch && request.method === 'GET') {
      const mobileAuth = await requireTechnicianAuth(request, env);
      if (!(mobileAuth instanceof Response)) {
        return mobileRoutes.orderPage(request, env, mobileMatch[1]);
      }
    }

    // Customer portal (public token)
    const customerMatch = url.pathname.match(/^\/seguimiento\/([^/]+)$/);
    if (customerMatch && request.method === 'GET') {
      return customerPortal(request, env, customerMatch[1]);
    }

    // Insurer portal (insurer token)
    const insurerPortalMatch = url.pathname.match(/^\/aseguradora\/([^/]+)$/);
    if (insurerPortalMatch && request.method === 'GET') {
      return insurerPortal(request, env, insurerPortalMatch[1]);
    }

    // Static assets (demo, public)
    const staticResponse = await serveStatic(request, env);
    if (staticResponse) return staticResponse;

    return notFound();
  },
};