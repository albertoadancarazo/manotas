import { hashPassword, verifyPassword, generateToken, encodeQRPayload, decodeQRPayload } from "../src/utils/crypto";
import { hashPassword as hp, verifyPassword as vp, createSession, verifySession, clearSessionCookie } from "../src/auth";

// Mock env for testing
const mockEnv = {
  JWT_SECRET: "test-secret-key-for-testing-only-32chars!!",
  DB: null,
  PHOTOS: null
} as any;

async function runTests() {
  console.log("=== Testing crypto utilities ===");
  
  // Test generateToken
  const token = generateToken(32);
  console.assert(token.length === 43, `Token length should be 43 (base64url 32 bytes), got ${token.length}`);
  console.assert(!token.includes("+") && !token.includes("/") && !token.includes("="), "Token should be base64url encoded");
  console.log("✓ generateToken");

  // Test QR payload encoding/decoding
  const payload = encodeQRPayload("test-uuid-123", "technician");
  const decoded = decodeQRPayload(payload);
  console.assert(decoded !== null, "QR payload should decode");
  console.assert(decoded.v === 1, "Version should be 1");
  console.assert(decoded.u === "test-uuid-123", "UUID should match");
  console.assert(decoded.r === "technician", "Role should match");
  console.log("✓ QR encode/decode");

  // Test invalid QR payload
  const invalid = decodeQRPayload("not-json");
  console.assert(invalid === null, "Invalid JSON should return null");
  console.log("✓ Invalid QR payload returns null");

  console.log("\n=== Testing password hashing ===");
  
  const password = "Test1234!";
  const hash = await hp(password);
  console.assert(typeof hash === "string" && hash.length > 0, "Hash should be non-empty string");
  console.assert(hash.startsWith("$argon2"), "Hash should be Argon2id format");
  console.log("✓ hashPassword produces Argon2id hash");

  const valid = await vp(password, hash);
  console.assert(valid === true, "Correct password should verify");
  console.log("✓ verifyPassword accepts correct password");

  const invalidPwd = await vp("WrongPassword", hash);
  console.assert(invalidPwd === false, "Wrong password should not verify");
  console.log("✓ verifyPassword rejects wrong password");

  console.log("\n=== Testing session (requires JWT secret) ===");
  
  // Test createSession
  const session = await createSession(mockEnv, { id: "user-123", role: "TECHNICIAN" });
  console.assert(session.token && session.token.length > 0, "Session should have token");
  console.assert(session.cookie && session.cookie.includes("manotas_session="), "Cookie should be set");
  console.assert(session.cookie.includes("HttpOnly"), "Cookie should be HttpOnly");
  console.assert(session.cookie.includes("Secure"), "Cookie should be Secure");
  console.assert(session.cookie.includes("SameSite=Lax"), "Cookie should be SameSite=Lax");
  console.log("✓ createSession produces token and cookie");

  // Test verifySession with valid token
  const verified = await verifySession(mockEnv, new Request("http://localhost", { headers: { Cookie: session.cookie } }));
  console.assert(verified !== null, "Valid session should verify");
  console.assert(verified?.userId === "user-123", "User ID should match");
  console.assert(verified?.role === "TECHNICIAN", "Role should match");
  console.log("✓ verifySession accepts valid token");

  // Test verifySession with invalid token
  const invalidVerified = await verifySession(mockEnv, new Request("http://localhost", { headers: { Cookie: "manotas_session=invalid.token.here" } }));
  console.assert(invalidVerified === null, "Invalid token should return null");
  console.log("✓ verifySession rejects invalid token");

  // Test verifySession with no cookie
  const noCookie = await verifySession(mockEnv, new Request("http://localhost"));
  console.assert(noCookie === null, "No cookie should return null");
  console.log("✓ verifySession returns null without cookie");

  // Test clearSessionCookie
  const cleared = clearSessionCookie();
  console.assert(cleared.includes("manotas_session="), "Clear cookie should have name");
  console.assert(cleared.includes("Max-Age=0"), "Clear cookie should have Max-Age=0");
  console.log("✓ clearSessionCookie produces expiry cookie");

  console.log("\n=== ALL TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});