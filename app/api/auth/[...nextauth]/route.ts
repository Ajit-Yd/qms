import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClientIp, rateLimit, rateLimitResponse } from "@/src/lib/rate-limit";
import { NextResponse } from "next/server";

const handler = NextAuth(authOptions);

async function withRateLimit(req: Request, next: () => Promise<Response>): Promise<Response> {
  const ip = getClientIp(req);
  // 5 attempts per 15 min per IP for login
  const { allowed, remaining, resetMs } = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: rateLimitResponse(remaining, resetMs) });
  }
  const res = await next();
  // Add rate limit headers to success responses
  Object.entries(rateLimitResponse(remaining, resetMs)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function GET(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return withRateLimit(req, () => handler(req as any, ctx as any));
}
export async function POST(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return withRateLimit(req, () => handler(req as any, ctx as any));
}
