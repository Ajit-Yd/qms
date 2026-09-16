import { notFound } from "next/navigation";
import Link from "next/link";
import Home from "@/app/page";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canCreateRecords, canSubmitOrUpdate, canViewRecord } from "@/lib/permissions";
import { loadProfiles } from "@/src/lib/load-profiles";
import { prismaForModule } from "@/src/lib/qms-record-api";
import type { ModuleKey } from "@/components/qms";

export const moduleKeys: ModuleKey[] = ["documents", "capa", "nonconformances", "audits", "training"];

export function resolveModule(segment: string): ModuleKey {
  const moduleKey = segment === "capas" ? "capa" : segment;
  if (!moduleKeys.includes(moduleKey as ModuleKey)) notFound();
  return moduleKey as ModuleKey;
}

export async function ModuleRoute({
  module,
  view = "list",
  recordId,
}: {
  module: ModuleKey;
  view?: "list" | "new" | "detail" | "edit";
  recordId?: string;
}) {
  // Get the ACTUAL logged-in user, not a hardcoded id.
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  if (!currentUserId) notFound();

  if (view === "new") {
    const profiles = await loadProfiles();
    if (!canCreateRecords(currentUserId, profiles)) {
      return <PermissionNotice />;
    }
  }

  if (recordId && (view === "detail" || view === "edit")) {
    const record = await prismaForModule(module).findUnique({ where: { id: recordId } });
    const profiles = await loadProfiles();

    if (!record || ("deletedAt" in record && record.deletedAt)) notFound();
    if (!canViewRecord(currentUserId, record.assignedTo, profiles)) notFound();
    if (view === "edit" && !canSubmitOrUpdate(currentUserId, record.assignedTo)) {
      return <PermissionNotice />;
    }
  }

  return (
    <Home
      initialModule={module}
      initialView={view}
      initialRecordId={recordId ?? null}
    />
  );
}

function PermissionNotice() {
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Unauthorized</h1>
        <p className="mt-2 text-sm text-slate-600">You do not have permission to edit this record.</p>
        <Link href="/unauthorized" className="mt-5 inline-block rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white">View access details</Link>
      </section>
    </main>
  );
}