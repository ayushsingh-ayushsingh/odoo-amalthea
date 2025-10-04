import { pgTable, text, timestamp, uuid, pgEnum, uniqueIndex, numeric, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- ENUMS ---

// Defines the possible roles a user can hold within the company.
export const userRoleEnum = pgEnum('user_role', ['Admin', 'Manager', 'Employee']);

// Defines the overall state of an expense claim.
export const expenseStatusEnum = pgEnum('expense_status', ['Draft', 'Pending', 'Approved', 'Rejected']);

// Defines the status of an approval request (step in the flow).
export const approvalStatusEnum = pgEnum('approval_status', ['Pending', 'Approved', 'Rejected']);

// Defines what an approval step is based on (e.g., direct manager, a specific role, or a conditional rule).
export const approverTypeEnum = pgEnum('approver_type', ['Manager', 'Role', 'User', 'ConditionalRule']);

// Defines the type of condition in a conditional approval rule.
export const conditionTypeEnum = pgEnum('condition_type', ['Percentage', 'SpecificUser', 'AmountThreshold']);

// Defines the logical operator for combining multiple conditions in a hybrid rule.
export const logicOperatorEnum = pgEnum('logic_operator', ['AND', 'OR', 'NONE']);

// 1. Company Table: Stores company-specific configuration. (Existing)
export const companies = pgTable('companies', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    name: text('name').notNull(),
    baseCurrencyCode: text('base_currency_code').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. User Table: Stores all user accounts (Admin, Manager, Employee). (Existing)
export const users = pgTable('users', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull(),
    managerId: uuid('manager_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
    return {
        emailIndex: uniqueIndex('user_email_idx').on(table.email),
    }
});

export const categories = pgTable('categories', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const expenses = pgTable('expenses', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }), // User who submitted the expense
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(), // Amount in expense currency
    currencyCode: text('currency_code').notNull(), // Currency of the expense
    description: text('description').notNull(),
    expenseDate: timestamp('expense_date').notNull(),

    status: expenseStatusEnum('status').default('Draft').notNull(),

    currentFlowStepId: uuid('current_flow_step_id').references(() => flowSteps.id, { onDelete: 'set null' }),

    finalApprovedAmount: numeric('final_approved_amount', { precision: 15, scale: 2 }),

    baseCurrencyAmount: numeric('base_currency_amount', { precision: 15, scale: 2 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const receipts = pgTable('receipts', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    expenseId: uuid('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }), // 1:1 relationship
    imageUrl: text('image_url').notNull(), // Link to the stored receipt image
    merchantName: text('merchant_name'), // Extracted via OCR
    receiptDate: timestamp('receipt_date'), // Extracted via OCR
    ocrProcessedData: jsonb('ocr_processed_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const approvalFlows = pgTable('approval_flows', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isDefault: boolean('is_default').default(false).notNull(), // Default flow for users without a specific flow
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const flowSteps = pgTable('flow_steps', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    flowId: uuid('flow_id').notNull().references(() => approvalFlows.id, { onDelete: 'cascade' }),
    stepOrder: numeric('step_order', { precision: 3, scale: 0 }).notNull(), // Sequence: 1, 2, 3...

    approverType: approverTypeEnum('approver_type').notNull(),
    isManagerApprover: boolean('is_manager_approver').default(false).notNull(), // Directly addresses the "NOTE: The expense is first approved by his manager" requirement

    approverRoleId: userRoleEnum('approver_role_id'), // Used if approverType is 'Role' (e.g., Finance)
    approverUserId: uuid('approver_user_id').references(() => users.id, { onDelete: 'set null' }), // Used if approverType is 'User' (e.g., Specific CFO)
    conditionalRuleId: uuid('conditional_rule_id').references(() => approvalRules.id, { onDelete: 'set null' }), // Used if approverType is 'ConditionalRule'

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const expenseApprovals = pgTable('expense_approvals', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    expenseId: uuid('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
    stepId: uuid('step_id').notNull().references(() => flowSteps.id, { onDelete: 'cascade' }), // Which step in the flow this decision relates to
    approverId: uuid('approver_id').notNull().references(() => users.id, { onDelete: 'restrict' }), // Who made the decision

    status: approvalStatusEnum('status').default('Pending').notNull(),
    comments: text('comments'),
    approvedAt: timestamp('approved_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
    return {
        uniqueApprovalPerStep: uniqueIndex('unique_approval_per_step').on(table.expenseId, table.stepId, table.approverId),
    }
});

export const approvalRules = pgTable('approval_rules', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),

    successOutcome: expenseStatusEnum('success_outcome').default('Approved').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ruleConditions = pgTable('rule_conditions', {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    ruleId: uuid('rule_id').notNull().references(() => approvalRules.id, { onDelete: 'cascade' }),

    conditionType: conditionTypeEnum('condition_type').notNull(),

    conditionValue: text('condition_value').notNull(),

    logicOperator: logicOperatorEnum('logic_operator').default('NONE').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- RELATIONS (for easy querying) ---

export const companiesRelations = relations(companies, ({ many }) => ({
    users: many(users),
    categories: many(categories),
    approvalFlows: many(approvalFlows),
    approvalRules: many(approvalRules),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    company: one(companies, {
        fields: [users.companyId],
        references: [companies.id],
    }),
    manager: one(users, {
        fields: [users.managerId],
        references: [users.id],
        relationName: 'manager',
    }),
    employees: many(users, {
        relationName: 'manager',
    }),
    submittedExpenses: many(expenses),
    expenseApprovals: many(expenseApprovals),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    company: one(companies, { fields: [categories.companyId], references: [companies.id] }),
    expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
    submitter: one(users, { fields: [expenses.userId], references: [users.id] }),
    category: one(categories, { fields: [expenses.categoryId], references: [categories.id] }),
    currentFlowStep: one(flowSteps, { fields: [expenses.currentFlowStepId], references: [flowSteps.id] }),
    receipt: one(receipts), // 1:1 relation to Receipts
    approvals: many(expenseApprovals),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
    expense: one(expenses, { fields: [receipts.expenseId], references: [expenses.id] }),
}));

export const approvalFlowsRelations = relations(approvalFlows, ({ one, many }) => ({
    company: one(companies, { fields: [approvalFlows.companyId], references: [companies.id] }),
    steps: many(flowSteps),
}));

export const flowStepsRelations = relations(flowSteps, ({ one, many }) => ({
    flow: one(approvalFlows, { fields: [flowSteps.flowId], references: [approvalFlows.id] }),
    conditionalRule: one(approvalRules, { fields: [flowSteps.conditionalRuleId], references: [approvalRules.id] }),
    approvals: many(expenseApprovals),
}));

export const expenseApprovalsRelations = relations(expenseApprovals, ({ one }) => ({
    expense: one(expenses, { fields: [expenseApprovals.expenseId], references: [expenses.id] }),
    step: one(flowSteps, { fields: [expenseApprovals.stepId], references: [flowSteps.id] }),
    approver: one(users, { fields: [expenseApprovals.approverId], references: [users.id] }),
}));

export const approvalRulesRelations = relations(approvalRules, ({ one, many }) => ({
    company: one(companies, { fields: [approvalRules.companyId], references: [companies.id] }),
    conditions: many(ruleConditions),
    flowSteps: many(flowSteps), // Rules can be referenced by multiple flow steps
}));

export const ruleConditionsRelations = relations(ruleConditions, ({ one }) => ({
    rule: one(approvalRules, { fields: [ruleConditions.ruleId], references: [approvalRules.id] }),
}));
