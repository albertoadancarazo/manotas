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

export function canAccessPhoto(visibility: string, requesterRole: string, isOwner: boolean): boolean {
  if (visibility === "INTERNAL_ONLY") return isOwner && (requesterRole === "TECHNICIAN" || requesterRole === "ADMIN");
  if (visibility === "CLIENT_VISIBLE") return requesterRole === "TECHNICIAN" || requesterRole === "ADMIN" || isOwner;
  if (visibility === "INSURER_VISIBLE") return requesterRole === "TECHNICIAN" || requesterRole === "ADMIN" || requesterRole === "INSURER";
  if (visibility === "CLIENT_AND_INSURER") return true;
  return false;
}