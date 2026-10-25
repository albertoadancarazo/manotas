import { createSession, hashPassword, verifyPassword } from "../src/auth";
import { json } from "../src/utils/response";

let mockUser: { id: string; password_hash: string; role: string } | null | undefined = undefined;

const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        first: async () => {
          if (sql.includes("SELECT id, password_hash, role FROM users")) {
            if (mockUser !== undefined) return mockUser;
            const hash = await hashPassword("Test1234!");
            return { id: "user-123", password_hash: hash, role: "TECHNICIAN" };
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

function setMockUser(user: { id: string; password_hash: string; role: string } | null) {
  mockUser = user;
}

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
  console.log("=== Testing auth routes ===");
  
  // Test 1: POST /api/auth/login with valid credentials
  const req1 = createMockRequest("POST", "http://localhost/api/auth/login", { email: "test@manotas.es", password: "Test1234!" });
  const loginRoute = (await import("../src/routes/auth")).authRoutes.login;
  const res1 = await loginRoute(req1, mockEnv);
  assert(res1.status === 200, `Login should be 200, got ${res1.status}`);
  const body1 = await res1.json();
  assert(body1.user.id === "user-123", "User ID should match");
  assert(body1.user.role === "TECHNICIAN", "Role should match");
  const cookie1 = res1.headers.get("Set-Cookie");
  assert(cookie1 && cookie1.includes("manotas_session="), "Should set session cookie");
  assert(cookie1.includes("HttpOnly"), "Cookie should be HttpOnly");
  console.log("✓ POST /api/auth/login valid credentials");

  // Test 2: POST /api/auth/login with invalid password
  const req2 = createMockRequest("POST", "http://localhost/api/auth/login", { email: "test@manotas.es", password: "WrongPass" });
  const res2 = await loginRoute(req2, mockEnv);
  assert(res2.status === 401, `Invalid password should be 401, got ${res2.status}`);
  const body2 = await res2.json();
  assert(body2.error === "invalid_credentials", "Should have invalid_credentials error");
  console.log("✓ POST /api/auth/login invalid password");

  // Test 3: POST /api/auth/login with non-existent user
  setMockUser(null);
  const req3 = createMockRequest("POST", "http://localhost/api/auth/login", { email: "none@manotas.es", password: "Test1234!" });
  const res3 = await loginRoute(req3, mockEnv);
  assert(res3.status === 401, `Non-existent user should be 401, got ${res3.status}`);
  console.log("✓ POST /api/auth/login non-existent user");

  // Test 4: POST /api/auth/logout
  const req4 = createMockRequest("POST", "http://localhost/api/auth/logout");
  const logoutRoute = (await import("../src/routes/auth")).authRoutes.logout;
  const res4 = await logoutRoute(req4, mockEnv);
  assert(res4.status === 200, `Logout should be 200, got ${res4.status}`);
  const cookie4 = res4.headers.get("Set-Cookie");
  assert(cookie4 && cookie4.includes("manotas_session=") && cookie4.includes("Max-Age=0"), "Should clear session cookie");
  console.log("✓ POST /api/auth/logout clears cookie");

  // Test 5: GET /api/auth/me with valid session
  const session = await createSession(mockEnv, { id: "user-123", role: "TECHNICIAN" });
  const req5 = createMockRequest("GET", "http://localhost/api/auth/me", undefined, session.cookie);
  const meRoute = (await import("../src/routes/auth")).authRoutes.me;
  const res5 = await meRoute(req5, mockEnv);
  assert(res5.status === 200, `Me should be 200, got ${res5.status}`);
  const body5 = await res5.json();
  assert(body5.user.userId === "user-123", "User ID should match");
  assert(body5.user.role === "TECHNICIAN", "Role should match");
  console.log("✓ GET /api/auth/me with valid session");

  // Test 6: GET /api/auth/me without session
  const req6 = createMockRequest("GET", "http://localhost/api/auth/me");
  const res6 = await meRoute(req6, mockEnv);
  assert(res6.status === 401, `Me without session should be 401, got ${res6.status}`);
  console.log("✓ GET /api/auth/me without session");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});