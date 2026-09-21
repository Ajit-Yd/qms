import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitResponse } from "@/src/lib/rate-limit";
import { NextResponse } from "next/server";

const handler = NextAuth(authOptions);

async function withRateLimit(req: Request, next: () => Promise<Response>): Promise<Response> {
  const url = new URL(req.url);
  const isCredentialsCallback = url.pathname.endsWith("/api/auth/callback/credentials") && req.method === "POST";
  if (!isCredentialsCallback) return next();
  const ip = getClientIp(req);
  // 20 attempts per 15min per IP — only failures count (cleared on success below)
  const { allowed, remaining, resetMs } = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429, headers: rateLimitResponse(remaining, resetMs) });
  }
  const res = await next();
  // If login succeeded (302 redirect or 200 with no error), clear the IP counter
  const isSuccess = res.status === 302 || (res.status === 200 && !res.headers.get("x-nextauth-error"));
  if (isSuccess) {
    const { clearRateLimit } = await import("@/src/lib/rate-limit");
    clearRateLimit(`login:${ip}`);
  } else {
    Object.entries(rateLimitResponse(remaining, resetMs)).forEach(([k, v]) => res.headers.set(k, v));
  }
  return res;
}

export async function GET(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return withRateLimit(req, () => handler(req as any, ctx as any));
}
export async function POST(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return withRateLimit(req, () => handler(req as any, ctx as any));
}
