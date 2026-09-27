import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { canRespondToTask, canReviewTask, normalizeTaskStatus } from "@/src/lib/tasks-api";

/** Lightweight status change: start work, send back, or approve. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const next = normalizeTaskStatus(body.status);
  if (!next) return NextResponse.json({ error: "Provide a valid status" }, { status: 400 });

  const task = await prisma.committeeTask.findUnique({
    where: { id },
    select: { id: true, committeeId: true, assignedTo: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const memberships = await prisma.committeeMembership.findMany();
  const allowed =
    next === "approved"
      ? canReviewTask(auth.userId, task, memberships, auth.profiles)
      : canRespondToTask(auth.userId, task, memberships, auth.profiles);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.committeeTask.update({
    where: { id },
    data: { status: next },
    select: { id: true, status: true },
  });
  return NextResponse.json({ success: true, task: updated });
}
