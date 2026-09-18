import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { createModuleRecord, listModuleRecords } from "@/src/lib/qms-record-api";

export async function GET() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  try {
    const records = await listModuleRecords("nonconformances", auth.userId, auth.profiles);
    return NextResponse.json({ records });
  } catch (error) {
    console.error("Error fetching nonconformances:", error);
    return NextResponse.json({ error: "Failed to fetch nonconformances" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  try {
    return await createModuleRecord("nonconformances", await request.json(), auth.userId, auth.profiles);
  } catch (error) {
    console.error("Error creating nonconformance:", error);
    return NextResponse.json({ error: "Failed to create nonconformance" }, { status: 500 });
  }
}
