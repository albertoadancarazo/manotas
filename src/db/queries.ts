import type { D1Database } from "@cloudflare/workers-types";

export const queries = {
  getTechnicianOrders: (db: D1Database, techId: string, filters?: { status?: string }) => {
    let sql = `SELECT wo.*, v.plate, v.make, v.model FROM work_orders wo JOIN vehicles v ON v.id = wo.vehicle_id WHERE wo.assigned_technician = ? AND wo.active = 1`;
    const args: any[] = [techId];
    if (filters?.status) {
      sql += ` AND wo.current_status = ?`;
      args.push(filters.status);
    }
    sql += ` ORDER BY wo.entry_date DESC`;
    return db.prepare(sql).bind(...args).all();
  },

  getOrderWithDetails: async (db: D1Database, orderUuid: string) => {
    const order = await db.prepare(`
      SELECT wo.*, v.plate, v.make, v.model, v.year, v.color
      FROM work_orders wo
      JOIN vehicles v ON v.id = wo.vehicle_id
      WHERE wo.uuid = ? AND wo.active = 1
    `).bind(orderUuid).first();
    if (!order) return null;
    const events = await db.prepare(`
      SELECT new_status, note_internal, note_public, created_at
      FROM work_order_events
      WHERE work_order_id = ?
      ORDER BY created_at ASC
    `).bind(order.id).all();
    const photos = await db.prepare(`
      SELECT id, category, visibility, uploaded_at, thumbnail_key
      FROM photos
      WHERE work_order_id = ?
      ORDER BY uploaded_at ASC
    `).bind(order.id).all();
    return { order, events: events.results, photos: photos.results };
  },

  createEvent: async (db: D1Database, data: {
    workOrderUuid: string;
    newStatus: string;
    technicianId: string;
    noteInternal?: string;
    notePublic?: string;
  }) => {
    const order = await db.prepare("SELECT id, current_status FROM work_orders WHERE uuid = ? AND active = 1")
      .bind(data.workOrderUuid).first() as { id: string; current_status: string } | null;
    if (!order) return null;
    
    const eventId = crypto.randomUUID();
    await db.batch([db.prepare(`
      INSERT INTO work_order_events (id, work_order_id, previous_status, new_status, technician_id, note_internal, note_public)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(eventId, order.id, order.current_status, data.newStatus, data.technicianId, data.noteInternal ?? null, data.notePublic ?? null),
    
    db.prepare("UPDATE work_orders SET current_status = ? WHERE id = ?")
      .bind(data.newStatus, order.id)]);
    
    return { eventId, orderId: order.id };
  },

  updateOrder: async (db: D1Database, orderUuid: string, data: {
    estimated_delivery_date?: string;
    assigned_technician?: string;
  }) => {
    const updates: string[] = [];
    const args: any[] = [];
    if (data.estimated_delivery_date) {
      updates.push("estimated_delivery_date = ?");
      args.push(data.estimated_delivery_date);
    }
    if (data.assigned_technician) {
      updates.push("assigned_technician = ?");
      args.push(data.assigned_technician);
    }
    if (updates.length === 0) return false;
    args.push(orderUuid);
    await db.prepare(`UPDATE work_orders SET ${updates.join(", ")} WHERE uuid = ? AND active = 1`).bind(...args).run();
    return true;
  }
};