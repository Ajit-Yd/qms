import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { hashPassword } from "@/src/lib/passwords";

/** Only the one global Primary Admin manages organizations and their Secondary Admins. */
async function requirePrimaryAdmin() {
  const auth = await requireSessionUser();
  if ("response" in auth) return { response: auth.response } as const;
  if (!auth.isPrimaryAdmin) {
    return { response: NextResponse.json({ error: "Primary Admin only" }, { status: 403 }) } as const;
  }
  return auth;
}

const orgInclude = {
  _count: { select: { profiles: true, committees: true } },
  profiles: {
    select: { id: true, name: true, email: true, active: true, systemRole: true },
    orderBy: { name: "asc" as const },
  },
};

export async function GET() {
  const auth = await requirePrimaryAdmin();
  if ("response" in auth) return auth.response;
  const organizations = await prisma.organization.findMany({
    include: orgInclude,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ organizations });
}

/**
 * Two jobs, kept in one route because they share the same gate:
 *  - `profileId` present  -> appoint/demote that organization's Secondary Admin
 *  - `name` present       -> create an organization, optionally with its first Secondary Admin
 */
export async function POST(request: Request) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requirePrimaryAdmin();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));

  if (body.profileId) {
    const systemRole = String(body.systemRole ?? "");
    if (!["org_admin", "member"].includes(systemRole)) {
      return NextResponse.json({ error: "systemRole must be org_admin or member" }, { status: 400 });
    }
    const target = await prisma.profile.findUnique({
      where: { id: String(body.profileId) },
      select: { id: true, systemRole: true },
    });
    if (!target) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (target.systemRole === "primary_admin") {
      return NextResponse.json({ error: "Cannot change the Primary Admin's own role" }, { status: 400 });
    }
    const profile = await prisma.profile.update({
      where: { id: target.id },
      data: { systemRole, canManageCommittees: systemRole === "org_admin" },
      select: { id: true, name: true, systemRole: true },
    });
    return NextResponse.json({ success: true, profile });
  }

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Organization name is required" }, { status: 400 });

  const clash = await prisma.organization.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (clash) return NextResponse.json({ error: "That organization already exists" }, { status: 409 });

  const adminName = String(body.adminName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (adminName && password.length < 8) {
    return NextResponse.json({ error: "Admin password must be at least 8 characters" }, { status: 400 });
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      profiles: adminName
        ? {
            create: {
              name: adminName,
              email: email || null,
              roleTitle: String(body.roleTitle ?? "Secondary Admin"),
              passwordHash: hashPassword(password),
              systemRole: "org_admin",
              canManageCommittees: true,
            },
          }
        : undefined,
    },
    include: orgInclude,
  });
  return NextResponse.json({ success: true, organization }, { status: 201 });
}

export async function PATCH(request: Request) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requirePrimaryAdmin();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));

  const id = String(body.id ?? "");
  const name = String(body.name ?? "").trim();
  if (!id || !name) return NextResponse.json({ error: "Organization and name are required" }, { status: 400 });

  const clash = await prisma.organization.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, NOT: { id } },
  });
  if (clash) return NextResponse.json({ error: "Another organization already uses that name" }, { status: 409 });

  const organization = await prisma.organization.update({
    where: { id },
    data: { name, ...(body.active === undefined ? {} : { active: Boolean(body.active) }) },
    include: orgInclude,
  });
  return NextResponse.json({ success: true, organization });
}
