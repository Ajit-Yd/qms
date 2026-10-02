import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { getProfileById, isMonitorOnly, isTopAuthority, toPublicProfile } from "@/src/lib/permissions";
import { prismaForModule } from "@/src/lib/qms-record-api";
import { hashPassword } from "@/src/lib/passwords";
import { sendNotification } from "@/src/lib/email";
import type { ModuleKey } from "@/components/qms";

export async function POST(request: Request) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

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
      organizationId: auth.organizationId,
      passwordHash: hashPassword(temporaryPassword),
    },
  });
  return NextResponse.json(
    { ok: true, user: toPublicProfile(user), temporaryPassword },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!isTopAuthority(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Only the top authority may change organization structure." }, { status: 403 });
  }
  const body = await request.json();
  if (body.profileId) {
    // Never let an org admin edit a profile that lives in another organization.
    if (!getProfileById(String(body.profileId), auth.profiles)) {
      return NextResponse.json({ error: "Profile not found in your organization." }, { status: 404 });
    }
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
    // Both ends of the move must be people in the caller's organization.
    if (!getProfileById(String(body.assignedTo), auth.profiles)) {
      return NextResponse.json({ error: "Assignee is not in your organization." }, { status: 403 });
    }
    const moduleKey = body.module as ModuleKey;
    const model = prismaForModule(moduleKey);
    const owned = auth.profiles.map((p) => p.id);
    const before = await model.findFirst({
      where: { id: body.recordId, assignedTo: { in: owned } },
    });
    if (!before) return NextResponse.json({ error: "Record not found in your organization." }, { status: 404 });
    const record = await model.update({
      where: { id: body.recordId },
      data: { assignedTo: body.assignedTo } as never,
    });
    // Notify new assignee (admin reassignment)
    if (before && (before as any).assignedTo !== body.assignedTo) {
      const assigner = getProfileById(auth.userId, auth.profiles);
      const title = (record as any).title ?? (record as any).course ?? body.recordId;
      const url = `/${moduleKey === "capa" ? "capas" : moduleKey}/${body.recordId}`;
      sendNotification(
        {
          type: "superior_assignment",
          recipientId: body.assignedTo,
          senderName: assigner?.name ?? "Admin",
          recordTitle: String(title),
          recordType: (moduleKey === "documents" ? "Document" : moduleKey === "capa" ? "Capa" : moduleKey === "nonconformances" ? "Nonconformance" : moduleKey === "audits" ? "Audit" : "Training") as any,
          recordUrl: url,
        },
        {
          userId: body.assignedTo,
          type: "superior_assignment",
          title: `Reassigned: ${title}`,
          message: `${assigner?.name ?? "Admin"} reassigned you "${title}"`,
          relatedId: body.recordId,
          relatedType: String(moduleKey),
          recordUrl: url,
        }
      ).catch((e) => console.warn("Reassignment notification failed:", e));
    }
    return NextResponse.json({ ok: true, change: record });
  }
  return NextResponse.json({ error: "A profile or record assignment is required." }, { status: 400 });
}

export async function GET() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  // Restrict: top-authority sees all; others see only own subtree (consistent with getViewerScope)
  const isTop = isTopAuthority(auth.userId, auth.profiles);
  if (!isTop) {
    // Non-top users get scoped view via /api/profiles instead; block bulk dump
    return NextResponse.json({ error: "Forbidden: team overview requires top-authority" }, { status: 403 });
  }
  const profiles = auth.profiles;
  // Records carry no organizationId; they belong to whoever they are assigned to.
  const owned = { where: { deletedAt: null, assignedTo: { in: profiles.map((p) => p.id) } } };
  const [documents, capas, nonconformances, audits, training] = await Promise.all([
    prisma.document.findMany(owned),
    prisma.capa.findMany(owned),
    prisma.nonconformance.findMany(owned),
    prisma.audit.findMany(owned),
    prisma.training.findMany(owned),
  ]);
  return NextResponse.json({
    profiles: profiles.map(toPublicProfile),
    recordsByModule: { documents, capa: capas, nonconformances, audits, training },
  });
}
