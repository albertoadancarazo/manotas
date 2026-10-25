import { createSession, hashPassword } from "../src/auth";

const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: {
    prepare: (sql: string) => {
      console.log("prepare() called with:", sql.substring(0, 80));
      return {
        bind: (...args: any[]) => {
          console.log("bind() called with:", args);
          return {
            first: async () => {
              if (sql.includes("SELECT id, password_hash, role FROM users")) {
                const hash = await hashPassword("Test1234!");
                if (sql.includes("tech@manotas.es")) {
                  return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
                }
                return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
              }
              if (sql.includes("work_orders wo")) {
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
              if (sql.includes("SELECT new_status, note_internal, note_public, created_at FROM work_order_events")) {
                return { results: [
                  { new_status: "RECEPCIONADO", note_public: "Recibido en taller", note_internal: "Revisión inicial OK", created_at: "2026-10-20T10:00:00" }
                ]};
              }
              if (sql.includes("SELECT id, category, visibility, uploaded_at, thumbnail_key FROM photos")) {
                return { results: [] };
              }
              return { results: [] };
            }
          };
        }
      };
    }
  },
  PHOTOS: null
} as any;

function createMockRequest(method: string, url: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers.Cookie = cookie;
  return new Request(url, { method, headers });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  console.log("=== Testing mobile routes ===");
  
  const techSession = await createSession(mockEnv, { id: "tech-123", role: "TECHNICIAN" });
  const techCookie = techSession.cookie;

  // Test 1: GET /taller/orden/:uuid without auth -> 401
  const req1 = createMockRequest("GET", "http://localhost/taller/orden/wo-uuid-1");
  const mobileRoute = (await import("../src/routes/mobile")).mobileRoutes.orderPage;
  const res1 = await mobileRoute(req1, mockEnv, "wo-uuid-1");
  assert(res1.status === 401, `Should be 401 without auth, got ${res1.status}`);
  console.log("✓ GET /taller/orden/:uuid without auth -> 401");

  // Test 2: GET /taller/orden/:uuid with auth -> 200 HTML
  const req2 = createMockRequest("GET", "http://localhost/taller/orden/wo-uuid-1", techCookie);
  const res2 = await mobileRoute(req2, mockEnv, "wo-uuid-1");
  assert(res2.status === 200, `Should be 200 with auth, got ${res2.status}`);
  const contentType = res2.headers.get("content-type");
  assert(contentType && contentType.includes("text/html"), `Should be HTML, got ${contentType}`);
  const html = await res2.text();
  assert(html.includes("WO-2026-001"), "Should contain order reference");
  assert(html.includes("1234ABC"), "Should contain plate");
  assert(html.includes("BMW"), "Should contain make");
  assert(html.includes("M3"), "Should contain model");
  assert(html.includes("Recepcionado"), "Should contain status label");
  assert(html.includes("Subir Fotos"), "Should contain photo upload section");
  assert(html.includes("Incidencias"), "Should contain incidents section");
  assert(html.includes("Timeline"), "Should contain timeline section");
  console.log("✓ GET /taller/orden/:uuid with auth -> 200 HTML");

  // Test 3: GET /taller/orden/:uuid nonexistent -> 404
  const mockEnvNotFound = {
    ...mockEnv,
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => {
            if (sql.includes("SELECT id, password_hash, role FROM users")) {
              const hash = await hashPassword("Test1234!");
              return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
            }
            return null;
          }
        })
      })
    },
    PHOTOS: null
  } as any;
  const req3 = createMockRequest("GET", "http://localhost/taller/orden/nonexistent", techCookie);
  const res3 = await mobileRoute(req3, mockEnvNotFound, "nonexistent");
  assert(res3.status === 404, `Should be 404 for nonexistent, got ${res3.status}`);
  console.log("✓ GET /taller/orden/:uuid nonexistent -> 404");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});