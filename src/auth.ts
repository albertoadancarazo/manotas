import { SignJWT, jwtVerify } from 'jose';
import { argon2idAsync } from '@noble/hashes/argon2.js';
import type { Env } from './index';
const TTL = 86400;
const encoder = new TextEncoder();
const hex = (data: Uint8Array) => Array.from(data, x => x.toString(16).padStart(2, '0')).join('');
const tokenHash = async (token: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(token))));
function secret(env: Env) {
  if (!env.JWT_SECRET || encoder.encode(env.JWT_SECRET).length < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  return encoder.encode(env.JWT_SECRET);
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await argon2idAsync(password, salt, { m: 19456, t: 2, p: 1, dkLen: 32 });
  return '$argon2id$v=19$m=19456,t=2,p=1$' + btoa(String.fromCharCode(...salt)).replace(/=+$/, '') + '$' + btoa(String.fromCharCode(...digest)).replace(/=+$/, '');
}
export async function verifyPassword(password: string, stored: string) {
  if (typeof password !== 'string' || typeof stored !== 'string' || password.length > 1024) return false;
  const match = stored.match(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/);
  if (!match) return false;
  try {
    const digest = await argon2idAsync(password, Uint8Array.from(atob(match[1]), c => c.charCodeAt(0)), { m: 19456, t: 2, p: 1, dkLen: 32 });
    const expected = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
    let difference = expected.length ^ digest.length;
    for (let i = 0; i < digest.length; i++) difference |= digest[i] ^ expected[i];
    return difference === 0;
  } catch { return false; }
}
export async function createSession(env: Env, user: { id: string; role: string }) {
  const id = crypto.randomUUID();
  const token = await new SignJWT({ role: user.role }).setSubject(user.id).setJti(id).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(TTL + 's').sign(secret(env));
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').bind(id, user.id, await tokenHash(token), new Date(Date.now() + TTL * 1000).toISOString()).run();
  return { token, cookie: 'manotas_session=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + TTL };
}
function readToken(request: Request) { return request.headers.get('Cookie')?.match(/(?:^|;\s*)manotas_session=([^;]+)/)?.[1]; }
export async function verifySession(env: Env, request: Request): Promise<{ userId: string; role: string } | null> {
  const token = readToken(request); if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(env), { algorithms: ['HS256'] });
    if (!payload.sub || !payload.jti) return null;
    const user = await env.DB.prepare('SELECT u.id, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.user_id = ? AND s.token_hash = ? AND s.expires_at > ? AND u.active = 1').bind(payload.jti, payload.sub, await tokenHash(token), new Date().toISOString()).first<{id: string; role: string}>();
    return user ? { userId: user.id, role: user.role } : null;
  } catch { return null; }
}
export async function revokeSession(env: Env, request: Request) {
  const token = readToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await tokenHash(token)).run();
}
export function clearSessionCookie() { return 'manotas_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'; }
