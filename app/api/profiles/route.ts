import { NextResponse } from "next/server";
import { requireSessionUser } from "@/src/lib/api-auth";
import { toPublicProfile } from "@/src/lib/permissions";

export async function GET() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json({ profiles: auth.profiles.map(toPublicProfile) });
}
