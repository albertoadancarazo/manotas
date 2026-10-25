import { createSession, hashPassword } from "../src/auth";

function createMockRequest(method: string, url: string) {
  return new Request(url, { method });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        first: async () => {
          console.log("customer portal first() SQL:", JSON.stringify(sql));
          if (sql.includes("SELECT wo.id, wo.reference, wo.current_status, wo.entry_date") && sql.includes("wo.public_token")) {
            return { 
              id: "wo-1", 
              reference: "WO-2026-001", 
              current_status: "EN_DESMONTAJE", 
              entry_date: "2026-10-20", 
              estimated_delivery_date: "2026-10-25",
              plate: "1234ABC", 
              make: "BMW", 
              model: "M3"
            };
          }
          return null;
        },
        run: async () => ({ success: true }),
        all: async () => {
          console.log("customer portal all() SQL:", JSON.stringify(sql));
          if (sql.includes("work_order_events")) {
            return { results: [
              { new_status: "RECEPCIONADO", note_public: "Recibido en taller", created_at: "2026-10-20T10:00:00" },
              { new_status: "EN_DESMONTAJE", note_public: "Desmontaje iniciado", created_at: "2026-10-21T08:00:00" }
            ]};
          }
          if (sql.includes("photos") && sql.includes("visibility")) {
            return { results: [
              { id: "photo-1", category: "damage", uploaded_at: "2026-10-20T12:00:00" },
              { id: "photo-2", category: "process", uploaded_at: "2026-10-21T09:00:00" }
            ]};
          }
          return { results: [] };
        }
      })
    })
  },
  PHOTOS: null
} as any;

async function runTests() {
  console.log("=== Testing customer portal ===");
  
  // Test 1: GET /seguimiento/:token valid -> 200 HTML
  const { customerPortal } = await import("../src/index");
  const req1 = createMockRequest("GET", "http://localhost/seguimiento/pub-token-123");
  const res1 = await customerPortal(req1, mockEnv, "pub-token-123");
  assert(res1.status === 200, `Should be 200, got ${res1.status}`);
  const contentType = res1.headers.get("content-type");
  assert(contentType && contentType.includes("text/html"), `Should be HTML, got ${contentType}`);
  const html = await res1.text();
  console.log("HTML output:", html.substring(0, 2000));
  assert(html.includes("WO-2026-001"), "Should contain order reference");
  assert(html.includes("EN_DESMONTAJE"), "Should contain status");
  assert(html.includes("BMW"), "Should contain vehicle make");
  assert(html.includes("Recibido en taller"), "Should contain timeline event");
  assert(html.includes("Desmontaje iniciado"), "Should contain timeline event");
  assert(html.includes("damage"), "Should contain photo category");
  console.log("✓ GET /seguimiento/:token valid -> 200 HTML");

  // Test 2: GET /seguimiento/:token invalid -> 404
  const mockEnvInvalid = {
    ...mockEnv,
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => null
        })
      })
    },
    PHOTOS: null
  } as any;
  const req2 = createMockRequest("GET", "http://localhost/seguimiento/invalid-token");
  const res2 = await customerPortal(req2, mockEnvInvalid, "invalid-token");
  assert(res2.status === 404, `Should be 404, got ${res2.status}`);
  console.log("✓ GET /seguimiento/:token invalid -> 404");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});