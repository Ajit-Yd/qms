import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { hashResetToken, setPassword } from "@/src/lib/passwords";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const newPassword = String(body.newPassword ?? body.password ?? "");

  if (!token || newPassword.length < 8) {
    return NextResponse.json({ error: "Token and new password (8+ chars) are required" }, { status: 400 });
  }

  const tokenHash = hashResetToken(token);
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: stored.profileId } });
  if (!profile || profile.active === false) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  if (email && profile.email?.toLowerCase() !== email) {
    return NextResponse.json({ error: "Email does not match token" }, { status: 400 });
  }

  await setPassword(profile.id, newPassword);
  await prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } });
  // Invalidate other tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { profileId: profile.id, id: { not: stored.id } } });

  return NextResponse.json({ success: true, message: "Password has been reset. You can now sign in." });
}
