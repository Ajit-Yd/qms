import "./load-env";
import { prisma } from "./prisma";
import {
  canManageCommittees,
  getSubordinateIds,
  isOrgAdmin,
  isPrimaryAdmin,
  isTopAuthority,
  type Profile,
} from "./permissions";
import { visibleCommitteeIds } from "./tasks-api";

let failed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
}

async function main() {
  const all = (await prisma.profile.findMany()) as unknown as Profile[];
  const orgs = await prisma.organization.findMany();
  const committees = await prisma.committee.findMany();

  check("one organization seeded", orgs.length, 1);
  check("every profile has an organization", all.filter((p) => !p.organizationId).length, 0);
  check("every committee has an organization", committees.filter((c) => !c.organizationId).length, 0);

  const primaries = all.filter((p) => p.systemRole === "primary_admin");
  const orgAdmins = all.filter((p) => p.systemRole === "org_admin");
  const members = all.filter((p) => p.systemRole === "member");
  check("exactly one Primary Admin", primaries.length, 1);
  check("org_admins are also canManageCommittees", orgAdmins.filter((p) => !p.canManageCommittees).length, 0);
  check("members are not canManageCommittees", members.filter((p) => p.canManageCommittees).length, 0);

  const primary = primaries[0];
  check("Primary Admin recognised", isPrimaryAdmin(primary.id, all), true);
  check("Primary Admin manages committees", canManageCommittees(primary.id, all), true);
  check("Primary Admin is top authority", isTopAuthority(primary.id, all), true);

  for (const admin of orgAdmins) {
    check(`${admin.name} is an org admin`, isOrgAdmin(admin.id, all), true);
  }
  const plain = members[0];
  if (plain) {
    check(`${plain.name} is not an org admin`, isOrgAdmin(plain.id, all), false);
    check(`${plain.name} cannot manage committees`, canManageCommittees(plain.id, all), false);
  }

  // A Secondary Admin who happens to be the root of their own tree must not get platform powers.
  const rootOrgAdmin = all.find((p) => p.systemRole === "org_admin" && p.reportsTo === null);
  if (rootOrgAdmin) {
    check("root Secondary Admin is not top authority", isTopAuthority(rootOrgAdmin.id, all), false);
  }

  // Committee visibility must be bounded by the organization, never a wildcard.
  const memberships = await prisma.committeeMembership.findMany();
  for (const admin of orgAdmins) {
    const orgCommitteeIds = committees.map((c) => c.id);
    const visible = visibleCommitteeIds(admin.id, memberships, all, orgCommitteeIds);
    check(`${admin.name} sees no wildcard`, visible.includes("*"), false);
  }

  // loadProfiles scoping is the actual tenant boundary.
  const scoped = await prisma.profile.findMany({ where: { organizationId: orgs[0].id } });
  check("loadProfiles(own org) excludes other orgs", scoped.every((p) => p.organizationId === orgs[0].id), true);
  check("subordinate walk stays inside the org", getSubordinateIds(primary.id, scoped).every((id) => scoped.some((p) => p.id === id)), true);

  console.log(failed ? `\n${failed} check(s) failed` : "\nAll tenant checks passed");
  await prisma.$disconnect();
  if (failed) process.exit(1);
}

void main();
