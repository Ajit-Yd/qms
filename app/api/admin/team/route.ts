import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { isMonitorOnly, isTopAuthority, toPublicProfile } from "@/src/lib/permissions";
import { prismaForModule } from "@/src/lib/qms-record-api";
import { hashPassword } from "@/src/lib/passwords";
import type { ModuleKey } from "@/components/qms";

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!isTopAuthority(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Only the top authority may create users." }, { status: 403 });
  }
  const body = await request.json();
  if (!body.name || !body.roleTitle || !body.reportsTo) {
    return NextResponse.json({ error: "name, roleTitle, and reportsTo are required." }, { status: 400 });
  }
  const temporaryPassword =
    typeof body.password === "string" && body.password.trim().length >= 8
      ? body.password.trim()
      : `Qms-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}!`;
  const user = await prisma.profile.create({
    data: {
      name: body.name,
      email: body.email || `${String(body.name).toLowerCase().replace(/\s+/g, ".")}@qms.local`,
      roleTitle: body.roleTitle,
      reportsTo: body.reportsTo,
      passwordHash: hashPassword(temporaryPassword),
    },
  });
  return NextResponse.json(
    { ok: true, user: toPublicProfile(user), temporaryPassword },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!isTopAuthority(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Only the top authority may change organization structure." }, { status: 403 });
  }
  const body = await request.json();
  if (body.profileId) {
    const user = await prisma.profile.update({
      where: { id: body.profileId },
      data: {
        ...(body.roleTitle !== undefined ? { roleTitle: body.roleTitle } : {}),
        ...(body.reportsTo !== undefined ? { reportsTo: body.reportsTo || null } : {}),
        ...(typeof body.email === "string" && body.email.trim() ? { email: body.email.trim() } : {}),
      },
    });
    return NextResponse.json({ ok: true, change: toPublicProfile(user) });
  }
  if (body.module && body.recordId && body.assignedTo) {
    if (isMonitorOnly(auth.userId, auth.profiles)) {
      return NextResponse.json({ error: "Forbidden: monitor-only role cannot reassign records." }, { status: 403 });
    }
    const moduleKey = body.module as ModuleKey;
    const record = await prismaForModule(moduleKey).update({
      where: { id: body.recordId },
      data: { assignedTo: body.assignedTo } as never,
    });
    return NextResponse.json({ ok: true, change: record });
  }
  return NextResponse.json({ error: "A profile or record assignment is required." }, { status: 400 });
}

export async function GET() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const profiles = await prisma.profile.findMany({ orderBy: { name: "asc" } });
  const [documents, capas, nonconformances, audits, training] = await Promise.all([
    prisma.document.findMany({ where: { deletedAt: null } }),
    prisma.capa.findMany({ where: { deletedAt: null } }),
    prisma.nonconformance.findMany({ where: { deletedAt: null } }),
    prisma.audit.findMany({ where: { deletedAt: null } }),
    prisma.training.findMany({ where: { deletedAt: null } }),
  ]);
  return NextResponse.json({
    profiles: profiles.map(toPublicProfile),
    recordsByModule: { documents, capa: capas, nonconformances, audits, training },
  });
}
