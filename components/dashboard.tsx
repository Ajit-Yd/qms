"use client";

import { useState } from "react";
import { getDirectReports, getSubordinateIds, type DashboardRole, type Profile } from "@/lib/permissions";
import { ModuleIcon, StatusBadge, type ModuleKey } from "@/components/qms";
import { SegmentedControl } from "@/components/ui/button";

type DashboardRecord = { id: string; assignedTo: string; status: string; module?: ModuleKey; title?: string; course?: string; dueDate?: string; date?: string; [key: string]: unknown };
type Records = Record<ModuleKey, DashboardRecord[]>;

const closedStatuses = ["Done", "Approved", "Closed"];
const modules: ModuleKey[] = ["documents", "capa", "nonconformances", "audits", "training"];
const isOpen = (record: DashboardRecord) => !closedStatuses.includes(record.status);
const recordLabel = (record: DashboardRecord) => record.title ?? String(record.course ?? record.id);
const isOverdue = (record: DashboardRecord) =>
  record.status === "Overdue" || (Boolean(record.dueDate) && new Date(record.dueDate as string) < new Date());

function ApprovalWidget({ records, viewerId }: { records: DashboardRecord[]; viewerId: string }) {
  const pending = records.filter((record) => record.status === "Pending" && record.assignedTo !== viewerId);
  return <section className="rounded-2xl border border-[#D9A441]/40 bg-[#FFF9EA] p-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">Pending my approval</h2><span className="rounded-full bg-[#D9A441] px-2 py-1 text-xs font-bold text-white">{pending.length}</span></div><div className="mt-3 space-y-2">{pending.length ? pending.slice(0, 5).map((record) => <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"><span className="truncate text-slate-700">{recordLabel(record)}</span><StatusBadge status={record.status} /></div>) : <p className="text-sm text-slate-600">Nothing is waiting for your decision.</p>}</div></section>;
}

function Kpis({ records, title }: { records: DashboardRecord[]; title: string }) {
  const open = records.filter(isOpen);
  const count = (key: ModuleKey) => records.filter((record) => record.module === key && isOpen(record)).length;
  const overdueTraining = records.filter((record) => record.module === "training" && isOverdue(record)).length;
  return <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><span className="text-sm text-slate-500">{open.length} open items</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Open CAPAs", count("capa"), "capa"], ["Open NCRs", count("nonconformances"), "nonconformances"], ["Open audits", count("audits"), "audits"], ["Overdue training", overdueTraining, "training"]].map(([label, value, module]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2"><ModuleIcon moduleKey={module as ModuleKey} size="sm" /><div><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div></div></div>)}</div></section>;
}

function TeamRollups({ records, viewerId, profiles }: { records: DashboardRecord[]; viewerId: string; profiles: Profile[] }) {
  const directReports = getDirectReports(viewerId, profiles);
  return <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold text-slate-900">By team</h2><div className="mt-3 space-y-3">{directReports.map((profile) => { const ids = [profile.id, ...getSubordinateIds(profile.id, profiles)]; const branch = records.filter((record) => ids.includes(record.assignedTo)); return <div key={profile.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="font-medium text-slate-700">{profile.name}</span><span className="text-sm text-slate-500">{branch.filter(isOpen).length} open / {branch.length} total</span></div>; })}</div></section>;
}

function PersonProgress({ profiles, records, viewerId }: { profiles: Profile[]; records: DashboardRecord[]; viewerId: string }) {
  const ids = [viewerId, ...getSubordinateIds(viewerId, profiles)];
  return <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold text-slate-900">Team progress</h2><div className="mt-3 space-y-3">{profiles.filter((profile) => ids.includes(profile.id)).map((profile) => { const mine = records.filter((record) => record.assignedTo === profile.id); const done = mine.filter((record) => !isOpen(record)).length; const percentage = mine.length ? Math.round((done / mine.length) * 100) : 0; return <div key={profile.id}><div className="flex justify-between text-sm"><span>{profile.name}</span><span className="text-slate-500">{percentage}%</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1E2530]" style={{ width: `${percentage}%` }} /></div></div>; })}</div></section>;
}

