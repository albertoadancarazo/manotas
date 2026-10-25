import { verifySession } from "../auth";
import { json } from "../utils/response";
import type { Env } from "../index";
import { queries } from "../db/queries";
import { generateInsurerReportPDF, generateWorkOrderSummaryPDF } from "../pdf/insurer-report";

async function requireInsurerAuth(request: Request, env: Env) {
  const session = await verifySession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (session.role !== 'INSURER') return json({ error: 'forbidden' }, 403);
  return session;
}

async function requireAdminAuth(request: Request, env: Env) {
  const session = await verifySession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (session.role !== 'ADMIN') return json({ error: 'forbidden' }, 403);
  return session;
}

async function requireTechAdminAuth(request: Request, env: Env) {
  const session = await verifySession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (!['TECHNICIAN', 'ADMIN'].includes(session.role)) {
    return json({ error: 'forbidden' }, 403);
  }
  return session;
}

function buildTimeline(events: any[]): any[] {
  const result = [];
  for (const e of events) {
    result.push({
      status: e.new_status,
      notePublic: e.note_public,
      noteInternal: e.note_internal,
      createdAt: e.created_at,
      technicianName: e.technician_name
    });
  }
  return result;
}

function buildPhotos(photos: any[], baseUrl: string): any[] {
  const result = [];
  for (const p of photos) {
    result.push({
      category: p.category,
      uploadedAt: p.uploaded_at,
      visibility: p.visibility,
      thumbnailUrl: p.thumbnail_key ? "/api/photos/" + p.id + "/signed-url" : undefined
    });
  }
  return result;
}

function buildInsurerReportData(order: any, events: any[], photos: any[], uuid: string): any {
  return {
    workOrder: {
      reference: order.reference,
      status: order.current_status,
      entryDate: order.entry_date,
      estimatedDeliveryDate: order.estimated_delivery_date,
      vehicle: {
        plate: order.plate,
        make: order.make,
        model: order.model,
        year: order.year,
        color: order.color
      },
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      insurerName: order.insurer_name,
      claimNumber: order.claim_number
    },
    timeline: buildTimeline(events),
    photos: buildPhotos(photos, ""),
    incidents: [],
    generatedAt: new Date().toISOString(),
    generatedBy: "insurer-" + uuid
  };
}

function buildSummaryReportData(order: any, events: any[], photos: any[], uuid: string): any {
  return {
    workOrder: {
      reference: order.reference,
      status: order.current_status,
      entryDate: order.entry_date,
      estimatedDeliveryDate: order.estimated_delivery_date,
      vehicle: {
        plate: order.plate,
        make: order.make,
        model: order.model,
        year: order.year,
        color: order.color
      },
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      insurerName: order.insurer_name,
      claimNumber: order.claim_number
    },
    timeline: buildTimeline(events),
    photos: buildPhotos(photos, ""),
    incidents: [],
    generatedAt: new Date().toISOString(),
    generatedBy: "tech-" + uuid
  };
}

function buildInsurerPortalReportData(order: any, events: any[], photos: any[], token: string): any {
  return {
    workOrder: {
      reference: order.reference,
      status: order.current_status,
      entryDate: order.entry_date,
      estimatedDeliveryDate: order.estimated_delivery_date,
      vehicle: {
        plate: order.plate,
        make: order.make,
        model: order.model,
        year: order.year,
        color: order.color
      },
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      insurerName: order.insurer_name,
      claimNumber: order.claim_number
    },
    timeline: buildTimeline(events),
    photos: buildPhotos(photos, ""),
    incidents: [],
    generatedAt: new Date().toISOString(),
    generatedBy: "insurer-portal-" + token
  };
}

export const pdfRoutes = {
  async getInsurerReport(request: Request, env: Env, uuid: string) {
    const auth = await requireInsurerAuth(request, env);
    if (auth instanceof Response) return auth;

    const orderData = await queries.getOrderWithDetails(env.DB, uuid);
    if (!orderData) return json({ error: 'not_found' }, 404);

    const order = orderData.order as any;
    const events = orderData.events || [];
    const photos = orderData.photos || [];

    const reportData = buildInsurerReportData(order, events, photos, uuid);

    const pdfBytes = await generateInsurerReportPDF(reportData);
    
    return new Response(pdfBytes as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="expediente-' + order.reference + '.pdf"'
      }
    });
  },

  async getSummaryPDF(request: Request, env: Env, uuid: string) {
    const auth = await requireTechAdminAuth(request, env);
    if (auth instanceof Response) return auth;

    const orderData = await queries.getOrderWithDetails(env.DB, uuid);
    if (!orderData) return json({ error: 'not_found' }, 404);

    const order = orderData.order as any;
    const events = orderData.events || [];
    const photos = orderData.photos || [];

    const reportData = buildSummaryReportData(order, events, photos, uuid);

    const pdfBytes = await generateWorkOrderSummaryPDF(reportData);
    
    return new Response(pdfBytes as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="resumen-' + uuid + '.pdf"'
      }
    });
  },

  async getInsurerPortalPDF(request: Request, env: Env, token: string) {
    const order = await env.DB.prepare(`
      SELECT wo.*, v.plate, v.make, v.model, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON v.id = wo.vehicle_id
      WHERE wo.insurer_token = ? AND wo.active = 1
    `).bind(token).first();

    if (!order) return json({ error: 'not_found' }, 404);

    const [events, photos] = await Promise.all([
      env.DB.prepare(`
        SELECT new_status, note_public, note_internal, created_at
        FROM work_order_events
        WHERE work_order_id = ? AND note_public IS NOT NULL
        ORDER BY created_at ASC
      `).bind(order.id).all(),
      env.DB.prepare(`
        SELECT id, category, uploaded_at, visibility, thumbnail_key
        FROM photos
        WHERE work_order_id = ? AND visibility IN ('INSURER_VISIBLE','CLIENT_AND_INSURER')
        ORDER BY uploaded_at ASC
      `).bind(order.id).all()
    ]);

    const reportData = {
      workOrder: {
        reference: order.reference,
        status: order.current_status,
        entryDate: order.entry_date,
        estimatedDeliveryDate: order.estimated_delivery_date,
        vehicle: {
          plate: order.plate,
          make: order.make,
          model: order.model,
          year: order.year,
          color: order.color
        },
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        insurerName: order.insurer_name,
        claimNumber: order.claim_number
      },
      timeline: buildTimeline(events),
      photos: buildPhotos(photos, ""),
      incidents: [],
      generatedAt: new Date().toISOString(),
      generatedBy: "insurer-portal-" + token
    };

    const pdfBytes = await generateInsurerReportPDF(reportData);
    
    return new Response(pdfBytes as BodyInit, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="expediente-' + order.reference + '.pdf"'
      }
    });
  }
};