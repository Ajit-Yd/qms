import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const redacted = url.replace(/(postgres(ql)?:\/\/)([^@]+)@/, "$1***:***@");
  return NextResponse.json({
    hasDbUrl: Boolean(url),
    redactedUrl: redacted,
    host: (() => {
      try {
        return new URL(url)?.hostname ?? null;
      } catch {
        return "unparseable";
      }
    })(),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}