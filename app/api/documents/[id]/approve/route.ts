import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { transitionModuleRecord } from "@/src/lib/qms-record-api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    return await transitionModuleRecord("documents", id, auth.userId, auth.profiles, "approve", String(body.comment || "Document approved"));
  } catch (error) {
    console.error("Error approving document:", error);
    return NextResponse.json({ error: "Failed to approve document" }, { status: 500 });
  }
}
