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
    { id: "doc-1", title: "SOP-001 Document Control Procedure Rev 4", assignedTo: "p-staff-1", status: "In progress", revision: "4", updated: "2026-08-20" },
    { id: "doc-2", title: "Change Control Log Rev 3", assignedTo: "p-owner-1", status: "Approved", revision: "3", updated: "2026-08-18" },
    { id: "doc-3", title: "Supplier Qualification Sheet Rev 1", assignedTo: "p-staff-4", status: "Pending", revision: "1", updated: "2026-08-12" },
    { id: "doc-4", title: "Quality Manual Rev 6", assignedTo: "p-deputy", status: "Approved", revision: "6", updated: "2026-09-02" },
    { id: "doc-5", title: "Batch Manufacturing Record Template", assignedTo: "p-owner-3", status: "Approved", revision: "2", updated: "2026-07-30" },
    { id: "doc-6", title: "Internal Audit Program 2026", assignedTo: "p-lead-qa", status: "In progress", revision: "1", updated: "2026-09-05" },
    { id: "doc-7", title: "Deviation Handling Procedure Rev 3", assignedTo: "p-owner-2", status: "Done", revision: "3", updated: "2026-06-18" },
    { id: "doc-8", title: "CAPA Effectiveness Verification SOP", assignedTo: "p-staff-1", status: "In progress", revision: "1", updated: "2026-09-08" },
    { id: "doc-9", title: "Environmental Monitoring Plan", assignedTo: "p-owner-4", status: "Pending", revision: "2", updated: "2026-09-10" },
    { id: "doc-10", title: "Personnel Training Record", assignedTo: "p-staff-3", status: "Draft", revision: "1", updated: "2026-08-28" },
    { id: "doc-11", title: "Risk Management File ISO 14971", assignedTo: "p-owner-2", status: "Approved", revision: "4", updated: "2026-05-21" },
    { id: "doc-12", title: "Calibration Schedule 2026", assignedTo: "p-staff-2", status: "In progress", revision: "1", updated: "2026-09-01" },
    { id: "doc-13", title: "Complaint Handling Procedure Rev 2", assignedTo: "p-owner-4", status: "Done", revision: "2", updated: "2026-04-14" },
    { id: "doc-14", title: "Cleaning Validation Protocol", assignedTo: "p-owner-3", status: "Draft", revision: "1", updated: "2026-09-09" },
    { id: "doc-15", title: "Good Distribution Practice Checklist", assignedTo: "p-lead-ops", status: "Pending", revision: "1", updated: "2026-09-11" },
  ],
  capa: [
    { id: "capa-1", title: "Seal integrity drift on Line 2", assignedTo: "p-staff-3", priority: "High", status: "In progress", dueDate: "2026-08-28" },
    { id: "capa-2", title: "Label print mismatch on 500mg cartons", assignedTo: "p-owner-2", priority: "Critical", status: "Overdue", dueDate: "2026-08-16" },
    { id: "capa-3", title: "Calibration check backlog", assignedTo: "p-staff-2", priority: "Medium", status: "Done", dueDate: "2026-08-22" },
    { id: "capa-4", title: "Autoclave cycle not reaching validated temperature", assignedTo: "p-owner-3", priority: "Critical", status: "In progress", dueDate: "2026-09-20" },
    { id: "capa-5", title: "Repeat deviations on batch B22", assignedTo: "p-owner-2", priority: "High", status: "Pending", dueDate: "2026-10-05" },
    { id: "capa-6", title: "Supplier corrective action overdue for Meridian", assignedTo: "p-staff-4", priority: "Medium", status: "In progress", dueDate: "2026-09-30" },
    { id: "capa-7", title: "Training records incomplete for two operators", assignedTo: "p-staff-3", priority: "Low", status: "Done", dueDate: "2026-07-31" },
    { id: "capa-8", title: "Environmental monitoring excursion on particle counts", assignedTo: "p-owner-4", priority: "High", status: "Pending", dueDate: "2026-10-12" },
    { id: "capa-9", title: "Traceability gap in batch packaging records", assignedTo: "p-owner-1", priority: "High", status: "In progress", dueDate: "2026-09-25" },
    { id: "capa-10", title: "Cleaning validation for Line 2 overdue", assignedTo: "p-owner-3", priority: "Medium", status: "Done", dueDate: "2026-08-19" },
    { id: "capa-11", title: "Complaint response time exceeds target", assignedTo: "p-owner-4", priority: "Medium", status: "Pending", dueDate: "2026-10-18" },
    { id: "capa-12", title: "Data integrity gap in release testing", assignedTo: "p-staff-1", priority: "Critical", status: "In progress", dueDate: "2026-09-15" },
  ],
  nonconformances: [
    { id: "nc-1", title: "Complaint from regional distributor", assignedTo: "p-owner-4", source: "Customer", severity: "High", status: "Pending", date: "2026-08-19" },
    { id: "nc-2", title: "Foreign particulate in batch B17", assignedTo: "p-staff-2", source: "Internal", severity: "Critical", status: "In progress", date: "2026-08-20" },
    { id: "nc-3", title: "Temperature excursion during transit", assignedTo: "p-owner-3", source: "Supplier", severity: "Medium", status: "Closed", date: "2026-08-15" },
    { id: "nc-4", title: "Out-of-spec result on potency assay", assignedTo: "p-staff-2", source: "Internal", severity: "Critical", status: "Pending", date: "2026-09-03" },
    { id: "nc-5", title: "Broken vial observed in packing line", assignedTo: "p-staff-3", source: "Internal", severity: "Medium", status: "In progress", date: "2026-09-05" },
    { id: "nc-6", title: "Missing signature on BMR page 4", assignedTo: "p-owner-1", source: "Internal", severity: "High", status: "Open", date: "2026-09-07" },
    { id: "nc-7", title: "Supplier delivered late against firm order", assignedTo: "p-owner-4", source: "Supplier", severity: "Low", status: "Closed", date: "2026-07-28" },
    { id: "nc-8", title: "Wrong revision issued to production floor", assignedTo: "p-staff-4", source: "Internal", severity: "High", status: "In progress", date: "2026-09-09" },
    { id: "nc-9", title: "Customer complaint about leaking vial cap", assignedTo: "p-owner-2", source: "Customer", severity: "Medium", status: "Pending", date: "2026-09-10" },
    { id: "nc-10", title: "Glass fragments found in reject bin", assignedTo: "p-staff-3", source: "Internal", severity: "Critical", status: "Open", date: "2026-09-11" },
    { id: "nc-11", title: "HVAC filter replacement overdue in cleanroom", assignedTo: "p-owner-3", source: "Supplier", severity: "Low", status: "Closed", date: "2026-06-30" },
    { id: "nc-12", title: "Retest result inconsistent with original OOS", assignedTo: "p-staff-1", source: "Internal", severity: "High", status: "Pending", date: "2026-09-08" },
  ],
  audits: [
    { id: "audit-1", title: "Internal audit checklist", assignedTo: "p-owner-1", status: "Done", date: "2026-08-17" },
    { id: "audit-2", title: "Supplier quality review", assignedTo: "p-staff-4", status: "Pending", date: "2026-08-23" },
    { id: "audit-3", title: "Traceability review", assignedTo: "p-owner-3", status: "In progress", date: "2026-08-21" },
    { id: "audit-4", title: "Cleanroom qualification audit", assignedTo: "p-owner-2", status: "Scheduled", date: "2026-09-30" },
    { id: "audit-5", title: "Data integrity and audit trail review", assignedTo: "p-staff-1", status: "In progress", date: "2026-09-25" },
    { id: "audit-6", title: "Annual internal audit cycle 2026 kickoff", assignedTo: "p-lead-qa", status: "Pending", date: "2026-10-01" },
    { id: "audit-7", title: "Cold chain distribution audit", assignedTo: "p-owner-4", status: "Scheduled", date: "2026-10-15" },
    { id: "audit-8", title: "Training effectiveness audit", assignedTo: "p-staff-3", status: "Done", date: "2026-07-22" },
  ],
  training: [
    { id: "train-1", employee: "Chris Allen", assignedTo: "p-staff-1", course: "GxP Foundations", status: "Done", dueDate: "2026-08-15" },
    { id: "train-2", employee: "Nia Patel", assignedTo: "p-staff-2", course: "Deviation Handling", status: "In progress", dueDate: "2026-08-29" },
    { id: "train-3", employee: "Mila Gomez", assignedTo: "p-staff-4", course: "Document Control", status: "Pending", dueDate: "2026-08-31" },
    { id: "train-4", employee: "Tom Brooks", assignedTo: "p-staff-3", course: "Cleanroom Behaviour", status: "Overdue", dueDate: "2026-08-10" },
    { id: "train-5", employee: "Elena Torres", assignedTo: "p-owner-2", course: "Risk Assessment (ISO 14971)", status: "Done", dueDate: "2026-07-19" },
    { id: "train-6", employee: "Daniel Kim", assignedTo: "p-owner-3", course: "Equipment Calibration", status: "In progress", dueDate: "2026-09-30" },
    { id: "train-7", employee: "Sara Khan", assignedTo: "p-owner-4", course: "Cold Chain Handling", status: "Pending", dueDate: "2026-10-05" },
    { id: "train-8", employee: "Noah Foster", assignedTo: "p-owner-1", course: "CAPA Investigation", status: "Done", dueDate: "2026-08-05" },
    { id: "train-9", employee: "Nia Patel", assignedTo: "p-staff-2", course: "Laboratory Data Integrity", status: "Pending", dueDate: "2026-09-20" },
    { id: "train-10", employee: "Chris Allen", assignedTo: "p-staff-1", course: "Visual Inspection Fundamentals", status: "In progress", dueDate: "2026-10-12" },
    { id: "train-11", employee: "Mila Gomez", assignedTo: "p-staff-4", course: "Supplier Qualification", status: "Overdue", dueDate: "2026-08-18" },
    { id: "train-12", employee: "Tom Brooks", assignedTo: "p-staff-3", course: "EHS Awareness", status: "Done", dueDate: "2026-06-27" },
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
  { id: "ct-3", committeeId: "c-qa", title: "Publish CAPA effectiveness metrics", description: "Summarize closure rates for the last two quarters", assignedTo: "p-staff-1", assignedBy: "p-lead-qa", status: "submitted" as const, dueDate: "2026-09-20", createdAt: "2026-08-28" },
  { id: "ct-4", committeeId: "c-innovation", title: "Draft risk register template", description: "Align with ISO 14971 expectations", assignedTo: "p-owner-2", assignedBy: "p-lead-qa", status: "in_progress" as const, dueDate: "2026-10-01", createdAt: "2026-08-30" },
  { id: "ct-5", committeeId: "c-safety", title: "Schedule monthly safety walkthrough", description: "Coordinate with operations for September rounds", assignedTo: "p-staff-3", assignedBy: "p-lead-ops", status: "approved" as const, dueDate: "2026-09-10", createdAt: "2026-09-01" },
  { id: "ct-6", committeeId: "c-qa", title: "Close out overdue calibration deviations", description: "Clear the CAPA backlog raised in Q2", assignedTo: "p-staff-2", assignedBy: "p-deputy", status: "in_progress" as const, dueDate: "2026-09-18", createdAt: "2026-09-02" },
  { id: "ct-7", committeeId: "c-qa", title: "Approve revision of SOP-014 Deviation Handling", description: "Third revision reflecting audit findings", assignedTo: "p-lead-qa", assignedBy: "p-deputy", status: "assigned" as const, dueDate: "2026-09-28", createdAt: "2026-09-04" },
  { id: "ct-8", committeeId: "c-safety", title: "Audit cold chain shipper validation", description: "Verify qualified shippers for winter transport", assignedTo: "p-owner-4", assignedBy: "p-lead-ops", status: "submitted" as const, dueDate: "2026-10-02", createdAt: "2026-09-05" },
  { id: "ct-9", committeeId: "c-innovation", title: "Pilot electronic batch record", description: "Assess feasibility for Line 2 records capture", assignedTo: "p-staff-1", assignedBy: "p-lead-qa", status: "assigned" as const, dueDate: "2026-10-20", createdAt: "2026-09-06" },
  { id: "ct-10", committeeId: "c-innovation", title: "Reduce change control cycle time", description: "Target 10 working days from request to approval", assignedTo: "p-owner-1", assignedBy: "p-lead-qa", status: "approved" as const, dueDate: "2026-09-12", createdAt: "2026-08-18" },
  { id: "ct-11", committeeId: "c-safety", title: "Refresh emergency evacuation plan", description: "Update assembly points after the site extension", assignedTo: "p-staff-3", assignedBy: "p-lead-ops", status: "assigned" as const, dueDate: "2026-10-10", createdAt: "2026-09-09" },
  { id: "ct-12", committeeId: "c-qa", title: "Consolidate training matrix", description: "Single source of truth for who is trained on what", assignedTo: "p-staff-4", assignedBy: "p-deputy", status: "in_progress" as const, dueDate: "2026-09-25", createdAt: "2026-09-08" },
];

