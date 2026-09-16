import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { deleteModuleRecord, getModuleRecord, updateModuleRecord } from "@/src/lib/qms-record-api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    return await getModuleRecord("documents", id, auth.userId, auth.profiles);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    return await updateModuleRecord("documents", id, await request.json(), auth.userId, auth.profiles);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    return await deleteModuleRecord("documents", id, auth.userId, auth.profiles);
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
