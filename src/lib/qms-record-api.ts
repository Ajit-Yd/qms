import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  canApproveOrRevise,
  canCreateRecords,
  canSubmitOrUpdate,
  canViewRecord,
  getProfileById,
  getSubordinateIds,
  type Profile,
} from "@/src/lib/permissions";
import { sendNotification } from "@/src/lib/email";
import type { ModuleKey } from "@/components/qms";

export const moduleApiConfig = {
  documents: { recordType: "Document", path: "documents" },
  capa: { recordType: "Capa", path: "capas" },
  nonconformances: { recordType: "Nonconformance", path: "nonconformances" },
  audits: { recordType: "Audit", path: "audits" },
  training: { recordType: "Training", path: "training" },
} as const;

export function toModuleKey(recordType: string): ModuleKey | null {
  const map: Record<string, ModuleKey> = {
    CAPA: "capa",
    Capa: "capa",
    Nonconformance: "nonconformances",
    Audit: "audits",
    Training: "training",
    Document: "documents",
  };
  return map[recordType] ?? null;
}

export function prismaForModule(module: ModuleKey): Prisma.DocumentDelegate {
  switch (module) {
    case "documents":
      return prisma.document as unknown as Prisma.DocumentDelegate;
    case "capa":
      return prisma.capa as unknown as Prisma.DocumentDelegate;
    case "nonconformances":
      return prisma.nonconformance as unknown as Prisma.DocumentDelegate;
    case "audits":
      return prisma.audit as unknown as Prisma.DocumentDelegate;
    case "training":
      return prisma.training as unknown as Prisma.DocumentDelegate;
  }
}

function assignedInclude() {
  return {
    assigned: {
      select: { id: true, name: true, email: true, reportsTo: true },
    },
  };
}

export function normalizeRecord(module: ModuleKey, record: Record<string, unknown>) {
  if (module === "training") {
    return {
      ...record,
      title: record.title ?? record.course ?? "Training",
    };
  }
  return record;
}

export async function listModuleRecords(module: ModuleKey, userId: string, profiles: Profile[]) {
  const visibleIds = [userId, ...getSubordinateIds(userId, profiles)];
  const rows = await prismaForModule(module).findMany({
    where: { assignedTo: { in: visibleIds }, deletedAt: null },
    include: assignedInclude(),
    orderBy: module === "documents" ? { updated: "desc" } : { id: "desc" },
  });
  return rows.map((row) => normalizeRecord(module, row as Record<string, unknown>));
}

const ALLOWED_STATUSES = new Set(["Draft", "Pending", "In progress", "Done", "Approved", "Closed", "Overdue", "Active", "Not started", "Inactive"]);
const ALLOWED_PRIORITY = new Set(["Low", "Medium", "High", "Critical"]);
const ALLOWED_SEVERITY = new Set(["Low", "Medium", "High", "Critical"]);
const ALLOWED_SOURCE = new Set(["Customer", "Supplier", "Internal", "Audit"]);

function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

function validateStatus(status: string): string | null {
  if (!ALLOWED_STATUSES.has(status)) return `Invalid status: ${status}`;
  return null;
}

export function createDataForModule(module: ModuleKey, body: Record<string, unknown>, userId: string): Record<string, unknown> | { error: string } {
  const assignedTo = String(body.assignedTo || userId);
  const status = String(body.status || "Draft");
  const statusErr = validateStatus(status);
  if (statusErr) return { error: statusErr };

  const assignedBy = userId;

  if (module === "documents") {
    const title = String(body.title || "Untitled document").trim();
    if (!title) return { error: "Title is required" };
    return { title, assignedTo, assignedBy, status, revision: String(body.revision || "1") };
  }
  if (module === "capa") {
    const title = String(body.title || "Untitled CAPA").trim();
    if (!title) return { error: "Title is required" };
    const priority = String(body.priority || "Medium");
    if (!ALLOWED_PRIORITY.has(priority)) return { error: `Invalid priority: ${priority}` };
    const dueDate = parseDate(body.dueDate);
    if (body.dueDate && !dueDate) return { error: "Invalid dueDate" };
    return { title, assignedTo, assignedBy, status, priority, dueDate };
  }
  if (module === "nonconformances") {
    const title = String(body.title || "Untitled NCR").trim();
    if (!title) return { error: "Title is required" };
    const source = String(body.source || "Internal");
    const severity = String(body.severity || "Medium");
    if (!ALLOWED_SOURCE.has(source)) return { error: `Invalid source: ${source}` };
    if (!ALLOWED_SEVERITY.has(severity)) return { error: `Invalid severity: ${severity}` };
    const date = parseDate(body.date) ?? new Date();
    if (body.date && !parseDate(body.date)) return { error: "Invalid date" };
    return { title, assignedTo, assignedBy, status, source, severity, date };
  }
  if (module === "audits") {
    const title = String(body.title || "Untitled audit").trim();
    if (!title) return { error: "Title is required" };
    const date = parseDate(body.date) ?? new Date();
    if (body.date && !parseDate(body.date)) return { error: "Invalid date" };
    return { title, assignedTo, assignedBy, status, date };
  }
  const course = String(body.course || body.title || "General training").trim();
  if (!course) return { error: "Course is required" };
  const dueDate = parseDate(body.dueDate);
  if (body.dueDate && !dueDate) return { error: "Invalid dueDate" };
  return {
    employee: String(body.employee || body.assignedTo || userId),
    course,
    assignedTo,
    assignedBy,
    status,
    dueDate,
  };
}

