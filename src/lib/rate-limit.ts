// Simple in-memory token bucket — per-instance (good for single-region dev/small prod).
// For multi-instance / Vercel scale, swap store with Upstash Redis.
// Usage: const { allowed, remaining, resetMs } = rateLimit(`login:${ip}`, 5, 60_000)

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function nowMs() {
  return Date.now();
}

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetMs: number } {
  const now = nowMs();
  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }
  if (entry.count < limit) {
    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, resetMs: entry.resetAt - now };
  }
  return { allowed: false, remaining: 0, resetMs: entry.resetAt - now };
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Best-effort client IP for rate-limit keys.
 *
 * ponytail: `x-forwarded-for` is client-appendable, so on a host with no
 * trusted proxy in front of it an attacker rotates the header and gets a fresh
 * bucket per request. That is acceptable only while TRUST_PROXY is unset (dev
 * and single-tenant demos). Set TRUST_PROXY=1 in production, where the edge
 * overwrites the header; then we take the platform-specific header first and
 * only fall back to XFF's rightmost-but-client-supplied entry.
 */
export function getClientIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "1";
  if (trustProxy) {
    // Set by the edge (Cloudflare/Vercel/nginx); not client-spoofable when the
    // edge is configured to overwrite it.
    const edge = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
    if (edge) return edge.trim();
  }
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    // Rightmost is the hop closest to us when a trusted proxy appends.
    const pick = trustProxy && parts.length > 1 ? parts[parts.length - 2] : parts[0];
    if (pick) return pick;
  }
  return "unknown";
}

/**
 * Per-user limiter for authenticated writes. Keyed on the session user, not the
 * IP, so a shared office NAT does not lock everyone out together.
 *
 * ponytail: counts every mutation in one in-memory map per instance. Behind
 * multiple instances each keeps its own bucket, so the real ceiling is
 * (limit x instances). Move `store` to Redis before scaling out.
 */
export function enforceUserRateLimit(
  userId: string,
  bucket: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetMs: number } {
  return rateLimit(`user:${userId}:${bucket}`, limit, windowMs);
}

export function rateLimitResponse(remaining: number, resetMs: number): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
    "Retry-After": String(Math.ceil(resetMs / 1000)),
  };
}

// Periodic cleanup to avoid memory leak (every 10min)
if (typeof setInterval !== "undefined" && !(globalThis as any).__qms_rl_interval) {
  (globalThis as any).__qms_rl_interval = setInterval(() => {
    const now = nowMs();
    for (const [k, v] of store.entries()) if (now >= v.resetAt) store.delete(k);
  }, 10 * 60 * 1000);
  // Prevent keeping Node alive in tests
  if ((globalThis as any).__qms_rl_interval.unref) (globalThis as any).__qms_rl_interval.unref();
}
