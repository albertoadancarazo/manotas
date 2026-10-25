import { escapeHtml } from './security';
import { photoContent, signedPhotoUrl } from './routes/photo-content';
import { pdfRoutes } from './routes/pdf';
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
  BASE_URL?: string;
  WHATSAPP_ACCOUNT_SID?: string; WHATSAPP_AUTH_TOKEN?: string; WHATSAPP_FROM_NUMBER?: string;
  SMS_ACCOUNT_SID?: string; SMS_AUTH_TOKEN?: string; SMS_FROM_NUMBER?: string;
  SENDGRID_API_KEY?: string; EMAIL_FROM?: string;
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
    WHERE work_order_id = ?
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
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Seguimiento ${escapeHtml(order.reference)}</title><style>body{font-family:system-ui;padding:20px;max-width:600px;margin:0 auto}.card{background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0}h1{color:#1a1a1a}</style></head><body><h1>${escapeHtml(order.reference)}</h1><div class="card"><strong>Estado:</strong> ${escapeHtml(order.current_status)}</div><div class="card"><strong>Vehículo:</strong> ${escapeHtml(order.plate)} ${escapeHtml(order.make)} ${escapeHtml(order.model)}</div><div class="card"><strong>Entrada:</strong> ${escapeHtml(order.entry_date)}</div><div class="card"><strong>Entrega est.:</strong> ${order.estimated_delivery_date || '—'}</div><h2>Timeline</h2>${timeline.results.map(t => `<div class="card"><strong>${new Date(String(t.created_at)).toLocaleString('es-ES')}</strong><br>${escapeHtml(t.new_status)}${t.note_public ? ': ' + escapeHtml(t.note_public) : ''}</div>`).join('')}<h2>Fotos</h2>${photos.results.map(p => `<div class="card">${escapeHtml(p.category)} - ${new Date(String(p.uploaded_at)).toLocaleString('es-ES')}<br><img style="max-width:100%;height:auto" loading="lazy" src="/api/photos/${encodeURIComponent(String(p.id))}/content?audience=customer&amp;token=${encodeURIComponent(token)}" alt="${escapeHtml(p.category)}"></div>`).join('')}</body></html>`;
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
    env.DB.prepare(`SELECT new_status, note_public, created_at FROM work_order_events WHERE work_order_id = ? ORDER BY created_at ASC`).bind(order.id).all(),
    env.DB.prepare(`SELECT id, category, uploaded_at FROM photos WHERE work_order_id = ? AND visibility IN ('INSURER_VISIBLE','CLIENT_AND_INSURER') ORDER BY uploaded_at ASC`).bind(order.id).all()
  ]);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Expediente ${escapeHtml(order.reference)}</title><style>body{font-family:system-ui;padding:20px;max-width:800px;margin:0 auto}.card{background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0}h1{color:#1a1a1a}</style></head><body><h1>Expediente ${escapeHtml(order.reference)}</h1><div class="card"><strong>Vehículo:</strong> ${escapeHtml(order.plate)} ${escapeHtml(order.make)} ${escapeHtml(order.model)}</div><div class="card"><strong>Estado:</strong> ${escapeHtml(order.current_status)}</div><h2>Timeline</h2>${events.results.map(e => `<div class="card"><strong>${new Date(String(e.created_at)).toLocaleString('es-ES')}</strong><br>${escapeHtml(e.new_status)}${e.note_public ? ': ' + escapeHtml(e.note_public) : ''}</div>`).join('')}<h2>Fotos/Documentos</h2>${photos.results.map(p => `<div class="card">${escapeHtml(p.category)} - ${new Date(String(p.uploaded_at)).toLocaleString('es-ES')}<br><img style="max-width:100%;height:auto" loading="lazy" src="/api/photos/${encodeURIComponent(String(p.id))}/content?audience=insurer&amp;token=${encodeURIComponent(token)}" alt="${escapeHtml(p.category)}"></div>`).join('')}</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' }});
}

