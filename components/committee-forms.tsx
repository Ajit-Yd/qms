"use client";

import { useState } from "react";

export type CommitteeFormType = "create" | "addMember" | "assignTask" | "succession" | "permission";

/**
 * Create Committee Form
 */
export function CreateCommitteeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: { name: string; description: string }) => void;
  onCancel?: () => void;
}) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onSubmit({
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800">Create Committee</h3>
      </div>

      <label className="block text-sm text-slate-600">
        <span className="mb-1.5 block font-medium">Committee Name *</span>
        <input
          type="text"
          name="name"
          required
          placeholder="e.g., Quality Assurance Committee"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>

      <label className="block text-sm text-slate-600">
        <span className="mb-1.5 block font-medium">Description</span>
        <textarea
          name="description"
          placeholder="e.g., Oversees quality policies and standards"
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          Create Committee
        </button>
      </div>
    </form>
  );
}

/**
 * Add Committee Member Form
 */
export function AddMemberForm({
  committeeMembers,
  availableProfiles,
  onSubmit,
  onCancel,
}: {
  committeeMembers: Array<{ id: string; name: string }>;
  availableProfiles: Array<{ id: string; name: string; roleTitle: string }>;
  onSubmit: (values: { profileId: string; roleInCommittee: string }) => void;
  onCancel?: () => void;
}) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onSubmit({
      profileId: String(formData.get("profileId") ?? ""),
      roleInCommittee: String(formData.get("roleInCommittee") ?? "member"),
    });
  };

  const alreadyMembers = committeeMembers.map((m) => m.id);
  const availableToAdd = availableProfiles.filter((p) => !alreadyMembers.includes(p.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800">Add Committee Member</h3>
      </div>

      <label className="block text-sm text-slate-600">
        <span className="mb-1.5 block font-medium">Select Member *</span>
        <select
          name="profileId"
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        >
          <option value="">-- Choose a user --</option>
          {availableToAdd.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profile.roleTitle})
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-slate-600">
        <span className="mb-1.5 block font-medium">Role in Committee *</span>
        <select
          name="roleInCommittee"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        >
          <option value="member">Member</option>
          <option value="head">Head</option>
        </select>
      </label>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          Add Member
        </button>
      </div>
    </form>
  );
}

/**
 * Assign Committee Task Form
 */
