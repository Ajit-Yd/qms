export type Profile = {
  id: string;
  name: string;
  email: string;
  roleTitle: string;
  reportsTo: string | null;
  active?: boolean;
  canManageCommittees?: boolean;
};

export const profiles: Profile[] = [
  { id: "p-director", name: "Alicia Reed", email: "alicia.reed@qms.local", roleTitle: "Director", reportsTo: null, active: true, canManageCommittees: false },
  { id: "p-deputy", name: "Marcus Webb", email: "marcus.webb@qms.local", roleTitle: "Deputy Director", reportsTo: "p-director", active: true, canManageCommittees: true },
  { id: "p-lead-qa", name: "Mason Lee", email: "mason.lee@qms.local", roleTitle: "Quality Lead", reportsTo: "p-deputy", active: true, canManageCommittees: true },
  { id: "p-lead-ops", name: "Priya Shah", email: "priya.shah@qms.local", roleTitle: "Operations Lead", reportsTo: "p-deputy", active: true, canManageCommittees: false },
  { id: "p-owner-1", name: "Noah Foster", email: "noah.foster@qms.local", roleTitle: "Process Owner", reportsTo: "p-lead-qa", active: true, canManageCommittees: false },
  { id: "p-owner-2", name: "Elena Torres", email: "elena.torres@qms.local", roleTitle: "Process Owner", reportsTo: "p-lead-qa", active: true, canManageCommittees: false },
  { id: "p-owner-3", name: "Daniel Kim", email: "daniel.kim@qms.local", roleTitle: "Process Owner", reportsTo: "p-lead-ops", active: true, canManageCommittees: false },
  { id: "p-owner-4", name: "Sara Khan", email: "sara.khan@qms.local", roleTitle: "Process Owner", reportsTo: "p-lead-ops", active: true, canManageCommittees: false },
  { id: "p-staff-1", name: "Chris Allen", email: "chris.allen@qms.local", roleTitle: "Quality Analyst", reportsTo: "p-owner-1", active: true, canManageCommittees: false },
  { id: "p-staff-2", name: "Nia Patel", email: "nia.patel@qms.local", roleTitle: "QA Technician", reportsTo: "p-owner-2", active: true, canManageCommittees: false },
  { id: "p-staff-3", name: "Tom Brooks", email: "tom.brooks@qms.local", roleTitle: "Operations Specialist", reportsTo: "p-owner-3", active: true, canManageCommittees: false },
  { id: "p-staff-4", name: "Mila Gomez", email: "mila.gomez@qms.local", roleTitle: "Document Controller", reportsTo: "p-owner-4", active: true, canManageCommittees: false },
];

export const recordsByModule = {
  documents: [
    { id: "doc-1", title: "SOP-001 Revision 4", assignedTo: "p-staff-1", status: "In progress", revision: "4", updated: "2026-08-20" },
    { id: "doc-2", title: "Change Control Log", assignedTo: "p-owner-1", status: "Approved", revision: "3", updated: "2026-08-18" },
    { id: "doc-3", title: "Supplier Qualification Sheet", assignedTo: "p-staff-4", status: "Pending", revision: "1", updated: "2026-08-12" },
  ],
  capa: [
    { id: "capa-1", title: "Seal integrity drift on Line 2", assignedTo: "p-staff-3", priority: "High", status: "In progress", dueDate: "2026-08-28" },
    { id: "capa-2", title: "Label print mismatch", assignedTo: "p-owner-2", priority: "Critical", status: "Overdue", dueDate: "2026-08-16" },
    { id: "capa-3", title: "Calibration check backlog", assignedTo: "p-staff-2", priority: "Medium", status: "Done", dueDate: "2026-08-22" },
  ],
  nonconformances: [
    { id: "nc-1", title: "Complaint from regional distributor", assignedTo: "p-owner-4", source: "Customer", severity: "High", status: "Pending", date: "2026-08-19" },
    { id: "nc-2", title: "Foreign particulate in batch B17", assignedTo: "p-staff-2", source: "Internal", severity: "Critical", status: "In progress", date: "2026-08-20" },
    { id: "nc-3", title: "Temperature excursion during transit", assignedTo: "p-owner-3", source: "Supplier", severity: "Medium", status: "Closed", date: "2026-08-15" },
  ],
  audits: [
    { id: "audit-1", title: "Internal audit checklist", assignedTo: "p-owner-1", status: "Done", date: "2026-08-17" },
    { id: "audit-2", title: "Supplier quality review", assignedTo: "p-staff-4", status: "Pending", date: "2026-08-23" },
    { id: "audit-3", title: "Traceability review", assignedTo: "p-owner-3", status: "In progress", date: "2026-08-21" },
  ],
  training: [
    { id: "train-1", employee: "Chris Allen", assignedTo: "p-staff-1", course: "GxP Foundations", status: "Done", dueDate: "2026-08-15" },
    { id: "train-2", employee: "Nia Patel", assignedTo: "p-staff-2", course: "Deviation Handling", status: "In progress", dueDate: "2026-08-29" },
    { id: "train-3", employee: "Mila Gomez", assignedTo: "p-staff-4", course: "Document Control", status: "Pending", dueDate: "2026-08-31" },
  ],
} as const;

