"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { profiles as seedProfiles } from "@/lib/qms-data";
import { getSubordinateIds } from "@/src/lib/permissions";
import { getDashboardRole, isMonitorOnly } from "@/lib/permissions";
import { recordsByModule } from "@/lib/qms-data";
import { SuccessionForm, GrantPermissionForm } from "@/components/committee-forms";
import { ProfileDisplay } from "@/components/profile-display";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import type { SuccessionSummary } from "@/src/lib/succession";

export default function TeamAdminPage() {
  const { data: session, status } = useSession();
  const viewerId = session?.user && "id" in session.user ? String(session.user.id) : "";
  const [profiles, setProfiles] = useState(seedProfiles);
  const canEditStructure = getDashboardRole(viewerId, profiles) === "top-authority";
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [reportsTo, setReportsTo] = useState("p-director");
  const [email, setEmail] = useState("");
  const [recordAssignments, setRecordAssignments] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(recordsByModule).flatMap(([module, records]) => records.map((record) => [`${module}:${record.id}`, record.assignedTo]))));
  const [showSuccessionForm, setShowSuccessionForm] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [successionSummary, setSuccessionSummary] = useState<SuccessionSummary | null>(null);
  const [newUserInfo, setNewUserInfo] = useState<string>("");

  const visibleIds = canEditStructure ? profiles.map((profile) => profile.id) : [viewerId, ...getSubordinateIds(viewerId, profiles)];
  if (status === "loading") return <main className="min-h-screen animate-pulse bg-[#EEF2FA] p-6" />;

  const handleSuccessionSubmit = async (values: { departingUserId: string; replacementUserId: string }) => {
    const response = await fetch(
      `/api/admin/succession?departingUserId=${encodeURIComponent(values.departingUserId)}&replacementUserId=${encodeURIComponent(values.replacementUserId)}`
    );
    if (response.ok) {
      const data = await response.json();
      setSuccessionSummary(data.summary as SuccessionSummary);
    } else {
      const error = await response.json();
      console.error("Succession preview failed:", error.error);
    }
  };

  const handleSuccessionExecute = async (values: { departingUserId: string; replacementUserId: string }) => {
    const response = await fetch("/api/admin/succession", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, confirmed: true }),
    });
    if (response.ok) {
      setSuccessionSummary(null);
      setShowSuccessionForm(false);
    } else {
      const error = await response.json();
      console.error("Succession failed:", error.error);
    }
  };

  const handlePermissionSubmit = async (values: { targetUserId: string; grant: boolean }) => {
    const response = await fetch("/api/admin/permissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (response.ok) {
      setProfiles((current) =>
        current.map((profile) => (profile.id === values.targetUserId ? { ...profile, canManageCommittees: values.grant } : profile))
      );
      setShowPermissionForm(false);
    } else {
      const error = await response.json();
      console.error("Permission update failed:", error.error);
    }
  };

  return <main className="min-h-screen bg-[#EEF2FA] p-3 sm:p-6 text-slate-800"><section className="mx-auto max-w-4xl space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:space-y-6 sm:p-6">
    <div>
      <Link href="/" className="text-sm text-slate-500">Back to dashboard</Link>
      <div className="flex items-center justify-between gap-3"><h1 className="mt-4 text-2xl font-bold text-slate-900">Team admin</h1><ThemeToggle /></div>
      <p className="mt-2 text-sm text-slate-600">Manage reporting relationships, team access, and committee permissions.</p>
    </div>

    {/* Team Structure Section */}
    <div className="border-t border-slate-200 pt-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Team Structure</h2>
      <div className="grid gap-3 sm:grid-cols-2">{profiles.filter((profile) => visibleIds.includes(profile.id)).map((profile) => <div key={profile.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><ProfileDisplay profile={profile} profiles={profiles} /><Link href={`/profiles/${profile.id}`} className="mt-2 inline-block text-xs font-medium text-slate-500 hover:text-slate-900">View profile →</Link><div className="mt-3 border-t border-slate-200 pt-3">{canEditStructure ? <label className="block text-xs text-slate-500">Role title<input defaultValue={profile.roleTitle} onBlur={(event) => { setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, roleTitle: event.target.value } : item)); void fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profile.id, roleTitle: event.target.value }) }); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700" /></label> : null}{canEditStructure ? <label className="mt-2 block text-xs text-slate-500">Reports to<select value={profile.reportsTo ?? ""} onChange={(event) => { setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, reportsTo: event.target.value || null } : item)); void fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profile.id, reportsTo: event.target.value || null }) }); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"><option value="">None</option>{profiles.filter((item) => item.id !== profile.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}{canEditStructure ? <label className="mt-2 block text-xs text-slate-500">Email<input defaultValue={profile.email ?? ""} onBlur={(event) => { const email = event.target.value.trim(); if (!email) return; setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, email } : item)); void fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profile.id, email }) }); }} placeholder="user@company.com" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700" /></label> : null}</div></div>)}</div>
    </div>

    {canEditStructure && (
      <>
        {/* Add User Section */}
        <form onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; void (async () => { setNewUserInfo(""); const response = await fetch("/api/admin/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, ".")}@qms.local`, roleTitle: roleTitle || "Team member", reportsTo }) }); if (!response.ok) { let message = "Failed to add user."; try { message = (await response.json()).error || message; } catch { /* keep default */ } setNewUserInfo(message); return; } const data = await response.json(); setProfiles((current) => [...current, data.user]); setNewUserInfo(data.temporaryPassword ? `User created. Temporary password: ${data.temporaryPassword}` : "User created."); setName(""); setRoleTitle(""); setEmail(""); })(); }} className="border-t border-slate-200 pt-4"><h2 className="font-semibold text-slate-900">Add user</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" aria-label="Name" className="rounded-xl border border-slate-200 px-3 py-2" /><input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} placeholder="Role" aria-label="Role" className="rounded-xl border border-slate-200 px-3 py-2" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@company.com" aria-label="Email" className="rounded-xl border border-slate-200 px-3 py-2" /></div><div className="mt-3"><select value={reportsTo} onChange={(event) => setReportsTo(event.target.value)} aria-label="Reports to" className="w-full rounded-xl border border-slate-200 px-3 py-2">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></div><Button type="submit" variant="primary" size="md" className="mt-3">Add user</Button>{newUserInfo && <p className="mt-2 text-sm text-slate-700">{newUserInfo}</p>}</form>

        {/* Reassign Records Section */}
        {!isMonitorOnly(viewerId, profiles) && (<section className="border-t border-slate-200 pt-4"><h2 className="font-semibold text-slate-900">Reassign records</h2><div className="mt-3 space-y-2">{Object.entries(recordsByModule).flatMap(([module, records]) => records.map((record) => <label key={`${module}:${record.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm"><span>{"title" in record ? record.title : record.course}</span><select value={recordAssignments[`${module}:${record.id}`]} onChange={(event) => { setRecordAssignments((current) => ({ ...current, [`${module}:${record.id}`]: event.target.value })); void fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ module, recordId: record.id, assignedTo: event.target.value }) }); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>))}</div></section>)}

        {/* Succession Section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Employee Succession</h2>
            <Button
              variant={showSuccessionForm ? "secondary" : "destructive"}
              onClick={() => { setShowSuccessionForm(!showSuccessionForm); setSuccessionSummary(null); }}
              className={showSuccessionForm ? "" : "bg-orange-600 hover:bg-orange-700 border-orange-600"}
            >
              {showSuccessionForm ? "Cancel" : "Replace Employee"}
            </Button>
          </div>
          {showSuccessionForm && (
            <SuccessionForm
              profiles={profiles}
              summary={successionSummary ?? undefined}
              onSubmit={handleSuccessionSubmit}
              onExecute={handleSuccessionExecute}
              onCancel={() => setShowSuccessionForm(false)}
            />
          )}
        </div>

        {/* Committee Permissions Section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Committee Permissions</h2>
            <Button
              variant={showPermissionForm ? "secondary" : "dark"}
              onClick={() => setShowPermissionForm(!showPermissionForm)}
              className={showPermissionForm ? "" : "bg-purple-600 hover:bg-purple-700 border-purple-600"}
            >
              {showPermissionForm ? "Cancel" : "Manage Permissions"}
            </Button>
          </div>
          {showPermissionForm && (
            <GrantPermissionForm
              profiles={profiles}
              onSubmit={handlePermissionSubmit}
              onCancel={() => setShowPermissionForm(false)}
            />
          )}
          <div className="mt-3 space-y-1 text-xs text-slate-600">
            <p className="font-medium">Users with committee management permission:</p>
            <ul className="list-inside list-disc">
              {profiles
                .filter((p) => p.canManageCommittees)
                .map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
            </ul>
          </div>
        </div>
      </>
    )}
  </section></main>;
}
