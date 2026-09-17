"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProfileDisplay } from "@/components/profile-display";
import type { Profile } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

type ProfileData = {
  profile: Profile;
  manager: { id: string; name: string; roleTitle: string } | null;
  directReports: Array<{ id: string; name: string; roleTitle: string; email: string | null }>;
  totalSubordinates: number;
  memberships: Array<{ id: string; roleInCommittee: string; committeeId: string; committeeName: string }>;
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;
  const [data, setData] = useState<ProfileData | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profileResponse, profilesResponse] = await Promise.all([
        fetch(`/api/profiles/${profileId}`),
        fetch("/api/profiles"),
      ]);
      if (!profilesResponse.ok) return;
      const profilesData = await profilesResponse.json();
      if (cancelled) return;
      setProfiles(profilesData.profiles as Profile[]);
      if (!profileResponse.ok) {
        setNotFound(true);
        return;
      }
      const profileData = await profileResponse.json();
      if (cancelled) return;
      setData(profileData as ProfileData);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-600">Profile not found.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-slate-600 hover:text-slate-900">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return <main className="min-h-screen animate-pulse bg-[#EEF2FA] p-6" />;
  }

  const { profile, manager, directReports, totalSubordinates, memberships } = data;

  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">← Back</Button>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{profile.roleTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{profile.email ?? "No email on file"}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${profile.active === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              {profile.active === false ? "Inactive" : "Active"}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-slate-500">Direct reports</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{directReports.length}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-slate-500">Team size</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{totalSubordinates} people</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-slate-500">Committees</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{memberships.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <ProfileDisplay profile={profile} profiles={profiles} memberships={memberships} />
        </div>

        {directReports.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Direct reports</h2>
            <ul className="space-y-2">
              {directReports.map((report) => (
                <li key={report.id}>
                  <Link
                    href={`/profiles/${report.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">{report.name}</span>
                    <span className="text-slate-500">{report.roleTitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {manager && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Manager</h2>
            <Link href={`/profiles/${manager.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm hover:bg-slate-50">
              <span className="font-medium text-slate-800">{manager.name}</span>
              <span className="text-slate-500">{manager.roleTitle}</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}