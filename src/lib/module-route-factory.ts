import { NextResponse } from "next/server";
import type { ModuleKey } from "@/components/qms";
import { requireSessionUser, type SessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { enforceUserRateLimit, rateLimitResponse } from "@/src/lib/rate-limit";
import {
  addModuleComment,
  createModuleRecord,
  deleteModuleRecord,
  getModuleRecord,
  listModuleRecords,
  transitionModuleRecord,
  updateModuleRecord,
} from "@/src/lib/qms-record-api";

/**
 * Every state-changing request goes through here: CSRF origin check first, then
 * the session, then a per-user write budget. Adding a mutating handler without
 * this is the easy mistake to make.
 */
async function guard(request: Request): Promise<{ auth: SessionUser } | { response: NextResponse }> {
  const csrf = verifyCsrf(request);
  if (csrf) return { response: csrf };
  const auth = await requireSessionUser();
  if ("response" in auth) return { response: auth.response };
  // Generous on purpose: this stops a runaway script or a stolen session from
  // hammering writes, not a person clicking quickly.
  const budget = enforceUserRateLimit(auth.userId, "write", 120, 60 * 1000);
  if (!budget.allowed) {
    return {
      response: NextResponse.json(
        { error: "Too many changes. Please slow down." },
        { status: 429, headers: rateLimitResponse(budget.remaining, budget.resetMs) }
      ),
    };
  }
  return { auth };
}

async function handleList(moduleKey: ModuleKey) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const records = await listModuleRecords(moduleKey, auth.userId, auth.profiles);
  return NextResponse.json({ records });
}

async function handleCreate(moduleKey: ModuleKey, request: Request, auth: SessionUser) {
  return createModuleRecord(moduleKey, await request.json(), auth.userId, auth.profiles);
}

export function moduleCollectionHandlers(moduleKey: ModuleKey) {
  return {
    GET: () => handleList(moduleKey),
    POST: async (request: Request) => {
      const g = await guard(request);
      if ("response" in g) return g.response;
      return handleCreate(moduleKey, request, g.auth);
    },
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
      const g = await guard(request);
      if ("response" in g) return g.response;
      return updateModuleRecord(moduleKey, (await ctx.params).id, await request.json(), g.auth.userId, g.auth.profiles);
    },
    DELETE: async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
      const g = await guard(request);
      if ("response" in g) return g.response;
      return deleteModuleRecord(moduleKey, (await ctx.params).id, g.auth.userId, g.auth.profiles);
    },
  };
}

export function moduleActionHandler(moduleKey: ModuleKey, action: "submit" | "approve" | "revise") {
  return async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const g = await guard(request);
    if ("response" in g) return g.response;
    const body = await request.json().catch(() => ({}));
    const comment =
      action === "revise"
        ? String(body.feedback || body.comment || "Please revise and resubmit")
        : String(body.comment || `${action} completed`);
    return transitionModuleRecord(moduleKey, (await ctx.params).id, g.auth.userId, g.auth.profiles, action, comment);
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
      const g = await guard(request);
      if ("response" in g) return g.response;
      const body = await request.json();
      const commentBody = String(body.body ?? "").trim();
      if (!commentBody) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
      return addModuleComment(moduleKey, (await ctx.params).id, g.auth.userId, g.auth.profiles, commentBody);
    },
  };
}
