import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canAssignCommitteeTask, getProfileById } from "@/src/lib/permissions";
import { sendNotification } from "@/src/lib/email";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id: committeeId } = await params;
  const memberships = await prisma.committeeMembership.findMany({ where: { committeeId } });
  if (!canAssignCommitteeTask(auth.userId, committeeId, auth.profiles, memberships)) {
    return NextResponse.json({ error: "You do not have permission to assign tasks in this committee" }, { status: 403 });
  }

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const assignedTo = String(body.assignedTo ?? "");
  if (!title) return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  if (!assignedTo) return NextResponse.json({ error: "Assignee is required" }, { status: 400 });

  const committee = await prisma.committee.findUnique({ where: { id: committeeId } });
  if (!committee) return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  if (!memberships.some((membership) => membership.profileId === assignedTo)) {
    return NextResponse.json({ error: "Assignee must be a member of this committee" }, { status: 400 });
  }

  const task = await prisma.committeeTask.create({
    data: {
      committeeId,
      title,
      description: body.description || "",
      assignedTo,
      assignedBy: auth.userId,
      status: "assigned",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });

  const senderProfile = getProfileById(auth.userId, auth.profiles);
  if (senderProfile) {
    const taskUrl = `/committees/${committeeId}`;
    await sendNotification(
      {
        type: "task_assigned",
        recipientId: assignedTo,
        senderName: senderProfile.name,
        recordTitle: title,
        recordType: "CommitteeTask",
        dueDate: body.dueDate || undefined,
        recordUrl: taskUrl,
        message: body.description || undefined,
      },
      {
        userId: assignedTo,
        type: "task_assigned",
        title: `Task assigned: ${title}`,
        message: `${senderProfile.name} assigned you a task in ${committee.name}: "${title}"`,
        relatedId: task.id,
        relatedType: "CommitteeTask",
        recordUrl: taskUrl,
      }
    );
  }

  return NextResponse.json({ success: true, task }, { status: 201 });
}
