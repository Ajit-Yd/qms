import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { canRespondToTask, canReviewTask } from "@/src/lib/tasks-api";
import { isViewableInline, MAX_FILE_BYTES, resolveMime } from "@/src/lib/files";

type Ctx = { params: Promise<{ id: string }> };

const taskResponseSelect = {
  id: true,
  status: true,
  responseNote: true,
  linkUrl: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  respondedAt: true,
} as const;

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const task = await prisma.committeeTask.findUnique({
    where: { id },
    select: { ...taskResponseSelect, committeeId: true, assignedTo: true, fileData: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberships = await prisma.committeeMembership.findMany({ where: { profileId: auth.userId } });
  const mayRead = canRespondToTask(auth.userId, task, memberships, auth.profiles) || canReviewTask(auth.userId, task, memberships, auth.profiles);
  if (!mayRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!task.fileData || !task.fileName) return NextResponse.json({ error: "No file attached" }, { status: 404 });

  if (new URL(request.url).searchParams.get("meta") === "1") {
    return NextResponse.json({
      fileName: task.fileName,
      fileType: task.fileType,
      fileSize: task.fileSize,
      responseNote: task.responseNote,
      linkUrl: task.linkUrl,
    });
  }

  const bytes = new Uint8Array(Buffer.from(task.fileData, "base64"));
  return new NextResponse(bytes, {
    headers: {
      "content-type": resolveMime(task.fileName, task.fileType) ?? "application/octet-stream",
      "content-disposition": `${isViewableInline(task.fileName) ? "inline" : "attachment"}; filename="${task.fileName.replace(/["\\]/g, "")}"`,
      "content-length": String(bytes.byteLength),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

/** Response submission: note + optional hyperlink + optional file, in one multipart form. */
export async function POST(request: Request, { params }: Ctx) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const task = await prisma.committeeTask.findUnique({ where: { id }, select: { committeeId: true, assignedTo: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberships = await prisma.committeeMembership.findMany();
  if (!canRespondToTask(auth.userId, task, memberships, auth.profiles)) {
    return NextResponse.json({ error: "Only the assignee, committee head, or a manager can respond" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const data: Record<string, unknown> = { respondedAt: new Date(), status: "submitted" };

  const note = String(form.get("responseNote") ?? "").trim();
  data.responseNote = note || null;

  const link = String(form.get("linkUrl") ?? "").trim();
  if (link) {
    let parsed: URL;
    try {
      parsed = new URL(link);
    } catch {
      return NextResponse.json({ error: "linkUrl must be a full URL (https://…)" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only http/https links are allowed" }, { status: 400 });
    }
    data.linkUrl = parsed.toString();
  } else {
    data.linkUrl = null;
  }

  const upload = form.get("file");
  if (upload instanceof File && upload.size > 0) {
    if (upload.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `File too large (max ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB)` }, { status: 413 });
    }
    const fileName = upload.name.replace(/^.*[\\/]/, "").trim();
    const fileType = resolveMime(fileName, upload.type);
    if (!fileType) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    data.fileName = fileName;
    data.fileType = fileType;
    data.fileSize = upload.size;
    data.fileData = Buffer.from(await upload.arrayBuffer()).toString("base64");
  }

  const updated = await prisma.committeeTask.update({ where: { id }, data, select: taskResponseSelect });
  return NextResponse.json({ success: true, task: updated });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const task = await prisma.committeeTask.findUnique({ where: { id }, select: { committeeId: true, assignedTo: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberships = await prisma.committeeMembership.findMany();
  if (!canRespondToTask(auth.userId, task, memberships, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.committeeTask.update({
    where: { id },
    data: { fileName: null, fileType: null, fileSize: null, fileData: null, status: "in_progress" },
    select: taskResponseSelect,
  });
  return NextResponse.json({ success: true, task: updated });
}
