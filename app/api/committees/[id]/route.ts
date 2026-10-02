import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { canManageCommittees } from "@/src/lib/permissions";
import { orgScope } from "@/src/lib/tenant";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const committee = await prisma.committee.findFirst({
    where: { id, ...orgScope(auth) },
    include: {
      // Never `profile: true` — that ships passwordHash to every org member.
      memberships: {
        include: {
          profile: {
            select: { id: true, name: true, email: true, roleTitle: true, reportsTo: true, active: true },
          },
        },
      },
      tasks: true,
      createdByProfile: { select: { id: true, name: true } },
    },
  });
  if (!committee) return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  return NextResponse.json({ committee });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!canManageCommittees(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden: committee management required" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.committee.findFirst({ where: { id, ...orgScope(auth) }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Committee not found" }, { status: 404 });
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!canManageCommittees(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden: committee management required" }, { status: 403 });
  }
  const { id } = await params;
  const committee = await prisma.committee.findFirst({ where: { id, ...orgScope(auth) } });
  if (!committee) return NextResponse.json({ error: "Committee not found" }, { status: 404 });
  await prisma.committee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
