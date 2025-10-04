import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/src'
import { approvalRules, ruleConditions, companies, flowSteps } from '@/src/db/schema'
import { eq } from 'drizzle-orm'

async function getOrCreateDefaultCompany() {
    // reuse pattern: pick first company or create a default one
    const existing = await db.select().from(companies).limit(1)
    if (existing.length > 0) return existing[0].id
    const [row] = await db.insert(companies).values({ name: 'Default Company', baseCurrencyCode: 'USD' }).returning({ id: companies.id })
    return row.id
}

export async function GET(request: NextRequest) {
    try {
        // Return all approval rules for company (simple implementation)
        const rules = await db.select().from(approvalRules).orderBy(approvalRules.createdAt)
        return NextResponse.json(rules)
    } catch (err) {
        console.error('Error reading approval rules', err)
        return NextResponse.json([], { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const payload = await request.json()

        const companyId = await getOrCreateDefaultCompany()

        // Basic validation
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Insert rule
        const [inserted] = await db.insert(approvalRules).values({
            companyId,
            name: payload.name ?? `Rule for ${payload.userId}`,
            description: payload.description ?? null,
        }).returning({ id: approvalRules.id })

        const ruleId = inserted.id

        // Insert optional conditions
        if (payload.conditions && Array.isArray(payload.conditions)) {
            for (const cond of payload.conditions) {
                await db.insert(ruleConditions).values({
                    ruleId,
                    conditionType: cond.conditionType || 'Percentage',
                    conditionValue: String(cond.conditionValue ?? ''),
                    logicOperator: cond.logicOperator || 'NONE',
                })
            }
        }

        // Insert flow steps if provided. Link them to this rule via conditionalRuleId so they can be loaded for editing
        if (payload.flowSteps && Array.isArray(payload.flowSteps)) {
            for (const step of payload.flowSteps) {
                await db.insert(flowSteps).values({
                    flowId: step.flowId ?? null,
                    stepOrder: step.stepOrder ?? 1,
                    approverType: step.approverType ?? 'User',
                    isManagerApprover: Boolean(step.isManagerApprover),
                    approverRoleId: step.approverRoleId ?? null,
                    approverUserId: step.approverUserId ?? null,
                    conditionalRuleId: ruleId,
                })
            }
        }

        return NextResponse.json({ message: 'Saved', id: ruleId })
    } catch (err) {
        console.error('Error saving approval rule', err)
        return new NextResponse('Failed', { status: 500 })
    }
}
