function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

import { createSession, hashPassword } from "../src/auth";

const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        first: async () => {
          console.log("insurer portal first() SQL:", JSON.stringify(sql));
          if (sql.includes("SELECT wo.*, v.plate, v.make, v.model FROM work_orders") && sql.includes("insurer_token")) {
            return {
              id: "wo-1",
              uuid: "wo-uuid-1",
              reference: "WO-2026-001",
              current_status: "EN_DESMONTAJE",
              entry_date: "2026-10-20",
              estimated_delivery_date: "2026-10-25",
              plate: "1234ABC",
              make: "BMW",
              model: "M3",
              year: 2023,
              color: "Azul",
              insurer_id: "insurer-1"
            };
          }
          return null;
        },
        run: async () => ({ success: true }),
        all: async () => {
          if (sql.includes("work_order_events") && sql.includes("note_public IS NOT NULL")) {
            return { results: [
              { new_status: "RECEPCIONADO", note_public: "Recibido en taller", created_at: "2026-10-20T10:00:00" },
              { new_status: "EN_DESMONTAJE", note_public: "Desmontaje iniciado", created_at: "2026-10-21T08:00:00" }
            ]};
          }
          if (sql.includes("photos") && sql.includes("visibility") && sql.includes("INSURER_VISIBLE")) {
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
  console.log("=== Testing insurer portal ===");
  
  const { insurerPortal } = await import("../src/index");
  
  // Test 1: GET /aseguradora/:token valid -> 200 HTML
  const req1 = new Request("http://localhost/aseguradora/ins-token-123", { method: "GET" });
  const res1 = await insurerPortal(req1, mockEnv, "ins-token-123");
  assert(res1.status === 200, `Should be 200, got ${res1.status}`);
  const contentType = res1.headers.get("content-type");
  assert(contentType && contentType.includes("text/html"), `Should be HTML, got ${contentType}`);
  const html = await res1.text();
  assert(html.includes("WO-2026-001"), "Should contain order reference");
  assert(html.includes("BMW"), "Should contain vehicle make");
  assert(html.includes("EN_DESMONTAJE"), "Should contain status");
  assert(html.includes("Recibido en taller"), "Should contain timeline event");
  assert(html.includes("Desmontaje iniciado"), "Should contain timeline event");
  assert(html.includes("damage"), "Should contain photo category");
  console.log("✓ GET /aseguradora/:token valid -> 200 HTML");

  // Test 2: GET /aseguradora/:token invalid -> 404
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
  const req2 = new Request("http://localhost/aseguradora/invalid-token", { method: "GET" });
  const res2 = await insurerPortal(req2, mockEnvInvalid, "invalid-token");
  assert(res2.status === 404, `Should be 404, got ${res2.status}`);
  console.log("✓ GET /aseguradora/:token invalid -> 404");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});