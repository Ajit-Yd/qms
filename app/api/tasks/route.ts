import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { normalizeTaskStatus, visibleCommitteeIds } from "@/src/lib/tasks-api";

const taskSelect = {
  id: true,
  committeeId: true,
  title: true,
  description: true,
  assignedTo: true,
  assignedBy: true,
  status: true,
  dueDate: true,
  responseNote: true,
  linkUrl: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  respondedAt: true,
  createdAt: true,
  committee: { select: { id: true, name: true } },
  assignedToProfile: { select: { id: true, name: true, roleTitle: true } },
  assignedByProfile: { select: { id: true, name: true } },
} as const;

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const committeeId = url.searchParams.get("committeeId");
  const status = url.searchParams.get("status");

  if (status && !normalizeTaskStatus(status)) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  const memberships = await prisma.committeeMembership.findMany({ where: { profileId: auth.userId } });
  const allowed = visibleCommitteeIds(auth.userId, memberships, auth.profiles);

  const committees = await prisma.committee.findMany({
    where: allowed[0] === "*" ? {} : { id: { in: allowed } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (!committees.length) return NextResponse.json({ tasks: [], committees });

  // "*" means committee manager: unrestricted. Otherwise intersect the request with visible committees.
  const committeeFilter =
    allowed[0] === "*"
      ? committeeId
        ? { committeeId }
        : {}
      : { committeeId: { in: committeeId ? allowed.filter((id) => id === committeeId) : allowed } };

  const tasks = await prisma.committeeTask.findMany({
    where: {
      ...committeeFilter,
      ...(status ? { status } : {}),
    },
    select: taskSelect,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks, committees });
}
