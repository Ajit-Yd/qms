import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { changePassword } from "@/src/lib/passwords";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? String(session.user.id) : "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  const ok = await changePassword(userId, currentPassword, newPassword);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  return NextResponse.json({ success: true });
}