export function AssignTaskForm({
  committeeName,
  committeeMembers,
  onSubmit,
  onCancel,
}: {
  committeeName: string;
  committeeMembers: Array<{ id: string; name: string }>;
  onSubmit: (values: { title: string; description: string; assignedTo: string; dueDate: string }) => void;
  onCancel?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onSubmit({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      assignedTo: String(formData.get("assignedTo") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800">Assign Task</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{committeeName}</span>
      </div>

      <label className="block text-sm text-slate-600">
        <span className="mb-1.5 block font-medium">Task Title *</span>
        <input
          type="text"
          name="title"
          required
          placeholder="e.g., Review Q2 audit results"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>

      <label className="block text-sm text-slate-600">
        <span className="mb-1.5 block font-medium">Description</span>
        <textarea
          name="description"
          placeholder="Detailed description of the task"
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-slate-600">
          <span className="mb-1.5 block font-medium">Assign to *</span>
          <select
            name="assignedTo"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
          >
            <option value="">-- Choose assignee --</option>
            {committeeMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-600">
          <span className="mb-1.5 block font-medium">Due Date</span>
          <input
            type="date"
            name="dueDate"
            defaultValue={today}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          Assign Task
        </button>
      </div>
    </form>
  );
}

/**
 * Succession/Replace Employee Form
 */
export function SuccessionForm({
  profiles,
  summary,
  onSubmit,
  onExecute,
  onCancel,
}: {
  profiles: Array<{ id: string; name: string; roleTitle: string }>;
  summary?: {
    departingUserName: string;
    replacementUserName: string;
    directReportsCount: number;
    committeeMembershipsCount: number;
    committeeHeadRolesCount: number;
  };
  onSubmit: (values: { departingUserId: string; replacementUserId: string }) => void;
  onExecute?: (values: { departingUserId: string; replacementUserId: string }) => void;
  onCancel?: () => void;
}) {
  const [departingUserId, setDepartingUserId] = useState<string>("");
  const [replacementUserId, setReplacementUserId] = useState<string>("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSubmit({
      departingUserId,
      replacementUserId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800">Replace Employee</h3>
        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">Admin Only</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-slate-600">
          <span className="mb-1.5 block font-medium">Departing Employee *</span>
          <select
            value={departingUserId}
            onChange={(e) => setDepartingUserId(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
          >
            <option value="">-- Choose employee --</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} ({profile.roleTitle})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-600">
          <span className="mb-1.5 block font-medium">Replacement Employee *</span>
          <select
            value={replacementUserId}
            onChange={(e) => setReplacementUserId(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
          >
            <option value="">-- Choose replacement --</option>
            {profiles
              .filter((p) => p.id !== departingUserId)
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.roleTitle})
                </option>
              ))}
          </select>
        </label>
      </div>

      {summary && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <h4 className="mb-2 font-semibold">Transfer Summary</h4>
          <ul className="space-y-1 text-xs">
            <li>• <strong>{summary.directReportsCount}</strong> direct reports will be reassigned</li>
            <li>• <strong>{summary.committeeMembershipsCount}</strong> committee memberships will transfer</li>
            {summary.committeeHeadRolesCount > 0 && (
              <li>• <strong>{summary.committeeHeadRolesCount}</strong> committee head roles will transfer</li>
            )}
            <li>• All history records will be preserved</li>
            <li>• {summary.departingUserName} will be marked as inactive</li>
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
        )}
        {summary && onExecute && (
          <button
            type="button"
            onClick={() => onExecute({ departingUserId, replacementUserId })}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Execute Replacement
          </button>
        )}
        <button
          type="submit"
          disabled={!departingUserId || !replacementUserId}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          Preview Replacement
        </button>
      </div>
    </form>
  );
}

/**
 * Grant Committee Management Permission Form
 */
export function GrantPermissionForm({
  profiles,
  onSubmit,
  onCancel,
}: {
  profiles: Array<{ id: string; name: string; roleTitle: string; canManageCommittees?: boolean }>;
  onSubmit: (values: { targetUserId: string; grant: boolean }) => void;
  onCancel?: () => void;
}) {
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [grant, setGrant] = useState<boolean>(true);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSubmit({
      targetUserId,
      grant,
    });
  };

  const selectedProfile = profiles.find((p) => p.id === targetUserId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800">Committee Management Permission</h3>
        <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">Admin Only</span>
      </div>

      <label className="block text-sm text-slate-600">
        <span className="mb-1.5 block font-medium">Select User *</span>
        <select
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        >
          <option value="">-- Choose user --</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profile.roleTitle})
            </option>
          ))}
        </select>
      </label>

      {selectedProfile && (
        <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
          <p>
            <strong>{selectedProfile.name}</strong> currently{" "}
            {selectedProfile.canManageCommittees ? (
              <span className="font-semibold text-green-700">has</span>
            ) : (
              <span>does not have</span>
            )}{" "}
            committee management permission.
          </p>
        </div>
      )}

      <label className="block text-sm text-slate-600">
        <span className="mb-1.5 block font-medium">Action *</span>
        <select
          value={grant ? "grant" : "revoke"}
          onChange={(e) => setGrant(e.target.value === "grant")}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        >
          <option value="grant">Grant Permission</option>
          <option value="revoke">Revoke Permission</option>
        </select>
      </label>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!targetUserId}
          className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {grant ? "Grant" : "Revoke"} Permission
        </button>
      </div>
    </form>
  );
}
