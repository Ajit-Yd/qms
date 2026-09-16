import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { deleteModuleRecord, getModuleRecord, updateModuleRecord } from "@/src/lib/qms-record-api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const result = await getModuleRecord("capa", id, auth.userId, auth.profiles);
    if (!result.ok) return result;
    const payload = await result.json();
    return NextResponse.json({ capa: payload.record, history: payload.history, comments: payload.comments });
  } catch (error) {
    console.error("Error fetching CAPA:", error);
    return NextResponse.json({ error: "Failed to fetch CAPA" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    return await updateModuleRecord("capa", id, await request.json(), auth.userId, auth.profiles);
  } catch (error) {
    console.error("Error updating CAPA:", error);
    return NextResponse.json({ error: "Failed to update CAPA" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    return await deleteModuleRecord("capa", id, auth.userId, auth.profiles);
  } catch (error) {
    console.error("Error deleting CAPA:", error);
    return NextResponse.json({ error: "Failed to delete CAPA" }, { status: 500 });
  }
}
