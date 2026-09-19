"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getSubordinateIds } from "@/src/lib/permissions";
import { getDashboardRole, isMonitorOnly } from "@/lib/permissions";
import { SuccessionForm, GrantPermissionForm } from "@/components/committee-forms";
import { ProfileDisplay } from "@/components/profile-display";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import type { SuccessionSummary } from "@/src/lib/succession";
import type { Profile } from "@/lib/permissions";

type TeamProfile = Profile & { canManageCommittees?: boolean; active?: boolean; email?: string | null };

export default function TeamAdminPage() {
  const { data: session, status } = useSession();
  const viewerId = session?.user && "id" in session.user ? String(session.user.id) : "";
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"members" | "add" | "records" | "succession" | "permissions">("members");
  const canEditStructure = profiles.length ? getDashboardRole(viewerId, profiles as any) === "top-authority" : false;

  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [reportsTo, setReportsTo] = useState("p-director");
  const [email, setEmail] = useState("");
  const [newUserInfo, setNewUserInfo] = useState("");
  const [newUserLoading, setNewUserLoading] = useState(false);

  const [showSuccessionForm, setShowSuccessionForm] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [successionSummary, setSuccessionSummary] = useState<SuccessionSummary | null>(null);

  // Fetch live profiles
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setProfiles((data.profiles ?? []) as TeamProfile[]);
          if (data.profiles?.length) setReportsTo(data.profiles[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visibleIds = useMemo(() => canEditStructure ? profiles.map((p) => p.id) : [viewerId, ...getSubordinateIds(viewerId, profiles as any)], [canEditStructure, profiles, viewerId]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (!visibleIds.includes(p.id)) return false;
      const haystack = `${p.name} ${p.roleTitle} ${p.email ?? ""}`.toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && p.roleTitle !== roleFilter) return false;
      return true;
    });
  }, [profiles, visibleIds, search, roleFilter]);

  const stats = useMemo(() => ({
    total: profiles.length,
    active: profiles.filter((p) => p.active !== false).length,
    managers: profiles.filter((p) => p.canManageCommittees).length,
    visible: filteredProfiles.length,
  }), [profiles, filteredProfiles]);

  const uniqueRoles = useMemo(() => Array.from(new Set(profiles.map((p) => p.roleTitle))).sort(), [profiles]);

  const handleSuccessionSubmit = async (values: { departingUserId: string; replacementUserId: string }) => {
    const response = await fetch(`/api/admin/succession?departingUserId=${encodeURIComponent(values.departingUserId)}&replacementUserId=${encodeURIComponent(values.replacementUserId)}`);
    if (response.ok) {
      const data = await response.json();
      setSuccessionSummary(data.summary as SuccessionSummary);
    } else {
      const error = await response.json().catch(() => ({}));
      setSuccessionSummary(null);
      alert(error.error ?? "Preview failed");
    }
  };

  const handleSuccessionExecute = async (values: { departingUserId: string; replacementUserId: string }) => {
    const response = await fetch("/api/admin/succession", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, confirmed: true }) });
    if (response.ok) {
      setSuccessionSummary(null);
      setShowSuccessionForm(false);
      // refresh profiles
      const res = await fetch("/api/profiles");
      if (res.ok) setProfiles((await res.json()).profiles ?? profiles);
    } else {
      const error = await response.json().catch(() => ({}));
      alert(error.error ?? "Succession failed");
    }
  };

  const handlePermissionSubmit = async (values: { targetUserId: string; grant: boolean }) => {
    const response = await fetch("/api/admin/permissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    if (response.ok) {
      setProfiles((current) => current.map((p) => (p.id === values.targetUserId ? { ...p, canManageCommittees: values.grant } : p)));
      setShowPermissionForm(false);
    } else {
      const error = await response.json().catch(() => ({}));
      alert(error.error ?? "Permission update failed");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || newUserLoading) return;
    setNewUserLoading(true);
    setNewUserInfo("");
    try {
      const response = await fetch("/api/admin/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, ".")}@qms.local`, roleTitle: roleTitle || "Team member", reportsTo }) });
      if (!response.ok) {
        let msg = "Failed to add user.";
        try { msg = (await response.json()).error || msg; } catch {}
        setNewUserInfo(msg);
        return;
      }
      const data = await response.json();
      setProfiles((current) => [...current, data.user]);
      setNewUserInfo(data.temporaryPassword ? `✓ User created. Temp password: ${data.temporaryPassword}` : "✓ User created.");
      setName(""); setRoleTitle(""); setEmail("");
    } finally {
      setNewUserLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#EEF2FA] p-3 sm:p-6 dark:bg-[#0b1220]">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-12 rounded-2xl bg-white dark:bg-slate-800" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white dark:bg-slate-800" />)}
          </div>
          <div className="h-64 rounded-2xl bg-white dark:bg-slate-800" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF2FA] p-3 sm:p-6 text-slate-800 dark:bg-[#0b1220] dark:text-slate-200">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">← Back to dashboard</Link>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Team admin</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage reporting, access, and committee permissions.</p>
            </div>
            <ThemeToggle />
          </div>
          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Active</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-3 dark:bg-purple-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-purple-600 dark:text-purple-400">Managers</p>
              <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.managers}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Shown</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.visible}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800 scrollbar-none">
          {[
            { id: "members", label: "Members" },
            { id: "add", label: "Add User" },
            { id: "permissions", label: "Permissions" },
            { id: "succession", label: "Succession" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, role, email..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pl-10 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                <span className="pointer-events-none absolute left-3 top-3 text-slate-400">⌕</span>
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:w-48">
                <option value="all">All roles</option>
                {uniqueRoles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((profile) => (
                <div key={profile.id} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E2530] text-sm font-bold text-white">{profile.name.slice(0, 2).toUpperCase()}</div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${profile.active === false ? "bg-red-100 text-red-700 dark:bg-red-900/30" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"}`}>{profile.active === false ? "Inactive" : "Active"}</span>
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{profile.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{profile.roleTitle}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{profile.email ?? "No email"}</p>
                  {profile.canManageCommittees && <span className="mt-2 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/30">Manager</span>}
                  <Link href={`/profiles/${profile.id}`} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-700">View profile →</Link>
                  {canEditStructure && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Role<input defaultValue={profile.roleTitle} onBlur={(e) => { const v = e.target.value; setProfiles((cur) => cur.map((x) => x.id === profile.id ? { ...x, roleTitle: v } : x)); void fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profile.id, roleTitle: v }) }); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900" /></label>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Reports to<select value={profile.reportsTo ?? ""} onChange={(e) => { const v = e.target.value || null; setProfiles((cur) => cur.map((x) => x.id === profile.id ? { ...x, reportsTo: v } : x)); void fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profile.id, reportsTo: v }) }); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"><option value="">None (top)</option>{profiles.filter((x) => x.id !== profile.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Email<input defaultValue={profile.email ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (!v) return; setProfiles((cur) => cur.map((x) => x.id === profile.id ? { ...x, email: v } : x)); void fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profile.id, email: v }) }); }} placeholder="user@company.com" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900" /></label>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filteredProfiles.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800"><p className="text-slate-500">No members match your search.</p></div>}
          </div>
        )}

        {/* Add User Tab */}
        {activeTab === "add" && canEditStructure && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add new member</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">They’ll receive a temporary password to sign in.</p>
            <form onSubmit={handleAddUser} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full name *<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900" /></label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role title<input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Quality Analyst" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900" /></label>
              </div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900" /><span className="mt-1 block text-xs text-slate-500">Leave blank to auto-generate @qms.local</span></label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reports to<select value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900">{profiles.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.roleTitle}</option>)}</select></label>
              <Button type="submit" variant="primary" size="lg" loading={newUserLoading} disabled={newUserLoading} className="w-full sm:w-auto">Add member</Button>
              {newUserInfo && <div className={`rounded-xl p-3 text-sm ${newUserInfo.startsWith("✓") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20" : "bg-red-50 text-red-700 dark:bg-red-900/20"}`}>{newUserInfo}</div>}
            </form>
          </div>
        )}
        {activeTab === "add" && !canEditStructure && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800"><p className="text-slate-600 dark:text-slate-400">Only top authority can add members.</p></div>}

        {/* Permissions Tab */}
        {activeTab === "permissions" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Committee permissions</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Grant committee management to trusted leads.</p>
                </div>
                <Button variant={showPermissionForm ? "secondary" : "dark"} onClick={() => setShowPermissionForm(!showPermissionForm)} className={showPermissionForm ? "" : "bg-purple-600 hover:bg-purple-700 border-purple-600"}>{showPermissionForm ? "Cancel" : "Manage"}</Button>
              </div>
              {showPermissionForm && <div className="mt-6"><GrantPermissionForm profiles={profiles as any} onSubmit={handlePermissionSubmit} onCancel={() => setShowPermissionForm(false)} /></div>}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Current managers ({stats.managers})</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profiles.filter((p) => p.canManageCommittees).length ? profiles.filter((p) => p.canManageCommittees).map((p) => <span key={p.id} className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">{p.name} <span className="text-xs opacity-70">• {p.roleTitle}</span></span>) : <p className="text-sm text-slate-500">No managers yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Succession Tab */}
        {activeTab === "succession" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Employee succession</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Reassign reports, records, and memberships when someone leaves.</p>
              </div>
              <Button variant={showSuccessionForm ? "secondary" : "destructive"} onClick={() => { setShowSuccessionForm(!showSuccessionForm); setSuccessionSummary(null); }} className={showSuccessionForm ? "" : "bg-orange-600 hover:bg-orange-700 border-orange-600"}>{showSuccessionForm ? "Cancel" : "Replace Employee"}</Button>
            </div>
            {showSuccessionForm && <div className="mt-6"><SuccessionForm profiles={profiles as any} summary={successionSummary ?? undefined} onSubmit={handleSuccessionSubmit} onExecute={handleSuccessionExecute} onCancel={() => setShowSuccessionForm(false)} /></div>}
          </div>
        )}
      </div>
    </main>
  );
}
