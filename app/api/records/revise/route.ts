import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { verifyCsrf } from "@/src/lib/csrf";
import { transitionModuleRecord, toModuleKey } from "@/src/lib/qms-record-api";

export async function POST(request: Request) {
  const csrf = verifyCsrf(request);
  if (csrf) return csrf;

  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  const body = await request.json();
  const { recordId, recordType, feedback } = body;
  if (!recordId || !recordType) {
    return NextResponse.json({ error: "recordId and recordType are required" }, { status: 400 });
  }
  const moduleKey = toModuleKey(String(recordType));
  if (!moduleKey) return NextResponse.json({ error: "Unsupported record type" }, { status: 400 });
  // Authorization happens in transitionModuleRecord against the record's real
  // assignedTo, not against anything the caller sent in the body.
  return transitionModuleRecord(
    moduleKey,
    String(recordId),
    auth.userId,
    auth.profiles,
    "revise",
    String(feedback || "Please revise and resubmit")
  );
}
