# Committees/Clubs System - Verification Guide

This document provides a step-by-step guide to verify that all committee features work correctly.

## Test Scenario Summary

The system includes seed data to test multiple scenarios:

### Users & Hierarchy
- **p-director** (Alicia Reed) - Top authority, can manage everything
- **p-lead-qa** (Mason Lee) - Quality Lead, has canManageCommittees = true
- **p-lead-ops** (Priya Shah) - Operations Lead, no committee management permission
- **p-staff-1** (Chris Allen) - Reports to p-owner-1

### Committees
1. **QA Committee** (c-qa)
   - Head: p-director
   - Members: p-lead-qa, p-lead-ops, p-owner-1

2. **Safety Committee** (c-safety)
   - Head: p-lead-ops
   - Members: p-owner-3, p-owner-4, p-staff-3

3. **Innovation Committee** (c-innovation)
   - Head: p-lead-qa
   - Members: p-owner-1, p-owner-2
   - **Special case**: p-staff-1 is ALSO a head (tests: staff member + head role + subordinate status all at once)

### Committee Tasks
- ct-1: "Review Q2 audit results" assigned to p-owner-1 in QA Committee
- ct-2: "Update safety procedures" assigned to p-owner-3 in Safety Committee

---

## VERIFICATION TEST 1: Independent Permission Contexts

**Goal:** Verify that p-staff-1 can simultaneously:
- Report to p-owner-1 in the main hierarchy
- Be a head of the Innovation Committee
- Be a member (not head) of the QA Committee

**Test Steps:**

1. Navigate to `/committees`
2. Click on "Innovation Committee"
3. Verify members list shows:
   - p-lead-qa: Committee Head
   - p-owner-1: Member
   - p-owner-2: Member
   - p-staff-1: **Committee Head** ✓
4. Click on "QA Committee"
5. Verify members list shows:
   - p-director: Committee Head
   - p-lead-qa: Member
   - p-lead-ops: Member
   - p-owner-1: Member
   - (p-staff-1 is NOT in this committee - confirm they're only a head elsewhere)
6. Navigate to `/admin/team`
7. Verify p-staff-1 shows "Reports to: p-owner-1" ✓

**Expected Result:** All three permission contexts work independently. p-staff-1 can:
- Be assigned work by p-owner-1 (superior-to-subordinate notifications)
- Assign tasks to members of Innovation Committee (as a head, not based on reporting hierarchy)
- Cannot manage other committees (no canManageCommittees permission)

---

## VERIFICATION TEST 2: Email Notifications (Task Assignment + Superior-to-Subordinate)

**Goal:** Verify that:
a) Committee task assignment sends email to assignee
b) Superior-to-subordinate assignment sends email
c) Both also create in-app notifications
d) Email failures don't block actions

**Setup:**
1. Set up a real email (e.g., Gmail, Resend test email)
2. Set `RESEND_API_KEY` in `.env.local`
3. Update seed data to use real email addresses (format: `{id}@example.com`)

**Test Steps:**

### Test 2a: Committee Task Assignment Email

1. Login as p-director (top authority, can assign tasks)
2. Navigate to `/committees/c-innovation`
3. Click "+ Assign Task"
4. Fill in:
   - Title: "Test Task Notification"
   - Description: "Testing email notifications"
   - Assign to: p-staff-1
   - Due Date: 2026-09-15
5. Click "Assign Task"
6. Check email inbox for p-staff-1@example.com
7. Verify email contains:
   - ✓ Subject: "Task Assigned: Test Task Notification"
   - ✓ Sender name: "Alicia Reed" (p-director)
   - ✓ Task details and due date
   - ✓ Clickable link to `/committees/c-innovation/tasks/{taskId}`
8. Login as p-staff-1
9. Navigate to `/settings`
10. Verify in-app notification appears showing the task assignment ✓

### Test 2b: Superior-to-Subordinate Assignment Email

1. Login as p-owner-1 (has p-staff-1 as subordinate)
2. Navigate to `/api/records/assign` (via API call or UI)
3. Call endpoint with:
   - recordType: "CAPA"
   - assignedTo: p-staff-1
   - title: "Test CAPA Assignment"
4. Check email for p-staff-1@example.com
5. Verify email contains:
   - ✓ Subject: "Assignment: Test CAPA Assignment"
   - ✓ Notification type indicates superior assignment
   - ✓ Sender: "Noah Foster" (p-owner-1)
6. Verify in-app notification created ✓

### Test 2c: Email Failure Doesn't Block Action

1. Temporarily set `RESEND_API_KEY` to invalid key
2. Assign a committee task
3. Verify:
   - ✓ Task is still created successfully (API returns 201)
   - ✓ In-app notification is still created
   - ✓ Response shows `emailSent: false` but `success: true`
   - ✓ Error is logged to console/server logs

---

## VERIFICATION TEST 3: Permission Enforcement (Server-Side)

**Goal:** Verify that permissions are enforced at the API level, not just the UI

**Test Steps:**

### Test 3a: Non-Manager Cannot Create Committee

1. Login as p-staff-1 (no canManageCommittees permission)
2. In browser console, execute:
   ```javascript
   fetch('/api/committees', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ name: "Unauthorized Committee", description: "" })
   })
   .then(r => r.json())
   .then(console.log)
   ```
3. Verify response: `{ error: "You do not have permission to create committees", status: 403 }` ✓

### Test 3b: Committee Head Can Assign Tasks (Only in Own Committee)

