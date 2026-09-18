"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getProfileById, type Profile } from "@/lib/permissions";
import { ProfileDisplay } from "@/components/profile-display";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberships, setMemberships] = useState<Array<{ id: string; roleInCommittee: string; committeeId: string; committeeName: string }>>([]);

  const userId = session?.user && "id" in session.user ? String(session.user.id) : "";
  const profile = getProfileById(userId, profiles);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [profilesResponse, detailResponse] = await Promise.all([
        fetch("/api/profiles"),
        fetch(`/api/profiles/${userId}`),
      ]);
      if (!profilesResponse.ok) return;
      const data = await profilesResponse.json();
      if (cancelled) return;
      setProfiles(data.profiles as Profile[]);
      if (detailResponse.ok) {
        const detail = await detailResponse.json();
        if (!cancelled) setMemberships(detail.memberships ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (status === "loading" || (profiles.length === 0 && !profile)) return <main className="min-h-screen bg-[#EEF2FA] p-6" />;
  if (!profile) return <main className="min-h-screen bg-[#EEF2FA] p-6">Unable to load your profile.</main>;

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to change password"); return; }
    event.currentTarget.reset();
    setMessage("Password updated.");
  };

  return (
    <main className="min-h-screen bg-[#EEF2FA] p-3 sm:p-6 text-slate-800">
      <section className="mx-auto w-full max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:space-y-6 sm:p-6">
        <div>
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">Back to dashboard</Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Settings</h1>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <ProfileDisplay profile={profile} profiles={profiles} memberships={memberships} isCurrentUser />
          <Link href={`/profiles/${userId}`} className="mt-4 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50 hover:border-slate-300">
            View public profile
          </Link>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">Change password</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <input required name="currentPassword" type="password" placeholder="Current password" aria-label="Current password" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
            <input required minLength={8} name="newPassword" type="password" placeholder="New password (8+ characters)" aria-label="New password" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
            <Button type="submit" variant="primary" size="md">Update password</Button>
          </form>
          {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      </section>
    </main>
  );
}
