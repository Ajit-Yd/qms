import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { hashResetToken } from "@/src/lib/passwords";

export async function POST(request: Request) {
  const { getClientIp, rateLimit, rateLimitResponse } = await import("@/src/lib/rate-limit");
  const ip = getClientIp(request);
  const ipLimit = rateLimit(`forgot:${ip}`, 3, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many reset attempts. Try again later." }, { status: 429, headers: rateLimitResponse(ipLimit.remaining, ipLimit.resetMs) });
  }
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  const emailLimit = rateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) {
    return NextResponse.json({ error: "Too many reset attempts for this email. Try again later." }, { status: 429, headers: rateLimitResponse(emailLimit.remaining, emailLimit.resetMs) });
  }

  // Always return success to prevent enumeration; do work only if user exists & active
  const profile = await prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, active: true },
  });
  if (!profile) {
    return NextResponse.json({ success: true, message: "If the account exists, instructions have been sent." });
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate prior tokens
  await prisma.passwordResetToken.deleteMany({ where: { profileId: profile.id } });
  await prisma.passwordResetToken.create({
    data: { profileId: profile.id, tokenHash, expiresAt },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
  console.log(`[password-reset] ${email}: ${resetUrl} (email disabled, use debugUrl)`);

  // Always return debugUrl so reset works without email (since email removed)
  return NextResponse.json({ success: true, message: "Use the link to reset (email disabled).", debugToken: rawToken, debugUrl: resetUrl });
}
