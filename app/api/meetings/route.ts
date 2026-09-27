import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { canManageCommittees, getSubordinateIds, isCommitteeHead } from "@/src/lib/permissions";
import { visibleCommitteeIds } from "@/src/lib/tasks-api";
import { orgScope } from "@/src/lib/tenant";

const meetingSelect = {
  id: true,
  committeeId: true,
  title: true,
  agenda: true,
  notes: true,
  scheduledAt: true,
  location: true,
  linkUrl: true,
  organizedBy: true,
  createdAt: true,
  committee: { select: { id: true, name: true } },
  organizer: { select: { id: true, name: true } },
  attendees: {
    select: { id: true, profileId: true, attended: true, profile: { select: { id: true, name: true, roleTitle: true } } },
  },
} as const;

function safeLink(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;

  const committeeId = new URL(request.url).searchParams.get("committeeId");
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
  if (!committees.length) return NextResponse.json({ meetings: [], committees });

  const meetings = await prisma.meeting.findMany({
    // A requested committee outside the viewer's organization matches nothing.
    where: { committeeId: committeeId && allowed.includes(committeeId) ? committeeId : { in: allowed } },
    select: meetingSelect,
    orderBy: { scheduledAt: "desc" },
  });
  return NextResponse.json({ meetings, committees });
}

export async function POST(request: Request) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));

  const committeeId = String(body.committeeId ?? "");
  const title = String(body.title ?? "").trim();
  if (!committeeId || !title) return NextResponse.json({ error: "Committee and title are required" }, { status: 400 });

  const scheduled = new Date(String(body.scheduledAt ?? ""));
  if (isNaN(scheduled.getTime())) {
    return NextResponse.json({ error: "Provide a valid date and time" }, { status: 400 });
  }

  const linkUrl = safeLink(body.linkUrl);
  if (String(body.linkUrl ?? "").trim() && !linkUrl) {
    return NextResponse.json({ error: "Meeting link must be a full http(s) URL" }, { status: 400 });
  }

  const target = await prisma.committee.findFirst({ where: { id: committeeId, ...orgScope(auth) } });
  if (!target) return NextResponse.json({ error: "Committee not found" }, { status: 404 });

  const memberships = await prisma.committeeMembership.findMany({ where: { committeeId } });
  const canOrganize =
    canManageCommittees(auth.userId, auth.profiles) || isCommitteeHead(auth.userId, committeeId, memberships);
  if (!canOrganize) {
    return NextResponse.json({ error: "Only the committee head or a manager can schedule a meeting" }, { status: 403 });
  }

  // Attendees default to the committee roster; organizers may narrow it.
  const roster = memberships.map((m) => m.profileId);
  const requested: string[] = Array.isArray(body.attendeeIds) ? body.attendeeIds.map(String) : roster;
  const attendeeIds: string[] = requested.filter((id) => roster.includes(id));
  const allowedPeople = new Set([auth.userId, ...getSubordinateIds(auth.userId, auth.profiles)]);
  const outOfScope = attendeeIds.filter((id) => !allowedPeople.has(id));
  if (outOfScope.length) {
    return NextResponse.json({ error: "Attendees must be you or your subordinates" }, { status: 403 });
  }

  const meeting = await prisma.meeting.create({
    data: {
      committeeId,
      title,
      agenda: String(body.agenda ?? "").trim() || null,
      notes: String(body.notes ?? "").trim() || null,
      scheduledAt: scheduled,
      location: String(body.location ?? "").trim() || null,
      linkUrl,
      organizedBy: auth.userId,
      attendees: { create: [...new Set(attendeeIds)].map((profileId: string) => ({ profileId })) },
    },
    select: meetingSelect,
  });

  return NextResponse.json({ success: true, meeting }, { status: 201 });
}