export async function createModuleRecord(module: ModuleKey, body: Record<string, unknown>, userId: string, profiles: Profile[]) {
  if (!canCreateRecords(userId, profiles)) {
    return NextResponse.json({ error: "Forbidden: monitor-only role cannot create records" }, { status: 403 });
  }
  const assignedTo = String(body.assignedTo || userId);
  const allowedIds = [userId, ...getSubordinateIds(userId, profiles)];
  if (!allowedIds.includes(assignedTo)) {
    return NextResponse.json({ error: "Forbidden: cannot assign outside your hierarchy" }, { status: 403 });
  }

  const dataOrError = createDataForModule(module, body, userId);
  if (dataOrError && "error" in dataOrError) {
    return NextResponse.json({ error: dataOrError.error }, { status: 400 });
  }
  const created = await prismaForModule(module).create({
    data: dataOrError as never,
    include: assignedInclude(),
  });

  const historyEntry = await prisma.recordHistory.create({
    data: {
      recordType: moduleApiConfig[module].recordType,
      recordId: created.id,
      fromStatus: null,
      toStatus: created.status,
      changedBy: userId,
      comment: `${moduleApiConfig[module].recordType} created`,
    },
  });

  // Assignment notification — if assigned to someone else, notify assignee
  const createdAssignedTo = (created as any).assignedTo as string;
  if (createdAssignedTo && createdAssignedTo !== userId) {
    const assigner = getProfileById(userId, profiles);
    const title = (created as any).title ?? (created as any).course ?? "Untitled";
    const dueDate = (created as any).dueDate ? new Date((created as any).dueDate).toISOString() : undefined;
    const url = `/${moduleApiConfig[module].path}/${(created as any).id}`;
    // Fire-and-forget, never blocks creation
    sendNotification(
      {
        type: "superior_assignment",
        recipientId: createdAssignedTo,
        senderName: assigner?.name ?? "Someone",
        recordTitle: String(title),
        recordType: moduleApiConfig[module].recordType as any,
        dueDate,
        recordUrl: url,
      },
      {
        userId: createdAssignedTo,
        type: "superior_assignment",
        title: `New assignment: ${title}`,
        message: `${assigner?.name ?? "Someone"} assigned you "${title}"`,
        relatedId: (created as any).id,
        relatedType: moduleApiConfig[module].recordType,
        recordUrl: url,
      }
    ).catch((e) => console.warn("Assignment notification failed (non-blocking):", e));
  }

  return NextResponse.json(
    { [module === "documents" ? "document" : module === "capa" ? "capa" : "record"]: normalizeRecord(module, created as Record<string, unknown>), historyEntry },
    { status: 201 }
  );
}

