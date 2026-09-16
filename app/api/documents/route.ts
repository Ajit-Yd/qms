import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { createModuleRecord, listModuleRecords } from "@/src/lib/qms-record-api";

export async function GET() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  try {
    const documents = await listModuleRecords("documents", auth.userId, auth.profiles);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  try {
    return await createModuleRecord("documents", await request.json(), auth.userId, auth.profiles);
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
