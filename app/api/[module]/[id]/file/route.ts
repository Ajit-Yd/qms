import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canApproveOrRevise, canSubmitOrUpdate, canViewRecord } from "@/src/lib/permissions";
import { verifyCsrf } from "@/src/lib/csrf";
import { enforceUserRateLimit, rateLimitResponse } from "@/src/lib/rate-limit";
import { fileMetaSelect, isViewableInline, resolveMime, MAX_FILE_BYTES } from "@/src/lib/files";
import { moduleApiConfig, prismaForModule } from "@/src/lib/qms-record-api";
import type { ModuleKey } from "@/components/qms";

type Ctx = { params: Promise<{ module: string; id: string }> };

// Map the URL path (documents, capas, nonconformances, audits, training) to a module key.
function resolveModule(path: string): ModuleKey | null {
  return (Object.keys(moduleApiConfig) as ModuleKey[]).find((key) => moduleApiConfig[key].path === path) ?? null;
}

async function loadRecord(module: ModuleKey, id: string) {
  return prismaForModule(module).findUnique({
    where: { id },
    select: { ...fileMetaSelect, fileData: true, assignedTo: true, deletedAt: true },
  });
}

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { module: modulePath, id } = await params;
  const moduleKey = resolveModule(modulePath);
  if (!moduleKey) return NextResponse.json({ error: "Unknown module" }, { status: 404 });
  const record = await loadRecord(moduleKey, id);
  if (!record || record.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewRecord(auth.userId, record.assignedTo, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!record.fileData || !record.fileName) {
    return NextResponse.json({ error: "No file attached" }, { status: 404 });
  }

  if (new URL(request.url).searchParams.get("meta") === "1") {
    return NextResponse.json({ fileName: record.fileName, fileType: record.fileType, fileSize: record.fileSize });
  }

  const bytes = new Uint8Array(Buffer.from(record.fileData, "base64"));
  return new NextResponse(bytes, {
    headers: {
      "content-type": resolveMime(record.fileName, record.fileType) ?? "application/octet-stream",
      "content-disposition": `${isViewableInline(record.fileName) ? "inline" : "attachment"}; filename="${record.fileName.replace(/[\u0000-\u001f\u007f"\\]/g, "")}"`,
      "content-length": String(bytes.byteLength),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function canWrite(userId: string, assignedTo: string, profiles: Parameters<typeof canViewRecord>[2]) {
  return canSubmitOrUpdate(userId, assignedTo) || canApproveOrRevise(userId, assignedTo, profiles);
}

export async function POST(request: Request, { params }: Ctx) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  // Uploads bypass the module factory, so they need their own write budget.
  const budget = enforceUserRateLimit(auth.userId, "upload", 30, 60 * 1000);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a moment." },
      { status: 429, headers: rateLimitResponse(budget.remaining, budget.resetMs) }
    );
  }
  const { module: modulePath, id } = await params;
  const moduleKey = resolveModule(modulePath);
  if (!moduleKey) return NextResponse.json({ error: "Unknown module" }, { status: 404 });
  const record = await loadRecord(moduleKey, id);
  if (!record || record.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canWrite(auth.userId, record.assignedTo, auth.profiles)) {
    return NextResponse.json({ error: "Only the assignee or their manager can upload" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const upload = form?.get("file");
  if (!(upload instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (upload.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
  if (upload.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `File too large (max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB)` }, { status: 413 });
  }

  const fileName = upload.name.replace(/^.*[\\/]/, "").trim();
  const fileType = resolveMime(fileName, upload.type);
  if (!fileType) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

  const fileData = Buffer.from(await upload.arrayBuffer()).toString("base64");
  const data: Record<string, unknown> = { fileName, fileType, fileSize: upload.size, fileData };
  if (moduleKey === "documents") data.updated = new Date();
  const updated = await prismaForModule(moduleKey).update({
    where: { id },
    data: data as never,
    select: fileMetaSelect,
  });

  return NextResponse.json({ success: true, file: updated });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { module: modulePath, id } = await params;
  const moduleKey = resolveModule(modulePath);
  if (!moduleKey) return NextResponse.json({ error: "Unknown module" }, { status: 404 });
  const record = await loadRecord(moduleKey, id);
  if (!record || record.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canWrite(auth.userId, record.assignedTo, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prismaForModule(moduleKey).update({
    where: { id },
    data: { fileName: null, fileType: null, fileSize: null, fileData: null } as never,
  });
  return NextResponse.json({ success: true });
}