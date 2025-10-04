import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/src'
import { expenses, flowSteps, users } from '@/src/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const approverId = url.searchParams.get('approverId')
    if (!approverId) return NextResponse.json({ error: 'approverId required' }, { status: 400 })

    // Find pending expenses with a currentFlowStepId
    const pendingExpenses = await db.select().from(expenses).where(eq(expenses.status, 'Pending'))
    const results: any[] = []

    for (const exp of pendingExpenses) {
      if (!exp.currentFlowStepId) continue
      const [step] = await db.select().from(flowSteps).where(eq(flowSteps.id, exp.currentFlowStepId)).limit(1)
      if (!step) continue

      // Load submitter
      const [submitter] = await db.select().from(users).where(eq(users.id, exp.userId)).limit(1)

      let authorized = false
      // Manager check
      if (step.isManagerApprover && submitter && submitter.managerId && String(submitter.managerId) === approverId) authorized = true
      // Specific user
      if (!authorized && step.approverUserId && String(step.approverUserId) === approverId) authorized = true
      // Role-based
      if (!authorized && step.approverRoleId) {
        const [approver] = await db.select().from(users).where(eq(users.id, approverId)).limit(1)
        if (approver && String(approver.role) === String(step.approverRoleId)) authorized = true
      }

      if (authorized) {
        results.push({ expense: exp, step, submitter })
      }
    }

    return NextResponse.json(results)
  } catch (err) {
    console.error('Error listing approvals', err)
    return NextResponse.json([], { status: 500 })
  }
}
