import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { loadProfiles } from "@/src/lib/load-profiles";
import type { Profile } from "@/src/lib/permissions";

export async function requireSessionUser(): Promise<
  | { userId: string; profiles: Profile[] }
  | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? String(session.user.id) : "";
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const profiles = await loadProfiles();
  return { userId, profiles };
}
