import { createSession, hashPassword } from "../src/auth";
import { json } from "../src/utils/response";

const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        first: async () => {
          if (sql.includes("SELECT id, password_hash, role FROM users")) {
            const hash = await hashPassword("Test1234!");
            return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
          }
          if (sql.includes("SELECT wo.*, v.plate, v.make, v.model") && sql.includes("WHERE wo.uuid = ?")) {
            return {
              id: "wo-1",
              uuid: "wo-uuid-1",
              reference: "WO-2026-001",
              current_status: "RECEPCIONADO",
              entry_date: "2026-10-20",
              estimated_delivery_date: "2026-10-25",
              plate: "1234ABC",
              make: "BMW",
              model: "M3",
              year: 2023,
              color: "Azul"
            };
          }
          if (sql.includes("SELECT wo.*, v.plate, v.make, v.model FROM work_orders") && sql.includes("assigned_technician")) {
            return {
              id: "wo-1",
              uuid: "wo-uuid-1",
              reference: "WO-2026-001",
              current_status: "RECEPCIONADO",
              entry_date: "2026-10-20",
              estimated_delivery_date: "2026-10-25",
              plate: "1234ABC",
              make: "BMW",
              model: "M3"
            };
          }
          if (sql.includes("SELECT id, current_status FROM work_orders WHERE uuid = ?")) {
            return { id: "wo-1", current_status: "RECEPCIONADO" };
          }
          return null;
        },
        run: async () => ({ success: true }),
        all: async () => {
          if (sql.includes("SELECT wo.*, v.plate, v.make, v.model FROM work_orders") && sql.includes("assigned_technician")) {
            return {
              results: [{
                id: "wo-1",
                uuid: "wo-uuid-1",
                reference: "WO-2026-001",
                current_status: "RECEPCIONADO",
                entry_date: "2026-10-20",
                estimated_delivery_date: "2026-10-25",
                plate: "1234ABC",
                make: "BMW",
                model: "M3"
              }]
            };
          }
          if (sql.includes("SELECT new_status, note_internal, note_public, created_at FROM work_order_events")) {
            return { results: [] };
          }
          if (sql.includes("SELECT id, category, visibility, uploaded_at, thumbnail_key FROM photos")) {
            return { results: [] };
          }
          return { results: [] };
        }
      })
    })
  },
  PHOTOS: null
} as any;

function createMockRequest(method: string, url: string, body?: any, cookie?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  console.log("=== Testing technician routes ===");
  
  // Create session for technician
  const session = await createSession(mockEnv, { id: "tech-123", role: "TECHNICIAN" });
  const cookie = session.cookie;

  // Test 1: GET /api/technician/orders without auth -> 401
  const req1 = createMockRequest("GET", "http://localhost/api/technician/orders");
  const ordersRoute = (await import("../src/routes/technician")).technicianRoutes.getOrders;
  const res1 = await ordersRoute(req1, mockEnv);
  assert(res1.status === 401, `Should be 401 without auth, got ${res1.status}`);
  console.log("✓ GET /api/technician/orders without auth -> 401");

  // Test 2: GET /api/technician/orders with auth -> 200
  const req2 = createMockRequest("GET", "http://localhost/api/technician/orders", undefined, cookie);
  const res2 = await ordersRoute(req2, mockEnv);
  assert(res2.status === 200, `Should be 200 with auth, got ${res2.status}`);
  const body2 = await res2.json();
  assert(Array.isArray(body2), "Should return array");
  console.log("✓ GET /api/technician/orders with auth -> 200");

  // Test 3: GET /api/technician/orders/:uuid with auth
  const getOrderRoute = (await import("../src/routes/technician")).technicianRoutes.getOrder;
  const req3 = createMockRequest("GET", "http://localhost/api/technician/orders/wo-uuid-1", undefined, cookie);
  const res3 = await getOrderRoute(req3, mockEnv, "wo-uuid-1");
  assert(res3.status === 200, `Should be 200, got ${res3.status}`);
  const body3 = await res3.json();
  assert(body3.order.id === "wo-1", "Order ID should match");
  assert(body3.order.reference === "WO-2026-001", "Reference should match");
  console.log("✓ GET /api/technician/orders/:uuid -> 200");

  // Test 4: POST /api/technician/orders/:uuid/events
  const createEventRoute = (await import("../src/routes/technician")).technicianRoutes.createEvent;
  const req4 = createMockRequest("POST", "http://localhost/api/technician/orders/wo-uuid-1/events", {
    newStatus: "PENDIENTE_PERITACION",
    noteInternal: "Waiting for insurance assessor",
    notePublic: "Assessment scheduled"
  }, cookie);
  const res4 = await createEventRoute(req4, mockEnv, "wo-uuid-1");
  assert(res4.status === 201, `Should be 201, got ${res4.status}`);
  const body4 = await res4.json();
  assert(body4.eventId !== undefined, "Should return eventId");
  console.log("✓ POST /api/technician/orders/:uuid/events -> 201");

  // Test 5: PATCH /api/technician/orders/:uuid
  const updateOrderRoute = (await import("../src/routes/technician")).technicianRoutes.updateOrder;
  const req5 = createMockRequest("PATCH", "http://localhost/api/technician/orders/wo-uuid-1", {
    estimated_delivery_date: "2026-10-28"
  }, cookie);
  const res5 = await updateOrderRoute(req5, mockEnv, "wo-uuid-1");
  assert(res5.status === 200, `Should be 200, got ${res5.status}`);
  console.log("✓ PATCH /api/technician/orders/:uuid -> 200");

  // Test 6: GET /api/technician/orders with status filter
  const req6 = createMockRequest("GET", "http://localhost/api/technician/orders?status=RECEPCIONADO", undefined, cookie);
  const res6 = await ordersRoute(req6, mockEnv);
  assert(res6.status === 200, `Should be 200, got ${res6.status}`);
  console.log("✓ GET /api/technician/orders with status filter -> 200");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});