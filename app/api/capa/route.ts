import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { createModuleRecord, listModuleRecords } from "@/src/lib/qms-record-api";

export async function GET() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  try {
    const capas = await listModuleRecords("capa", auth.userId, auth.profiles);
    return NextResponse.json({ capas });
  } catch (error) {
    console.error("Error fetching CAPAs:", error);
    return NextResponse.json({ error: "Failed to fetch CAPAs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  try {
    return await createModuleRecord("capa", await request.json(), auth.userId, auth.profiles);
  } catch (error) {
    console.error("Error creating CAPA:", error);
    return NextResponse.json({ error: "Failed to create CAPA" }, { status: 500 });
  }
}
