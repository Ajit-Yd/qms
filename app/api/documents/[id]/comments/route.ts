import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { addModuleComment, getModuleRecord } from "@/src/lib/qms-record-api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const result = await getModuleRecord("documents", id, auth.userId, auth.profiles);
    if (!result.ok) return result;
    const payload = await result.json();
    return NextResponse.json({ comments: payload.comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const commentBody = String(body.body ?? "").trim();
  if (!commentBody) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  try {
    return await addModuleComment("documents", id, auth.userId, auth.profiles, commentBody);
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
