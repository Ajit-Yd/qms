"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DataTable } from "@/components/qms";
import { canManageCommittees, getProfileById, type Profile } from "@/lib/permissions";
import { CreateCommitteeForm } from "@/components/committee-forms";
import { Button } from "@/components/ui/button";

type CommitteeRow = {
  id: string;
  name: string;
  heads: string;
  memberCount: number;
  taskCount: number;
  description: string;
};

type ApiCommittee = {
  id: string;
  name: string;
  description: string | null;
  memberships: Array<{ profileId: string; roleInCommittee: string }>;
  tasks: unknown[];
};

export default function CommitteesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const viewerId = session?.user && "id" in session.user ? String(session.user.id) : "";
  const [rows, setRows] = useState<CommitteeRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [committeesResponse, profilesResponse] = await Promise.all([
        fetch("/api/committees"),
        fetch("/api/profiles"),
      ]);
      if (!committeesResponse.ok || !profilesResponse.ok) return;
      const [committeesData, profilesData] = await Promise.all([
        committeesResponse.json(),
        profilesResponse.json(),
      ]);
      if (cancelled) return;
      const availableProfiles = profilesData.profiles as Profile[];
      setProfiles(availableProfiles);
      setRows((committeesData.committees as ApiCommittee[]).map((committee) => {
        const heads = committee.memberships
          .filter((m) => m.roleInCommittee === "head")
          .map((m) => getProfileById(m.profileId, availableProfiles)?.name || "Unknown")
          .join(", ");
        return {
          id: committee.id,
          name: committee.name,
          heads: heads || "No head assigned",
          memberCount: committee.memberships.length,
          taskCount: committee.tasks.length,
          description: committee.description || "No description",
        };
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCommittees = async () => {
    const [committeesResponse, profilesResponse] = await Promise.all([
      fetch("/api/committees"),
      fetch("/api/profiles"),
    ]);
    if (!committeesResponse.ok || !profilesResponse.ok) return;
    const [committeesData, profilesData] = await Promise.all([
      committeesResponse.json(),
      profilesResponse.json(),
    ]);
    const availableProfiles = profilesData.profiles as Profile[];
    setProfiles(availableProfiles);
    setRows((committeesData.committees as ApiCommittee[]).map((committee) => {
      const heads = committee.memberships
        .filter((m) => m.roleInCommittee === "head")
        .map((m) => getProfileById(m.profileId, availableProfiles)?.name || "Unknown")
        .join(", ");
      return {
        id: committee.id,
        name: committee.name,
        heads: heads || "No head assigned",
        memberCount: committee.memberships.length,
        taskCount: committee.tasks.length,
        description: committee.description || "No description",
      };
    }));
  };

  useEffect(() => {
    if (rows.length && !viewerId) return;
    rows.forEach((row) => router.prefetch(`/committees/${row.id}`));
  }, [router, rows, viewerId]);

  const isManager = canManageCommittees(viewerId, profiles);

  const columns = [
    { key: "name" as const, label: "Committee Name" },
    { key: "heads" as const, label: "Committee Head(s)" },
    {
      key: "memberCount" as const,
      label: "Members",
      render: (row: CommitteeRow) => `${row.memberCount} members`,
    },
    {
      key: "taskCount" as const,
      label: "Open Tasks",
      render: (row: CommitteeRow) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            row.taskCount > 0
              ? "bg-orange-100 text-orange-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {row.taskCount}
        </span>
      ),
    },
  ];

  const handleCreateCommittee = async (values: { name: string; description: string }) => {
    const response = await fetch("/api/committees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const error = await response.json();
      console.error("Create committee failed:", error.error);
      return;
    }
    setShowCreateForm(false);
    void loadCommittees();
  };

  const loading = status === "loading";

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Committees & Clubs</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length} committee{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isManager && (
          <Button
            variant={showCreateForm ? "secondary" : "primary"}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Cancel" : "＋ New Committee"}
          </Button>
        )}
      </div>

      {showCreateForm && isManager && (
        <CreateCommitteeForm
          onSubmit={handleCreateCommittee}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {loading || (!rows.length && <DataTable rows={[]} columns={columns} />)}
        {!loading && rows.length > 0 && (
          <DataTable
            rows={rows}
            columns={columns}
            onRowClick={(row) => router.push(`/committees/${row.id}`)}
          />
        )}
      </div>

      <div className="text-center text-xs text-slate-500">
        <p>Click any committee to view members, tasks, and details</p>
      </div>
    </div>
  );
}