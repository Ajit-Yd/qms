import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { changePassword } from "@/src/lib/passwords";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? String(session.user.id) : "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  if (!changePassword(userId, currentPassword, newPassword)) return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  return NextResponse.json({ success: true });
}