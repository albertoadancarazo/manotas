import { createSession, verifyPassword, verifySession, clearSessionCookie } from "../auth";
import { json } from "../utils/response";
import type { Env } from "../index";

export const authRoutes = {
  async login(request: Request, env: Env) {
    const body = await request.json() as { email: string; password: string };
    const { email, password } = body;
    const user = await env.DB.prepare("SELECT id, password_hash, role FROM users WHERE email = ? AND active = 1")
      .bind(email).first() as { id: string; password_hash: string; role: string } | null;
    if (!user || !await verifyPassword(password, user.password_hash)) {
      return json({ error: "invalid_credentials" }, 401);
    }
    const { token, cookie } = await createSession(env, { id: user.id, role: user.role });
    return json({ user: { id: user.id, role: user.role } }, 200, { "Set-Cookie": cookie });
  },

  async logout(_request: Request, _env: Env) {
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  },

  async me(request: Request, env: Env) {
    const session = await verifySession(env, request);
    if (!session) return json({ error: "unauthorized" }, 401);
    return json({ user: session });
  }
};