import { NextResponse } from "next/server";
import type { ModuleKey } from "@/components/qms";
import { requireSessionUser } from "@/src/lib/api-auth";
import {
  addModuleComment,
  createModuleRecord,
  deleteModuleRecord,
  getModuleRecord,
  listModuleRecords,
  transitionModuleRecord,
  updateModuleRecord,
} from "@/src/lib/qms-record-api";

async function handleList(moduleKey: ModuleKey) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const records = await listModuleRecords(moduleKey, auth.userId, auth.profiles);
  return NextResponse.json({ records });
}

async function handleCreate(moduleKey: ModuleKey, request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  return createModuleRecord(moduleKey, await request.json(), auth.userId, auth.profiles);
}

export function moduleCollectionHandlers(moduleKey: ModuleKey) {
  return {
    GET: () => handleList(moduleKey),
    POST: (request: Request) => handleCreate(moduleKey, request),
  };
}

export function moduleItemHandlers(moduleKey: ModuleKey) {
  return {
    GET: async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
      const auth = await requireSessionUser();
      if ("response" in auth) return auth.response;
      return getModuleRecord(moduleKey, (await ctx.params).id, auth.userId, auth.profiles);
    },
    PATCH: async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
      const auth = await requireSessionUser();
      if ("response" in auth) return auth.response;
      return updateModuleRecord(moduleKey, (await ctx.params).id, await request.json(), auth.userId, auth.profiles);
    },
    DELETE: async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
      const auth = await requireSessionUser();
      if ("response" in auth) return auth.response;
      return deleteModuleRecord(moduleKey, (await ctx.params).id, auth.userId, auth.profiles);
    },
  };
}

export function moduleActionHandler(moduleKey: ModuleKey, action: "submit" | "approve" | "revise") {
  return async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;
    const body = await request.json().catch(() => ({}));
    const comment =
      action === "revise"
        ? String(body.feedback || body.comment || "Please revise and resubmit")
        : String(body.comment || `${action} completed`);
    return transitionModuleRecord(moduleKey, (await ctx.params).id, auth.userId, auth.profiles, action, comment);
  };
}

export function moduleCommentHandlers(moduleKey: ModuleKey) {
  return {
    GET: async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
      const auth = await requireSessionUser();
      if ("response" in auth) return auth.response;
      const result = await getModuleRecord(moduleKey, (await ctx.params).id, auth.userId, auth.profiles);
      if (!result.ok) return result;
      const payload = await result.json();
      return NextResponse.json({ comments: payload.comments });
    },
    POST: async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
      const auth = await requireSessionUser();
      if ("response" in auth) return auth.response;
      const body = await request.json();
      const commentBody = String(body.body ?? "").trim();
      if (!commentBody) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
      return addModuleComment(moduleKey, (await ctx.params).id, auth.userId, auth.profiles, commentBody);
    },
  };
}
