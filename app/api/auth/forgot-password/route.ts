import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { hashResetToken } from "@/src/lib/passwords";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

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
  // Use single helper — non-blocking, always succeeds for enumeration safety
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
  console.log(`[password-reset] ${email}: ${resetUrl}`);

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ success: true, message: "Instructions sent if the account exists.", debugToken: rawToken, debugUrl: resetUrl });
  }
  return NextResponse.json({ success: true, message: "If the account exists, instructions have been sent." });
}
