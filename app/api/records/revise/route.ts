import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { canApproveOrRevise } from "@/src/lib/permissions";
import { transitionModuleRecord, toModuleKey } from "@/src/lib/qms-record-api";

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const body = await request.json();
  const { recordId, recordType, assignedTo, feedback } = body;
  if (!recordId || !recordType || !assignedTo) {
    return NextResponse.json({ error: "recordId, recordType, and assignedTo are required" }, { status: 400 });
  }
  if (!canApproveOrRevise(auth.userId, assignedTo, auth.profiles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const moduleKey = toModuleKey(String(recordType));
  if (!moduleKey) return NextResponse.json({ error: "Unsupported record type" }, { status: 400 });
  return transitionModuleRecord(
    moduleKey,
    String(recordId),
    auth.userId,
    auth.profiles,
    "revise",
    String(feedback || "Please revise and resubmit")
  );
}
