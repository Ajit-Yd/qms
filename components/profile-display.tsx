import Link from "next/link";
import { canManageCommittees, type Profile } from "@/lib/permissions";

type Membership = { id: string; committeeId: string; roleInCommittee: string; committeeName?: string };

export function ProfileDisplay({
  profile,
  profiles = [],
  memberships = [],
  readOnly = true,
  isCurrentUser = false,
}: {
  profile: Profile;
  profiles?: Profile[];
  memberships?: Membership[];
  readOnly?: boolean;
  isCurrentUser?: boolean;
}) {
  const manager = profile.reportsTo ? profiles.find((item) => item.id === profile.reportsTo) : null;
  const directReports = profiles.filter((item) => item.reportsTo === profile.id);
  const teamCount = directReports.filter((report) => profiles.some((item) => item.reportsTo === report.id)).length;
  const subject = isCurrentUser ? "You" : profile.name;
  const joined = profile.createdAt ? new Date(profile.createdAt) : null;

  return (
    <section className="space-y-4" aria-label={`${profile.name} profile`}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{profile.name}</h2>
        <p className="text-sm text-slate-500">{readOnly ? "Profile information" : "Editable profile"}</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-medium text-slate-700">Full name</dt><dd className="text-slate-600">{profile.name}</dd></div>
        <div><dt className="font-medium text-slate-700">Email</dt><dd className="text-slate-600">{profile.email || "—"}</dd></div>
        <div><dt className="font-medium text-slate-700">Role title</dt><dd className="text-slate-600">{profile.roleTitle}</dd></div>
        <div>
          <dt className="font-medium text-slate-700">Reports to</dt>
          <dd className="text-slate-600">{manager ? `${manager.name} (${manager.roleTitle})` : "Top authority"}</dd>
        </div>
        {joined && (
          <div><dt className="font-medium text-slate-700">Member since</dt><dd className="text-slate-600">{joined.toLocaleDateString()}</dd></div>
        )}
        <div className={joined ? "" : "sm:col-span-2"}>
          <dt className="font-medium text-slate-700">Hierarchy position</dt>
          <dd className="text-slate-600">
            {directReports.length === 0
              ? `${subject} ${isCurrentUser ? "have" : "has"} no direct reports.`
              : `${subject} manage${isCurrentUser ? "" : "s"} ${directReports.length} direct report${directReports.length === 1 ? "" : "s"} and ${teamCount} team${teamCount === 1 ? "" : "s"} in total.`}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-slate-700">Committee management permission</dt>
          <dd className="text-slate-600">{canManageCommittees(profile.id, profiles) ? "Granted" : "Not granted"}</dd>
        </div>
      </dl>

      {directReports.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Direct reports</h3>
          <ul className="space-y-2">
            {directReports.map((report) => (
              <li key={report.id}>
                <Link href={`/profiles/${report.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm hover:bg-slate-100">
                  <span className="font-medium text-slate-700">{report.name}</span>
                  <span className="text-slate-500">{report.roleTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Committee memberships</h3>
        {memberships.length === 0 ? <p className="text-sm text-slate-500">No committee memberships.</p> : (
          <ul className="space-y-2">
            {memberships.map((membership) => (
              <li key={membership.id}>
                <Link href={`/committees/${membership.committeeId}`} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm hover:bg-slate-100">
                  <span>{membership.committeeName ?? membership.committeeId}</span>
                  <span className="font-medium text-slate-600">{membership.roleInCommittee === "head" ? "Committee Head" : "Member"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {memberships.length > 0 && <Link href="/committees" className="inline-block text-sm font-medium text-slate-600 hover:text-slate-900">View all committees</Link>}
    </section>
  );
}