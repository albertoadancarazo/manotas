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
            if (sql.includes("admin@manotas.es")) {
              return { id: "admin-1", password_hash: hash, role: "ADMIN" };
            }
            if (sql.includes("tech@manotas.es")) {
              return { id: "tech-1", password_hash: hash, role: "TECHNICIAN" };
            }
            return { id: "admin-1", password_hash: hash, role: "ADMIN" };
          }
          if (sql.includes("SELECT COUNT(*) as count FROM work_orders WHERE active = 1 AND current_status NOT IN")) {
            return { results: [{ count: 8 }] };
          }
          if (sql.includes("SELECT COUNT(*) as count FROM work_orders WHERE active = 1")) {
            return { results: [{ count: 10 }] };
          }
          if (sql.includes("SELECT current_status, COUNT(*) as count FROM work_orders")) {
            return { results: [
              { current_status: "RECEPCIONADO", count: 3 },
              { current_status: "EN_DESMONTAJE", count: 2 },
              { current_status: "LISTO_PARA_ENTREGA", count: 3 }
            ]};
          }
          if (sql.includes("SELECT COUNT(*) as count FROM users WHERE active = 1")) {
            return { results: [{ count: 5 }] };
          }
          return null;
        },
        run: async () => ({ success: true }),
        all: async () => {
          if (sql.includes("SELECT id, name, email, role, active, created_at FROM users")) {
            return { results: [
              { id: "admin-1", name: "Admin User", email: "admin@manotas.es", role: "ADMIN", active: 1, created_at: "2026-10-20" },
              { id: "tech-1", name: "Tech User", email: "tech@manotas.es", role: "TECHNICIAN", active: 1, created_at: "2026-10-20" },
              { id: "tech-2", name: "Tech User 2", email: "tech2@manotas.es", role: "TECHNICIAN", active: 1, created_at: "2026-10-20" }
            ]};
          }
          if (sql.includes("SELECT wo.*, v.plate, v.make, v.model FROM work_orders") && sql.includes("ORDER BY wo.entry_date DESC")) {
            return { results: [
              { id: "wo-1", uuid: "wo-uuid-1", reference: "WO-2026-001", current_status: "RECEPCIONADO", entry_date: "2026-10-20", estimated_delivery_date: "2026-10-25", plate: "1234ABC", make: "BMW", model: "M3", assigned_technician: "tech-1" },
              { id: "wo-2", uuid: "wo-uuid-2", reference: "WO-2026-002", current_status: "EN_DESMONTAJE", entry_date: "2026-10-19", estimated_delivery_date: "2026-10-24", plate: "5678DEF", make: "Audi", model: "RS6", assigned_technician: "tech-2" }
            ]};
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
  return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  console.log("=== Testing admin dashboard ===");
  
  const adminSession = await createSession(mockEnv, { id: "admin-1", role: "ADMIN" });
  const adminCookie = adminSession.cookie;
  
  const techSession = await createSession(mockEnv, { id: "tech-1", role: "TECHNICIAN" });
  const techCookie = techSession.cookie;

  // Test 1: GET /admin/dashboard without auth -> 401
  const req1 = createMockRequest("GET", "http://localhost/admin/dashboard");
  const dashboardRoute = (await import("../src/routes/admin-dashboard")).adminDashboardRoutes.dashboard;
  const res1 = await dashboardRoute(req1, mockEnv);
  assert(res1.status === 401, `Should be 401 without auth, got ${res1.status}`);
  console.log("✓ GET /admin/dashboard without auth -> 401");

  // Test 2: GET /admin/dashboard with tech auth -> 403
  const req2 = createMockRequest("GET", "http://localhost/admin/dashboard", undefined, techCookie);
  const res2 = await dashboardRoute(req2, mockEnv);
  assert(res2.status === 403, `Should be 403 for tech, got ${res2.status}`);
  console.log("✓ GET /admin/dashboard with tech -> 403");

  // Test 3: GET /admin/dashboard with admin auth -> 200 HTML
  const req3 = createMockRequest("GET", "http://localhost/admin/dashboard", undefined, adminCookie);
  const res3 = await dashboardRoute(req3, mockEnv);
  assert(res3.status === 200, `Should be 200 with admin, got ${res3.status}`);
  const contentType = res3.headers.get("content-type");
  assert(contentType && contentType.includes("text/html"), `Should be HTML, got ${contentType}`);
  const html = await res3.text();
  assert(html.includes("Dashboard"), "Should contain Dashboard title");
  assert(html.includes("Total Órdenes"), "Should contain stats label");
  assert(html.includes("Órdenes Activas"), "Should contain active orders label");
  assert(html.includes("Usuarios"), "Should contain users label");
  console.log("✓ GET /admin/dashboard with admin -> 200 HTML");

  // Test 4: GET /admin/dashboard/orders -> 200 HTML with order table
  const ordersRoute = (await import("../src/routes/admin-dashboard")).adminDashboardRoutes.orders;
  const req4 = createMockRequest("GET", "http://localhost/admin/dashboard/orders", undefined, adminCookie);
  const res4 = await ordersRoute(req4, mockEnv);
  assert(res4.status === 200, `Should be 200, got ${res4.status}`);
  const html4 = await res4.text();
  assert(html4.includes("Órdenes"), "Should contain orders title");
  assert(html4.includes("Referencia"), "Should contain table header");
  console.log("✓ GET /admin/dashboard/orders -> 200 HTML");

  // Test 5: GET /admin/dashboard/users -> 200 HTML with user table
  const usersRoute = (await import("../src/routes/admin-dashboard")).adminDashboardRoutes.users;
  const req5 = createMockRequest("GET", "http://localhost/admin/dashboard/users", undefined, adminCookie);
  const res5 = await usersRoute(req5, mockEnv);
  assert(res5.status === 200, `Should be 200, got ${res5.status}`);
  const html5 = await res5.text();
  assert(html5.includes("Usuarios"), "Should contain users title");
  assert(html5.includes("Nombre"), "Should contain table header");
  console.log("✓ GET /admin/dashboard/users -> 200 HTML");

  // Test 6: POST /admin/dashboard/users (create user) -> 201
  const createUserRoute = (await import("../src/routes/admin-dashboard")).adminDashboardRoutes.createUser;
  const req6 = createMockRequest("POST", "http://localhost/admin/dashboard/users", { 
    name: "New Tech", 
    email: "newtech@manotas.es", 
    password: "Password123!", 
    role: "TECHNICIAN" 
  }, adminCookie);
  const res6 = await createUserRoute(req6, mockEnv);
  assert(res6.status === 201, `Should be 201, got ${res6.status}`);
  console.log("✓ POST /admin/dashboard/users -> 201");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});