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

export function createDataForModule(module: ModuleKey, body: Record<string, unknown>, userId: string) {
  const assignedTo = String(body.assignedTo || userId);
  const status = String(body.status || (module === "capa" ? "Draft" : "Draft"));
  if (module === "documents") {
    return { title: String(body.title || "Untitled document").trim(), assignedTo, status, revision: String(body.revision || "1") };
  }
  if (module === "capa") {
    return {
      title: String(body.title || "Untitled CAPA").trim(),
      assignedTo,
      status,
      priority: String(body.priority || "Medium"),
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
    };
  }
  if (module === "nonconformances") {
    return {
      title: String(body.title || "Untitled NCR").trim(),
      assignedTo,
      status,
      source: String(body.source || "Internal"),
      severity: String(body.severity || "Medium"),
      date: body.date ? new Date(String(body.date)) : new Date(),
    };
  }
  if (module === "audits") {
    return {
      title: String(body.title || "Untitled audit").trim(),
      assignedTo,
      status,
      date: body.date ? new Date(String(body.date)) : new Date(),
    };
  }
  return {
    employee: String(body.employee || body.assignedTo || userId),
    course: String(body.course || body.title || "General training"),
    assignedTo,
    status,
    dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
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

  const created = await prismaForModule(module).create({
    data: createDataForModule(module, body, userId) as never,
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
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(String(body.dueDate)) : null;
  if (module === "documents") data.updated = new Date();

  const updated = await prismaForModule(module).update({
    where: { id },
    data: data as never,
    include: assignedInclude(),
  });

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
