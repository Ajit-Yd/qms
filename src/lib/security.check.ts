import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Static guard rails for the security fixes. These assert on source shape, not
 * runtime behaviour, so they run in CI without a database and catch the
 * regression that matters: someone adding a mutating route and forgetting
 * auth, CSRF, or tenant scoping.
 *
 * Runtime proof lives in the live tests (login throttling, cross-tenant 403s).
 */

let failed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
}

const API = join(process.cwd(), "app", "api");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith("route.ts") ? [full] : [];
  });
}

const routes = walk(API).map((f) => {
  const raw = readFileSync(f, "utf8");
  return {
    file: f.slice(process.cwd().length + 1).replace(/\\/g, "/"),
    raw,
    // Comments are prose, not code: strip them so a comment that mentions a
    // dangerous pattern (e.g. explaining why it is banned) is not a finding.
    src: raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
    // These delegate auth and CSRF to the shared factory.
    viaFactory: /module-route-factory/.test(raw),
  };
});

// NextAuth has its own CSRF + session handling, so it is exempt by design.
const exempt = new Set(["app/api/auth/[...nextauth]/route.ts"]);

console.log("Auth: every route authenticates");
for (const r of routes) {
  if (exempt.has(r.file)) continue;
  const authenticates = /requireSessionUser|getServerSession/.test(r.src) || r.viaFactory;
  // Password reset is reached before a session exists, by design.
  const preAuth = r.file.includes("forgot-password") || r.file.includes("reset-password");
  check(`${r.file} requires a session`, authenticates || preAuth, true);
}

console.log("\nCSRF: every state-changing handler verifies the origin");
for (const r of routes) {
  if (exempt.has(r.file)) continue;
  const mutates = /export async function (POST|PUT|PATCH|DELETE)/.test(r.src);
  if (!mutates) continue;
  check(`${r.file} calls verifyCsrf`, /verifyCsrf/.test(r.src) || r.viaFactory, true);
}

console.log("\nTenant scoping: profile reads are never unscoped");
const profilesId = readFileSync(join(API, "profiles", "[id]", "route.ts"), "utf8");
check("profiles/[id] uses orgScope", /orgScope\(auth\)/.test(profilesId), true);
check("profiles/[id] has no bare findUnique on id", !/findUnique\(\{\s*where:\s*\{\s*id\s*\}\s*\}\)/.test(profilesId), true);
check("profiles/[id] has no unscoped profile dump", !/prisma\.profile\.findMany\(\{\s*select/.test(profilesId), true);

console.log("\nSecrets: no route ships a password hash to a client");
for (const r of routes) {
  // `profile: true` / `include: { profile: true }` selects every column,
  // passwordHash included.
  check(`${r.file} avoids profile: true`, !/profile:\s*true/.test(r.src), true);
}

console.log("\nRecords: the assign endpoint cannot reach outside its span of control");
const assign = readFileSync(join(API, "records", "assign", "route.ts"), "utf8");
check("records/assign scopes the record lookup", /findFirst\(\{[\s\S]*?assignedTo:\s*\{\s*in:\s*manageable\s*\}/.test(assign), true);
check("records/assign does not use an unscoped findUnique", !/prismaForModule\(moduleKey\)\.findUnique/.test(assign), true);

console.log("\nSoft deletes: deleted records cannot be re-transitioned or re-deleted");
const recordApi = readFileSync(join(process.cwd(), "src", "lib", "qms-record-api.ts"), "utf8");
check("deleteModuleRecord guards deletedAt", /deleteModuleRecord[\s\S]*?deletedAt" in record && record\.deletedAt/.test(recordApi), true);
check("transitionModuleRecord guards deletedAt", (recordApi.match(/deletedAt" in record && record\.deletedAt/g) ?? []).length >= 2, true);

console.log("\nRate limiting: the login limiter actually blocks");
const auth = readFileSync(join(process.cwd(), "src", "lib", "auth.ts"), "utf8");
check("login checks the budget before verifying", auth.indexOf("rateLimit(") < auth.indexOf("verifyPassword("), true);
check("an over-budget login returns null", /if \(!budget\.allowed\)[\s\S]{0,120}return null/.test(auth), true);

console.log("\nHeaders: the security headers are configured");
const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
for (const header of [
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
]) {
  check(`next.config sets ${header}`, config.includes(header), true);
}
check("poweredByHeader is off", /poweredByHeader:\s*false/.test(config), true);

console.log("\nPasswords: scrypt input is bounded");
const passwords = readFileSync(join(process.cwd(), "src", "lib", "passwords.ts"), "utf8");
check("verifyHash rejects oversized input before hashing", /verifyHash[\s\S]*?MAX_PASSWORD_LENGTH[\s\S]*?return false[\s\S]*?scryptSync/.test(passwords), true);

console.log("\nReset tokens: not echoed back by default");
const forgot = readFileSync(join(API, "auth", "forgot-password", "route.ts"), "utf8");
check("debugToken requires EXPOSE_RESET_TOKEN", /EXPOSE_RESET_TOKEN === "1"/.test(forgot), true);

console.log(failed === 0 ? "\nAll security checks passed" : `\n${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);