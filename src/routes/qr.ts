import { verifySession } from "../auth";
import { generateToken, encodeQRPayload } from "../utils/crypto";
import { json } from "../utils/response";
import type { Env } from "../index";
import { orderAccess } from '../security';
import QRCode from "qrcode";

async function requireTechAdminAuth(request: Request, env: Env): Promise<{ userId: string; role: string } | Response> {
  const session = await verifySession(env, request);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!["TECHNICIAN", "ADMIN"].includes(session.role)) {
    return json({ error: "forbidden" }, 403);
  }
  return session;
}

export const qrRoutes = {
  async generate(request: Request, env: Env) {
    const auth = await requireTechAdminAuth(request, env);
    if (auth instanceof Response) return auth;
    
    const body = await request.json() as { workOrderId: string; role: "technician" | "customer" | "insurer" };
    const { workOrderId, role } = body;
    if (!['technician','customer','insurer'].includes(role) || typeof workOrderId !== 'string') return json({ error: 'invalid_input' }, 400);
    const access = await orderAccess(request, env, workOrderId, true);
    if (access instanceof Response) return access;
    
    const order = await env.DB.prepare("SELECT uuid FROM work_orders WHERE id = ? AND active = 1")
      .bind(workOrderId).first() as { uuid: string } | null;
    if (!order) return json({ error: "not_found" }, 404);
    
    const token = generateToken(24);
    const payload = encodeQRPayload(order.uuid, role);
    
    const host = new URL(request.url).host;
    const basePath = role === "technician" ? "taller/orden" : role === "customer" ? "seguimiento" : "aseguradora";
    const qrUrl = `${new URL(request.url).origin}/${basePath}/${role === "technician" ? order.uuid : token}`;
    
    const dataUrl = await QRCode.toString(qrUrl, { type: 'svg', width: 256, margin: 2 }).then(svg => 'data:image/svg+xml;base64,' + btoa(svg));
    
    if (role === "customer") {
      await env.DB.prepare("UPDATE work_orders SET public_token = ? WHERE id = ?")
        .bind(token, workOrderId).run();
    } else if (role === "insurer") {
      await env.DB.prepare("UPDATE work_orders SET insurer_token = ? WHERE id = ?")
        .bind(token, workOrderId).run();
    }
    
    return json({ qrDataUrl: dataUrl, token, url: qrUrl });
  },

  async verify(request: Request, env: Env, uuid: string) {
    const order = await env.DB.prepare("SELECT id, public_token, insurer_token FROM work_orders WHERE uuid = ? AND active = 1")
      .bind(uuid).first();
    if (!order) return json({ valid: false }, 404);
    return json({ 
      valid: true, 
      workOrderId: order.id, 
      hasPublicToken: !!order.public_token, 
      hasInsurerToken: !!order.insurer_token 
    });
  }
};