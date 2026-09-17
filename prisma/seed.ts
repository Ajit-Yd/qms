import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  profiles,
  recordsByModule,
  committees,
  committeeMemberships,
  committeeTasks,
} from "../lib/qms-data";
import { hashPassword } from "../src/lib/passwords";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "DemoPass123!";

// Demo passwords are NEVER committed: generated from env or deterministic fallback only at runtime.
// In production, set SEED_PASSWORDS_JSON='{\"p-director\":\"...\"}' to provide per-user passwords.
// Otherwise a single DEMO_PASSWORD is used for all seeded users (printed once at seed time).
const profilePasswords: Record<string, string> = (() => {
  const raw = process.env.SEED_PASSWORDS_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      console.warn("Invalid SEED_PASSWORDS_JSON, falling back to DEMO_PASSWORD");
    }
  }
  return {};
})();

function emailFor(profile: (typeof profiles)[number]): string {
  return profile.email || profile.name.trim().toLowerCase().replace(/\s+/g, ".") + "@qms.local";
}

async function main() {
  console.log("🌱 Seeding database with sample data...");

  await prisma.recordHistory.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.committeeTask.deleteMany();
  await prisma.committeeMembership.deleteMany();
  await prisma.committee.deleteMany();
  await prisma.training.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.nonconformance.deleteMany();
  await prisma.capa.deleteMany();
  await prisma.document.deleteMany();
  await prisma.profile.deleteMany();

  const rootProfiles = profiles.filter((profile) => !profile.reportsTo);
  const childProfiles = profiles.filter((profile) => profile.reportsTo);

  console.log("📦 Seeding profiles...");
  for (const profile of rootProfiles) {
    await prisma.profile.create({
      data: {
        id: profile.id,
        name: profile.name,
        email: emailFor(profile),
        roleTitle: profile.roleTitle,
        reportsTo: profile.reportsTo,
        canManageCommittees: profile.canManageCommittees ?? false,
        passwordHash: hashPassword(profilePasswords[profile.id] ?? DEMO_PASSWORD),
      },
    });
  }

  for (const profile of childProfiles) {
    await prisma.profile.create({
      data: {
        id: profile.id,
        name: profile.name,
        email: emailFor(profile),
        roleTitle: profile.roleTitle,
        reportsTo: profile.reportsTo,
        canManageCommittees: profile.canManageCommittees ?? false,
        passwordHash: hashPassword(profilePasswords[profile.id] ?? DEMO_PASSWORD),
      },
    });
  }

  console.log("📦 Seeding documents...");
  const createdDocuments = [] as Array<{ id: string }>;
  for (const doc of recordsByModule.documents) {
    const created = await prisma.document.create({
      data: {
        id: doc.id,
        title: doc.title,
        assignedTo: doc.assignedTo,
        status: doc.status,
        revision: doc.revision,
        updated: new Date(doc.updated),
      },
    });
    createdDocuments.push(created);
  }

  console.log("📦 Seeding CAPA records...");
  const createdCapa = [] as Array<{ id: string }>;
  for (const record of recordsByModule.capa) {
    const created = await prisma.capa.create({
      data: {
        id: record.id,
        title: record.title,
        assignedTo: record.assignedTo,
        priority: record.priority,
        status: record.status,
        dueDate: record.dueDate ? new Date(record.dueDate) : null,
      },
    });
    createdCapa.push(created);
  }

  console.log("📦 Seeding nonconformances...");
  const createdNonconformances = [] as Array<{ id: string }>;
  for (const record of recordsByModule.nonconformances) {
    const created = await prisma.nonconformance.create({
      data: {
        id: record.id,
        title: record.title,
        assignedTo: record.assignedTo,
        source: record.source,
        severity: record.severity,
        status: record.status,
        date: new Date(record.date),
      },
    });
    createdNonconformances.push(created);
  }

  console.log("📦 Seeding audits...");
  const createdAudits = [] as Array<{ id: string }>;
  for (const audit of recordsByModule.audits) {
    const created = await prisma.audit.create({
      data: {
        id: audit.id,
        title: audit.title,
        assignedTo: audit.assignedTo,
        status: audit.status,
        date: new Date(audit.date),
      },
    });
    createdAudits.push(created);
  }

  console.log("📦 Seeding training records...");
  const createdTraining = [] as Array<{ id: string }>;
  for (const train of recordsByModule.training) {
    const created = await prisma.training.create({
      data: {
        id: train.id,
        employee: train.employee,
        course: train.course,
        status: train.status,
        dueDate: train.dueDate ? new Date(train.dueDate) : null,
        assignedTo: train.assignedTo,
      },
    });
    createdTraining.push(created);
  }

  console.log("📦 Seeding committees...");
  for (const committee of committees) {
    await prisma.committee.create({
      data: {
        id: committee.id,
        name: committee.name,
        description: committee.description,
        createdBy: committee.createdBy,
        createdAt: committee.createdAt ? new Date(committee.createdAt) : undefined,
      },
    });
  }

  console.log("📦 Seeding committee memberships...");
  for (const membership of committeeMemberships) {
    await prisma.committeeMembership.create({
      data: {
        id: membership.id,
        committeeId: membership.committeeId,
        profileId: membership.profileId,
        roleInCommittee: membership.roleInCommittee,
        joinedAt: new Date(),
      },
    });
  }

  console.log("📦 Seeding committee tasks...");
  for (const task of committeeTasks) {
    await prisma.committeeTask.create({
      data: {
        id: task.id,
        committeeId: task.committeeId,
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo,
        assignedBy: task.assignedBy,
        status: task.status,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        createdAt: task.createdAt ? new Date(task.createdAt) : undefined,
      },
    });
  }

  console.log("📦 Seeding record history...");
  const historySeed = [
    {
      id: "rh-1",
      recordType: "document",
      recordId: "doc-1",
      fromStatus: "Pending",
      toStatus: "In progress",
      changedBy: "p-staff-1",
      comment: "Initial review started for the SOP update.",
    },
    {
      id: "rh-2",
      recordType: "capa",
      recordId: "capa-2",
      fromStatus: "Pending",
      toStatus: "Overdue",
      changedBy: "p-owner-2",
      comment: "Escalated because due date was missed.",
    },
    {
      id: "rh-3",
      recordType: "training",
      recordId: "train-2",
      fromStatus: "Pending",
      toStatus: "In progress",
      changedBy: "p-staff-2",
      comment: "Employee began the training module.",
    },
  ];

  for (const entry of historySeed) {
    await prisma.recordHistory.create({
      data: {
        id: entry.id,
        recordType: entry.recordType,
        recordId: entry.recordId,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        changedBy: entry.changedBy,
        comment: entry.comment,
      },
    });
  }

  console.log("📦 Seeding comments...");
  const commentSeed = [
    {
      id: "comment-1",
      recordType: "document",
      recordId: "doc-1",
      authorId: "p-owner-1",
      body: "Please verify the final revision before approval.",
    },
    {
      id: "comment-2",
      recordType: "capa",
      recordId: "capa-1",
      authorId: "p-staff-3",
      body: "The seal drift was reproduced during the latest line check.",
    },
    {
      id: "comment-3",
      recordType: "nonconformance",
      recordId: "nc-2",
      authorId: "p-owner-3",
      body: "Sample evidence has been archived for review.",
    },
  ];

  for (const item of commentSeed) {
    await prisma.comment.create({
      data: {
        id: item.id,
        recordType: item.recordType,
        recordId: item.recordId,
        authorId: item.authorId,
        body: item.body,
      },
    });
  }

  console.log("📦 Seeding notifications...");
  const notificationSeed = [
    {
      id: "notif-1",
      userId: "p-owner-1",
      message: "Document review requires your approval.",
      link: "/documents/doc-1",
      read: false,
    },
    {
      id: "notif-2",
      userId: "p-staff-2",
      message: "CAPA escalation requires an action plan.",
      link: "/capa/capa-2",
      read: false,
    },
    {
      id: "notif-3",
      userId: "p-director",
      message: "Committee task assigned: Review Q2 audit results.",
      link: "/committees/c-qa",
      read: false,
    },
  ];

  for (const item of notificationSeed) {
    await prisma.notification.create({
      data: {
        id: item.id,
        userId: item.userId,
        message: item.message,
        link: item.link,
        read: item.read,
      },
    });
  }

  console.log("✅ Seeding complete!");
  console.log("\nSeeded data summary:");
  console.log(`  - Profiles: ${profiles.length}`);
  console.log(`  - Documents: ${createdDocuments.length}`);
  console.log(`  - CAPA records: ${createdCapa.length}`);
  console.log(`  - Nonconformances: ${createdNonconformances.length}`);
  console.log(`  - Audits: ${createdAudits.length}`);
  console.log(`  - Training records: ${createdTraining.length}`);
  console.log(`  - Committees: ${committees.length}`);
  console.log(`  - Committee memberships: ${committeeMemberships.length}`);
  console.log(`  - Committee tasks: ${committeeTasks.length}`);
  console.log(`  - Record histories: ${historySeed.length}`);
  console.log(`  - Comments: ${commentSeed.length}`);
  console.log(`  - Notifications: ${notificationSeed.length}`);
  const hasCustomPasswords = Object.keys(profilePasswords).length > 0;
  if (hasCustomPasswords) {
    console.log(`\n🔑 Login credentials (per user, from SEED_PASSWORDS_JSON):`);
  } else {
    console.log(`\n🔑 Login credentials (all users share DEMO_PASSWORD — set SEED_PASSWORD/SEED_PASSWORDS_JSON to customize):`);
  }
  for (const profile of [...rootProfiles, ...childProfiles]) {
    const pwd = profilePasswords[profile.id] ?? DEMO_PASSWORD;
    // Only print in dev/seed context; never log in production request handlers
    console.log(`  ${emailFor(profile).padEnd(34)} ${profile.roleTitle.padEnd(20)} ${pwd}`);
  }
  if (!hasCustomPasswords) {
    console.warn("⚠️  Seed used a shared demo password. Rotate via SEED_PASSWORD / SEED_PASSWORDS_JSON for real deployments.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
