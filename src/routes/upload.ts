import { verifySession } from "../auth";
import { putPhoto, getSignedUrl, validateUpload, canAccessPhoto } from "../utils/r2";
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
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const workOrderId = formData.get("workOrderId") as string;
    const eventId = formData.get("eventId") as string | null;
    const category = formData.get("category") as string;
    const visibility = formData.get("visibility") as "INTERNAL_ONLY" | "CLIENT_VISIBLE" | "INSURER_VISIBLE" | "CLIENT_AND_INSURER" || "INTERNAL_ONLY";
    
    if (!file || !workOrderId || !category) {
      return json({ error: "missing_fields" }, 400);
    }
    
    const validation = validateUpload(file);
    if (!validation.ok) return json({ error: validation.error }, validation.error === "file_too_large" ? 413 : 415);
    
    const arrayBuffer = await file.arrayBuffer();
    const objectKey = `photos/${workOrderId}/${generateUUID()}-${file.name}`;
    const thumbnailKey = objectKey.replace(/\.[^.]+$/, "-thumb.webp");
    
    await putPhoto(env.PHOTOS, objectKey, arrayBuffer, file.type);
    
    const photoId = generateUUID();
    await env.DB.prepare(`
      INSERT INTO photos (id, work_order_id, event_id, technician_id, category, object_key, thumbnail_key, visibility, file_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(photoId, workOrderId, eventId, auth.userId, category, objectKey, thumbnailKey, visibility, "").run();
    
    return json({ id: photoId, objectKey, thumbnailKey }, 201);
  },

  async signedUrl(request: Request, env: Env, photoId: string) {
    const auth = await verifySession(env, request);
    if (!auth) return json({ error: "unauthorized" }, 401);
    
    const photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?").bind(photoId).first() as any;
    if (!photo) return json({ error: "not_found" }, 404);
    
    const isOwner = photo.technician_id === auth.userId;
    if (!canAccessPhoto(photo.visibility, auth.role, isOwner)) {
      return json({ error: "forbidden" }, 403);
    }
    
    const url = await getSignedUrl(env.PHOTOS, photo.object_key);
    return json({ signedUrl: url });
  }
};