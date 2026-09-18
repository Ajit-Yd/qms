export type Profile = {
  id: string;
  name: string;
  email?: string | null;
  roleTitle: string;
  reportsTo: string | null;
  active?: boolean | null;
  canManageCommittees?: boolean | null;
  createdAt?: string | Date;
};

export function getProfileById(id: string, profiles: Profile[]) {
  return profiles.find((profile) => profile.id === id);
}

export function toPublicProfile<T extends Record<string, unknown>>(profile: T): Omit<T, "passwordHash"> {
  const copy: Record<string, unknown> = { ...profile };
  delete copy.passwordHash;
  return copy as Omit<T, "passwordHash">;
}

export function getDirectReports(userId: string, profiles: Profile[]) {
  return profiles.filter((profile) => profile.reportsTo === userId);
}

export type DashboardRole = "top-authority" | "team-lead" | "process-owner" | "staff";

export function getDashboardRole(userId: string, profiles: Profile[]): DashboardRole {
  const profile = getProfileById(userId, profiles);
  if (!profile || profile.reportsTo === null) return "top-authority";

  const directReports = getDirectReports(userId, profiles);
  if (!directReports.length) return "staff";
  if (directReports.some((report) => getDirectReports(report.id, profiles).length > 0)) return "team-lead";
  return "process-owner";
}

export function isTopAuthority(userId: string, profiles: Profile[]): boolean {
  const profile = getProfileById(userId, profiles);
  return profile?.reportsTo === null;
}

export function isMonitorOnly(userId: string, profiles: Profile[]): boolean {
  return isTopAuthority(userId, profiles);
}

export function canCreateRecords(userId: string, profiles: Profile[]): boolean {
  return !isMonitorOnly(userId, profiles);
}

export function canAssignRecords(userId: string, profiles: Profile[]): boolean {
  return !isMonitorOnly(userId, profiles);
}

export function canManageCommittees(userId: string, profiles: Profile[]): boolean {
  if (isMonitorOnly(userId, profiles)) return false;
  return getProfileById(userId, profiles)?.canManageCommittees ?? false;
}

export function canGrantCommitteePermission(userId: string, profiles: Profile[]): boolean {
  return isTopAuthority(userId, profiles);
}

export function isCommitteeHead(
  userId: string,
  committeeId: string,
  memberships: Array<{ profileId: string; committeeId: string; roleInCommittee: string }>
): boolean {
  return memberships.some(
    (membership) =>
      membership.profileId === userId &&
      membership.committeeId === committeeId &&
      membership.roleInCommittee === "head"
  );
}

export function canAssignCommitteeTask(
  userId: string,
  committeeId: string,
  profiles: Profile[],
  committeeMemberships: Array<{ profileId: string; committeeId: string; roleInCommittee: string }> = []
): boolean {
  if (isMonitorOnly(userId, profiles)) return false;
  if (canManageCommittees(userId, profiles)) return true;
  return isCommitteeHead(userId, committeeId, committeeMemberships);
}

export function validateGrantPermission(
  grantingUserId: string,
  targetUserId: string,
  profiles: Profile[]
): { valid: boolean; reason?: string } {
  if (!isTopAuthority(grantingUserId, profiles)) {
    return { valid: false, reason: "Only the top authority can grant committee management permissions" };
  }

  if (grantingUserId === targetUserId) {
    return { valid: false, reason: "Cannot grant permissions to yourself" };
  }

  const targetProfile = getProfileById(targetUserId, profiles);
  if (!targetProfile) {
    return { valid: false, reason: "Target user does not exist" };
  }

  return { valid: true };
}

export function canInitiateSuccession(userId: string, profiles: Profile[]): boolean {
  return isTopAuthority(userId, profiles);
}

export function getSubordinateIds(userId: string, profiles: Profile[]): string[] {
  const seen = new Set<string>();
  const queue = [userId];

  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);

    const children = profiles
      .filter((profile) => profile.reportsTo === current)
      .map((profile) => profile.id);
    queue.push(...children);
  }

  return Array.from(seen).filter((id) => id !== userId);
}

export function isSuperiorToSubordinate(
  assigningUserId: string,
  assignedToUserId: string,
  profiles: Profile[]
): boolean {
  return getSubordinateIds(assigningUserId, profiles).includes(assignedToUserId);
}

export function getViewerScope(userId: string, profiles: Profile[]) {
  return [userId, ...getSubordinateIds(userId, profiles)];
}

export function canViewRecord(viewerId: string, assignedTo: string, profiles: Profile[]) {
  if (!viewerId || !assignedTo) return false;
  return getViewerScope(viewerId, profiles).includes(assignedTo) || viewerId === assignedTo;
}

export function canSubmitOrUpdate(viewerId: string, assignedTo: string) {
  return viewerId === assignedTo;
}

export function canApproveOrRevise(viewerId: string, assignedTo: string, profiles: Profile[]) {
  if (viewerId === assignedTo) return false;
  let currentId = getProfileById(assignedTo, profiles)?.reportsTo ?? null;
  const seen = new Set<string>();

  while (currentId && !seen.has(currentId)) {
    if (currentId === viewerId) return true;
    seen.add(currentId);
    currentId = getProfileById(currentId, profiles)?.reportsTo ?? null;
  }

  return false;
}
