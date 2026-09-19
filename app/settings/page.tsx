"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getProfileById, type Profile } from "@/lib/permissions";
import { ProfileDisplay } from "@/components/profile-display";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "appearance">("profile");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberships, setMemberships] = useState<Array<{ id: string; roleInCommittee: string; committeeId: string; committeeName: string }>>([]);

  const userId = session?.user && "id" in session.user ? String(session.user.id) : "";
  const profile = getProfileById(userId, profiles);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [profilesResponse, detailResponse] = await Promise.all([fetch("/api/profiles"), fetch(`/api/profiles/${userId}`)]);
      if (!profilesResponse.ok) return;
      const data = await profilesResponse.json();
      if (cancelled) return;
      setProfiles(data.profiles as Profile[]);
      if (detailResponse.ok) {
        const detail = await detailResponse.json();
        if (!cancelled) setMemberships(detail.memberships ?? []);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (changing) return;
    setMessage(""); setError(""); setChanging(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/account/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error || "Unable to change password"); return; }
      event.currentTarget.reset();
      setMessage("Password updated.");
    } catch { setError("Network error"); } finally { setChanging(false); }
  };

  if (status === "loading" || (profiles.length === 0 && !profile)) {
    return (
      <main className="min-h-screen bg-[#EEF2FA] p-3 sm:p-6 dark:bg-[#0b1220]">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-12 rounded-2xl bg-white dark:bg-slate-800" />
          <div className="h-64 rounded-2xl bg-white dark:bg-slate-800" />
        </div>
      </main>
    );
  }
  if (!profile) return <main className="min-h-screen bg-[#EEF2FA] p-6 dark:bg-[#0b1220]">Unable to load your profile.</main>;

  return (
    <main className="min-h-screen bg-[#EEF2FA] p-3 sm:p-6 text-slate-800 dark:bg-[#0b1220] dark:text-slate-200">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400">← Back to dashboard</Link>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Settings</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage your account and preferences.</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-900 scrollbar-none">
            {[
              { id: "profile", label: "Profile" },
              { id: "security", label: "Security" },
              { id: "appearance", label: "Appearance" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        {activeTab === "profile" && (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E2530] text-xl font-bold text-white">{profile.name.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{profile.name}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{profile.roleTitle}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">{profile.email ?? "No email"}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${profile.active === false ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"} dark:bg-emerald-900/30`}>{profile.active === false ? "Inactive" : "Active"}</span>
              </div>
              <div className="mt-6">
                <ProfileDisplay profile={profile} profiles={profiles} memberships={memberships} isCurrentUser />
                <Link href={`/profiles/${userId}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 sm:w-auto">View public profile →</Link>
              </div>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Quick stats</h3>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><span className="text-sm text-slate-600 dark:text-slate-400">Committees</span><span className="font-bold text-slate-900 dark:text-white">{memberships.length}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><span className="text-sm text-slate-600 dark:text-slate-400">Role</span><span className="text-sm font-medium text-slate-900 dark:text-white">{profile.roleTitle}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Need help?</h4>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Contact your administrator to update role or reporting line.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Change password</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Must be at least 8 characters.</p>
              <form onSubmit={changePassword} className="mt-4 space-y-3">
                <input required name="currentPassword" type="password" placeholder="Current password" aria-label="Current password" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900" />
                <input required minLength={8} name="newPassword" type="password" placeholder="New password" aria-label="New password" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900" />
                <Button type="submit" variant="primary" size="md" loading={changing} disabled={changing} className="w-full">Update password</Button>
              </form>
              {message && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20">{message}</div>}
              {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20">{error}</div>}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Security</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><span>Two-factor</span><span className="rounded-full bg-slate-200 px-2 py-1 text-xs dark:bg-slate-700">Coming soon</span></div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><span>Sessions</span><span className="text-xs text-slate-500">1 active</span></div>
                <p className="pt-2 text-xs text-slate-500">Password is hashed with scrypt + timingSafeEqual. Reset via email if you forget it.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Appearance</h3>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Theme</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Current: {theme}</p>
              </div>
              <ThemeToggle />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => setTheme("light")} className={`rounded-xl border p-3 text-left ${theme === "light" ? "border-slate-900 bg-slate-900 text-white dark:border-white" : "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900"}`}><p className="font-semibold">Light</p><p className="text-xs opacity-70">Day mode</p></button>
              <button onClick={() => setTheme("dark")} className={`rounded-xl border p-3 text-left ${theme === "dark" ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900"}`}><p className="font-semibold">Dark</p><p className="text-xs opacity-70">Night mode</p></button>
            </div>
            <p className="mt-4 text-xs text-slate-500">Follows system preference until you pick manually. Works on mobile, tablet, and monitor.</p>
          </div>
        )}
      </div>
    </main>
  );
}
