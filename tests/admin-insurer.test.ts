import { createSession, hashPassword } from "../src/auth";

const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: {
    prepare: (sql: string) => {
      const result = {
        bind: (...args: any[]) => {
          console.log("bind() called, args:", args);
          return {
            first: async () => {
              if (sql.includes("SELECT id, password_hash, role FROM users")) {
                const hash = await hashPassword("Test1234!");
                if (sql.includes("admin@manotas.es")) {
                  return { id: "admin-1", password_hash: hash, role: "ADMIN" };
                }
                if (sql.includes("insurer@manotas.es")) {
                  return { id: "insurer-1", password_hash: hash, role: "INSURER" };
                }
                return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
              }
              if (sql.includes("SELECT wo.*, v.plate") && sql.includes("insurer_id")) {
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
              return null;
            },
            run: async () => ({ success: true }),
            all: async () => {
              if (sql.includes("SELECT wo.*, v.plate, v.make, v.model FROM work_orders") && sql.includes("insurer_id")) {
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
              if (sql.includes("SELECT COUNT(*) as count FROM work_orders WHERE active = 1 AND current_status NOT IN")) {
                return { results: [{ count: 8 }] };
              }
              if (sql.includes("SELECT COUNT(*) as count FROM work_orders WHERE active = 1")) {
                return { results: [{ count: 10 }] };
              }
              if (sql.includes("SELECT current_status, COUNT(*) as count FROM work_orders")) {
                return { results: [{ current_status: "RECEPCIONADO", count: 5 }] };
              }
              if (sql.includes("SELECT COUNT(*) as count FROM users WHERE active = 1")) {
                return { results: [{ count: 3 }] };
              }
              if (sql.includes("SELECT id, name, email, role, active, created_at FROM users")) {
                return { results: [
                  { id: "admin-1", name: "Admin", email: "admin@manotas.es", role: "ADMIN", active: 1, created_at: "2026-10-20" },
                  { id: "insurer-1", name: "Insurer", email: "insurer@manotas.es", role: "INSURER", active: 1, created_at: "2026-10-20" }
                ]};
              }
              return { results: [] };
            }
          }
        },
        first: async () => {
          console.log("first() called with sql:", sql.substring(0, 100));
          if (sql.includes("SELECT id, password_hash, role FROM users")) {
            const hash = await hashPassword("Test1234!");
            if (sql.includes("admin@manotas.es")) {
              return { id: "admin-1", password_hash: hash, role: "ADMIN" };
            }
            if (sql.includes("insurer@manotas.es")) {
              return { id: "insurer-1", password_hash: hash, role: "INSURER" };
            }
            return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
          }
          if (sql.includes("SELECT wo.*, v.plate, v.make, v.model, v.year, v.color FROM work_orders") && sql.includes("insurer_id")) {
            console.log("Matched insurer order details query");
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
          return null;
        },
        run: async () => ({ success: true }),
        all: async () => {
          if (sql.includes("SELECT wo.*, v.plate, v.make, v.model FROM work_orders") && sql.includes("insurer_id")) {
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
          if (sql.includes("SELECT COUNT(*) as count FROM work_orders WHERE active = 1 AND current_status NOT IN")) {
            return { results: [{ count: 8 }] };
          }
          if (sql.includes("SELECT COUNT(*) as count FROM work_orders WHERE active = 1")) {
            return { results: [{ count: 10 }] };
          }
          if (sql.includes("SELECT current_status, COUNT(*) as count FROM work_orders")) {
            return { results: [{ current_status: "RECEPCIONADO", count: 5 }] };
          }
          if (sql.includes("SELECT COUNT(*) as count FROM users WHERE active = 1")) {
            return { results: [{ count: 3 }] };
          }
          if (sql.includes("SELECT id, name, email, role, active, created_at FROM users")) {
            return { results: [
              { id: "admin-1", name: "Admin", email: "admin@manotas.es", role: "ADMIN", active: 1, created_at: "2026-10-20" },
              { id: "insurer-1", name: "Insurer", email: "insurer@manotas.es", role: "INSURER", active: 1, created_at: "2026-10-20" }
            ]};
          }
          return { results: [] };
        }
      };
      return result;
    }
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
  console.log("=== Testing admin routes ===");
  
  const adminSession = await createSession(mockEnv, { id: "admin-1", role: "ADMIN" });
  const adminCookie = adminSession.cookie;
  
  const insurerSession = await createSession(mockEnv, { id: "insurer-1", role: "INSURER" });
  const insurerCookie = insurerSession.cookie;

  // Test 1: Admin GET /api/admin/users without auth -> 401
  const req1 = createMockRequest("GET", "http://localhost/api/admin/users");
  const adminUsersRoute = (await import("../src/routes/admin")).adminRoutes.getUsers;
  const res1 = await adminUsersRoute(req1, mockEnv);
  assert(res1.status === 401, `Admin users should be 401 without auth, got ${res1.status}`);
  console.log("✓ Admin GET /api/admin/users without auth -> 401");

  // Test 2: Admin GET /api/admin/users with auth -> 200
  const req2 = createMockRequest("GET", "http://localhost/api/admin/users", undefined, adminCookie);
  const res2 = await adminUsersRoute(req2, mockEnv);
  assert(res2.status === 200, `Admin users should be 200 with auth, got ${res2.status}`);
  const body2 = await res2.json();
  assert(Array.isArray(body2), "Should return array");
  console.log("✓ Admin GET /api/admin/users with auth -> 200");

  // Test 3: Admin GET /api/admin/orders -> 200
  const adminOrdersRoute = (await import("../src/routes/admin")).adminRoutes.getAllOrders;
  const req3 = createMockRequest("GET", "http://localhost/api/admin/orders", undefined, adminCookie);
  const res3 = await adminOrdersRoute(req3, mockEnv);
  assert(res3.status === 200, `Admin orders should be 200, got ${res3.status}`);
  console.log("✓ Admin GET /api/admin/orders -> 200");

  // Test 4: Admin GET /api/admin/stats -> 200
  const adminStatsRoute = (await import("../src/routes/admin")).adminRoutes.getStats;
  const req4 = createMockRequest("GET", "http://localhost/api/admin/stats", undefined, adminCookie);
  const res4 = await adminStatsRoute(req4, mockEnv);
  assert(res4.status === 200, `Admin stats should be 200, got ${res4.status}`);
  const body4 = await res4.json();
  assert(typeof body4.totalOrders === "number", "Should have totalOrders");
  console.log("✓ Admin GET /api/admin/stats -> 200");

  // Test 5: Technician accessing admin routes -> 403
  const techSession = await createSession(mockEnv, { id: "tech-123", role: "TECHNICIAN" });
  const techCookie = techSession.cookie;
  const req5 = createMockRequest("GET", "http://localhost/api/admin/users", undefined, techCookie);
  const res5 = await adminUsersRoute(req5, mockEnv);
  assert(res5.status === 403, `Technician accessing admin should be 403, got ${res5.status}`);
  console.log("✓ Technician accessing admin routes -> 403");

  console.log("\n=== Testing insurer routes ===");
  
  // Test 6: Insurer GET /api/insurer/orders -> 200
  const insurerOrdersRoute = (await import("../src/routes/insurer")).insurerRoutes.getAssignedOrders;
  const req6 = createMockRequest("GET", "http://localhost/api/insurer/orders", undefined, insurerCookie);
  const res6 = await insurerOrdersRoute(req6, mockEnv);
  assert(res6.status === 200, `Insurer orders should be 200, got ${res6.status}`);
  console.log("✓ Insurer GET /api/insurer/orders -> 200");

  // Test 7: Insurer GET /api/insurer/orders/:uuid -> 200
  const insurerOrderRoute = (await import("../src/routes/insurer")).insurerRoutes.getOrderDetails;
  const req7 = createMockRequest("GET", "http://localhost/api/insurer/orders/wo-uuid-1", undefined, insurerCookie);
  const res7 = await insurerOrderRoute(req7, mockEnv, "wo-uuid-1");
  assert(res7.status === 200, `Insurer order details should be 200, got ${res7.status}`);
  console.log("✓ Insurer GET /api/insurer/orders/:uuid -> 200");

  // Test 8: Technician accessing insurer routes -> 403
  const req8 = createMockRequest("GET", "http://localhost/api/insurer/orders", undefined, techCookie);
  const res8 = await insurerOrdersRoute(req8, mockEnv);
  assert(res8.status === 403, `Technician accessing insurer should be 403, got ${res8.status}`);
  console.log("✓ Technician accessing insurer routes -> 403");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});