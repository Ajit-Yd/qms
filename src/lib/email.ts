import { prisma } from "@/src/lib/prisma";

// Single reusable email helper — every email goes through this one function
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("Email disabled: RESEND_API_KEY not set");
    return false;
  }
  if (!to || !to.includes("@")) {
    console.warn(`Cannot send email: invalid recipient ${to}`);
    return false;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL?.trim() || "QMS Notifications <notifications@qms.local>";
    const result = await resend.emails.send({ from, to, subject, html });
    if ((result as any).error) {
      console.error(`Email failed to ${to}:`, (result as any).error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false;
  }
}

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type EmailType =
  | "task_assigned"
  | "superior_assignment"
  | "approval_needed"
  | "approved"
  | "revision_needed"
  | "submitted_for_review";

export interface EmailPayload {
  type: EmailType;
  recipientId: string;
  senderName: string;
  recordTitle: string;
  recordType: "CommitteeTask" | "CAPA" | "Capa" | "Nonconformance" | "Audit" | "Training" | "Document";
  dueDate?: string;
  recordUrl: string;
  message?: string;
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));
}
function safeUrl(value: string): string {
  const s = String(value);
  return s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://") ? escapeHtml(s) : "#";
}
function getEmailSubject(type: EmailType, recordTitle: string): string {
  switch (type) {
    case "task_assigned": return `Task Assigned: ${recordTitle}`;
    case "superior_assignment": return `Assignment: ${recordTitle}`;
    case "approval_needed":
    case "submitted_for_review": return `Awaiting Approval: ${recordTitle}`;
    case "approved": return `Approved: ${recordTitle}`;
    case "revision_needed": return `Revision Needed: ${recordTitle}`;
    default: return `Notification: ${recordTitle}`;
  }
}
function getEmailBody(payload: EmailPayload, recipientName: string): string {
  const { type, senderName, recordTitle, dueDate, recordUrl, message } = payload;
  const escRecipient = escapeHtml(recipientName);
  const escSender = escapeHtml(senderName);
  const escTitle = escapeHtml(recordTitle);
  const escMsg = message ? escapeHtml(message) : "";
  const escUrl = safeUrl(recordUrl);
  let content = "";
  switch (type) {
    case "task_assigned":
      content = `<p>Hi ${escRecipient},</p><p><strong>${escSender}</strong> has assigned a task to you:</p><h3>${escTitle}</h3>${escMsg ? `<p><strong>Details:</strong> ${escMsg}</p>` : ""}${dueDate ? `<p><strong>Due Date:</strong> ${escapeHtml(new Date(dueDate).toLocaleDateString())}</p>` : ""}<p><a href="${escUrl}">View Task</a></p>`;
      break;
    case "superior_assignment":
      content = `<p>Hi ${escRecipient},</p><p><strong>${escSender}</strong> has assigned you the following work:</p><h3>${escTitle}</h3>${escMsg ? `<p><strong>Details:</strong> ${escMsg}</p>` : ""}<p><a href="${escUrl}">View Assignment</a></p>`;
      break;
    case "approval_needed":
    case "submitted_for_review":
      content = `<p>Hi ${escRecipient},</p><p>Your approval is needed for the following:</p><h3>${escTitle}</h3><p><a href="${escUrl}">Review & Approve</a></p>`;
      break;
    case "approved":
      content = `<p>Hi ${escRecipient},</p><p><strong>${escSender}</strong> has approved:</p><h3>${escTitle}</h3><p><a href="${escUrl}">View Details</a></p>`;
      break;
    case "revision_needed":
      content = `<p>Hi ${escRecipient},</p><p><strong>${escSender}</strong> has requested revisions for:</p><h3>${escTitle}</h3>${escMsg ? `<p><strong>Feedback:</strong> ${escMsg}</p>` : ""}<p><a href="${escUrl}">Make Revisions</a></p>`;
      break;
  }
  return `<!DOCTYPE html><html><body>${content}</body></html>`;
}

export async function sendEmailNotification(payload: EmailPayload): Promise<boolean> {
  const recipient = await prisma.profile.findUnique({ where: { id: payload.recipientId } });
  if (!recipient?.email) {
    console.warn(`Cannot send email: recipient ${payload.recipientId} not found or has no email`);
    return false;
  }
  const subject = getEmailSubject(payload.type, payload.recordTitle);
  const html = getEmailBody(payload, recipient.name);
  return sendEmail(recipient.email, subject, html);
}

export interface NotificationPayload {
  userId: string;
  type: EmailType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  recordUrl?: string;
}

export async function sendNotification(
  emailPayload: EmailPayload,
  notificationPayload: NotificationPayload
): Promise<{ emailSent: boolean; notification: { id: string; userId: string; message: string; link: string | null; read: boolean } }> {
  // Email is bonus channel — must not block in-app notification
  let emailSent = false;
  try {
    emailSent = await sendEmailNotification(emailPayload);
  } catch (e) {
    console.error("Email send failed (non-blocking):", e);
    emailSent = false;
  }

  const notification = await prisma.notification.create({
    data: {
      userId: notificationPayload.userId,
      message: notificationPayload.message,
      link: notificationPayload.recordUrl ?? null,
      read: false,
    },
  });

  return { emailSent, notification };
}
