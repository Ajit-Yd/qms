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

export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
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
