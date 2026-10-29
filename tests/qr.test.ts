import { createSession, hashPassword, generateToken } from "../src/auth";
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
              return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
            }
            return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
          }
          if (sql.includes("SELECT uuid FROM work_orders WHERE id = ?")) {
            return { uuid: "wo-uuid-1" };
          }
          if (sql.includes("SELECT id, public_token, insurer_token FROM work_orders WHERE uuid = ?")) {
            return { id: "wo-1", public_token: "pub-token-123", insurer_token: "ins-token-456" };
          }
          return null;
        },
        run: async () => ({ success: true }),
        all: async () => ({ results: [] })
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
  console.log("=== Testing QR routes ===");
  
  const adminSession = await createSession(mockEnv, { id: "admin-1", role: "ADMIN" });
  const adminCookie = adminSession.cookie;
  
  const techSession = await createSession(mockEnv, { id: "tech-123", role: "TECHNICIAN" });
  const techCookie = techSession.cookie;

  // Test 1: POST /api/qr/generate without auth -> 401
  const req1 = createMockRequest("POST", "http://localhost/api/qr/generate", { workOrderId: "wo-1", role: "technician" });
  const qrGenerateRoute = (await import("../src/routes/qr")).qrRoutes.generate;
  const res1 = await qrGenerateRoute(req1, mockEnv);
  assert(res1.status === 401, `QR generate should be 401 without auth, got ${res1.status}`);
  console.log("✓ POST /api/qr/generate without auth -> 401");

  // Test 2: POST /api/qr/generate with technician auth -> 200
  const req2 = createMockRequest("POST", "http://localhost/api/qr/generate", { workOrderId: "wo-1", role: "technician" }, techCookie);
  const res2 = await qrGenerateRoute(req2, mockEnv);
  assert(res2.status === 200, `QR generate should be 200 with auth, got ${res2.status}`);
  const body2 = await res2.json();
  assert(body2.qrDataUrl && body2.qrDataUrl.startsWith("data:image/png;base64,"), "Should return base64 PNG data URL");
  assert(body2.token && body2.token.length > 0, "Should return token");
  assert(body2.url && body2.url.includes("/taller/orden/"), "Should return technician URL");
  console.log("✓ POST /api/qr/generate with technician auth -> 200");

  // Test 3: POST /api/qr/generate with customer role
  const req3 = createMockRequest("POST", "http://localhost/api/qr/generate", { workOrderId: "wo-1", role: "customer" }, adminCookie);
  const res3 = await qrGenerateRoute(req3, mockEnv);
  assert(res3.status === 200, `QR generate customer should be 200, got ${res3.status}`);
  const body3 = await res3.json();
  assert(body3.url && body3.url.includes("/seguimiento/"), "Should return customer URL");
  console.log("✓ POST /api/qr/generate with customer role -> 200");

  // Test 4: POST /api/qr/generate with insurer role
  const req4 = createMockRequest("POST", "http://localhost/api/qr/generate", { workOrderId: "wo-1", role: "insurer" }, adminCookie);
  const res4 = await qrGenerateRoute(req4, mockEnv);
  assert(res4.status === 200, `QR generate insurer should be 200, got ${res4.status}`);
  const body4 = await res4.json();
  assert(body4.url && body4.url.includes("/aseguradora/"), "Should return insurer URL");
  console.log("✓ POST /api/qr/generate with insurer role -> 200");

  // Test 5: POST /api/qr/generate for non-existent order -> 404
  const mockEnvNoOrder = {
    ...mockEnv,
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => {
            if (sql.includes("SELECT uuid FROM work_orders WHERE id = ?")) {
              return null;
            }
            return null;
          }
        })
      })
    }
  } as any;
  const req5 = createMockRequest("POST", "http://localhost/api/qr/generate", { workOrderId: "nonexistent", role: "technician" }, techCookie);
  const res5 = await qrGenerateRoute(req5, mockEnvNoOrder);
  assert(res5.status === 404, `QR generate nonexistent should be 404, got ${res5.status}`);
  console.log("✓ POST /api/qr/generate nonexistent order -> 404");

  // Test 6: GET /api/qr/verify/:uuid valid -> 200
  const qrVerifyRoute = (await import("../src/routes/qr")).qrRoutes.verify;
  const req6 = createMockRequest("GET", "http://localhost/api/qr/verify/wo-uuid-1");
  const res6 = await qrVerifyRoute(req6, mockEnv, "wo-uuid-1");
  assert(res6.status === 200, `QR verify should be 200, got ${res6.status}`);
  const body6 = await res6.json();
  assert(body6.valid === true, "Should be valid");
  assert(body6.workOrderId === "wo-1", "Should return workOrderId");
  console.log("✓ GET /api/qr/verify/:uuid valid -> 200");

  // Test 7: GET /api/qr/verify/:uuid invalid -> 404
  const mockEnvInvalid = {
    ...mockEnv,
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => null
        })
      })
    }
  } as any;
  const req7 = createMockRequest("GET", "http://localhost/api/qr/verify/invalid-uuid");
  const res7 = await qrVerifyRoute(req7, mockEnvInvalid, "invalid-uuid");
  assert(res7.status === 404, `QR verify invalid should be 404, got ${res7.status}`);
  const body7 = await res7.json();
  assert(body7.valid === false, "Should be invalid");
  console.log("✓ GET /api/qr/verify/:uuid invalid -> 404");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});