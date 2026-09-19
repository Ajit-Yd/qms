import { prisma } from "@/src/lib/prisma";

// Email removed — in-app notifications only.
// Kept types for compatibility; email sending is no-op.

export function isEmailEnabled(): boolean {
  return false;
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

export async function sendEmailNotification(_payload: EmailPayload): Promise<boolean> {
  return false;
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
  _emailPayload: EmailPayload,
  notificationPayload: NotificationPayload
): Promise<{ emailSent: boolean; notification: { id: string; userId: string; message: string; link: string | null; read: boolean } }> {
  const notification = await prisma.notification.create({
    data: {
      userId: notificationPayload.userId,
      message: notificationPayload.message,
      link: notificationPayload.recordUrl ?? null,
      read: false,
    },
  });

  return { emailSent: false, notification };
}