export const committees = [
  { id: "c-qa", name: "Quality Assurance Committee", description: "Oversees quality policies and standards", createdBy: "p-deputy", createdAt: "2026-01-15" },
  { id: "c-safety", name: "Safety & Compliance Committee", description: "Manages workplace safety and regulatory compliance", createdBy: "p-deputy", createdAt: "2026-02-01" },
  { id: "c-innovation", name: "Process Innovation Committee", description: "Drives process improvements and new initiatives", createdBy: "p-lead-qa", createdAt: "2026-03-10" },
];

export const committeeMemberships = [
  { id: "cm-1", committeeId: "c-qa", profileId: "p-deputy", roleInCommittee: "head" as const },
  { id: "cm-2", committeeId: "c-qa", profileId: "p-director", roleInCommittee: "member" as const },
  { id: "cm-3", committeeId: "c-qa", profileId: "p-lead-qa", roleInCommittee: "member" as const },
  { id: "cm-4", committeeId: "c-qa", profileId: "p-lead-ops", roleInCommittee: "member" as const },
  { id: "cm-5", committeeId: "c-qa", profileId: "p-owner-1", roleInCommittee: "member" as const },
  { id: "cm-6", committeeId: "c-safety", profileId: "p-lead-ops", roleInCommittee: "head" as const },
  { id: "cm-7", committeeId: "c-safety", profileId: "p-owner-3", roleInCommittee: "member" as const },
  { id: "cm-8", committeeId: "c-safety", profileId: "p-owner-4", roleInCommittee: "member" as const },
  { id: "cm-9", committeeId: "c-safety", profileId: "p-staff-3", roleInCommittee: "member" as const },
  { id: "cm-10", committeeId: "c-innovation", profileId: "p-lead-qa", roleInCommittee: "head" as const },
  { id: "cm-11", committeeId: "c-innovation", profileId: "p-owner-1", roleInCommittee: "member" as const },
  { id: "cm-12", committeeId: "c-innovation", profileId: "p-owner-2", roleInCommittee: "member" as const },
  { id: "cm-13", committeeId: "c-innovation", profileId: "p-staff-1", roleInCommittee: "member" as const },
];

export const committeeTasks = [
  { id: "ct-1", committeeId: "c-qa", title: "Review Q2 audit results", description: "Comprehensive review of audit findings", assignedTo: "p-owner-1", assignedBy: "p-deputy", status: "in_progress" as const, dueDate: "2026-09-15", createdAt: "2026-08-20" },
  { id: "ct-2", committeeId: "c-safety", title: "Update safety procedures", description: "Revise PPE requirements per new regulations", assignedTo: "p-owner-3", assignedBy: "p-lead-ops", status: "assigned" as const, dueDate: "2026-09-01", createdAt: "2026-08-25" },
  { id: "ct-3", committeeId: "c-qa", title: "Publish CAPA effectiveness metrics", description: "Summarize closure rates for the last two quarters", assignedTo: "p-staff-1", assignedBy: "p-lead-qa", status: "assigned" as const, dueDate: "2026-09-20", createdAt: "2026-08-28" },
  { id: "ct-4", committeeId: "c-innovation", title: "Draft risk register template", description: "Align with ISO 14971 expectations", assignedTo: "p-owner-2", assignedBy: "p-lead-qa", status: "in_progress" as const, dueDate: "2026-10-01", createdAt: "2026-08-30" },
  { id: "ct-5", committeeId: "c-safety", title: "Schedule monthly safety walkthrough", description: "Coordinate with operations for September rounds", assignedTo: "p-staff-3", assignedBy: "p-lead-ops", status: "assigned" as const, dueDate: "2026-09-10", createdAt: "2026-09-01" },
];

export function getProfileById(id: string) {
  return profiles.find((profile) => profile.id === id);
}

export function getCommitteeById(id: string) {
  return committees.find((committee) => committee.id === id);
}

export function getMembershipsForCommittee(committeeId: string) {
  return committeeMemberships.filter((membership) => membership.committeeId === committeeId);
}

export function getTasksForCommittee(committeeId: string) {
  return committeeTasks.filter((task) => task.committeeId === committeeId);
}
