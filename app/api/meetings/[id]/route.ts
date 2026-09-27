import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { canManageCommittees, isCommitteeHead } from "@/src/lib/permissions";

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

async function loadMeeting(id: string) {
  const auth = await requireSessionUser();
  if ("response" in auth) return { response: auth.response } as const;

  const meeting = await prisma.meeting.findUnique({ where: { id }, select: meetingSelect });
  if (!meeting) {
    return { response: NextResponse.json({ error: "Meeting not found" }, { status: 404 }) } as const;
  }

  const memberships = await prisma.committeeMembership.findMany({ where: { committeeId: meeting.committeeId } });
  const isAttendee = memberships.some((m) => m.profileId === auth.userId);
  const isOrganizer = meeting.organizedBy === auth.userId;
  const isHead = isCommitteeHead(auth.userId, meeting.committeeId, memberships);
  const manages = canManageCommittees(auth.userId, auth.profiles);

  if (!isAttendee && !isOrganizer && !isHead && !manages) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { meeting, canEdit: isOrganizer || isHead || manages } as const;
}

/** Notes, agenda, and per-person attendance. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const loaded = await loadMeeting(id);
  if ("response" in loaded) return loaded.response;
  if (!loaded.canEdit) return NextResponse.json({ error: "Only the organizer, committee head, or a manager can edit" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.notes !== undefined) data.notes = String(body.notes).trim() || null;
  if (body.agenda !== undefined) data.agenda = String(body.agenda).trim() || null;
  if (body.location !== undefined) data.location = String(body.location).trim() || null;

  const meeting =
    Object.keys(data).length > 0
      ? await prisma.meeting.update({ where: { id }, data, select: meetingSelect })
      : await prisma.meeting.findUniqueOrThrow({ where: { id }, select: meetingSelect });

  if (Array.isArray(body.attendedProfileIds)) {
    const wanted = new Set(body.attendedProfileIds.map(String));
    const members = meeting.attendees.map((a) => a.profileId);
    await prisma.$transaction(
      members
        .filter((profileId) => wanted.has(profileId) !== meeting.attendees.find((a) => a.profileId === profileId)?.attended)
        .map((profileId) =>
          prisma.meetingAttendee.update({ where: { meetingId_profileId: { meetingId: id, profileId } }, data: { attended: wanted.has(profileId) } })
        )
    );
  }

  const updated = await prisma.meeting.findUniqueOrThrow({ where: { id }, select: meetingSelect });
  return NextResponse.json({ success: true, meeting: updated });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const { id } = await ctx.params;
  const loaded = await loadMeeting(id);
  if ("response" in loaded) return loaded.response;
  if (!loaded.canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.meeting.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
