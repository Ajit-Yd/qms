import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitResponse } from "@/src/lib/rate-limit";
import { NextResponse } from "next/server";

const handler = NextAuth(authOptions);

async function withRateLimit(req: Request, next: () => Promise<Response>): Promise<Response> {
  const url = new URL(req.url);
  const isCredentialsCallback = url.pathname.endsWith("/api/auth/callback/credentials") && req.method === "POST";
  // Only rate-limit the actual login POST, not session/error/csrf
  if (!isCredentialsCallback) return next();
  const ip = getClientIp(req);
  const { allowed, remaining, resetMs } = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429, headers: rateLimitResponse(remaining, resetMs) });
  }
  const res = await next();
  Object.entries(rateLimitResponse(remaining, resetMs)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function GET(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return withRateLimit(req, () => handler(req as any, ctx as any));
}
export async function POST(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return withRateLimit(req, () => handler(req as any, ctx as any));
}
