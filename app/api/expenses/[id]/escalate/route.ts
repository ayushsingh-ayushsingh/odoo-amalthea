import { NextResponse } from 'next/server'
import { db } from '@/src'
import { expenses, flowSteps } from '@/src/db/schema'
import { eq, gt, and } from 'drizzle-orm'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const expenseId = params.id
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1)
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

    if (!expense.currentFlowStepId) {
      // No current step; nothing to escalate
      return NextResponse.json({ message: 'Expense has no active approval step' })
    }

    // Load current step
    const [current] = await db.select().from(flowSteps).where(eq(flowSteps.id, expense.currentFlowStepId)).limit(1)
    if (!current) return NextResponse.json({ error: 'Current flow step not found' }, { status: 404 })

    // Find next group (smallest greater stepOrder)
    const nextSteps = await db.select().from(flowSteps).where(and(eq(flowSteps.flowId, current.flowId), gt(flowSteps.stepOrder, current.stepOrder))).orderBy(flowSteps.stepOrder)
    if (nextSteps.length > 0) {
      const nextGroupOrder = nextSteps[0].stepOrder
      const nextGroup = nextSteps.filter(s => String(s.stepOrder) === String(nextGroupOrder))
      if (nextGroup.length > 0) {
        await db.update(expenses).set({ currentFlowStepId: nextGroup[0].id }).where(eq(expenses.id, expenseId))
        return NextResponse.json({ message: 'Escalated to next approval group', nextStepId: nextGroup[0].id })
      }
    }

    // No next steps -> finalize as Approved
    await db.update(expenses).set({ status: 'Approved', currentFlowStepId: null }).where(eq(expenses.id, expenseId))
    return NextResponse.json({ message: 'Expense approved (end of flow) via escalate' })
  } catch (err) {
    console.error('Error escalating expense', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
