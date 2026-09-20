import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { changePassword } from "@/src/lib/passwords";

export async function POST(request: Request) {
  const { getClientIp, rateLimit, rateLimitResponse } = await import("@/src/lib/rate-limit");
  const ip = getClientIp(request);
  const { allowed, remaining, resetMs } = rateLimit(`pwd:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: rateLimitResponse(remaining, resetMs) });
  }
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? String(session.user.id) : "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userLimit = rateLimit(`pwd:user:${userId}`, 5, 15 * 60 * 1000);
  if (!userLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts for this account. Try again later." }, { status: 429, headers: rateLimitResponse(userLimit.remaining, userLimit.resetMs) });
  }

  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  const ok = await changePassword(userId, currentPassword, newPassword);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  return NextResponse.json({ success: true });
}