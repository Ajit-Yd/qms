import assert from "node:assert/strict";
import { canRespondToTask, canReviewTask, normalizeTaskStatus, visibleCommitteeIds, type Membership } from "./tasks-api";
import type { Profile } from "./permissions";

const profiles: Profile[] = [
  { id: "admin", name: "Admin", roleTitle: "Primary Admin", reportsTo: null, canManageCommittees: true },
  { id: "head", name: "Head", roleTitle: "Manager", reportsTo: "admin" },
  { id: "member", name: "Member", roleTitle: "Staff", reportsTo: "head" },
  { id: "outsider", name: "Outsider", roleTitle: "Staff", reportsTo: "admin" },
];

const memberships: Membership[] = [
  { committeeId: "c1", profileId: "head", roleInCommittee: "head" },
  { committeeId: "c1", profileId: "member", roleInCommittee: "member" },
  { committeeId: "c2", profileId: "outsider", roleInCommittee: "head" },
];

const task = { committeeId: "c1", assignedTo: "member" };

assert.equal(normalizeTaskStatus("submitted"), "submitted");
assert.equal(normalizeTaskStatus("nonsense"), null);
assert.equal(normalizeTaskStatus(undefined), null);

// Committee managers see their organization's committees; everyone else only their own.
// The wildcard is gone: it would have let a Secondary Admin read other organizations' tasks.
assert.deepEqual(visibleCommitteeIds("admin", memberships, profiles, ["c1", "c2"]), ["c1", "c2"]);
assert.deepEqual(visibleCommitteeIds("member", memberships, profiles, ["c1", "c2"]), ["c1"]);
assert.deepEqual(visibleCommitteeIds("outsider", memberships, profiles, ["c1", "c2"]), ["c2"]);
assert.deepEqual(visibleCommitteeIds("nobody", memberships, profiles, ["c1", "c2"]), []);
// A manager in an org with no committees sees nothing, rather than everything.
assert.deepEqual(visibleCommitteeIds("admin", memberships, profiles, []), []);

// Responding: assignee, committee head, or manager.
assert.equal(canRespondToTask("member", task, memberships, profiles), true);
assert.equal(canRespondToTask("head", task, memberships, profiles), true);
assert.equal(canRespondToTask("admin", task, memberships, profiles), true);
assert.equal(canRespondToTask("outsider", task, memberships, profiles), false);

// Reviewing: head or manager, but never the assignee themselves.
assert.equal(canReviewTask("head", task, memberships, profiles), true);
assert.equal(canReviewTask("admin", task, memberships, profiles), true);
assert.equal(canReviewTask("member", task, memberships, profiles), false);
assert.equal(canReviewTask("outsider", task, memberships, profiles), false);

console.log("tasks-api.ts checks passed");