function Compliance({ records }: { records: DashboardRecord[] }) { const score = records.length ? Math.round((records.filter((record) => !isOpen(record)).length / records.length) * 100) : 0; return <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold text-slate-900">Compliance score</h2><div className="mt-4 flex items-center justify-center"><div className="flex h-28 w-28 items-center justify-center rounded-full border-12 border-[#EDF4EF] text-center"><div><div className="text-3xl font-bold text-slate-900">{score}</div><div className="text-[10px] uppercase tracking-widest text-slate-500">score</div></div></div></div></section>; }

export function Dashboard({ viewerId, profiles, records, role }: { viewerId: string; profiles: Profile[]; records: Records; role: DashboardRole }) {
  const [breakdown, setBreakdown] = useState<"team" | "person">("team");
  const allRecords = modules.flatMap((module) => (records[module] ?? []).map((record) => ({ ...record, module })));
  const scoped = allRecords.filter((record) => [viewerId, ...getSubordinateIds(viewerId, profiles)].includes(record.assignedTo));
  const directTeam = allRecords.filter((record) => getDirectReports(viewerId, profiles).map((profile) => profile.id).includes(record.assignedTo));
  if (role === "staff") return <div className="space-y-6"><Kpis records={scoped} title="My tasks" /><div className="grid gap-4 sm:gap-6 xl:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold text-slate-900">My tasks</h2><div className="mt-3 space-y-2">{scoped.filter(isOpen).map((record) => <div key={record.id} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{recordLabel(record)}</span><StatusBadge status={record.status} /></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-lg font-semibold text-slate-900">My training status</h2><p className="mt-3 text-sm text-slate-600">{scoped.filter((record) => record.course || record.assignedTo).filter((record) => record.assignedTo === viewerId && record.course).filter(isOpen).length} training items remain open.</p></section></div></div>;
  if (role === "process-owner") return <div className="space-y-6"><ApprovalWidget records={directTeam} viewerId={viewerId} /><Kpis records={directTeam} title="Direct team" /><div className="grid gap-4 sm:gap-6 xl:grid-cols-2"><PersonProgress profiles={profiles} records={directTeam} viewerId={viewerId} /><section className="rounded-2xl border border-[#C1614F]/30 bg-[#FFF5F3] p-4"><h2 className="text-lg font-semibold text-slate-900">Overdue items</h2><div className="mt-3 space-y-2">{directTeam.filter(isOverdue).map((record) => <div key={record.id} className="rounded-xl bg-white p-3 text-sm text-[#C1614F]">{recordLabel(record)}</div>)}</div></section></div></div>;
  if (role === "team-lead") return <div className="space-y-6"><Kpis records={scoped} title="Full team subtree" /><ApprovalWidget records={scoped} viewerId={viewerId} /><div className="grid gap-4 sm:gap-6 xl:grid-cols-2"><TeamRollups records={scoped} viewerId={viewerId} profiles={profiles} /><PersonProgress profiles={profiles} records={scoped} viewerId={viewerId} /></div></div>;
  return <div className="space-y-6"><Kpis records={allRecords} title="Company-wide performance" /><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">Organization breakdown</h2><SegmentedControl value={breakdown} onChange={(v) => setBreakdown(v as "team" | "person")} options={[{ value: "team", label: "By team" }, { value: "person", label: "By person" }]} /></div><div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.3fr_0.7fr]">{breakdown === "team" ? <TeamRollups records={allRecords} viewerId={viewerId} profiles={profiles} /> : <PersonProgress profiles={profiles} records={allRecords} viewerId={viewerId} />}<Compliance records={allRecords} /></div><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Significant activity</h2><p className="mt-2 text-sm text-slate-600">New non-conformances and audit closures are highlighted here.</p></section></div>;
}
