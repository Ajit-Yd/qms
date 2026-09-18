import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canManageCommittees } from "@/src/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const committee = await prisma.committee.findUnique({
    where: { id },
    include: {
      memberships: { include: { profile: true } },
      tasks: true,
      createdByProfile: { select: { id: true, name: true } },
    },
  });
  if (!committee) return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  return NextResponse.json({ committee });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!canManageCommittees(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden: committee management required" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  if (typeof body.name !== "string" && typeof body.description !== "string") {
    return NextResponse.json({ error: "Provide name or description" }, { status: 400 });
  }
  const committee = await prisma.committee.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
      ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
    },
  });
  return NextResponse.json({ ok: true, committee });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!canManageCommittees(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden: committee management required" }, { status: 403 });
  }
  const { id } = await params;
  const committee = await prisma.committee.findUnique({ where: { id } });
  if (!committee) return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  await prisma.committee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
