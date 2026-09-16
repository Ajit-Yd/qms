import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { transitionModuleRecord } from "@/src/lib/qms-record-api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    return await transitionModuleRecord("documents", id, auth.userId, auth.profiles, "submit", String(body.comment || "Document submitted for approval"));
  } catch (error) {
    console.error("Error submitting document:", error);
    return NextResponse.json({ error: "Failed to submit document" }, { status: 500 });
  }
}
