"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DataTable, StatusBadge } from "@/components/qms";
import { canAssignCommitteeTask, canManageCommitteeMembers, type Profile } from "@/src/lib/permissions";
import { AddMemberForm, AssignTaskForm } from "@/components/committee-forms";

type CommitteeDetail = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdByProfile: { id: string; name: string } | null;
  memberships: Array<{
    id: string;
    profileId: string;
    roleInCommittee: string;
    profile: Profile | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    assignedTo: string;
    status: string;
    dueDate: string | null;
  }>;
};

type MemberRow = { id: string; name: string; roleTitle: string; role: string };
type TaskRow = { id: string; title: string; assignedTo: string; status: string; dueDate: string };

export default function CommitteeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const committeeId = params.id as string;
  const { data: session, status: authStatus } = useSession();
  const viewerId = session?.user && "id" in session.user ? String(session.user.id) : "";

  const [committee, setCommittee] = useState<CommitteeDetail | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [pageError, setPageError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [committeeResponse, profilesResponse] = await Promise.all([
        fetch(`/api/committees/${committeeId}`),
        fetch("/api/profiles"),
      ]);
      if (!profilesResponse.ok) return;
      const profilesData = await profilesResponse.json();
      if (cancelled) return;
      setProfiles(profilesData.profiles as Profile[]);
      if (!committeeResponse.ok) {
        setNotFound(true);
        return;
      }
      const committeeData = await committeeResponse.json();
      if (cancelled) return;
      setCommittee(committeeData.committee as CommitteeDetail);
    })();
    return () => {
      cancelled = true;
    };
  }, [committeeId]);

  const refetch = async () => {
    const [committeeResponse, profilesResponse] = await Promise.all([
      fetch(`/api/committees/${committeeId}`),
      fetch("/api/profiles"),
    ]);
    if (!profilesResponse.ok) return;
    const profilesData = await profilesResponse.json();
    if (!profilesData.profiles) return;
    setProfiles(profilesData.profiles as Profile[]);
    if (!committeeResponse.ok) {
      setNotFound(true);
      return;
    }
    const committeeData = await committeeResponse.json();
    setCommittee(committeeData.committee as CommitteeDetail);
  };

  if (notFound) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-600">Committee not found</p>
        </div>
      </div>
    );
  }

  if (!committee || authStatus === "loading") {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-slate-600">Loading committee…</p>
        </div>
      </div>
    );
  }

  const memberships = committee.memberships ?? [];
  const tasks = committee.tasks ?? [];

  const canManage = canManageCommitteeMembers(viewerId, profiles);
  const canAssignTasks = canAssignCommitteeTask(viewerId, committeeId, profiles);

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name || "Unknown";

  const memberRows: MemberRow[] = memberships.map((membership) => {
    const profile = membership.profile;
    return {
      id: membership.id,
      name: profile?.name || profileName(membership.profileId),
      roleTitle: profile?.roleTitle || "Team member",
      role: membership.roleInCommittee === "head" ? "Committee Head" : "Member",
    };
  });

  const memberColumns = [
    { key: "name" as const, label: "Name" },
    { key: "roleTitle" as const, label: "Organization Role" },
    {
      key: "role" as const,
      label: "Committee Role",
      render: (row: MemberRow) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            row.role === "Committee Head"
              ? "bg-purple-100 text-purple-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {row.role}
        </span>
      ),
    },
  ];

  const taskRows: TaskRow[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    assignedTo: profileName(task.assignedTo),
    status: String(task.status),
    dueDate: task.dueDate || "",
  }));

  const taskColumns = [
    { key: "title" as const, label: "Task" },
    { key: "assignedTo" as const, label: "Assigned To" },
    {
      key: "status" as const,
      label: "Status",
      render: (row: TaskRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "dueDate" as const,
      label: "Due Date",
      render: (row: TaskRow) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "No due date"),
    },
  ];

  const handleAddMember = async (values: { profileId: string; roleInCommittee: string }) => {
    const response = await fetch(`/api/committees/${committeeId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const error = await response.json();
      console.error("Add member failed:", error.error);
      return;
    }
    setShowAddMember(false);
    void refetch();
  };

  const handleAssignTask = async (values: {
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
  }) => {
    const response = await fetch(`/api/committees/${committeeId}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const error = await response.json();
      console.error("Assign task failed:", error.error);
      return;
    }
    setShowAssignTask(false);
    void refetch();
  };

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPageError("");
    if (!editName.trim()) {
      setPageError("Committee name is required.");
      return;
    }
    const response = await fetch(`/api/committees/${committeeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription }),
    });
    if (!response.ok) {
      const error = await response.json();
      setPageError(error.error || "Failed to save committee.");
      return;
    }
    setShowEditForm(false);
    void refetch();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete committee "${committee.name}"? This removes its members and tasks.`)) return;
    setDeleting(true);
    setPageError("");
    const response = await fetch(`/api/committees/${committeeId}`, { method: "DELETE" });
    if (!response.ok) {
      const error = await response.json();
      setDeleting(false);
      setPageError(error.error || "Failed to delete committee.");
      return;
    }
    router.push("/committees");
    router.refresh();
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Committee Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <Link href="/committees" className="text-sm text-slate-500">← All committees</Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{committee.name}</h1>
            {committee.description && !showEditForm && (
              <p className="mt-2 text-sm text-slate-600">{committee.description}</p>
            )}
            {!showEditForm && (
              <p className="mt-3 text-xs text-slate-500">
                Created by {committee.createdByProfile?.name || "Unknown"} •{" "}
                {committee.createdAt ? new Date(committee.createdAt).toLocaleDateString() : ""}
              </p>
            )}
          </div>
          {canManage && !showEditForm && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditName(committee.name);
                  setEditDescription(committee.description ?? "");
                  setShowEditForm(true);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </div>

        {showEditForm && (
          <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Name</label>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            {pageError && <p className="text-sm text-red-600">{pageError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setPageError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-slate-500">Members</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{memberRows.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-slate-500">Heads</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {memberRows.filter((m) => m.role === "Committee Head").length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-slate-500">Open Tasks</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {taskRows.filter((t) => t.status !== "approved").length}
            </p>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Members ({memberRows.length})</h2>
          {canManage && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              {showAddMember ? "Cancel" : "+ Add Member"}
            </button>
          )}
        </div>

        {showAddMember && canManage && (
          <div className="mb-4">
            <AddMemberForm
              committeeMembers={memberRows}
              availableProfiles={profiles}
              onSubmit={handleAddMember}
              onCancel={() => setShowAddMember(false)}
            />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <DataTable rows={memberRows} columns={memberColumns} />
        </div>
      </div>

      {/* Tasks Section */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Tasks ({taskRows.length})</h2>
          {canAssignTasks && (
            <button
              onClick={() => setShowAssignTask(!showAssignTask)}
              className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              {showAssignTask ? "Cancel" : "+ Assign Task"}
            </button>
          )}
        </div>

        {showAssignTask && canAssignTasks && (
          <div className="mb-4">
            <AssignTaskForm
              committeeName={committee.name}
              committeeMembers={memberRows}
              onSubmit={handleAssignTask}
              onCancel={() => setShowAssignTask(false)}
            />
          </div>
        )}

        {taskRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No tasks assigned yet
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <DataTable rows={taskRows} columns={taskColumns} />
          </div>
        )}
      </div>
    </div>
  );
}