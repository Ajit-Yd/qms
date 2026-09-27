"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Attendee = { id: string; profileId: string; attended: boolean; profile: { id: string; name: string } | null };

type Meeting = {
  id: string;
  committeeId: string;
  title: string;
  agenda: string | null;
  notes: string | null;
  scheduledAt: string;
  location: string | null;
  linkUrl: string | null;
  organizedBy: string;
  committee: { id: string; name: string };
  organizer: { id: string; name: string } | null;
  attendees: Attendee[];
};

type CommitteeOption = { id: string; name: string };

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function MeetingsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const viewerId = session?.user && "id" in session.user ? String(session.user.id) : "";
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [committees, setCommittees] = useState<CommitteeOption[]>([]);
  const [committeeId, setCommitteeId] = useState(searchParams.get("committee") ?? "");
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // No setState before the first await.
  const load = useCallback(async () => {
    if (!viewerId) return;
    try {
      const response = await fetch(`/api/meetings${committeeId ? `?committeeId=${committeeId}` : ""}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(String(data.error ?? "Could not load meetings"));
        return;
      }
      setMeetings((data.meetings ?? []) as Meeting[]);
      setCommittees((data.committees ?? []) as CommitteeOption[]);
      setError("");
    } catch {
      setError("Could not load meetings");
    } finally {
      setLoading(false);
    }
  }, [viewerId, committeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const body = {
      committeeId: String(new FormData(form).get("committeeId") ?? ""),
      title: String(new FormData(form).get("title") ?? ""),
      agenda: String(new FormData(form).get("agenda") ?? ""),
      scheduledAt: String(new FormData(form).get("scheduledAt") ?? ""),
      location: String(new FormData(form).get("location") ?? ""),
      linkUrl: String(new FormData(form).get("linkUrl") ?? ""),
    };
    const response = await fetch("/api/meetings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(String(data.error ?? "Could not schedule meeting"));
      return;
    }
    setShowForm(false);
    void load();
  };

  const saveNotes = async (id: string, notes: string) => {
    await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    void load();
  };

  const toggleAttendance = async (meeting: Meeting, profileId: string) => {
    const attended = new Set(meeting.attendees.filter((a) => a.attended).map((a) => a.profileId));
    if (attended.has(profileId)) attended.delete(profileId);
    else attended.add(profileId);
    await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attendedProfileIds: [...attended] }),
    });
    void load();
  };

  return (
    <main className="min-h-screen bg-[#EEF2FA] p-4 text-slate-800 dark:bg-[#0b1220] dark:text-slate-200 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meetings</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {meetings.length} meeting{meetings.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "＋ Schedule"}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {committees.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <FilterChip active={committeeId === ""} onClick={() => setCommitteeId("")}>
              All
            </FilterChip>
            {committees.map((committee) => (
              <FilterChip key={committee.id} active={committeeId === committee.id} onClick={() => setCommitteeId(committee.id)}>
                {committee.name}
              </FilterChip>
            ))}
          </div>
        )}

        {showForm && (
          <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Committee">
                <select name="committeeId" required className={inputClass}>
                  {committees.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date & time">
                <input name="scheduledAt" type="datetime-local" required defaultValue={toLocalInput(new Date().toISOString())} className={inputClass} />
              </Field>
            </div>
            <Field label="Title">
              <input name="title" required placeholder="e.g., CAPA review — open queries" className={inputClass} />
            </Field>
            <Field label="Agenda">
              <textarea name="agenda" rows={2} placeholder="What needs discussing?" className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Location">
                <input name="location" placeholder="Room / venue" className={inputClass} />
              </Field>
              <Field label="Link (optional)">
                <input name="linkUrl" type="url" placeholder="https://…" className={inputClass} />
              </Field>
            </div>
            <p className="text-[11px] text-slate-500">Attendees default to the whole committee roster.</p>
            <div className="flex justify-end gap-2">
              <Button type="submit" variant="primary">Schedule meeting</Button>
            </div>
          </form>
        )}

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-500">Loading meetings…</p>}
          {!loading && !meetings.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No meetings yet.
            </div>
          )}
          {meetings.map((meeting) => {
            const present = meeting.attendees.filter((a) => a.attended).length;
            return (
              <article key={meeting.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#1D9E75]">{meeting.committee.name}</div>
                    <h2 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">{meeting.title}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700">
                    {new Date(meeting.scheduledAt).toLocaleString()}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Organized by {meeting.organizer?.name ?? "Unknown"}</span>
                  {meeting.location && <span>Where: {meeting.location}</span>}
                  <span>{present}/{meeting.attendees.length} present</span>
                </div>

                {meeting.agenda && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{meeting.agenda}</p>}

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  {meeting.linkUrl && (
                    <a href={meeting.linkUrl} target="_blank" rel="noreferrer noopener noreferrer" className="text-slate-600 underline">
                      {meeting.linkUrl}
                    </a>
                  )}
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === meeting.id ? null : meeting.id)}
                    className="text-xs font-semibold text-slate-600 underline"
                  >
                    {openId === meeting.id ? "Hide roster & notes" : `Roster & notes (${meeting.attendees.length})`}
                  </button>

                  {openId === meeting.id && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {meeting.attendees.map((attendee) => (
                          <button
                            key={attendee.id}
                            type="button"
                            onClick={() => void toggleAttendance(meeting, attendee.profileId)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              attendee.attended
                                ? "bg-[#1D9E75] text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {attendee.profile?.name ?? "Unknown"}
                          </button>
                        ))}
                        {!meeting.attendees.length && <p className="text-xs text-slate-500">No attendees.</p>}
                      </div>

                      <NotesEditor
                        key={meeting.id}
                        initial={meeting.notes ?? ""}
                        canEdit={meeting.organizedBy === viewerId}
                        onSave={(notes) => void saveNotes(meeting.id, notes)}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-slate-600 dark:text-slate-300">
      <span className="mb-1.5 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function NotesEditor({ initial, canEdit, onSave }: { initial: string; canEdit: boolean; onSave: (notes: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Minutes / notes</div>
      {canEdit ? (
        <>
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className={inputClass} />
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => onSave(value)}>
            Save notes
          </Button>
        </>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{initial || "No notes yet."}</p>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-[#1D9E75] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
