import type { R2Bucket } from "@cloudflare/workers-types";

export async function putPhoto(bucket: R2Bucket, key: string, data: ArrayBuffer, contentType: string) {
  await bucket.put(key, data, { 
    httpMetadata: { contentType }, 
    customMetadata: { uploadedAt: new Date().toISOString() }
  });
}

export async function getSignedUrl(bucket: R2Bucket, key: string, ttlSeconds = 900) {
  // @ts-expect-error - createSignedUrl exists in newer @cloudflare/workers-types
  return bucket.createSignedUrl(key, { method: "GET", expiration: ttlSeconds });
}

export function validateUpload(file: File): { ok: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024;
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (file.size > maxSize) return { ok: false, error: "file_too_large" };
  if (!allowed.includes(file.type)) return { ok: false, error: "invalid_mime_type" };
  return { ok: true };
}

// Scope must already be checked against the order, not just the photo author.
export function canAccessPhoto(visibility: string, requesterRole: string, hasOrderAccess: boolean): boolean {
  if (!hasOrderAccess) return false;
  if (requesterRole === 'ADMIN' || requesterRole === 'TECHNICIAN') return true;
  if (requesterRole === 'INSURER') return ['INSURER_VISIBLE','CLIENT_AND_INSURER'].includes(visibility);
  if (requesterRole === 'CLIENT') return ['CLIENT_VISIBLE','CLIENT_AND_INSURER'].includes(visibility);
  return false;
}
