import { verifySession } from '../auth';
import { orderAccess } from '../security';
import { SignJWT, jwtVerify } from 'jose';
import { json } from '../utils/response';
import type { Env } from '../index';

export async function photoAccess(request: Request, env: Env, id: string) {
  const photo = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(id).first();
  if (!photo) return new Response('Not found', { status: 404 });
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const audience = url.searchParams.get('audience');
  if (token && (audience === 'customer' || audience === 'insurer')) {
    const order = await env.DB.prepare(`SELECT id FROM work_orders WHERE id = ? AND ${audience === 'customer' ? 'public_token' : 'insurer_token'} = ? AND active = 1`).bind(photo.work_order_id, token).first();
    const allowed = audience === 'customer' ? ['CLIENT_VISIBLE','CLIENT_AND_INSURER'] : ['INSURER_VISIBLE','CLIENT_AND_INSURER'];
    if (!order || !allowed.includes(String(photo.visibility))) return new Response('Forbidden', { status: 403 });
  } else {
    const access = await orderAccess(request, env, String(photo.work_order_id), true);
    if (access instanceof Response) return access;
    const session = await verifySession(env, request);
    if (session?.role === 'INSURER' && !['INSURER_VISIBLE','CLIENT_AND_INSURER'].includes(String(photo.visibility))) return new Response('Forbidden', { status: 403 });
  }
  return photo;
}

export async function photoContent(request: Request, env: Env, id: string) {
  const photo = await photoAccess(request, env, id);
  if (photo instanceof Response) return photo;
  const sig = new URL(request.url).searchParams.get('sig');
  if (sig) {
    try {
      const { payload } = await jwtVerify(sig, new TextEncoder().encode(env.JWT_SECRET), { algorithms: ['HS256'], audience: 'photo' });
      if (payload.sub !== id) return new Response('Forbidden', { status: 403 });
    } catch { return new Response('Expired or invalid URL', { status: 403 }); }
  }
  const object = await env.PHOTOS.get(String(photo.object_key));
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers({ 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline' });
  headers.set('content-type', object.httpMetadata?.contentType || 'application/octet-stream');
  return new Response(object.body, { headers });
}

export async function signedPhotoUrl(request: Request, env: Env, id: string) {
  const photo = await photoAccess(request, env, id);
  if (photo instanceof Response) return photo;
  const sig = await new SignJWT({}).setSubject(id).setAudience('photo').setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(new TextEncoder().encode(env.JWT_SECRET));
  const url = new URL(`/api/photos/${encodeURIComponent(id)}/content`, request.url);
  url.searchParams.set('sig', sig);
  return json({ signedUrl: url.toString(), expiresIn: 900 });
}
