import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";

export async function GET() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const notifications = await prisma.notification.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  const notification = await prisma.notification.updateMany({
    where: { id: body.id, userId: auth.userId },
    data: { read: true },
  });
  return NextResponse.json({ ok: true, notification });
}
