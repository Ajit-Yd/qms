import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/src/lib/prisma";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyHash(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  try {
    return timingSafeEqual(actual, Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(userId: string, password: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { passwordHash: true, active: true },
  });
  if (!profile || profile.active === false || !profile.passwordHash) return false;
  return verifyHash(password, profile.passwordHash);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  if (!(await verifyPassword(userId, currentPassword))) return false;
  await prisma.profile.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return true;
}

export async function setPassword(userId: string, newPassword: string) {
  await prisma.profile.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
}
