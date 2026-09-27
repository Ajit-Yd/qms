import { NextResponse } from "next/server";

export function verifyCsrf(request: Request): NextResponse | null {
  // Only enforce for state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return null;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  let expectedOrigin: string | null = null;
  try {
    if (nextAuthUrl) expectedOrigin = new URL(nextAuthUrl).origin;
    else if (host) expectedOrigin = `https://${host}`;
  } catch {}

  const check = origin ?? referer;
  if (!check) {
    return NextResponse.json({ error: "CSRF check failed: missing Origin" }, { status: 403 });
  }
  if (expectedOrigin) {
    try {
      const checkOrigin = new URL(check).origin;
      if (checkOrigin !== expectedOrigin) {
        return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
    }
  }
  return null;
}
