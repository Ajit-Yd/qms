import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { getSubordinateIds, isSuperiorToSubordinate, getProfileById, isMonitorOnly } from "@/src/lib/permissions";
import { prismaForModule, toModuleKey } from "@/src/lib/qms-record-api";
import { prisma } from "@/src/lib/prisma";
import { sendNotification } from "@/src/lib/email";

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (isMonitorOnly(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden: monitor-only role cannot assign tasks" }, { status: 403 });
  }
  const body = await request.json();
  const { recordId, recordType, assignedTo, title, dueDate, description } = body;
  if (!recordId || !recordType || !assignedTo) {
    return NextResponse.json({ error: "recordId, recordType, and assignedTo are required" }, { status: 400 });
  }

  const allowedAssigneeIds = [auth.userId, ...getSubordinateIds(auth.userId, auth.profiles)];
  if (!allowedAssigneeIds.includes(assignedTo)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const moduleKey = toModuleKey(String(recordType));
  if (!moduleKey) return NextResponse.json({ error: "Unsupported record type" }, { status: 400 });

  const existing = await prismaForModule(moduleKey).findUnique({ where: { id: String(recordId) } });
  if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const updated = await prismaForModule(moduleKey).update({
    where: { id: String(recordId) },
    data: { assignedTo } as never,
  });

  await prisma.recordHistory.create({
    data: {
      recordType: String(recordType),
      recordId: String(recordId),
      fromStatus: existing.status,
      toStatus: existing.status,
      changedBy: auth.userId,
      comment: `Reassigned to ${assignedTo}`,
    },
  });

  const assignerProfile = getProfileById(auth.userId, auth.profiles);
  if (assignerProfile && isSuperiorToSubordinate(auth.userId, assignedTo, auth.profiles)) {
    const recordUrl = `/${moduleKey === "capa" ? "capas" : moduleKey}/${recordId}`;
    await sendNotification(
      {
        type: "superior_assignment",
        recipientId: assignedTo,
        senderName: assignerProfile.name,
        recordTitle: title || `${recordType} Assignment`,
        recordType: recordType,
        dueDate: dueDate || undefined,
        recordUrl,
        message: description || undefined,
      },
      {
        userId: assignedTo,
        type: "superior_assignment",
        title: `Assignment from ${assignerProfile.name}: ${title || recordType}`,
        message: `${assignerProfile.name} has assigned you a ${recordType}: "${title || recordType}"`,
        relatedId: recordId,
        relatedType: recordType,
        recordUrl,
      }
    );
  }

  return NextResponse.json({ success: true, assigned: true, record: updated });
}
