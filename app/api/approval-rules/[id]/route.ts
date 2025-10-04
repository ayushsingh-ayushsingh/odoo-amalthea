import { NextResponse } from 'next/server'
import { db } from '@/src'
import { approvalRules, ruleConditions, flowSteps } from '@/src/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const rows = await db.select().from(approvalRules).where(eq(approvalRules.id, id)).limit(1)
    if (!rows || rows.length === 0) return NextResponse.json({}, { status: 404 })
    const rule = rows[0]

    // Load associated conditions and flow steps (flow steps linked via conditionalRuleId)
    const conditions = await db.select().from(ruleConditions).where(eq(ruleConditions.ruleId, id))
    const steps = await db.select().from(flowSteps).where(eq(flowSteps.conditionalRuleId, id)).orderBy(flowSteps.stepOrder)

    return NextResponse.json({ ...rule, conditions, flowSteps: steps })
  } catch (e) {
    console.error(e)
    return NextResponse.json({}, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const payload = await request.json()

    await db.update(approvalRules).set({ name: payload.name, description: payload.description }).where(eq(approvalRules.id, id))

    // For simplicity, replace all conditions and flow steps
    await db.delete(ruleConditions).where(eq(ruleConditions.ruleId, id))
    await db.delete(flowSteps).where(eq(flowSteps.conditionalRuleId, id))
    if (payload.conditions && Array.isArray(payload.conditions)) {
      for (const cond of payload.conditions) {
        await db.insert(ruleConditions).values({
          ruleId: id,
          conditionType: cond.conditionType,
          conditionValue: String(cond.conditionValue),
          logicOperator: cond.logicOperator || 'NONE',
        })
      }
    }

    if (payload.flowSteps && Array.isArray(payload.flowSteps)) {
      for (const step of payload.flowSteps) {
        await db.insert(flowSteps).values({
          flowId: step.flowId ?? null,
          stepOrder: step.stepOrder ?? 1,
          approverType: step.approverType ?? 'User',
          isManagerApprover: Boolean(step.isManagerApprover),
          approverRoleId: step.approverRoleId ?? null,
          approverUserId: step.approverUserId ?? null,
          conditionalRuleId: id,
        })
      }
    }

    return NextResponse.json({ message: 'Updated' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    await db.delete(approvalRules).where(eq(approvalRules.id, id))
    return NextResponse.json({ message: 'Deleted' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
