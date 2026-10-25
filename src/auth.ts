import { SignJWT, jwtVerify } from "jose";
import { hash, verify } from "@node-rs/argon2";
import type { Env } from "./index";

const COOKIE_NAME = "manotas_session";
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  return verify(hashStr, password);
}

export async function createSession(env: Env, user: { id: string; role: string }) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const token = await new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(secret);

  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
  return { token, cookie };
}

export async function verifySession(env: Env, request: Request): Promise<{ userId: string; role: string } | null> {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(match[1], secret);
    return { userId: payload.sub as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}