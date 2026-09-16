import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { transitionModuleRecord } from "@/src/lib/qms-record-api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    return await transitionModuleRecord("capa", id, auth.userId, auth.profiles, "approve", String(body.comment || "CAPA approved"));
  } catch (error) {
    console.error("Error approving CAPA:", error);
    return NextResponse.json({ error: "Failed to approve CAPA" }, { status: 500 });
  }
}
