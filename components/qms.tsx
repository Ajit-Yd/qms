"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type ModuleKey =
  | "documents"
  | "capa"
  | "nonconformances"
  | "audits"
  | "training";

export const moduleConfig: Record<
  ModuleKey,
  { label: string; accent: string; icon: string }
> = {
  documents: { label: "Documents", accent: "#4A5D7A", icon: "doc" },
  capa: { label: "CAPA", accent: "#1D9E75", icon: "cap" },
  nonconformances: {
    label: "Non-conformances",
    accent: "#C1614F",
    icon: "nc",
  },
  audits: { label: "Audits", accent: "#D9A441", icon: "audit" },
  training: { label: "Training", accent: "#7A5FB8", icon: "train" },
};

export function normalizeStatus(status: string): string {
  if (status.toLowerCase() === "not started") return "Not started";
  if (status.toLowerCase() === "in progress") return "In progress";
  return status;
}

export const statusStyles: Record<string, { bg: string; fg: string }> = {
  Pending: { bg: "#FBF3E1", fg: "#D9A441" },
  "In progress": { bg: "#EAF1F7", fg: "#4C7EA8" },
  Done: { bg: "#EDF4EF", fg: "#5C9271" },
  Approved: { bg: "#EDF4EF", fg: "#5C9271" },
  Overdue: { bg: "#FAECEA", fg: "#C1614F" },
  Critical: { bg: "#FAECEA", fg: "#C1614F" },
  Draft: { bg: "#F1F1F0", fg: "#6B7280" },
  Inactive: { bg: "#F1F1F0", fg: "#6B7280" },
  "Not started": { bg: "#FBF3E1", fg: "#D9A441" },
  Active: { bg: "#EDF4EF", fg: "#5C9271" },
  Closed: { bg: "#F1F1F0", fg: "#6B7280" },
  High: { bg: "#FAECEA", fg: "#C1614F" },
  Medium: { bg: "#FBF3E1", fg: "#D9A441" },
  Low: { bg: "#EAF1F7", fg: "#4C7EA8" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? statusStyles[normalizeStatus(status)] ?? { bg: "#F1F1F0", fg: "#6B7280" };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {status}
    </span>
  );
}

