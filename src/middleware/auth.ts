import { verifySession } from "../auth";
import type { Env } from "../index";

export function requireAuth() {
  return async (ctx: any, next: any) => {
    const session = await verifySession(ctx.env, ctx.request);
    if (!session) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }
    ctx.user = session;
    return next();
  };
}

export function requireRole(...roles: string[]) {
  return async (ctx: any, next: any) => {
    if (!ctx.user || !roles.includes(ctx.user.role)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }
    return next();
  };
}

export function optionalAuth() {
  return async (ctx: any, next: any) => {
    const session = await verifySession(ctx.env, ctx.request);
    if (session) ctx.user = session;
    return next();
  };
}