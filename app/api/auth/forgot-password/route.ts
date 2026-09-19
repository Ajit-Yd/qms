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

  // Email removed: log reset URL for dev, return generic success (in-app notification not needed for password reset)
  console.log(`[password-reset] ${email}: token ${rawToken} expires ${expiresAt.toISOString()}`);

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ success: true, message: "Instructions sent if the account exists.", debugToken: rawToken });
  }
  return NextResponse.json({ success: true, message: "If the account exists, instructions have been sent." });
}
