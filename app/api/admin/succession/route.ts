import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { isTopAuthority } from "@/src/lib/permissions";
import { executeSuccession, generateSuccessionSummary, validateSuccession } from "@/src/lib/succession";

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!isTopAuthority(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Only the top authority can perform succession operations" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const departingUserId = searchParams.get("departingUserId");
  const replacementUserId = searchParams.get("replacementUserId");
  if (!departingUserId || !replacementUserId) {
    return NextResponse.json({ error: "departingUserId and replacementUserId query parameters are required" }, { status: 400 });
  }
  const validation = validateSuccession(auth.userId, departingUserId, replacementUserId, auth.profiles);
  if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });
  const summary = await generateSuccessionSummary(departingUserId, replacementUserId, auth.profiles);
  return NextResponse.json({ success: true, summary });
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!isTopAuthority(auth.userId, auth.profiles)) {
    return NextResponse.json({ error: "Only the top authority can perform succession operations" }, { status: 403 });
  }
  const body = await request.json();
  const { departingUserId, replacementUserId, confirmed } = body;
  if (!departingUserId || !replacementUserId) {
    return NextResponse.json({ error: "departingUserId and replacementUserId are required" }, { status: 400 });
  }
  if (confirmed !== true) {
    return NextResponse.json({ error: "Succession must be explicitly confirmed (confirmed: true)" }, { status: 400 });
  }
  const validation = validateSuccession(auth.userId, departingUserId, replacementUserId, auth.profiles);
  if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });
  const result = await executeSuccession(departingUserId, replacementUserId);
  return NextResponse.json({ success: true, message: "Succession completed successfully", changes: result.changes });
}