async function dispatch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (method !== 'GET' && method !== 'HEAD' && request.headers.has('Origin') && request.headers.get('Origin') !== url.origin) return json({error:'invalid_origin'},403);
  if (path === '/taller' && method === 'GET') {
    const auth = await requireTechAdminAuth(request,env);
    if (auth instanceof Response) return auth.status === 401 ? Response.redirect(url.origin + '/login.html?next=/taller',302) : auth;
    const orders = auth.role === 'ADMIN' ? await env.DB.prepare('SELECT uuid,reference,current_status FROM work_orders WHERE active = 1 ORDER BY entry_date DESC').all() : await env.DB.prepare('SELECT uuid,reference,current_status FROM work_orders WHERE assigned_technician = ? AND active = 1 ORDER BY entry_date DESC').bind(auth.userId).all();
    return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Órdenes · Manotas</title><body style="background:#f4f0e6;color:#242321;font:18px/1.6 system-ui;max-width:48rem;margin:2rem auto;padding:1rem"><h1>Órdenes del taller</h1><ul>' + orders.results.map(o => '<li><a href="/taller/orden/' + encodeURIComponent(String(o.uuid)) + '">' + escapeHtml(o.reference) + '</a> · ' + escapeHtml(o.current_status) + '</li>').join('') + '</ul><form action="/api/auth/logout" method="post"><button>Salir</button></form></body></html>',{headers:{'content-type':'text/html; charset=utf-8'}});
  }
  if (path === '/api/health') return json({ok:true, service:'manotas', version:'0.1.0'});
  if (path === '/api/auth/login' && method === 'POST') return authRoutes.login(request, env);
  if (path === '/api/auth/logout' && method === 'POST') return authRoutes.logout(request, env);
  if (path === '/api/auth/me' && method === 'GET') return authRoutes.me(request, env);
  if (path === '/api/qr/generate' && method === 'POST') return qrRoutes.generate(request, env);
  let match: RegExpMatchArray | null;
  if ((match = path.match(/^\/api\/qr\/verify\/([^/]+)$/)) && method === 'GET') {
    const auth = await requireTechAdminAuth(request,env); if (auth instanceof Response) return auth;
    return qrRoutes.verify(request,env,match[1]);
  }
  if ((match = path.match(/^\/api\/photos\/([^/]+)\/(content|signed-url)$/)) && method === 'GET') return match[2] === 'content' ? photoContent(request,env,match[1]) : signedPhotoUrl(request,env,match[1]);
  if (path === '/api/photos/upload' && method === 'POST') return uploadRoutes.upload(request,env);
  if (path === '/api/technician/orders' && method === 'GET') return technicianRoutes.getOrders(request,env);
  if ((match = path.match(/^\/api\/technician\/orders\/([^/]+)(?:\/(events|pdf))?$/))) {
    if (match[2] === 'events' && method === 'POST') return technicianRoutes.createEvent(request,env,match[1]);
    if (match[2] === 'pdf' && method === 'GET') return pdfRoutes.getSummaryPDF(request,env,match[1]);
    if (!match[2] && method === 'GET') return technicianRoutes.getOrder(request,env,match[1]);
    if (!match[2] && method === 'PATCH') return technicianRoutes.updateOrder(request,env,match[1]);
  }
  if (path === '/api/admin/users') {
    if (method === 'GET') return adminRoutes.getUsers(request,env);
    if (method === 'POST') return adminDashboardRoutes.createUser(request,env);
  }
  if (path === '/api/admin/orders' && method === 'GET') return adminRoutes.getAllOrders(request,env);
  if (path === '/api/admin/stats' && method === 'GET') return adminRoutes.getStats(request,env);
  if (path === '/admin/dashboard' && method === 'GET') return adminDashboardRoutes.dashboard(request,env);
  if (path === '/admin/dashboard/orders' && method === 'GET') return adminDashboardRoutes.orders(request,env);
  if (path === '/admin/dashboard/users' && method === 'GET') return adminDashboardRoutes.users(request,env);
  if (path === '/api/insurer/orders' && method === 'GET') return insurerRoutes.getAssignedOrders(request,env);
  if ((match = path.match(/^\/api\/insurer\/orders\/([^/]+)(?:\/(pdf))?$/)) && method === 'GET') return match[2] ? pdfRoutes.getInsurerReport(request,env,match[1]) : insurerRoutes.getOrderDetails(request,env,match[1]);
  if ((match = path.match(/^\/taller\/orden\/([^/]+)$/)) && method === 'GET') return mobileRoutes.orderPage(request,env,match[1]);
  if ((match = path.match(/^\/seguimiento\/([^/]+)$/)) && method === 'GET') return customerPortal(request,env,match[1]);
  if ((match = path.match(/^\/aseguradora\/([^/]+)(?:\/(pdf))?$/)) && method === 'GET') return match[2] ? pdfRoutes.getInsurerPortalPDF(request,env,match[1]) : insurerPortal(request,env,match[1]);
  if ((match = path.match(/^\/api\/public\/tracking\/([^/]+)$/)) && method === 'GET') {
    const order = await getPublicOrder(env,match[1]); if(!order) return notFound();
    const [timeline,photos] = await Promise.all([getPublicTimeline(env,String(order.id)),getPublicPhotos(env,String(order.id))]);
    return json({order:{reference:order.reference,status:order.current_status,entryDate:order.entry_date,estimatedDeliveryDate:order.estimated_delivery_date,vehicle:{plate:order.plate,make:order.make,model:order.model}},timeline:timeline.results,photos:photos.results});
  }
  if (method === 'GET' || method === 'HEAD') {
    const asset = await env.ASSETS.fetch(new Request(new URL(path === '/' ? '/demo/index.html' : path, request.url), request));
    if (asset.status !== 404) return asset;
  }
  return notFound();
}
export default { async fetch(request: Request,env: Env): Promise<Response> {
  let response: Response;
  try { response = await dispatch(request,env); }
  catch (error) { console.error('Request failed', error instanceof Error ? error.name + ': ' + error.message : 'unknown'); response = error instanceof SyntaxError ? json({error:'invalid_json'},400) : json({error:'internal_error'},500); }
  if (response.status === 401 && (new URL(request.url).pathname.startsWith('/taller/') || new URL(request.url).pathname.startsWith('/admin/'))) return Response.redirect(new URL('/login.html?next=' + encodeURIComponent(new URL(request.url).pathname), request.url).toString(),302);
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options','nosniff'); headers.set('referrer-policy','no-referrer'); headers.set('x-frame-options','DENY');
  headers.set('cache-control','no-store');
  return new Response(response.body,{status:response.status,headers});
}};
