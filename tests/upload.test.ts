import { createSession, hashPassword, generateUUID } from "../src/auth";
import { json } from "../src/utils/response";

const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        first: async () => {
          if (sql.includes("SELECT id, password_hash, role FROM users")) {
            const hash = await hashPassword("Test1234!");
            if (sql.includes("tech@manotas.es")) {
              return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
            }
            if (sql.includes("client@manotas.es")) {
              return { id: "client-1", password_hash: hash, role: "TECHNICIAN" };
            }
            return { id: "tech-123", password_hash: hash, role: "TECHNICIAN" };
          }
          if (sql.includes("SELECT * FROM photos WHERE id = ?")) {
            return { 
              id: "photo-1", 
              work_order_id: "wo-1", 
              technician_id: "tech-123",
              object_key: "photos/wo-1/test.jpg",
              visibility: "INTERNAL_ONLY"
            };
          }
          return null;
        },
        run: async () => ({ success: true }),
        all: async () => ({ results: [] })
      })
    })
  },
  PHOTOS: {
    put: async (key: string, data: ArrayBuffer, options: any) => {},
    createSignedUrl: async (key: string, options: any) => `https://signed.example.com/${key}?sig=test`
  }
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
  console.log("=== Testing upload routes ===");
  
  const techSession = await createSession(mockEnv, { id: "tech-123", role: "TECHNICIAN" });
  const techCookie = techSession.cookie;
  
  const clientSession = await createSession(mockEnv, { id: "client-1", role: "TECHNICIAN" });
  const clientCookie = clientSession.cookie;

  // Test 1: POST /api/photos/upload without auth -> 401
  const req1 = createMockRequest("POST", "http://localhost/api/photos/upload", { file: new File([""], "test.jpg"), workOrderId: "wo-1", category: "damage" });
  const uploadRoute = (await import("../src/routes/upload")).uploadRoutes.upload;
  const res1 = await uploadRoute(req1, mockEnv);
  assert(res1.status === 401, `Upload should be 401 without auth, got ${res1.status}`);
  console.log("✓ POST /api/photos/upload without auth -> 401");

  // Test 2: POST /api/photos/upload with valid data -> 201
  const testFile = new File(["fake image data"], "test.jpg", { type: "image/jpeg" });
  const formData = new FormData();
  formData.append("file", testFile);
  formData.append("workOrderId", "wo-1");
  formData.append("category", "damage");
  formData.append("visibility", "INTERNAL_ONLY");
  
  const req2 = new Request("http://localhost/api/photos/upload", {
    method: "POST",
    headers: { Cookie: techCookie },
    body: formData
  });
  const res2 = await uploadRoute(req2, mockEnv);
  assert(res2.status === 201, `Upload should be 201, got ${res2.status}`);
  const body2 = await res2.json();
  assert(body2.id && body2.objectKey, "Should return photo id and objectKey");
  console.log("✓ POST /api/photos/upload valid -> 201");

  // Test 3: POST /api/photos/upload with invalid MIME -> 415
  const badFile = new File(["bad"], "test.exe", { type: "application/x-msdownload" });
  const badFormData = new FormData();
  badFormData.append("file", badFile);
  badFormData.append("workOrderId", "wo-1");
  badFormData.append("category", "damage");
  
  const req3 = new Request("http://localhost/api/photos/upload", {
    method: "POST",
    headers: { Cookie: techCookie },
    body: badFormData
  });
  const res3 = await uploadRoute(req3, mockEnv);
  assert(res3.status === 415, `Invalid MIME should be 415, got ${res3.status}`);
  console.log("✓ POST /api/photos/upload invalid MIME -> 415");

  // Test 4: GET /api/photos/:id/signed-url with owner -> 200
  const signedUrlRoute = (await import("../src/routes/upload")).uploadRoutes.signedUrl;
  const req4 = createMockRequest("GET", "http://localhost/api/photos/photo-1/signed-url", undefined, techCookie);
  const res4 = await signedUrlRoute(req4, mockEnv, "photo-1");
  assert(res4.status === 200, `Signed URL should be 200 for owner, got ${res4.status}`);
  const body4 = await res4.json();
  assert(body4.signedUrl && body4.signedUrl.includes("signed.example.com"), "Should return signed URL");
  console.log("✓ GET /api/photos/:id/signed-url owner -> 200");

  // Test 5: GET /api/photos/:id/signed-url without auth -> 401
  const req5 = createMockRequest("GET", "http://localhost/api/photos/photo-1/signed-url");
  const res5 = await signedUrlRoute(req5, mockEnv, "photo-1");
  assert(res5.status === 401, `Signed URL should be 401 without auth, got ${res5.status}`);
  console.log("✓ GET /api/photos/:id/signed-url no auth -> 401");

  // Test 6: GET /api/photos/:id/signed-url non-owner INTERNAL_ONLY -> 403
  // We need a photo owned by tech-123 but requested by client-1
  const req6 = createMockRequest("GET", "http://localhost/api/photos/photo-1/signed-url", undefined, clientCookie);
  const res6 = await signedUrlRoute(req6, mockEnv, "photo-1");
  assert(res6.status === 403, `Signed URL should be 403 for non-owner INTERNAL_ONLY, got ${res6.status}`);
  console.log("✓ GET /api/photos/:id/signed-url non-owner INTERNAL_ONLY -> 403");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});