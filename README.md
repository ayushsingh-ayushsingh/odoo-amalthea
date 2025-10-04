# Project: Expense Management (Odoo Amalthea)

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

Next Steps
------------------------
1. Inline receipts in the manager approvals table + a modal to view them (uses `/api/expenses/[id]`).
2. Move currency conversion into the server `POST /api/expenses` so `baseCurrencyAmount` is computed server-side and persisted.
3. Add recursive team lookup for manager views.
4. Implement OCR pipeline for receipts and store parsed fields in `receipts.ocrProcessedData`.
5. Add unit/integration tests for approval logic (manager-first, percentage rules, specific approver, escalation).

If you'd like, I can implement one of the recommended next steps for you. Pick one and I'll start working on it and update the todo list accordingly.

Tech stack & Docker
--------------------
This project is built with a modern full-stack stack. Key technologies used:

- Next.js (App Router) — React-based framework used for frontend pages and server routes under `app/api/*`.
- shadcn/ui — component library and design primitives (Radix + Tailwind CSS) used for UI building blocks (tables, dialogs, buttons, etc.).
- Drizzle ORM — typed ORM for PostgreSQL; schema is defined in `src/db/schema.ts` and used by API routes.
- PostgreSQL — production-grade relational database used for companies, users, expenses, receipts, approval flows, and approvals.
- Docker & Docker Compose — the repository includes `docker-compose.yml` for running Postgres and the app together during development or CI.

Quick Docker usage
------------------
1. Create a `.env` file at the project root and set at minimum a `DATABASE_URL` pointing at Postgres. Example:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/amalthea
```

2. Start services with Docker Compose (this will build the app and start Postgres):

```bash
docker compose up --build
```

3. When running in Docker Compose, the web app will try to read `DATABASE_URL` from the environment. You can connect to the database from the host using a local psql client if you expose ports in `docker-compose.yml`.

Notes on environment and deployment
----------------------------------
- Ensure `DATABASE_URL` and any other secrets are set in the environment for production deployments (e.g., Vercel environment variables or your deployment platform).
- The codebase expects Tailwind CSS and shadcn primitives; the Next.js build will include those as part of `pnpm build` or Docker image build.

If you'd like, I can add a minimal `docker-compose.override.yml` or a short `Makefile` to simplify common commands (build, up, down, db shell)."

Crafted with ❤️ By Ayush Singh.
