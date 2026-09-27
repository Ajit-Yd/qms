"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { StatusBadge } from "@/components/qms";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { formatFileSize, MAX_FILE_BYTES } from "@/src/lib/files";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In progress" },
  { key: "submitted", label: "Pending review" },
  { key: "approved", label: "Approved" },
] as const;

type CommitteeOption = { id: string; name: string };

type Task = {
  id: string;
  committeeId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  responseNote: string | null;
  linkUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  respondedAt: string | null;
  committee: { id: string; name: string };
  assignedToProfile: { id: string; name: string } | null;
  assignedByProfile: { id: string; name: string } | null;
};

const isOverdue = (task: Task) =>
  !!task.dueDate && !["submitted", "approved"].includes(task.status) && new Date(task.dueDate).getTime() < Date.now();

function RespondForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = event.currentTarget;
    const picked = (form.elements.namedItem("file") as HTMLInputElement)?.files?.[0];
    if (picked && picked.size > MAX_FILE_BYTES) {
      setError(`Too large. Max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB.`);
      setBusy(false);
      return;
    }
    try {
      const body = new FormData(form);
      const response = await fetch(`/api/tasks/${task.id}/file`, { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(String(data.error ?? "Could not save response"));
      else onDone();
    } catch {
      setError("Could not save response");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <textarea
        name="responseNote"
        defaultValue={task.responseNote ?? ""}
        rows={3}
        placeholder="Describe what you did…"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm"
      />
      <input
        name="linkUrl"
        type="url"
        defaultValue={task.linkUrl ?? ""}
        placeholder="https://… (optional link)"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="file"
          type="file"
          aria-label="Attach evidence"
          className="text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
        />
        <Button type="submit" variant="primary" size="sm" loading={busy} disabled={busy}>
          Submit response
        </Button>
      </div>
      <p className="text-[11px] text-slate-400">
        PDF, Word, Excel, images, archives · up to {Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB · optional hyperlink
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

export default function TasksPage() {
  const { data: session } = useSession();
  const viewerId = session?.user && "id" in session.user ? String(session.user.id) : "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [committees, setCommittees] = useState<CommitteeOption[]>([]);
  const [committeeId, setCommitteeId] = useState("");
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // No setState before the first await.
  const load = useCallback(async () => {
    if (!viewerId) return;
    const params = new URLSearchParams();
    if (committeeId) params.set("committeeId", committeeId);
    if (status) params.set("status", status);
    try {
      const response = await fetch(`/api/tasks?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(String(data.error ?? "Could not load tasks"));
        return;
      }
      setTasks((data.tasks ?? []) as Task[]);
      setCommittees((data.committees ?? []) as CommitteeOption[]);
      setError("");
    } catch {
      setError("Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, [viewerId, committeeId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, next: "approved" | "in_progress") => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (response.ok) void load();
  };

  return (
    <main className="min-h-screen bg-[#EEF2FA] p-4 text-slate-800 dark:bg-[#0b1220] dark:text-slate-200 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Tasks</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
              {committees.length ? ` across ${committees.length} committee${committees.length === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Committee filter — All pinned on top */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Committees</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={committeeId === ""} onClick={() => setCommitteeId("")}>
              All
            </FilterChip>
            {committees.map((committee) => (
              <FilterChip
                key={committee.id}
                active={committeeId === committee.id}
                onClick={() => setCommitteeId(committee.id)}
              >
                {committee.name}
              </FilterChip>
            ))}
          </div>

          <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Status</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <FilterChip key={filter.key || "all"} active={status === filter.key} onClick={() => setStatus(filter.key)}>
                {filter.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-500">Loading tasks…</p>}
          {!loading && !tasks.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No tasks match this filter.
            </div>
          )}
          {tasks.map((task) => (
            <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-[#1D9E75]">
                    {task.committee.name}
                  </div>
                  <h2 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">{task.title}</h2>
                  {task.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{task.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {isOverdue(task) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Overdue</span>
                  )}
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Assigned to: {task.assignedToProfile?.name ?? "Unknown"}</span>
                {task.assignedByProfile && <span>By: {task.assignedByProfile.name}</span>}
                <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}</span>
              </div>

              {(task.responseNote || task.linkUrl || task.fileName) && (
                <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900/50">
                  {task.responseNote && <p className="whitespace-pre-wrap">{task.responseNote}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {task.fileName && (
                      <a href={`/api/tasks/${task.id}/file`} target="_blank" rel="noreferrer" className="font-semibold text-[#1D9E75] underline">
                        {task.fileName}
                      </a>
                    )}
                    {task.fileName && <span className="text-slate-400">{formatFileSize(task.fileSize)}</span>}
                    {task.linkUrl && (
                      <a href={task.linkUrl} target="_blank" rel="noreferrer noopener noreferrer" className="text-slate-600 underline">
                        {task.linkUrl}
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {openId === task.id ? (
                  <>
                    <RespondForm task={task} onDone={() => { setOpenId(null); void load(); }} />
                  </>
                ) : (
                  <>
                    <Button variant="primary" size="sm" onClick={() => setOpenId(task.id)}>
                      {task.status === "submitted" ? "Edit response" : "Respond"}
                    </Button>
                    {task.status === "submitted" && task.assignedToProfile?.id !== viewerId && (
                      <>
                        <Button variant="success" size="sm" onClick={() => void review(task.id, "approved")}>
                          Approve
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => void review(task.id, "in_progress")}>
                          Send back
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[#1D9E75] text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
