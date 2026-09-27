"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type OrgProfile = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  systemRole: string | null;
};
type Organization = {
  id: string;
  name: string;
  active: boolean;
  _count: { profiles: number; committees: number };
  profiles: OrgProfile[];
};

const input =
  "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:bg-white";
const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_32px_rgba(16,24,40,0.06)]";

const roleLabel = (role: string | null) =>
  role === "primary_admin" ? "Primary Admin" : role === "org_admin" ? "Secondary Admin" : "Member";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/organizations");
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed to load organizations");
      return;
    }
    setOrgs((await res.json()).organizations ?? []);
  }, []);

  // No setState before the first await.
  useEffect(() => {
    void load();
  }, [load]);

  const post = async (payload: unknown) => {
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return false;
    }
    setError("");
    return true;
  };

  const createOrg = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await post({ name, adminName, email, password });
    setBusy(false);
    if (ok) {
      setName("");
      setAdminName("");
      setEmail("");
      setPassword("");
      await load();
    }
  };

  const toggleRole = async (profile: OrgProfile) => {
    if (busy) return;
    setBusy(true);
    const ok = await post({ profileId: profile.id, systemRole: profile.systemRole === "org_admin" ? "member" : "org_admin" });
    setBusy(false);
    if (ok) await load();
  };

  const rename = async (id: string) => {
    if (busy || !editingName.trim()) return;
    setBusy(true);
    const res = await fetch("/api/organizations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name: editingName }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Rename failed");
      return;
    }
    setEditingId("");
    setEditingName("");
    await load();
  };

  return (
    <main className="min-h-screen bg-[#EEF2FA] p-4 text-slate-800 sm:p-6 dark:bg-[#0b1220] dark:text-slate-200">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-800">
              &larr; Back to QMS
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Organizations</h1>
            <p className="mt-1 text-sm text-slate-600">
              As Primary Admin you own every organization and appoint its Secondary Admins.
            </p>
          </div>
          <ThemeToggle />
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={card}>
            <h2 className="font-semibold text-slate-900">New organization</h2>
            <form onSubmit={createOrg} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Organization name
                <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Secondary Admin name <span className="font-normal text-slate-500">(optional)</span>
                <input value={adminName} onChange={(e) => setAdminName(e.target.value)} className={input} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Admin email <span className="font-normal text-slate-500">(optional)</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Admin password <span className="font-normal text-slate-500">(min 8 chars)</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
              </label>
              <Button type="submit" variant="primary" loading={busy} disabled={busy}>
                Create organization
              </Button>
            </form>
          </section>

          <div className="space-y-4">
            {orgs.length === 0 && <p className={card}>No organizations yet.</p>}
            {orgs.map((org) => (
              <section key={org.id} className={card}>
                <div className="flex items-center justify-between gap-3">
                  {editingId === org.id ? (
                    <div className="flex flex-1 gap-2">
                      <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className={input} />
                      <Button size="sm" variant="primary" onClick={() => rename(org.id)} disabled={busy}>
                        Save
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId("")}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h2 className="font-semibold text-slate-900">{org.name}</h2>
                        <p className="text-xs text-slate-500">
                          {org._count.profiles} people &middot; {org._count.committees} committees
                          {org.active ? "" : " \u00b7 inactive"}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => { setEditingId(org.id); setEditingName(org.name); }}>
                        Rename
                      </Button>
                    </>
                  )}
                </div>

                <ul className="mt-3 divide-y divide-slate-100">
                  {org.profiles.length === 0 && <li className="py-2 text-sm text-slate-500">No people yet.</li>}
                  {org.profiles.map((person) => (
                    <li key={person.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {person.name} <span className="text-xs text-slate-500">&middot; {roleLabel(person.systemRole)}</span>
                        </p>
                        {person.email && <p className="text-xs text-slate-500">{person.email}</p>}
                      </div>
                      {person.systemRole !== "primary_admin" && (
                        <Button size="sm" variant="secondary" onClick={() => toggleRole(person)} disabled={busy}>
                          {person.systemRole === "org_admin" ? "Make member" : "Make Secondary Admin"}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
