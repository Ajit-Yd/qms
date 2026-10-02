import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { verifyCsrf } from "@/src/lib/csrf";
import { hashResetToken } from "@/src/lib/passwords";

export async function POST(request: Request) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const { getClientIp, rateLimit, rateLimitResponse } = await import("@/src/lib/rate-limit");
  const ip = getClientIp(request);
  const ipLimit = rateLimit(`forgot:${ip}`, 3, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many reset attempts. Try again later." }, { status: 429, headers: rateLimitResponse(ipLimit.remaining, ipLimit.resetMs) });
  }
  const body = await request.json().catch(() => ({}));
  const organization = String(body.organization ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!organization) return NextResponse.json({ error: "Organization is required" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  const emailLimit = rateLimit(`forgot:email:${organization.toLowerCase()}:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) {
    return NextResponse.json({ error: "Too many reset attempts for this email. Try again later." }, { status: 429, headers: rateLimitResponse(emailLimit.remaining, emailLimit.resetMs) });
  }

  // Always return success to prevent enumeration; do work only if user exists & active
  const org = await prisma.organization.findFirst({
    where: { name: { equals: organization, mode: "insensitive" }, active: true },
  });
  const profile = org
    ? await prisma.profile.findFirst({
        where: { organizationId: org.id, email: { equals: email, mode: "insensitive" }, active: true },
      })
    : null;
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
  // Use single helper if email enabled, otherwise log only in dev (no PII in prod logs)
  if (process.env.RESEND_API_KEY) {
    try {
      const { sendEmail } = await import("@/src/lib/email");
      await sendEmail(
        email,
        "Reset your QMS password",
        `<p>Hi ${profile.name},</p><p>You requested a password reset. <a href="${resetUrl}">Click here to reset</a> (expires in 1 hour).</p><p>If you did not request this, ignore this email.</p>`
      );
    } catch (e) {
      console.warn("Password reset email failed (non-blocking):", e);
    }
  }
  // The token is only ever echoed back when explicitly asked for. Gating this on
  // NODE_ENV !== "production" used to hand a working reset token to anyone who
  // could reach a preview/staging deploy still running in development mode.
  if (process.env.EXPOSE_RESET_TOKEN === "1") {
    console.log(`[password-reset] ${email}: ${resetUrl}`);
    return NextResponse.json({ success: true, message: "Instructions sent if the account exists.", debugToken: rawToken, debugUrl: resetUrl });
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(`[password-reset] ${email}: ${resetUrl}`);
  }
  console.log(`[password-reset] token created for ${profile.id}`);
  return NextResponse.json({ success: true, message: "If the account exists, instructions have been sent." });
}
