import { orderAccess } from '../security';
import { photoStore } from '../utils/photo-store';
import { signedPhotoUrl } from './photo-content';
import { verifySession } from "../auth";
import { putPhoto, validateUpload } from "../utils/r2";
import { queries } from "../db/queries";
import { json } from "../utils/response";
import { generateUUID } from "../utils/crypto";
import type { Env } from "../index";

async function requireTechAdminAuth(request: Request, env: Env): Promise<{ userId: string; role: string } | Response> {
  const session = await verifySession(env, request);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!["TECHNICIAN", "ADMIN"].includes(session.role)) {
    return json({ error: "forbidden" }, 403);
  }
  return session;
}

export const uploadRoutes = {
  async upload(request: Request, env: Env) {
    const auth = await requireTechAdminAuth(request, env);
    if (auth instanceof Response) return auth;
    
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return json({error:'multipart_required'},415);
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const workOrderId = formData.get("workOrderId") as string;
    const eventId = formData.get("eventId") as string | null;
    const category = formData.get("category") as string;
    const visibility = formData.get("visibility") as "INTERNAL_ONLY" | "CLIENT_VISIBLE" | "INSURER_VISIBLE" | "CLIENT_AND_INSURER" || "INTERNAL_ONLY";
    
    if (!(file instanceof File) || !workOrderId || !category) {
      return json({ error: "missing_fields" }, 400);
    }
    
    const access = await orderAccess(request, env, workOrderId, true);
    if (access instanceof Response) return access;
    if (!['INTERNAL_ONLY','CLIENT_VISIBLE','INSURER_VISIBLE','CLIENT_AND_INSURER'].includes(visibility)) return json({ error: 'invalid_visibility' }, 400);
    if (eventId) {
      const event = await env.DB.prepare('SELECT id FROM work_order_events WHERE id = ? AND work_order_id = ?').bind(eventId, workOrderId).first();
      if (!event) return json({ error: 'invalid_event' }, 400);
    }
    const validation = validateUpload(file);
    if (env.PHOTO_STORAGE === 'd1-test' && file.size > 2 * 1024 * 1024) return json({error:'test_photo_limit_2mb'},413);
    if (!validation.ok) return json({ error: validation.error }, validation.error === "file_too_large" ? 413 : 415);
    
    const arrayBuffer = await file.arrayBuffer();
    const objectKey = `photos/${workOrderId}/${generateUUID()}-${file.name}`;
    const thumbnailKey = null;
    
    await putPhoto(photoStore(env), objectKey, arrayBuffer, file.type);
    
    const photoId = generateUUID();
    await env.DB.prepare(`
      INSERT INTO photos (id, work_order_id, event_id, technician_id, category, object_key, thumbnail_key, visibility, file_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(photoId, workOrderId, eventId, auth.userId, category, objectKey, thumbnailKey, visibility, Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', arrayBuffer)), b => b.toString(16).padStart(2,'0')).join('')).run();
    
    return json({ id: photoId, objectKey, thumbnailKey }, 201);
  },

  async signedUrl(request: Request, env: Env, photoId: string) { return signedPhotoUrl(request, env, photoId); }
};
