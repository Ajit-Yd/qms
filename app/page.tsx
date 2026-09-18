"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DataTable,
  ModuleIcon,
  RecordForm,
  StatusBadge,
  moduleConfig,
  type ModuleKey,
} from "@/components/qms";
import { Dashboard } from "@/components/dashboard";
import { ApprovalPanel } from "@/components/approval-panel";
import {
  canApproveOrRevise,
  canCreateRecords,
  canSubmitOrUpdate,
  getProfileById,
  getDashboardRole,
  getSubordinateIds,
  getViewerScope,
  type Profile,
} from "@/lib/permissions";
import { readSnapshot, writeSnapshot } from "@/lib/qms-cache";
import { Button } from "@/components/ui/button";

type ModuleRecord = {
  id: string;
  title: string;
  assignedTo: string;
  status: string;
  deletedAt?: string | null;
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

type CommentEntry = {
  id: string;
  recordType: ModuleKey;
  recordId: string;
  author: string;
  body: string;
  timestamp: string;
};

type NotificationItem = {
  id: string;
  userId: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

type ModuleOption = { key: ModuleKey; label: string; total: number };

const moduleList: ModuleOption[] = [
  { key: "documents", label: "Documents", total: 12 },
  { key: "capa", label: "CAPA", total: 8 },
  { key: "nonconformances", label: "Non-conformances", total: 6 },
  { key: "audits", label: "Audits", total: 4 },
  { key: "training", label: "Training", total: 14 },
];

const emptyRecords: Record<ModuleKey, ModuleRecord[]> = {
  documents: [],
  capa: [],
  nonconformances: [],
  audits: [],
  training: [],
};

const getStatusOptions = (moduleKey: ModuleKey) => {
  const common = ["Draft", "Pending", "In progress", "Done", "Approved", "Closed", "Overdue"];
  if (moduleKey === "nonconformances") return [...common, "Critical"];
  if (moduleKey === "capa") return common;
  return common;
};

const formatISODate = (value: string) => value || "—";
const syncUrl = (path: string) => {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", path);
  }
};

const modulePath = (moduleKey: ModuleKey) => moduleKey === "capa" ? "capas" : moduleKey;

const apiPath = (moduleKey: ModuleKey, recordId?: string, action?: string) => {
  const base = moduleKey === "capa" ? "/api/capa" : `/api/${moduleKey}`;
  if (!recordId) return base;
  return action ? `${base}/${recordId}/${action}` : `${base}/${recordId}`;
};

const parseList = (moduleKey: ModuleKey, data: Record<string, unknown>): ModuleRecord[] => {
  const raw =
    (data.documents as ModuleRecord[]) ||
    (data.capas as ModuleRecord[]) ||
    (data.records as ModuleRecord[]) ||
    [];
  return raw.map((row) => ({
    ...row,
    title: String(row.title ?? row.course ?? "Untitled"),
    dueDate: row.dueDate ? String(row.dueDate).slice(0, 10) : row.dueDate,
    date: row.date ? String(row.date).slice(0, 10) : row.date,
    updated: row.updated ? String(row.updated).slice(0, 10) : row.updated,
  }));
};

export default function Home({
  initialModule = "documents",
  initialView = "dashboard",
  initialRecordId = null,
}: {
  initialModule?: ModuleKey;
  initialView?: "dashboard" | "list" | "new" | "detail" | "edit";
  initialRecordId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const viewerId = session?.user && "id" in session.user ? String(session.user.id) : "";
  const cachedSnapshot = viewerId ? readSnapshot(viewerId) : null;
  const [profiles, setProfiles] = useState<Profile[]>(cachedSnapshot?.profiles ?? []);
  const dashboardRole = getDashboardRole(viewerId, profiles);
  const [records, setRecords] = useState<Record<ModuleKey, ModuleRecord[]>>(cachedSnapshot?.records ?? emptyRecords);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(cachedSnapshot?.notifications ?? []);
  const [activeModule, setActiveModule] = useState<ModuleKey>(initialModule);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [specificFilter, setSpecificFilter] = useState("all");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(initialRecordId ?? searchParams.get("record"));
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(initialView === "new");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(initialView === "edit" ? initialRecordId : null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close profile/notification popovers on outside click or Escape
  useEffect(() => {
    if (!notificationOpen && !accountOpen) return;
    const onDown = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setNotificationOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotificationOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [notificationOpen, accountOpen]);

  useEffect(() => {
    if (!viewerId) return;
    const load = async () => {
      try {
        const [profileRes, notificationRes, ...moduleResponses] = await Promise.all([
          fetch("/api/profiles"),
          fetch("/api/notifications"),
          fetch("/api/documents"),
          fetch("/api/capa"),
          fetch("/api/nonconformances"),
          fetch("/api/audits"),
          fetch("/api/training"),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfiles(data.profiles ?? []);
        }
        if (notificationRes.ok) {
          const data = await notificationRes.json();
          setNotifications(data.notifications ?? []);
        }
        const keys: ModuleKey[] = ["documents", "capa", "nonconformances", "audits", "training"];
        const next = { ...emptyRecords };
        for (let index = 0; index < keys.length; index += 1) {
          const response = moduleResponses[index];
          if (response.ok) {
            next[keys[index]] = parseList(keys[index], await response.json());
          }
        }
        setRecords(next);
      } catch (error) {
        console.error("Failed to load QMS data:", error);
      }
    };
    void load();
  }, [viewerId]);

  // Keep the in-memory snapshot current so back-navigation renders instantly.
  useEffect(() => {
    if (!viewerId) return;
    writeSnapshot(viewerId, { profiles, notifications, records });
  }, [viewerId, profiles, notifications, records]);

  useEffect(() => {
    if (!viewerId || !selectedRecordId) return;
    const loadDetail = async () => {
      try {
        const response = await fetch(apiPath(activeModule, selectedRecordId));
        if (!response.ok) return;
        const data = await response.json();
        const historyRows = (data.history ?? []) as Array<{
          id: string;
          recordType: string;
          recordId: string;
          fromStatus: string | null;
          toStatus: string;
          changedBy: string;
          comment: string | null;
          createdAt: string;
        }>;
        const commentRows = (data.comments ?? []) as Array<{
          id: string;
          recordType: string;
          recordId: string;
          authorId: string;
          body: string;
          createdAt: string;
        }>;
        setHistory(
          historyRows.map((entry) => ({
            id: entry.id,
            recordType: activeModule,
            recordId: entry.recordId,
            fromStatus: entry.fromStatus ?? "",
            toStatus: entry.toStatus,
            changedBy: entry.changedBy,
            comment: entry.comment ?? "",
            timestamp: entry.createdAt,
          }))
        );
        setComments(
          commentRows.map((entry) => ({
            id: entry.id,
            recordType: activeModule,
            recordId: entry.recordId,
            author: entry.authorId,
            body: entry.body,
            timestamp: entry.createdAt,
          }))
        );
      } catch (error) {
        console.error("Failed to load record detail:", error);
      }
    };
    void loadDetail();
  }, [viewerId, selectedRecordId, activeModule]);

  const currentRecord = useMemo(() => {
    const currentList = records[activeModule] ?? [];
    return currentList.find((record) => record.id === selectedRecordId) ?? currentList[0] ?? null;
  }, [activeModule, records, selectedRecordId]);

  const visibleRecords = useMemo(() => {
    const list = records[activeModule] ?? [];
    const allowed = list.filter((record) => {
      if (record.deletedAt) return false;
      return getViewerScope(viewerId, profiles).includes(String(record.assignedTo));
    });

    return allowed.filter((record) => {
      const haystack = [
        record.title,
        record.assignedTo,
        record.status,
        String(record.revision ?? ""),
        String(record.priority ?? ""),
        String(record.severity ?? ""),
        String(record.source ?? ""),
        String(record.course ?? ""),
        String(record.employee ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && !["Done", "Approved", "Closed"].includes(record.status)) ||
        record.status === statusFilter;
      const matchesSpecific =
        specificFilter === "all" ||
        (record.priority && record.priority === specificFilter) ||
        (record.severity && record.severity === specificFilter) ||
        (record.source && record.source === specificFilter) ||
        (record.status && record.status === specificFilter);

      return matchesSearch && matchesStatus && matchesSpecific;
    });
  }, [activeModule, records, search, specificFilter, statusFilter, viewerId, profiles]);

  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRecords = visibleRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const unreadNotifications = notifications.filter((item) => item.userId === viewerId && !item.read);
  const recordHistory = history.filter((item) => item.recordType === activeModule && item.recordId === currentRecord?.id);
  const recordComments = comments.filter((item) => item.recordType === activeModule && item.recordId === currentRecord?.id);

  const subordinateIds = useMemo(() => getSubordinateIds(viewerId, profiles), [viewerId, profiles]);
  const assignableProfiles = useMemo(() => {
    const subs = profiles.filter((p) => subordinateIds.includes(p.id));
    if (subs.length === 0) {
      const self = profiles.find((p) => p.id === viewerId);
      return self ? [self] : subs;
    }
    if (editingRecordId && currentRecord) {
      const cur = String(currentRecord.assignedTo);
      if (!subs.some((p) => p.id === cur)) {
        const curProfile = profiles.find((p) => p.id === cur);
        if (curProfile) return [...subs, curProfile];
      }
    }
    return subs;
  }, [profiles, subordinateIds, viewerId, editingRecordId, currentRecord]);

  if (sessionStatus === "loading") {
    return <main className="min-h-screen animate-pulse bg-[#EEF2FA] p-8"><div className="h-12 rounded-xl bg-white" /><div className="mt-6 h-64 rounded-2xl bg-white" /></main>;
  }

  const handleCreateRecord = async (values: Record<string, string>) => {
    try {
      const response = await fetch(apiPath(activeModule), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title || values.course || "Untitled record",
          assignedTo: values.assignedTo || viewerId,
          status: values.status || "Draft",
          revision: values.revision || "1",
          priority: values.priority || "Medium",
          dueDate: values.dueDate,
          source: values.source || "Internal",
          severity: values.severity || "Medium",
          date: values.date,
          employee: values.employee || values.assignedTo || viewerId,
          course: values.course || values.title || "General training",
        }),
      });
      if (!response.ok) {
        const msg = await response.text();
        console.error("Failed to create record:", msg);
        try { const j = JSON.parse(msg); setActionError(j.error ?? "Failed to create record"); } catch { setActionError(msg.slice(0,120) || "Failed to create record"); }
        return;
      }
      const data = await response.json();
      const created = data.document || data.capa || data.record;
      if (!created) return;
      setRecords((prev) => ({
        ...prev,
        [activeModule]: [parseList(activeModule, { records: [created] })[0], ...(prev[activeModule] ?? [])],
      }));
      if (data.historyEntry) {
        setHistory((prev) => [
          {
            id: data.historyEntry.id,
            recordType: activeModule,
            recordId: created.id,
            fromStatus: data.historyEntry.fromStatus ?? "New",
            toStatus: data.historyEntry.toStatus,
            changedBy: viewerId,
            comment: data.historyEntry.comment ?? "Record created.",
            timestamp: data.historyEntry.createdAt ?? new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setSelectedRecordId(created.id);
      setShowNewForm(false);
    } catch (error) {
      console.error("Error creating record:", error);
      setActionError("Network error creating record");
    }
  };

  const handleDeleteRecord = async (moduleKey: ModuleKey, recordId: string) => {
    // For documents, use the API
    if (moduleKey === "documents") {
      try {
        const response = await fetch(`/api/documents/${recordId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setRecords((prev) => ({
            ...prev,
            documents: (prev.documents ?? []).filter((doc) => doc.id !== recordId),
          }));
          if (selectedRecordId === recordId) {
            setSelectedRecordId(null);
            setApprovalOpen(false);
          }
        } else {
          const delMsg = await response.text();
          console.error("Failed to delete document:", delMsg);
          try { const j = JSON.parse(delMsg); setActionError(j.error ?? "Delete failed"); } catch { setActionError(delMsg.slice(0,120)); }
        }
      } catch (error) {
        console.error("Error deleting document:", error);
        setActionError("Network error deleting document");
      }
      return;
    }

    // For other modules, use in-memory logic
    setRecords((previous) => ({
      ...previous,
      [moduleKey]: (previous[moduleKey] ?? []).map((record) =>
        record.id === recordId
          ? { ...record, deletedAt: new Date().toISOString() }
          : record,
      ),
    }));
  };

  const handleUpdateRecord = async (moduleKey: ModuleKey, recordId: string, values: Record<string, string>) => {
    // For documents, use the API
    if (moduleKey === "documents") {
      try {
        const response = await fetch(`/api/documents/${recordId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title,
            revision: values.revision,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecords((prev) => ({
            ...prev,
            documents: (prev.documents ?? []).map((doc) =>
              doc.id === recordId ? data.document : doc
            ),
          }));
          setEditingRecordId(null);
        } else {
          const updMsg = await response.text();
          console.error("Failed to update document:", updMsg);
          try { const j = JSON.parse(updMsg); setActionError(j.error ?? "Update failed"); } catch { setActionError(updMsg.slice(0,120)); }
        }
      } catch (error) {
        console.error("Error updating document:", error);
      }
      return;
    }

    // For other modules, use in-memory logic
    setRecords((previous) => ({
      ...previous,
      [moduleKey]: (previous[moduleKey] ?? []).map((record) => {
        if (record.id !== recordId) return record;
        const next = { ...record };
        Object.entries(values).forEach(([key, value]) => {
          if (value) next[key] = value;
        });
        return next;
      }),
    }));
    setEditingRecordId(null);
  };

  const handleWorkflow = async (moduleKey: ModuleKey, recordId: string, action: "submit" | "approve" | "revise", comment: string) => {
    const record = (records[moduleKey] ?? []).find((item) => item.id === recordId);
    if (!record) return;

    // Documents submit through their own endpoint; other actions go through the shared record APIs
    // so history, notifications, and emails are handled server-side for every module.
    if (action !== "submit" || moduleKey === "documents") {
      const endpoint =
        action === "submit"
          ? `/api/documents/${recordId}/submit`
          : action === "approve"
            ? "/api/records/approve"
            : "/api/records/revise";

      const recordType = {
        documents: "Document",
        capa: "Capa",
        nonconformances: "Nonconformance",
        audits: "Audit",
        training: "Training",
      }[moduleKey];

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "submit"
              ? { comment }
              : action === "approve"
                ? { recordId, recordType, assignedTo: record.assignedTo, title: record.title, comment }
                : { recordId, recordType, assignedTo: record.assignedTo, feedback: comment }
          ),
        });
        if (!response.ok) {
          const wfMsg = await response.text();
          console.error("Failed to perform workflow action:", wfMsg);
          try { const j = JSON.parse(wfMsg); setActionError(j.error ?? "Workflow action failed"); } catch { setActionError(wfMsg.slice(0,120)); }
          return;
        }
        const data = await response.json();
        const updated = data.document ?? data.capa ?? data.record;
        if (updated) {
          setRecords((prev) => ({
            ...prev,
            [moduleKey]: (prev[moduleKey] ?? []).map((item) =>
              item.id === recordId ? parseList(moduleKey, { records: [updated] })[0] : item
            ),
          }));
        }
        if (data.historyEntry) {
          setHistory((prev) => [data.historyEntry, ...prev]);
        }
      } catch (error) {
        console.error("Error performing workflow action:", error);
        setActionError("Network error performing workflow action");
      }
      return;
    }

    // Non-document submit has no server endpoint yet; keep the in-memory fallback.
    setRecords((previous) => ({
      ...previous,
      [moduleKey]: (previous[moduleKey] ?? []).map((item) =>
        item.id === recordId ? { ...item, status: "Pending" } : item,
      ),
    }));

    setHistory((previous) => [
      {
        id: `h-${Date.now()}`,
        recordType: moduleKey,
        recordId,
        fromStatus: record.status,
        toStatus: "Pending",
        changedBy: viewerId,
        comment,
        timestamp: new Date().toISOString(),
      },
      ...previous,
    ]);

    setNotifications((previous) => [
      {
        id: `n-${Date.now()}`,
        userId: record.assignedTo,
        message: `Your ${moduleConfig[moduleKey].label} record was submitted for review.`,
        link: `/${modulePath(moduleKey)}`,
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...previous,
    ]);
  };

  const addComment = async (body: string) => {
    if (!currentRecord || !body.trim()) return;

    // For documents, use the API
    if (activeModule === "documents") {
      try {
        const response = await fetch(`/api/documents/${currentRecord.id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });

        if (response.ok) {
          const data = await response.json();
          setComments((prev) => [
            {
              id: data.comment.id,
              recordType: activeModule,
              recordId: currentRecord.id,
              author: viewerId,
              body,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ]);
        } else {
          const cMsg = await response.text();
          console.error("Failed to add comment:", cMsg);
          try { const j = JSON.parse(cMsg); setActionError(j.error ?? "Failed to add comment"); } catch { setActionError(cMsg.slice(0,120)); }
        }
      } catch (error) {
        console.error("Error adding comment:", error);
        setActionError("Network error adding comment");
      }
      return;
    }

    // For other modules, use in-memory logic
    setComments((previous) => [
      {
        id: `c-${Date.now()}`,
        recordType: activeModule,
        recordId: currentRecord.id,
        author: viewerId,
        body,
        timestamp: new Date().toISOString(),
      },
      ...previous,
    ]);
  };

  const statusOptions = getStatusOptions(activeModule);
  const moduleSpecificOptions =
    activeModule === "capa"
      ? ["Low", "Medium", "High", "Critical"]
      : activeModule === "nonconformances"
        ? ["Low", "Medium", "High", "Critical"]
        : activeModule === "audits"
          ? ["Internal", "External", "Supplier"]
          : ["all"];

  return (
    <div className="min-h-screen bg-[#EEF2FA] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="sticky top-0 z-30 w-full shrink-0 bg-[#1E2530] p-2.5 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] sm:p-3 lg:sticky lg:top-0 lg:h-screen lg:w-[72px] lg:p-3">
          <div className="flex items-center gap-3 sm:justify-between lg:flex-col lg:items-center lg:justify-start lg:gap-6">
            <Link href="/" aria-label="Dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1E2530] text-lg font-extrabold shadow-sm transition hover:shadow-md active:scale-[0.98] sm:h-11 sm:w-11">Q</Link>
            <nav className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-none sm:gap-2 lg:mt-4 lg:flex-col lg:overflow-visible">
              {moduleList.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  aria-label={module.label}
                  onClick={() => { setActiveModule(module.key); setPage(1); setApprovalOpen(false); setShowNewForm(false); setEditingRecordId(null); setSelectedRecordId(null); syncUrl(`/${modulePath(module.key)}`); }}
                  className={`group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] transition-all duration-200 sm:h-11 sm:w-11 sm:rounded-2xl ${
                    activeModule === module.key
                      ? "bg-white text-[#1E2530] border-white shadow-md scale-[1.02]"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
                  }`}
                  title={module.label}
                >
                  <ModuleIcon moduleKey={module.key} size="sm" />
                </button>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-2 lg:mt-auto lg:flex-col lg:gap-2">
              <Link href="/admin/team" className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-semibold tracking-wide text-slate-200 transition hover:bg-white/10 hover:text-white sm:h-9 sm:px-3 lg:w-full lg:py-1.5">
                Admin
              </Link>
              <Link href="/committees" className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-semibold tracking-wide text-slate-200 transition hover:bg-white/10 hover:text-white sm:hidden">
                Teams
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 lg:p-8">
          <header className="animate-in mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)] backdrop-blur-sm sm:mb-6 sm:gap-4 sm:p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-xs">Quality management system</p>
              <h1 className="mt-1 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{dashboardRole === "top-authority" ? "Executive Dashboard" : dashboardRole === "staff" ? "My Dashboard" : "Team Dashboard"}</h1>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 text-sm text-slate-600 md:w-auto">
              <select
                value={viewerId}
                disabled
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                aria-label="Viewer"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
              <Button variant="subtle" size="md" onClick={() => searchInputRef.current?.focus()} aria-label="Search records">⌕ Search</Button>
              <Link href="/admin/team" className="inline-flex h-9 items-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Team admin</Link>
              <Link href="/settings" className="inline-flex h-9 items-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">Settings</Link>

              <div ref={notificationRef} className="relative">
                <Button
                  variant="subtle"
                  size="md"
                  onClick={() => setNotificationOpen((value) => !value)}
                  aria-expanded={notificationOpen}
                  aria-haspopup="menu"
                  aria-label="Notifications"
                  className="relative"
                >
                  <span className="text-[15px]">◐</span> Bell
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C1614F] px-1 text-[10px] font-bold text-white shadow">
                      {unreadNotifications.length}
                    </span>
                  )}
                </Button>
                {notificationOpen && (
                  <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    {notifications.filter((item) => item.userId === viewerId).length ? (
                      notifications
                        .filter((item) => item.userId === viewerId)
                        .map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setNotifications((previous) =>
                                previous.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
                              );
                              setNotificationOpen(false);
                              if (item.link) {
                                const match = item.link.match(/^\/(documents|capas|capa|nonconformances|audits|training)(?:\/([^/]+))?/);
                                if (match) {
                                  const key = (match[1] === "capas" || match[1] === "capa" ? "capa" : match[1]) as ModuleKey;
                                  setActiveModule(key);
                                  setShowNewForm(false);
                                  setEditingRecordId(null);
                                  setSelectedRecordId(match[2] ?? null);
                                  setApprovalOpen(Boolean(match[2]));
                                  syncUrl(item.link);
                                } else {
                                  router.push(item.link);
                                }
                              }
                            }}
                            className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                          >
                            <span className="mt-1 h-2 w-2 rounded-full bg-[#D9A441]" />
                            <span className="text-sm text-slate-700">{item.message}</span>
                          </button>
                        ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500">No notifications</div>
                    )}
                    <Link href="/notifications" onClick={() => setNotificationOpen(false)} className="mt-1 block rounded-lg border-t border-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">View all notifications</Link>
                  </div>
                )}
              </div>
              <div ref={accountRef} className="relative">
                <button type="button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen} aria-haspopup="menu" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E2530] font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:bg-[#2a3441] hover:shadow-md active:scale-[0.97]" aria-label="Open account menu">
                  {profiles.find((profile) => profile.id === viewerId)?.name.slice(0, 1) ?? "A"}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-12 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    <Link href="/settings" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">Settings</Link>
                    <button type="button" onClick={async () => { await signOut({ callbackUrl: "/login", redirect: true }); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Log out</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {actionError && (
            <div className="animate-in mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError(null)} className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-red-700 shadow-sm">Dismiss</button>
            </div>
          )}

          <Dashboard viewerId={viewerId} profiles={profiles} records={records} role={dashboardRole} />

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 sm:mt-6 sm:p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{moduleConfig[activeModule].label}</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <input
                  aria-label="Search records"
                  ref={searchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search all fields"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:w-auto"
                />
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  {statusOptions.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {activeModule !== "documents" && (
                  <select value={specificFilter} onChange={(event) => setSpecificFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <option value="all">All filters</option>
                    {moduleSpecificOptions.map((option: string) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setSpecificFilter("all");
                  }}
                >
                  Reset
                </Button>
                {profiles.some((profile) => profile.id === viewerId) && canCreateRecords(viewerId, profiles) && (
                  <Button variant="primary" size="md" onClick={() => { setShowNewForm(true); setEditingRecordId(null); setSelectedRecordId(null); setApprovalOpen(false); syncUrl(`/${modulePath(activeModule)}/new`); }}>
                    ＋ New record
                  </Button>
                )}
                </div>
              </div>
            </div>

            {(showNewForm || editingRecordId) && (
              <div className="mb-4">
                <RecordForm
                  moduleKey={activeModule}
                  profiles={assignableProfiles}
                  initialValues={editingRecordId ? Object.fromEntries(Object.entries(currentRecord ?? {}).filter(([, value]) => typeof value === "string")) as Record<string, string> : { assignedTo: assignableProfiles[0]?.id ?? viewerId }}
                  onSubmit={editingRecordId ? (values) => handleUpdateRecord(activeModule, editingRecordId, values) : handleCreateRecord}
                  onCancel={() => { setShowNewForm(false); setEditingRecordId(null); }}
                />
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
              <div>
                <DataTable
                  rows={pagedRecords}
                  onRowClick={(row) => { setSelectedRecordId(String(row.id)); setApprovalOpen(true); }}
                  onEdit={(row) => { setSelectedRecordId(String(row.id)); setEditingRecordId(String(row.id)); }}
                  onDelete={(row) => handleDeleteRecord(activeModule, String(row.id))}
                  onViewHistory={(row) => { setSelectedRecordId(String(row.id)); }}
                  columns={[
                    { key: "title", label: "Title" },
                    { key: "assignedTo", label: "Assigned to", render: (row) => getProfileById(String(row.assignedTo), profiles)?.name ?? "-" },
                    { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status)} /> },
                    { key: "updated", label: "Updated", render: (row) => <span>{formatISODate(String(row.updated ?? row.date ?? row.dueDate ?? "-"))}</span> },
                  ]}
                />
                {visibleRecords.length > pageSize && (
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                    <span className="text-xs font-medium text-slate-500">Page {currentPage} of {pageCount}</span>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                      <Button variant="secondary" size="sm" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {currentRecord ? (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ModuleIcon moduleKey={activeModule} />
                        <div>
                          <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{moduleConfig[activeModule].label}</div>
                          <h3 className="text-lg font-semibold text-slate-900">{currentRecord.title}</h3>
                        </div>
                      </div>
                      <StatusBadge status={String(currentRecord.status)} />
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
                      <div><span className="font-medium">Assigned:</span> {getProfileById(String(currentRecord.assignedTo), profiles)?.name}</div>
                      {typeof currentRecord.priority === "string" && currentRecord.priority && <div><span className="font-medium">Priority:</span> {String(currentRecord.priority)}</div>}
                      {typeof currentRecord.severity === "string" && currentRecord.severity && <div><span className="font-medium">Severity:</span> {String(currentRecord.severity)}</div>}
                      {typeof currentRecord.revision === "string" && currentRecord.revision && <div><span className="font-medium">Revision:</span> {String(currentRecord.revision)}</div>}
                      {typeof currentRecord.dueDate === "string" && currentRecord.dueDate && <div><span className="font-medium">Due:</span> {formatISODate(String(currentRecord.dueDate))}</div>}
                      {typeof currentRecord.date === "string" && currentRecord.date && <div><span className="font-medium">Date:</span> {formatISODate(String(currentRecord.date))}</div>}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {canSubmitOrUpdate(viewerId, String(currentRecord.assignedTo)) && (
                        <Button variant="primary" size="md" onClick={() => handleWorkflow(activeModule, currentRecord.id, "submit", "Submitted for review.")}>Submit</Button>
                      )}
                      {canSubmitOrUpdate(viewerId, String(currentRecord.assignedTo)) && (
                        <Button variant="secondary" size="md" onClick={() => { setEditingRecordId(currentRecord.id); setShowNewForm(false); setApprovalOpen(false); syncUrl(`/${modulePath(activeModule)}/${currentRecord.id}/edit`); }}>Edit</Button>
                      )}
                      {canApproveOrRevise(viewerId, String(currentRecord.assignedTo), profiles) && (
                        <>
                          <Button variant="success" size="md" onClick={() => handleWorkflow(activeModule, currentRecord.id, "approve", "Approved by manager.")}>Approve</Button>
                          <Button variant="destructive" size="md" onClick={() => handleWorkflow(activeModule, currentRecord.id, "revise", "Revise and redirect per request.")}>Revise & Redirect</Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => handleDeleteRecord(activeModule, currentRecord.id)}
                        className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 hover:text-red-800"
                      >
                        Delete
                      </Button>
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-2 text-sm font-semibold text-slate-700">History</div>
                      <div className="space-y-2">
                        {recordHistory.length ? recordHistory.map((entry) => (
                          <div key={entry.id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                            <div className="font-medium text-slate-700">{entry.fromStatus} → {entry.toStatus}</div>
                            <div>{getProfileById(entry.changedBy, profiles)?.name ?? "System"} · {new Date(entry.timestamp).toISOString().slice(0, 10)}</div>
                            <div>{entry.comment}</div>
                          </div>
                        )) : <div className="text-xs text-slate-500">No history yet.</div>}
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-2 text-sm font-semibold text-slate-700">Comments</div>
                      <div className="space-y-2">
                        {recordComments.length ? recordComments.map((comment) => (
                          <div key={comment.id} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                            <div className="font-medium text-slate-700">{getProfileById(comment.author, profiles)?.name ?? comment.author}</div>
                            <div>{comment.body}</div>
                          </div>
                        )) : <div className="text-xs text-slate-500">No comments yet.</div>}
                      </div>
                      <textarea
                        aria-label="Add comment"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            addComment((event.currentTarget as HTMLTextAreaElement).value.trim());
                            (event.currentTarget as HTMLTextAreaElement).value = "";
                          }
                        }}
                        placeholder="Add a comment and press Enter"
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">No record selected.</div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {approvalOpen && currentRecord && (
        <ApprovalPanel
          moduleKey={activeModule}
          record={currentRecord}
          profiles={profiles}
          viewerId={viewerId}
          onClose={() => setApprovalOpen(false)}
          onWorkflowDone={(updated, entry) => {
            setRecords((prev) => ({
              ...prev,
              [activeModule]: (prev[activeModule] ?? []).map((item) =>
                item.id === updated.id ? parseList(activeModule, { records: [updated] })[0] : item
              ),
            }));
            setHistory((prev) => [entry, ...prev]);
          }}
        />
      )}
    </div>
  );
}

