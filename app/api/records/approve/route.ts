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
  const { recordId, recordType, title, comment } = body;
  if (!recordId || !recordType) {
    return NextResponse.json({ error: "recordId and recordType are required" }, { status: 400 });
  }
  const moduleKey = toModuleKey(String(recordType));
  if (!moduleKey) return NextResponse.json({ error: "Unsupported record type" }, { status: 400 });
  // No assignee check here: the caller used to pass `assignedTo` in the body and
  // we compared against that, which proved nothing. transitionModuleRecord
  // authorizes against the record's real assignedTo.
  return transitionModuleRecord(
    moduleKey,
    String(recordId),
    auth.userId,
    auth.profiles,
    "approve",
    String(comment || title || "Approved")
  );
}