/** Seeded meetings, so the meetings dashboard is not empty. */
export const meetings = [
  { id: "mt-1", committeeId: "c-qa", title: "Monthly QMS review - August", scheduledAt: "2026-08-27T10:00:00.000Z", location: "Conference Room A", organizedBy: "p-deputy", status: "Completed", notes: "Reviewed CAPA closure rates. Agreed to escalate the Meridian supplier action.", agenda: "1. CAPA metrics\n2. Audit findings\n3. Open deviations" },
  { id: "mt-2", committeeId: "c-safety", title: "Safety walkthrough - Line 2", scheduledAt: "2026-09-11T08:30:00.000Z", location: "Line 2 floor", organizedBy: "p-lead-ops", status: "Completed", notes: "Two PPE gaps found on the packing line; corrective actions raised.", agenda: "Walkdown checklist\nHousekeeping review" },
  { id: "mt-3", committeeId: "c-qa", title: "Monthly QMS review - September", scheduledAt: "2026-09-25T14:00:00.000Z", location: "Conference Room A", organizedBy: "p-deputy", status: "Scheduled", notes: null, agenda: "1. CAPA metrics\n2. Document control update\n3. Audit schedule" },
  { id: "mt-4", committeeId: "c-innovation", title: "Electronic batch record feasibility", scheduledAt: "2026-09-30T11:00:00.000Z", location: "Meeting Room C", organizedBy: "p-lead-qa", status: "Scheduled", notes: null, agenda: "Current paper process\nVendor options\nCost estimate" },
  { id: "mt-5", committeeId: "c-safety", title: "Emergency preparedness tabletop", scheduledAt: "2026-10-08T13:30:00.000Z", location: "Conference Room A", organizedBy: "p-lead-ops", status: "Scheduled", notes: null, agenda: "Evacuation scenario\nCommunication tree" },
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
