import type { Env } from '../index';

export interface PhotoStore {
  put(key: string, data: ArrayBuffer, options: {httpMetadata: {contentType: string}; customMetadata?: Record<string,string>}): Promise<unknown>;
  get(key: string): Promise<{body: ReadableStream; httpMetadata?: {contentType?: string}} | null>;
}

// Explicit staging-only fallback; production continues to require its R2 binding.
export function photoStore(env: Env): PhotoStore {
  if (env.PHOTO_STORAGE !== 'd1-test') return env.PHOTOS;
  return {
    async put(key, data, options) {
      if (data.byteLength > 2 * 1024 * 1024) throw new Error('staging_photo_too_large');
      const bytes = new Uint8Array(data);
      const statements = [env.DB.prepare('INSERT INTO test_photo_objects (object_key, content_type) VALUES (?, ?)').bind(key, options.httpMetadata.contentType)];
      for (let offset=0, part=0;offset<bytes.length;offset+=32768,part++) {
        const content = btoa(String.fromCharCode(...bytes.subarray(offset,offset+32768)));
        statements.push(env.DB.prepare('INSERT INTO test_photo_chunks (object_key, part, content) VALUES (?, ?, ?)').bind(key,part,content));
      }
      await env.DB.batch(statements);
    },
    async get(key) {
      const object=await env.DB.prepare('SELECT content_type FROM test_photo_objects WHERE object_key = ?').bind(key).first<{content_type:string}>();
      if (!object) return null;
      const chunks=await env.DB.prepare('SELECT content FROM test_photo_chunks WHERE object_key = ? ORDER BY part').bind(key).all<{content:string}>();
      const body = new ReadableStream({start(controller) {
        for (const chunk of chunks.results) controller.enqueue(Uint8Array.from(atob(chunk.content),c=>c.charCodeAt(0)));
        controller.close();
      }});
      return {body,httpMetadata:{contentType:object.content_type}};
    }
  };
}
