"use client";

import type { ModuleKey } from "@/components/qms";
import type { Profile } from "@/lib/permissions";

export type CachedModuleRecord = {
  id: string;
  title: string;
  assignedTo: string;
  status: string;
  deletedAt?: string | null;
  [key: string]: unknown;
};

export type QmsSnapshot = {
  profiles: Profile[];
  notifications: Array<{
    id: string;
    userId: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: string;
  }>;
  records: Record<ModuleKey, CachedModuleRecord[]>;
};

const snapshots = new Map<string, QmsSnapshot>();

export function readSnapshot(viewerId: string): QmsSnapshot | null {
  return snapshots.get(viewerId) ?? null;
}

export function writeSnapshot(viewerId: string, snapshot: QmsSnapshot): void {
  snapshots.set(viewerId, snapshot);
}

export function clearSnapshot(viewerId: string): void {
  snapshots.delete(viewerId);
}