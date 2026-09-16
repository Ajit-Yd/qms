import { prisma } from "@/src/lib/prisma";
import { getDirectReports, isTopAuthority, type Profile } from "@/src/lib/permissions";

export interface SuccessionValidation {
  valid: boolean;
  reason?: string;
}

export interface SuccessionSummary {
  departingUserId: string;
  departingUserName: string;
  replacementUserId: string;
  replacementUserName: string;
  directReportsCount: number;
  recordsToTransferCount: number;
  committeeMembershipsCount: number;
  committeeHeadRolesCount: number;
  totalImpact: number;
}

export function validateSuccession(
  initiatingUserId: string,
  departingUserId: string,
  replacementUserId: string,
  profiles: Profile[]
): SuccessionValidation {
  if (!isTopAuthority(initiatingUserId, profiles)) {
    return { valid: false, reason: "Only the top authority can initiate succession" };
  }

  if (departingUserId === replacementUserId) {
    return { valid: false, reason: "Cannot replace an employee with themselves" };
  }

  const departingUser = profiles.find((profile) => profile.id === departingUserId);
  const replacementUser = profiles.find((profile) => profile.id === replacementUserId);

  if (!departingUser) return { valid: false, reason: "Departing user not found" };
  if (!replacementUser) return { valid: false, reason: "Replacement user not found" };
  if (departingUser.active === false) return { valid: false, reason: "Departing user is already inactive" };
  if (replacementUser.active === false) return { valid: false, reason: "Replacement user must be active" };

  return { valid: true };
}

export async function generateSuccessionSummary(
  departingUserId: string,
  replacementUserId: string,
  profiles: Profile[]
): Promise<SuccessionSummary> {
  const departingUser = profiles.find((profile) => profile.id === departingUserId);
  const replacementUser = profiles.find((profile) => profile.id === replacementUserId);
  if (!departingUser || !replacementUser) throw new Error("Invalid user IDs");

  const directReportsCount = getDirectReports(departingUserId, profiles).length;
  const [documents, capas, ncs, audits, trainings, memberships] = await Promise.all([
    prisma.document.count({ where: { assignedTo: departingUserId, deletedAt: null } }),
    prisma.capa.count({ where: { assignedTo: departingUserId, deletedAt: null } }),
    prisma.nonconformance.count({ where: { assignedTo: departingUserId, deletedAt: null } }),
    prisma.audit.count({ where: { assignedTo: departingUserId, deletedAt: null } }),
    prisma.training.count({ where: { assignedTo: departingUserId, deletedAt: null } }),
    prisma.committeeMembership.findMany({ where: { profileId: departingUserId } }),
  ]);

  const recordsToTransferCount = documents + capas + ncs + audits + trainings;
  const committeeMembershipsCount = memberships.length;
  const committeeHeadRolesCount = memberships.filter((membership) => membership.roleInCommittee === "head").length;

  return {
    departingUserId,
    departingUserName: departingUser.name,
    replacementUserId,
    replacementUserName: replacementUser.name,
    directReportsCount,
    recordsToTransferCount,
    committeeMembershipsCount,
    committeeHeadRolesCount,
    totalImpact: directReportsCount + recordsToTransferCount + committeeMembershipsCount,
  };
}

export async function executeSuccession(departingUserId: string, replacementUserId: string) {
  return prisma.$transaction(async (tx) => {
    const reports = await tx.profile.findMany({ where: { reportsTo: departingUserId } });
    await tx.profile.updateMany({
      where: { reportsTo: departingUserId },
      data: { reportsTo: replacementUserId },
    });

    await Promise.all([
      tx.document.updateMany({ where: { assignedTo: departingUserId }, data: { assignedTo: replacementUserId } }),
      tx.capa.updateMany({ where: { assignedTo: departingUserId }, data: { assignedTo: replacementUserId } }),
      tx.nonconformance.updateMany({ where: { assignedTo: departingUserId }, data: { assignedTo: replacementUserId } }),
      tx.audit.updateMany({ where: { assignedTo: departingUserId }, data: { assignedTo: replacementUserId } }),
      tx.training.updateMany({ where: { assignedTo: departingUserId }, data: { assignedTo: replacementUserId } }),
      tx.committeeTask.updateMany({ where: { assignedTo: departingUserId }, data: { assignedTo: replacementUserId } }),
    ]);

    const memberships = await tx.committeeMembership.findMany({ where: { profileId: departingUserId } });
    for (const membership of memberships) {
      const existing = await tx.committeeMembership.findUnique({
        where: { committeeId_profileId: { committeeId: membership.committeeId, profileId: replacementUserId } },
      });
      if (existing) {
        if (membership.roleInCommittee === "head" && existing.roleInCommittee !== "head") {
          await tx.committeeMembership.update({
            where: { id: existing.id },
            data: { roleInCommittee: "head" },
          });
        }
        await tx.committeeMembership.delete({ where: { id: membership.id } });
      } else {
        await tx.committeeMembership.update({
          where: { id: membership.id },
          data: { profileId: replacementUserId },
        });
      }
    }

    await tx.profile.update({
      where: { id: departingUserId },
      data: { active: false },
    });

    return {
      success: true as const,
      changes: {
        directReportsTransferred: reports.map((report) => report.id),
        committeeMembershipsTransferred: memberships,
        departingUserMarkedInactive: true,
      },
    };
  });
}
