"use client";

import { useState } from "react";
import Link from "next/link";
import {
  StatusBadge,
  ModuleIcon,
  moduleConfig,
  type ModuleKey,
} from "@/components/qms";
import {
  canApproveOrRevise,
  canSubmitOrUpdate,
  getProfileById,
  type Profile,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";

const modulePath = (moduleKey: ModuleKey) => (moduleKey === "capa" ? "capas" : moduleKey);

const recordTypeOf = (moduleKey: ModuleKey) =>
  ({
    documents: "Document",
    capa: "Capa",
    nonconformances: "Nonconformance",
    audits: "Audit",
    training: "Training",
  } as const)[moduleKey];

type PanelRecord = {
  id: string;
  title: string;
  assignedTo: string;
  status: string;
  [key: string]: unknown;
};

type HistoryEntry = {
  id: string;
  recordType: ModuleKey;
  recordId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  comment: string;
  timestamp: string;
};

export function ApprovalPanel({
  moduleKey,
  record,
  profiles,
  viewerId,
  onClose,
  onWorkflowDone,
}: {
  moduleKey: ModuleKey;
  record: PanelRecord;
  profiles: Profile[];
  viewerId: string;
  onClose: () => void;
  onWorkflowDone: (record: PanelRecord, historyEntry: HistoryEntry) => void;
}) {
  const [pending, setPending] = useState<"approve" | "revise" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const assignee = getProfileById(String(record.assignedTo), profiles);
  const canApprove = canApproveOrRevise(viewerId, String(record.assignedTo), profiles);
  const canEdit = canSubmitOrUpdate(viewerId, String(record.assignedTo));
  const alreadyFinal = record.status === "Approved" || record.status === "Closed";

  const run = async (action: "approve" | "revise") => {
    setPending(action);
    setMessage(null);
    try {
      const response = await fetch(action === "approve" ? "/api/records/approve" : "/api/records/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "approve"
            ? {
                recordId: record.id,
                recordType: recordTypeOf(moduleKey),
                assignedTo: record.assignedTo,
                title: record.title,
                comment: "Approved from the review window.",
              }
            : {
                recordId: record.id,
                recordType: recordTypeOf(moduleKey),
                assignedTo: record.assignedTo,
                feedback: "Please revise and resubmit.",
              }
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(String(data.error ?? "Action failed"));
        return;
      }
      const updated = data.document ?? data.capa ?? data.record ?? record;
      onWorkflowDone(
        updated,
        data.historyEntry
          ? {
              id: data.historyEntry.id,
              recordType: moduleKey,
              recordId: data.historyEntry.recordId,
              fromStatus: data.historyEntry.fromStatus ?? "",
              toStatus: data.historyEntry.toStatus,
              changedBy: viewerId,
              comment: data.historyEntry.comment ?? "",
              timestamp: data.historyEntry.createdAt ?? new Date().toISOString(),
            }
          : {
              id: `h-${Date.now()}`,
              recordType: moduleKey,
              recordId: record.id,
              fromStatus: record.status,
              toStatus: action === "approve" ? "Approved" : "Draft",
              changedBy: viewerId,
              comment: "",
              timestamp: new Date().toISOString(),
            }
      );
      setMessage(action === "approve" ? "Approved — email sent to the assignee." : "Rejected — returned for revision, email sent.");
    } catch {
      setMessage("Request failed.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-h-[calc(100vh-2rem)] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-[#EEF2FA] px-4 py-3">
        <ModuleIcon moduleKey={moduleKey} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{moduleConfig[moduleKey].label} · review</div>
          <h3 className="truncate text-sm font-semibold text-slate-900">{record.title}</h3>
        </div>
        <StatusBadge status={String(record.status)} />
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close review window" className="h-7 w-7 rounded-full">×</Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm text-slate-700">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Assigned to</div>
            <div className="font-medium text-slate-800">{assignee?.name ?? record.assignedTo}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Email on send</div>
            <div className="truncate font-medium text-slate-800">{assignee?.email ?? "—"}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeof record.priority === "string" && record.priority && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Priority: {record.priority}</span>
          )}
          {typeof record.severity === "string" && record.severity && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Severity: {record.severity}</span>
          )}
          {typeof record.revision === "string" && record.revision && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Revision: {record.revision}</span>
          )}
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 p-2 text-xs text-slate-600">
          {canApprove ? (
            <>Approving or rejecting emails <strong>{assignee?.email ?? "the assignee"}</strong> with the outcome and a link to the record.</>
          ) : (
            <>You are the assignee of this record. Submit it for review to notify your manager.</>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        {message && <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{message}</div>}
        <div className="flex flex-wrap gap-2">
          {canApprove && (
            <>
              <Button
                variant="success"
                size="md"
                loading={pending === "approve"}
                disabled={pending !== null || alreadyFinal}
                onClick={() => void run("approve")}
                className="flex-1"
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                size="md"
                loading={pending === "revise"}
                disabled={pending !== null || alreadyFinal}
                onClick={() => void run("revise")}
                className="flex-1"
              >
                Reject
              </Button>
            </>
          )}
          {!canApprove && canEdit && (
            <span className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm text-slate-500">Review handles manager approval only.</span>
          )}
          <Link href={`/${modulePath(moduleKey)}/${record.id}`} className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300">
            Open full record
          </Link>
        </div>
      </div>
    </div>
  );
}