1. Login as p-lead-qa (head of Innovation Committee)
2. Call: `POST /api/committees/c-innovation/tasks`
3. Verify: ✓ Request succeeds (200/201)
4. Call: `POST /api/committees/c-safety/tasks` (not a head here)
5. Verify: ✓ Request fails with 403 ✓

### Test 3c: Top Authority Override

1. Login as p-director
2. Call: `POST /api/committees/c-safety/tasks` (any committee)
3. Verify: ✓ Request succeeds (top authority can assign in any committee)

---

## VERIFICATION TEST 4: Succession / Employee Replacement

**Goal:** Verify that replacing an employee transfers:
- Direct reports
- Assigned records
- Committee memberships (including head roles)
- History is preserved
- User marked as inactive

**Test Setup:**
Create a test employee:
- Name: "Test Employee"
- Role: "Test Role"
- Reports to: p-lead-qa
- Assign them to: a CAPA, an Audit, a Training record
- Make them: head of Innovation Committee, member of Safety Committee
- Give them direct reports: create 2 new users reporting to them

**Test Steps:**

1. Login as p-director (only they can initiate succession)
2. Navigate to `/admin/team`
3. Click "Replace Employee"
4. Select:
   - Departing Employee: Test Employee
   - Replacement Employee: p-staff-1
5. Form shows summary:
   - ✓ Direct reports to transfer: [count]
   - ✓ Committee memberships: [count]
   - ✓ Committee head roles: [count]
6. Click "Proceed with Replacement"
7. Call API: `GET /api/admin/succession/summary?departingUserId=TEST&replacementUserId=p-staff-1`
8. Verify response includes succession summary with counts ✓
9. Call API: `POST /api/admin/succession/execute` with `{ departingUserId: "TEST", replacementUserId: "p-staff-1", confirmed: true }`
10. Verify response: `{ success: true, changes: { directReportsTransferred: [...], ... } }` ✓

**Verification Steps:**

1. Navigate to `/admin/team`
2. Verify:
   - ✓ Test Employee still exists (not deleted)
   - ✓ Direct reports now show "Reports to: p-staff-1"
   - ✓ Records previously assigned to Test Employee now show p-staff-1 as assignee
3. Login as p-staff-1, check `/settings`
   - ✓ Innovation Committee shows p-staff-1 as head (transferred from Test Employee)
   - ✓ Safety Committee shows p-staff-1 as member (transferred)
4. Check database/logs:
   - ✓ Test Employee profile has `active: false` (marked inactive)
   - ✓ No RecordHistory entries were deleted or rewritten
   - ✓ History still attributes past actions to Test Employee by name

---

## VERIFICATION TEST 5: Committee Management Permissions

**Goal:** Verify that only top authority can grant/revoke committee management permissions

**Test Steps:**

1. Login as p-staff-1 (no permission)
2. In console, try to call:
   ```javascript
   fetch('/api/admin/permissions', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ targetUserId: "p-lead-ops", grant: true })
   })
   ```
3. Verify: ✗ 403 error ✓

4. Login as p-lead-ops (is manager but not top authority)
5. Try same API call
6. Verify: ✗ 403 error ✓

7. Login as p-director (top authority)
8. Call same API with targetUserId: "p-lead-ops"
9. Verify: ✓ Success

10. Try to grant to self:
    ```javascript
    fetch('/api/admin/permissions', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: "p-director", grant: true })
    })
    ```
11. Verify: ✗ Error: "Cannot grant permissions to yourself" ✓

---

## VERIFICATION TEST 6: Committee Visibility & Task Filtering

**Goal:** Verify that users can see committees and only their accessible tasks

**Test Steps:**

1. Login as any user
2. Navigate to `/committees`
3. Verify: ✓ Can see all committees (everyone can view)
4. Verify: ✓ Create button only shows for canManageCommittees users
5. Click a committee
6. Verify:
   - ✓ Regular users can see members and tasks
   - ✓ Add Member button only shows for canManageCommittees users
   - ✓ Assign Task button only shows for heads or canManageCommittees users
7. Check `/settings` page
8. Verify:
   - ✓ Shows "Committee Memberships" section if user is in any committee
   - ✓ Shows role (Head/Member) for each
   - ✓ Links to committee pages work

---

## Quick Test Checklist

Run this checklist to verify core functionality:

- [ ] Test 1: Independent permission contexts verified
- [ ] Test 2a: Committee task email sends with correct content
- [ ] Test 2b: Superior-to-subordinate email sends
- [ ] Test 2c: Email failure doesn't block action
- [ ] Test 3a: Non-manager can't create committee via API
- [ ] Test 3b: Committee head can only assign in own committee
- [ ] Test 3c: Top authority can override permissions
- [ ] Test 4: Succession transfers all data and marks user inactive
- [ ] Test 5: Only top authority can grant permissions
- [ ] Test 6: Permissions properly hide/show UI controls

---

## Known Limitations (Implementation Notes)

Currently using seed data (`qms-data.ts`). In production:

1. **Database Integration**: All operations should save to Prisma database
2. **Transactions**: Succession must use database transaction to ensure atomicity
3. **Email Addresses**: Currently using `{id}@qms.local` format; would need real email configuration
4. **History Tracking**: Need to implement RecordHistory table to preserve past actions
5. **Notifications**: Should be persisted to database, not just in-memory
6. **Session User**: Tests use hardcoded userId; should use actual session data

---

## Debugging Tips

- Check browser console for permission errors
- API responses include error messages describing what went wrong
- Email logs are in server console output (Resend API responses)
- Permission denied = 403, Invalid data = 400, Server error = 500
- Succession dry-run via GET endpoint before confirming via POST
