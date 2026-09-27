import { canManageCommittees, isCommitteeHead, type Profile } from "@/src/lib/permissions";

export const TASK_STATUSES = ["assigned", "in_progress", "submitted", "approved"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export function normalizeTaskStatus(value: unknown): TaskStatus | null {
  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : null;
}

export type Membership = { committeeId: string; profileId: string; roleInCommittee: string };

/** Committees whose task list the viewer may read: their own, plus all when they manage committees. */
export function visibleCommitteeIds(userId: string, memberships: Membership[], profiles: Profile[]): string[] {
  const mine = memberships.filter((m) => m.profileId === userId).map((m) => m.committeeId);
  return canManageCommittees(userId, profiles) ? ["*", ...mine] : mine;
}

/** Assignee responds; committee head and committee managers may respond on their behalf. */
export function canRespondToTask(
  userId: string,
  task: { committeeId: string; assignedTo: string },
  memberships: Membership[],
  profiles: Profile[]
): boolean {
  if (userId === task.assignedTo) return true;
  if (isCommitteeHead(userId, task.committeeId, memberships)) return true;
  return canManageCommittees(userId, profiles);
}

/** Head may review (approve) their own committee's tasks. */
export function canReviewTask(
  userId: string,
  task: { committeeId: string; assignedTo: string },
  memberships: Membership[],
  profiles: Profile[]
): boolean {
  if (userId === task.assignedTo) return false;
  return canManageCommittees(userId, profiles) || isCommitteeHead(userId, task.committeeId, memberships);
}