export function ModuleIcon({
  moduleKey,
  size = "md",
}: {
  moduleKey: ModuleKey;
  size?: "sm" | "md";
}) {
  const accent = moduleConfig[moduleKey].accent;
  const dims = size === "sm" ? "h-8 w-8 text-[12px]" : "h-10 w-10 text-[13px]";

  const glyph = {
    doc: "◫",
    cap: "✓",
    nc: "!",
    audit: "▣",
    train: "◌",
  }[moduleConfig[moduleKey].icon];

  return (
    <span
      className={`${dims} inline-flex items-center justify-center rounded-full border font-bold`}
      style={{
        backgroundColor: `${accent}18`,
        borderColor: `${accent}30`,
        color: accent,
      }}
      aria-label={moduleConfig[moduleKey].label}
      title={moduleConfig[moduleKey].label}
    >
      {glyph}
    </span>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  onRowClick,
  onEdit,
  onDelete,
  onViewHistory,
}: {
  rows: T[];
  columns: Array<{ key: keyof T; label: string; render?: (row: T) => ReactNode }>;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onViewHistory?: (row: T) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        No records found for this view.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-4 py-3 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row.id ?? JSON.stringify(row))}
                onClick={() => onRowClick?.(row)}
                className={`border-t border-slate-200 ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
              >
                {columns.map((column) => (
                  <td key={`${String(row.id ?? JSON.stringify(row))}-${String(column.key)}`} className="px-4 py-3 align-middle">
                    {column.render ? column.render(row) : String(row[column.key] ?? "-")}
                  </td>
                ))}
                <td className="relative px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${String(row.title ?? row.id ?? "record")}`}
                    onClick={() => setOpenMenuId((current) => current === String(row.id) ? null : String(row.id))}
                    className="text-slate-500"
                  >
                    ⋯
                  </Button>
                  {openMenuId === String(row.id) && (
                    <div className="absolute right-2 top-10 z-10 w-40 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl animate-in">
                      <button type="button" onClick={() => { onEdit?.(row); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">✎ Edit</button>
                      <button type="button" onClick={() => { onDelete?.(row); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50">🗑 Delete</button>
                      <button type="button" onClick={() => { onViewHistory?.(row); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50">◷ View history</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row) => (
          <div
            key={String(row.id ?? JSON.stringify(row))}
            onClick={() => onRowClick?.(row)}
            className={`rounded-xl border border-slate-200 bg-slate-50 p-3 ${onRowClick ? "cursor-pointer hover:bg-slate-100" : ""}`}
          >
            {columns.map((column) => (
              <div key={`${String(row.id ?? JSON.stringify(row))}-mobile-${String(column.key)}`} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{column.label}</span>
                <span className="text-right text-sm text-slate-700">
                  {column.render ? column.render(row) : String(row[column.key] ?? "-")}
                </span>
              </div>
            ))}
            <div className="relative mt-2 flex justify-end" onClick={(event) => event.stopPropagation()}>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${String(row.title ?? row.id ?? "record")}`} onClick={() => setOpenMenuId((current) => current === String(row.id) ? null : String(row.id))} className="bg-white text-slate-500 shadow-sm">⋯</Button>
              {openMenuId === String(row.id) && (
                <div className="absolute right-0 top-8 z-10 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in">
                  <button type="button" onClick={() => { onEdit?.(row); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-slate-50">✎ Edit</button>
                  <button type="button" onClick={() => { onDelete?.(row); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50">🗑 Delete</button>
                  <button type="button" onClick={() => { onViewHistory?.(row); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-slate-50">◷ View history</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecordForm({
  moduleKey,
  profiles,
  onSubmit,
  initialValues,
  onCancel,
}: {
  moduleKey: ModuleKey;
  profiles: Array<{ id: string; name: string; roleTitle: string }>;
  onSubmit: (values: Record<string, string>) => void;
  initialValues?: Record<string, string>;
  onCancel?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const defaultValues: Record<string, string> = {
    title: "",
    assignedTo: profiles[0]?.id ?? "",
    status: "Pending",
    revision: "0",
    updated: today,
    priority: "Medium",
    source: "Customer",
    severity: "Medium",
    date: today,
    course: "",
    dueDate: today,
  };

  const baseFields: Record<string, { label: string; type?: string; options?: string[] }[]> = {
    documents: [
      { label: "Title", type: "text" },
      { label: "Assigned to", type: "select" },
      { label: "Status", type: "select", options: ["Pending", "In progress", "Done", "Draft"] },
      { label: "Revision", type: "text" },
      { label: "Updated", type: "date" },
    ],
    capa: [
      { label: "Title", type: "text" },
      { label: "Assigned to", type: "select" },
      { label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { label: "Status", type: "select", options: ["Pending", "In progress", "Done", "Overdue"] },
      { label: "Due date", type: "date" },
    ],
    nonconformances: [
      { label: "Title", type: "text" },
      { label: "Assigned to", type: "select" },
      { label: "Source", type: "select", options: ["Customer", "Supplier", "Internal", "Audit"] },
      { label: "Severity", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { label: "Status", type: "select", options: ["Pending", "In progress", "Done", "Closed"] },
      { label: "Date", type: "date" },
    ],
    audits: [
      { label: "Title", type: "text" },
      { label: "Assigned to", type: "select" },
      { label: "Status", type: "select", options: ["Pending", "In progress", "Done", "Draft"] },
      { label: "Date", type: "date" },
    ],
    training: [
      { label: "Employee", type: "select" },
      { label: "Course", type: "text" },
      { label: "Status", type: "select", options: ["Pending", "In progress", "Done", "Draft"] },
      { label: "Due date", type: "date" },
    ],
  };

  const fields = baseFields[moduleKey];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: Record<string, string> = {};

    fields.forEach((field) => {
      const key = field.label.toLowerCase().replace(/\s+/g, "");
      const mappedKey =
        key === "employee" || key === "assignedto" ? "assignedTo" : key === "duedate" ? "dueDate" : key === "updated" ? "updated" : key;

      values[mappedKey] = String(formData.get(mappedKey) ?? defaultValues[mappedKey] ?? "");
    });

    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-800">New record</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Draft</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => {
          const id = field.label.toLowerCase().replace(/\s+/g, "");
          const key =
            id === "employee" || id === "assignedto" ? "assignedTo" : id === "duedate" ? "dueDate" : id === "updated" ? "updated" : id;

          if (field.type === "select") {
            const options = field.options ?? profiles.map((profile) => profile.name);
            return (
              <label key={id} className="block text-sm text-slate-600">
                <span className="mb-1.5 block font-medium">{field.label}</span>
                <select
                  name={key}
                  defaultValue={initialValues?.[key] ?? defaultValues[key] ?? profiles[0]?.id ?? ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  {key === "assignedTo"
                    ? profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)
                    : options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            );
          }

          return (
            <label key={id} className="block text-sm text-slate-600">
              <span className="mb-1.5 block font-medium">{field.label}</span>
              <input
                type={field.type ?? "text"}
                name={key}
                defaultValue={initialValues?.[key] ?? defaultValues[key] ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button type="button" variant="secondary" size="md" onClick={onCancel}>Cancel</Button>}
        <Button
          type="submit"
          variant="primary"
          size="md"
          style={{ backgroundColor: moduleConfig[moduleKey].accent, borderColor: moduleConfig[moduleKey].accent }}
          className="min-w-[120px] shadow-md"
        >
          Save record
        </Button>
      </div>
    </form>
  );
}