export async function getModuleRecord(module: ModuleKey, id: string, userId: string, profiles: Profile[]) {
  const record = await prismaForModule(module).findUnique({ where: { id }, include: assignedInclude() });
  if (!record || ("deletedAt" in record && record.deletedAt)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canViewRecord(userId, record.assignedTo, profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [history, comments] = await Promise.all([
    prisma.recordHistory.findMany({
      where: { recordType: moduleApiConfig[module].recordType, recordId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.comment.findMany({
      where: { recordType: moduleApiConfig[module].recordType, recordId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    record: normalizeRecord(module, record as Record<string, unknown>),
    history,
    comments,
  });
}

export async function updateModuleRecord(
  module: ModuleKey,
  id: string,
  body: Record<string, unknown>,
  userId: string,
  profiles: Profile[]
) {
  const record = await prismaForModule(module).findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canSubmitOrUpdate(userId, record.assignedTo) && !canApproveOrRevise(userId, record.assignedTo, profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  for (const key of ["title", "priority", "revision", "source", "severity", "employee", "course", "status"]) {
    if (body[key] !== undefined) {
      const v = String(body[key]);
      if (key === "status" && validateStatus(v)) return NextResponse.json({ error: validateStatus(v) }, { status: 400 });
      if (key === "priority" && !ALLOWED_PRIORITY.has(v)) return NextResponse.json({ error: `Invalid priority: ${v}` }, { status: 400 });
      if (key === "severity" && !ALLOWED_SEVERITY.has(v)) return NextResponse.json({ error: `Invalid severity: ${v}` }, { status: 400 });
      if (key === "source" && !ALLOWED_SOURCE.has(v)) return NextResponse.json({ error: `Invalid source: ${v}` }, { status: 400 });
      if (key === "title" && !v.trim()) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      data[key] = body[key];
    }
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === "") data.dueDate = null;
    else {
      const d = parseDate(body.dueDate);
      if (!d) return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
      data.dueDate = d;
    }
  }
  if (body.date !== undefined) {
    const d = parseDate(body.date);
    if (!d) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    data.date = d;
  }
  if (module === "documents") data.updated = new Date();

  // Track assignedTo change for notification (if body contains new assignee)
  const newAssignedTo = body.assignedTo ? String(body.assignedTo) : null;
  const oldAssignedTo = (record as any).assignedTo as string | null;
  const assignedToChanged = newAssignedTo && newAssignedTo !== oldAssignedTo;
  if (assignedToChanged) {
    if (!getSubordinateIds(userId, profiles).includes(newAssignedTo) && newAssignedTo !== userId) {
      return NextResponse.json({ error: "Forbidden: cannot assign outside your hierarchy" }, { status: 403 });
    }
    data.assignedTo = newAssignedTo;
    // Keep original assignedBy if already set, otherwise set to updater? Keep original.
  }

  const updated = await prismaForModule(module).update({
    where: { id },
    data: data as never,
    include: assignedInclude(),
  });

  if (assignedToChanged && newAssignedTo) {
    const assigner = getProfileById(userId, profiles);
    const title = (updated as any).title ?? (updated as any).course ?? "Untitled";
    const dueDate = (updated as any).dueDate ? new Date((updated as any).dueDate).toISOString() : undefined;
    const url = `/${moduleApiConfig[module].path}/${id}`;
    sendNotification(
      {
        type: "superior_assignment",
        recipientId: newAssignedTo,
        senderName: assigner?.name ?? "Someone",
        recordTitle: String(title),
        recordType: moduleApiConfig[module].recordType as any,
        dueDate,
        recordUrl: url,
      },
      {
        userId: newAssignedTo,
        type: "superior_assignment",
        title: `Reassigned: ${title}`,
        message: `${assigner?.name ?? "Someone"} reassigned you "${title}"`,
        relatedId: id,
        relatedType: moduleApiConfig[module].recordType,
        recordUrl: url,
      }
    ).catch((e) => console.warn("Reassignment notification failed (non-blocking):", e));
  }

  return NextResponse.json({
    [module === "documents" ? "document" : module === "capa" ? "capa" : "record"]: normalizeRecord(module, updated as Record<string, unknown>),
  });
}

export async function deleteModuleRecord(module: ModuleKey, id: string, userId: string, profiles: Profile[]) {
  const record = await prismaForModule(module).findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canSubmitOrUpdate(userId, record.assignedTo) && !canApproveOrRevise(userId, record.assignedTo, profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const deleted = await prismaForModule(module).update({
    where: { id },
    data: { deletedAt: new Date() } as never,
  });
  return NextResponse.json({ record: deleted });
}

export async function transitionModuleRecord(
  module: ModuleKey,
  id: string,
  userId: string,
  profiles: Profile[],
  action: "submit" | "approve" | "revise",
  comment: string
) {
  const record = await prismaForModule(module).findUnique({
    where: { id },
    include: assignedInclude(),
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "submit" && !canSubmitOrUpdate(userId, record.assignedTo)) {
    return NextResponse.json({ error: "Forbidden: only assignee can submit" }, { status: 403 });
  }
  if (action !== "submit" && !canApproveOrRevise(userId, record.assignedTo, profiles)) {
    return NextResponse.json({ error: "Forbidden: only the assignee's manager can take this action" }, { status: 403 });
  }

  const toStatus = action === "submit" ? "Pending" : action === "approve" ? "Approved" : "Draft";
  const updateData: Record<string, unknown> = { status: toStatus };
  if (module === "documents") updateData.updated = new Date();

  const [updated, historyEntry] = await prisma.$transaction([
    prismaForModule(module).update({ where: { id }, data: updateData as never }),
    prisma.recordHistory.create({
      data: {
        recordType: moduleApiConfig[module].recordType,
        recordId: id,
        fromStatus: record.status,
        toStatus,
        changedBy: userId,
        comment,
      },
    }),
  ]);

  const actor = getProfileById(userId, profiles);
  const title = "title" in record ? String(record.title) : String((record as { course?: string }).course ?? id);
  const url = `/${moduleApiConfig[module].path}/${id}`;

  if (action === "submit" && record.assigned.reportsTo) {
    await sendNotification(
      {
        type: "submitted_for_review",
        recipientId: record.assigned.reportsTo,
        senderName: record.assigned.name,
        recordTitle: title,
        recordType: moduleApiConfig[module].recordType as "Capa",
        recordUrl: url,
      },
      {
        userId: record.assigned.reportsTo,
        type: "submitted_for_review",
        title: `${moduleApiConfig[module].recordType} submitted: ${title}`,
        message: `${record.assigned.name} has submitted "${title}" for your review`,
        relatedId: id,
        relatedType: moduleApiConfig[module].recordType,
        recordUrl: url,
      }
    ).catch((error) => console.warn("Failed to send notification:", error));
  }

  if (action === "approve" && actor) {
    await sendNotification(
      {
        type: "approved",
        recipientId: record.assignedTo,
        senderName: actor.name,
        recordTitle: title,
        recordType: moduleApiConfig[module].recordType as "Capa",
        recordUrl: url,
      },
      {
        userId: record.assignedTo,
        type: "approved",
        title: `${moduleApiConfig[module].recordType} approved: ${title}`,
        message: `${actor.name} has approved "${title}"`,
        relatedId: id,
        relatedType: moduleApiConfig[module].recordType,
        recordUrl: url,
      }
    ).catch((error) => console.warn("Failed to send notification:", error));
  }

  if (action === "revise" && actor) {
    await sendNotification(
      {
        type: "revision_needed",
        recipientId: record.assignedTo,
        senderName: actor.name,
        recordTitle: title,
        recordType: moduleApiConfig[module].recordType as "Capa",
        recordUrl: url,
        message: comment,
      },
      {
        userId: record.assignedTo,
        type: "revision_needed",
        title: `Revision needed: ${title}`,
        message: `${actor.name} has requested revisions for "${title}"`,
        relatedId: id,
        relatedType: moduleApiConfig[module].recordType,
        recordUrl: url,
      }
    ).catch((error) => console.warn("Failed to send notification:", error));
  }

  // Completion notification to original assigner (assignedBy) when status becomes completed
  const completedStatuses = new Set(["Approved", "Closed", "Done", "Complete"]);
  if (completedStatuses.has(toStatus)) {
    // assignedBy is reliable; fallback to first history entry's changedBy if null
    let originalAssignerId: string | null = (record as any).assignedBy ?? null;
    if (!originalAssignerId) {
      const firstHistory = await prisma.recordHistory.findFirst({
        where: { recordType: moduleApiConfig[module].recordType, recordId: id },
        orderBy: { createdAt: "asc" },
      });
      originalAssignerId = firstHistory?.changedBy ?? null;
    }
    if (originalAssignerId && originalAssignerId !== userId) {
      const originalAssigner = getProfileById(originalAssignerId, profiles);
      const completer = getProfileById(userId, profiles);
      if (originalAssigner) {
        const url = `/${moduleApiConfig[module].path}/${id}`;
        sendNotification(
          {
            type: "approved",
            recipientId: originalAssignerId,
            senderName: completer?.name ?? actor?.name ?? "Someone",
            recordTitle: title,
            recordType: moduleApiConfig[module].recordType as any,
            recordUrl: url,
          },
          {
            userId: originalAssignerId,
            type: "approved",
            title: `Completed: ${title}`,
            message: `${completer?.name ?? actor?.name ?? "Someone"} completed "${title}" (${toStatus})`,
            relatedId: id,
            relatedType: moduleApiConfig[module].recordType,
            recordUrl: url,
          }
        ).catch((e) => console.warn("Completion notification failed (non-blocking):", e));
      }
    }
  }

  const itemKey = module === "documents" ? "document" : module === "capa" ? "capa" : "record";
  return NextResponse.json({
    success: true,
    [itemKey]: normalizeRecord(module, updated as Record<string, unknown>),
    historyEntry,
  });
}

export async function addModuleComment(module: ModuleKey, id: string, userId: string, profiles: Profile[], body: string) {
  const record = await prismaForModule(module).findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewRecord(userId, record.assignedTo, profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const comment = await prisma.comment.create({
    data: {
      recordType: moduleApiConfig[module].recordType,
      recordId: id,
      authorId: userId,
      body,
    },
  });
  return NextResponse.json({ comment }, { status: 201 });
}
