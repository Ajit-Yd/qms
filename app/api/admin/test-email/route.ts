import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/src/lib/prisma";
import { requireSessionUser } from "@/src/lib/api-auth";
import { isTopAuthority } from "@/src/lib/permissions";
import { isEmailEnabled } from "@/src/lib/email";

export async function POST() {
  const auth = await requireSessionUser();
  if ("response" in auth) return auth.response;
  if (!isTopAuthority(auth.userId, auth.profiles)) {
    return NextResponse.json(
      { ok: false, error: "Only the top authority can send a test email" },
      { status: 403 }
    );
  }

  if (!isEmailEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Email is disabled. Add RESEND_API_KEY to .env.local and restart the app." },
      { status: 400 }
    );
  }

  const profile = await prisma.profile.findUnique({ where: { id: auth.userId } });
  const recipient = profile?.email;
  if (!recipient) {
    return NextResponse.json({ ok: false, error: "Your profile has no email address to send to" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "QMS Notifications <notifications@qms.local>";
  const result = await resend.emails.send({
    from,
    to: recipient,
    subject: "QMS email test",
    html: "<p>If you are reading this, QMS email notifications are working.</p>",
  });

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message ?? String(result.error), from }, { status: 502 });
  }

  return NextResponse.json({ ok: true, to: recipient, from });
}