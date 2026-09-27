import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { normalizeTaskStatus, visibleCommitteeIds } from "@/src/lib/tasks-api";
import { orgScope } from "@/src/lib/tenant";

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

  const orgCommittees = await prisma.committee.findMany({ where: orgScope(auth), select: { id: true } });
  const memberships = await prisma.committeeMembership.findMany({ where: { profileId: auth.userId } });
  const allowed = visibleCommitteeIds(
    auth.userId,
    memberships,
    auth.profiles,
    orgCommittees.map((c) => c.id)
  );

  const committees = await prisma.committee.findMany({
    where: { id: { in: allowed } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (!committees.length) return NextResponse.json({ tasks: [], committees });

  // A requested committee outside the viewer's organization simply matches nothing.
  const committeeFilter = { committeeId: committeeId && allowed.includes(committeeId) ? committeeId : { in: allowed } };

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
