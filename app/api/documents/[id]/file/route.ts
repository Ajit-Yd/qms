import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canApproveOrRevise, canSubmitOrUpdate, canViewRecord } from "@/src/lib/permissions";
import { prisma } from "@/src/lib/prisma";
import { verifyCsrf } from "@/src/lib/csrf";
import { fileMetaSelect, isViewableInline, resolveMime, MAX_FILE_BYTES } from "@/src/lib/files";

type Ctx = { params: Promise<{ id: string }> };

async function loadDoc(id: string) {
  return prisma.document.findUnique({
    where: { id },
    select: { ...fileMetaSelect, fileData: true, assignedTo: true, deletedAt: true },
  });
}

function canWrite(userId: string, assignedTo: string, profiles: Parameters<typeof canViewRecord>[2]) {
  return canSubmitOrUpdate(userId, assignedTo) || canApproveOrRevise(userId, assignedTo, profiles);
}

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const doc = await loadDoc(id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewRecord(auth.userId, doc.assignedTo, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!doc.fileData || !doc.fileName) {
    return NextResponse.json({ error: "No file attached" }, { status: 404 });
  }

  if (new URL(request.url).searchParams.get("meta") === "1") {
    const { fileData: _omit, ...meta } = doc;
    return NextResponse.json(meta);
  }

  const bytes = new Uint8Array(Buffer.from(doc.fileData, "base64"));
  return new NextResponse(bytes, {
    headers: {
      "content-type": resolveMime(doc.fileName, doc.fileType) ?? "application/octet-stream",
      "content-disposition": `${isViewableInline(doc.fileName) ? "inline" : "attachment"}; filename="${doc.fileName.replace(/["\\]/g, "")}"`,
      "content-length": String(bytes.byteLength),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function POST(request: Request, { params }: Ctx) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const doc = await loadDoc(id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canWrite(auth.userId, doc.assignedTo, auth.profiles)) {
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
  const updated = await prisma.document.update({
    where: { id },
    data: { fileName, fileType, fileSize: upload.size, fileData, updated: new Date() },
    select: fileMetaSelect,
  });

  return NextResponse.json({ success: true, file: updated });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const doc = await loadDoc(id);
  if (!doc || doc.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canWrite(auth.userId, doc.assignedTo, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.document.update({
    where: { id },
    data: { fileName: null, fileType: null, fileSize: null, fileData: null },
  });
  return NextResponse.json({ success: true });
}
