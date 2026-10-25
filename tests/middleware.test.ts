import { requireAuth, requireRole, optionalAuth } from "../src/middleware/auth";
import { createSession } from "../src/auth";

const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: null,
  PHOTOS: null
} as any;

function createMockContext(request: Request, env = mockEnv) {
  return {
    request,
    env,
    user: undefined as any
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTests() {
  console.log("=== Testing requireAuth ===");
  
  // Test 1: No cookie -> 401
  const ctx1 = createMockContext(new Request("http://localhost"));
  const middleware1 = requireAuth();
  const result1 = await middleware1(ctx1, async () => new Response("OK"));
  assert(result1 instanceof Response, "Should return Response");
  assert(result1.status === 401, `Should be 401, got ${result1.status}`);
  const body1 = await result1.json();
  assert(body1.error === "unauthorized", "Should have unauthorized error");
  console.log("✓ requireAuth returns 401 without cookie");

  // Test 2: Invalid cookie -> 401
  const ctx2 = createMockContext(new Request("http://localhost", { headers: { Cookie: "manotas_session=invalid" } }));
  const middleware2 = requireAuth();
  const result2 = await middleware2(ctx2, async () => new Response("OK"));
  assert(result2.status === 401, `Should be 401, got ${result2.status}`);
  console.log("✓ requireAuth returns 401 with invalid token");

  // Test 3: Valid cookie -> sets ctx.user and calls next
  const session = await createSession(mockEnv, { id: "user-123", role: "TECHNICIAN" });
  const ctx3 = createMockContext(new Request("http://localhost", { headers: { Cookie: session.cookie } }));
  let nextCalled = false;
  const middleware3 = requireAuth();
  const result3 = await middleware3(ctx3, async () => {
    nextCalled = true;
    assert(ctx3.user !== undefined, "ctx.user should be set");
    assert(ctx3.user.userId === "user-123", "userId should match");
    assert(ctx3.user.role === "TECHNICIAN", "role should match");
    return new Response("OK");
  });
  assert(nextCalled === true, "next() should be called");
  assert(result3.status === 200, `Should be 200, got ${result3.status}`);
  console.log("✓ requireAuth sets ctx.user and calls next with valid token");

  console.log("\n=== Testing requireRole (chained after requireAuth) ===");
  
  // Test 4: requireRole allows matching role (chained after requireAuth)
  const ctx4 = createMockContext(new Request("http://localhost", { headers: { Cookie: session.cookie } }));
  let nextCalled4 = false;
  const authMiddleware4 = requireAuth();
  const roleMiddleware4 = requireRole("TECHNICIAN", "ADMIN");
  const result4 = await authMiddleware4(ctx4, async () => {
    return await roleMiddleware4(ctx4, async () => {
      nextCalled4 = true;
      return new Response("OK");
    });
  });
  assert(nextCalled4 === true, "next() should be called for allowed role");
  assert(result4.status === 200, `Should be 200, got ${result4.status}`);
  console.log("✓ requireRole allows matching role");

  // Test 5: requireRole denies non-matching role
  const sessionAdmin = await createSession(mockEnv, { id: "user-456", role: "INSURER" });
  const ctx5 = createMockContext(new Request("http://localhost", { headers: { Cookie: sessionAdmin.cookie } }));
  const authMiddleware5 = requireAuth();
  const roleMiddleware5 = requireRole("TECHNICIAN", "ADMIN");
  const result5 = await authMiddleware5(ctx5, async () => {
    return await roleMiddleware5(ctx5, async () => new Response("OK"));
  });
  assert(result5.status === 403, `Should be 403, got ${result5.status}`);
  const body5 = await result5.json();
  assert(body5.error === "forbidden", "Should have forbidden error");
  console.log("✓ requireRole denies non-matching role");

  // Test 6: requireRole denies unauthenticated (requireAuth returns 401 first)
  const ctx6 = createMockContext(new Request("http://localhost"));
  const authMiddleware6 = requireAuth();
  const roleMiddleware6 = requireRole("TECHNICIAN");
  const result6 = await authMiddleware6(ctx6, async () => {
    return await roleMiddleware6(ctx6, async () => new Response("OK"));
  });
  assert(result6.status === 401, `Should be 401 for unauthenticated, got ${result6.status}`);
  console.log("✓ requireAuth returns 401 for unauthenticated (before requireRole)");

  console.log("\n=== Testing optionalAuth ===");
  
  // Test 7: optionalAuth sets user when valid cookie present
  const ctx7 = createMockContext(new Request("http://localhost", { headers: { Cookie: session.cookie } }));
  let nextCalled7 = false;
  const middleware7 = optionalAuth();
  const result7 = await middleware7(ctx7, async () => {
    nextCalled7 = true;
    assert(ctx7.user !== undefined, "ctx.user should be set with valid cookie");
    return new Response("OK");
  });
  assert(nextCalled7 === true, "next() should be called");
  console.log("✓ optionalAuth sets ctx.user with valid cookie");

  // Test 8: optionalAuth doesn't set user when no cookie, but calls next
  const ctx8 = createMockContext(new Request("http://localhost"));
  let nextCalled8 = false;
  const middleware8 = optionalAuth();
  const result8 = await middleware8(ctx8, async () => {
    nextCalled8 = true;
    assert(ctx8.user === undefined, "ctx.user should be undefined without cookie");
    return new Response("OK");
  });
  assert(nextCalled8 === true, "next() should be called");
  assert(ctx8.user === undefined, "ctx.user should be undefined");
  console.log("✓ optionalAuth calls next without setting user when no cookie");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});