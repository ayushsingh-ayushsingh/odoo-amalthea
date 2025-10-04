Project: Expense Management (Odoo Amalthea)

Overview
--------
This repository contains a Next.js (App Router) application that implements an expense management system. It focuses on role-aware workflows (Admin, Manager, Employee), multi-step approval flows, conditional approval rules (percentage, specific approver, hybrid), and receipt handling. The backend uses Drizzle ORM against a PostgreSQL schema.

Core features implemented
------------------------
- Authentication placeholder: dev-friendly auth by setting `localStorage.userId` or using the provided `/api/me` route to identify the current user.
- User & company bootstrapping on signup (Admin + Company config including base currency).
- Role management: Admin, Manager, Employee; manager relationships per user.
- Expense submission: employees can submit expenses in any currency; receipts can be uploaded and persisted to `public/uploads`.
- Approval flows: multi-step flows are supported. The system enforces manager-first steps when `isManagerApprover` is set and supports role-based and user-specific approvers.
- Conditional rules: Percentage and Specific approver rules (and hybrids) are baked into the approval logic.
- Manager UI: Approvals page shows expenses a manager may act on. Approve, Reject, and Escalate actions are supported.

Quick start (development)
-------------------------
1. Install dependencies

```bash
pnpm install
```

2. Start the dev server

```bash
pnpm dev
```

3. Open the app

Open http://localhost:3000 in your browser.

Notes
-----
- This project uses the Next.js App Router and server actions for API routes under `app/api/*`.
- Receipt images are written to `public/uploads` by the receipts upload route.
- For local development there is a lightweight dev-friendly way to identify the user: set `localStorage.userId` in the browser console to the desired user id to emulate a logged-in session. The `/api/me` endpoint will also return the user if authenticated.

Key folders and files
---------------------
- `app/`
	- `dashboard/` — main app pages: manager approvals, expense submission, my expenses, user management, approval rules.
	- `api/` — server routes (expenses, approvals, receipts, users, me, etc.).
- `components/` — shared UI components (tables, dialogs, navbar, etc.).
- `src/db/schema.ts` — Drizzle ORM schema that defines tables: `companies`, `users`, `expenses`, `receipts`, `approval_flows`, `flow_steps`, `approval_rules`, `rule_conditions`, `expense_approvals`.

Important API endpoints (server-side)
-----------------------------------
- `GET /api/me` — returns current user and `companyBaseCurrency`.
- `GET /api/users` — list users (used to display submitter names and build maps).
- `POST /api/expenses` — create a new expense. Expects JSON with `{ userId, amount, currencyCode, description, expenseDate, categoryId? }`.
- `GET /api/expenses` — list expenses. Supports `?userId=` and `?managerId=` for filtering.
- `GET /api/expenses/[id]` — (added) returns an expense with `approvals` and `receipts` in one response.
- `POST /api/expenses/[id]/approvals` — submit an approval decision (body: `{ approverId, action, comments? }`). Approvals are authorized server-side (manager, role, specific user) and will evaluate conditional rules.
- `POST /api/expenses/[id]/escalate` — move the expense to the next approval group or finalize it if at the end of the flow.
- `POST /api/receipts` & `GET /api/receipts?expenseId=` — upload and list receipts. Uploads are saved to `public/uploads` and persisted in the `receipts` table.

Database notes (schema highlights)
--------------------------------
- `companies` stores company config including `baseCurrencyCode`.
- `users` has `role` (Admin|Manager|Employee) and `managerId` to express hierarchy.
- `expenses` stores original `amount` and `currencyCode`, plus `baseCurrencyAmount` and `finalApprovedAmount` fields to store conversions and final settled amounts.
- `flow_steps` defines each step in an approval flow and can point to `approverRoleId`, `approverUserId`, or `conditionalRuleId`. `isManagerApprover` indicates a manager-first step.
- `expense_approvals` stores decisions per expense per step and who approved.

Design decisions and current limitations
--------------------------------------
- Authorization: The server-side `/api/approvals` and approval POST handler implement authorization checks. Managers are validated against the submitter.managerId for manager-steps.
- Currency conversion: Currently conversion is often done client-side in some flows; there is a `baseCurrencyAmount` column and a TODO to perform conversions server-side for auditability.
- Team lookup: the `?managerId=` filter returns direct reports. Recursive/indirect-report traversal is not implemented yet — TODO.
- OCR: receipt OCR is not implemented in this repository. The `receipts` table has an `ocrProcessedData` JSON column where parsed data could be stored.

How the Approvals page works
----------------------------
- The manager approvals page fetches `/api/me` for the current user, loads company expenses from `/api/expenses`, then queries `/api/approvals?approverId=` to determine which expenses the approver may act on. The UI shows action buttons (Approve / Reject / Escalate) only for expenses the approver is authorized to handle. Once an action is taken the row becomes readonly locally.

Development tips
----------------
- If you don't have a full auth setup locally: set `localStorage.userId` in the browser console to emulate login.
- To inspect receipts, check `public/uploads` after a successful upload.
- Use the `src/db/schema.ts` to understand the Drizzle ORM types and relations when writing queries.

Testing & linting
-----------------
- Run linter / type checks via your workspace scripts (if configured):

```bash
pnpm lint
pnpm build
```

If you add tests, prefer Vitest or Jest and place tests under `tests/`.

Next steps (recommended)
------------------------
1. Inline receipts in the manager approvals table + a modal to view them (uses `/api/expenses/[id]`).
2. Move currency conversion into the server `POST /api/expenses` so `baseCurrencyAmount` is computed server-side and persisted.
3. Add recursive team lookup for manager views.
4. Implement OCR pipeline for receipts and store parsed fields in `receipts.ocrProcessedData`.
5. Add unit/integration tests for approval logic (manager-first, percentage rules, specific approver, escalation).

If you'd like, I can implement one of the recommended next steps for you. Pick one and I'll start working on it and update the todo list accordingly.
