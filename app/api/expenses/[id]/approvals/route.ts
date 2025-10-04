import { NextResponse } from 'next/server'
import { db } from '@/src'
import { expenses, flowSteps, expenseApprovals, users, ruleConditions } from '@/src/db/schema'
import { eq, and, gt } from 'drizzle-orm'

type Body = {
  approverId: string
  action: 'Approved' | 'Rejected'
  comments?: string
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const expenseId = await params.id
    const body: Body = await request.json()

    if (!body || !body.approverId || !body.action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Load expense and current step
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1)
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

    if (!expense.currentFlowStepId) {
      return NextResponse.json({ error: 'Expense has no assigned approval step' }, { status: 400 })
    }

    // Load the current step; then identify all steps in the same stepOrder (parallel group)
    const [step] = await db.select().from(flowSteps).where(eq(flowSteps.id, expense.currentFlowStepId)).limit(1)
    if (!step) return NextResponse.json({ error: 'Current flow step not found' }, { status: 404 })

    // Load all steps in the current group (same flowId and stepOrder)
    const groupSteps = await db.select().from(flowSteps).where(and(eq(flowSteps.flowId, step.flowId), eq(flowSteps.stepOrder, step.stepOrder)))

    // Load approver user
    const [approver] = await db.select().from(users).where(eq(users.id, body.approverId)).limit(1)
    if (!approver) return NextResponse.json({ error: 'Approver user not found' }, { status: 404 })

    // Determine which step in the group this approver is authorized for
    const [submitter] = await db.select().from(users).where(eq(users.id, expense.userId)).limit(1)

    let matchingStep = groupSteps.find(s => {
      // Manager approver mapping
      if (s.isManagerApprover) {
        if (submitter && submitter.managerId && String(submitter.managerId) === String(approver.id)) return true
      }
      // Specific user
      if (s.approverUserId && String(s.approverUserId) === String(approver.id)) return true
      // Role-based
      if (s.approverRoleId && String(s.approverRoleId) === String(approver.role)) return true
      return false
    })

    if (!matchingStep) {
      return NextResponse.json({ error: 'Not authorized to approve this step' }, { status: 403 })
    }

    // Insert approval record associated to the exact matching step
    await db.insert(expenseApprovals).values({
      expenseId,
      stepId: matchingStep.id,
      approverId: approver.id,
      status: body.action,
      comments: body.comments ?? null,
      approvedAt: body.action === 'Approved' ? new Date() : null,
    }).onConflictDoNothing()

    // If rejected -> finalize expense as Rejected
    if (body.action === 'Rejected') {
      await db.update(expenses).set({ status: 'Rejected' }).where(eq(expenses.id, expenseId))
      return NextResponse.json({ message: 'Expense rejected' })
    }

    // Approved path: evaluate conditions attached to the group (if any)
    // We consider the conditionalRuleId on the matching step (if present)
    const conditionalRuleId = matchingStep.conditionalRuleId || null
    if (conditionalRuleId) {
      const conditions = await db.select().from(ruleConditions).where(eq(ruleConditions.ruleId, conditionalRuleId))

      // SpecificUser rule: auto-approve if that user approved
      const specific = conditions.find(c => String(c.conditionType) === 'SpecificUser')
      if (specific && String(specific.conditionValue) === String(approver.id)) {
        await db.update(expenses).set({ status: 'Approved' }).where(eq(expenses.id, expenseId))
        return NextResponse.json({ message: 'Expense auto-approved due to specific approver rule' })
      }

      // Percentage rule: compute approvals across the entire group (parallel approvers)
      const percentageCond = conditions.find(c => String(c.conditionType) === 'Percentage')
      if (percentageCond) {
        const groupStepIds = groupSteps.map(s => String(s.id))
        const total = groupSteps.length || 1
        const approvedRows = await db.select().from(expenseApprovals).where(and(eq(expenseApprovals.expenseId, expenseId), eq(expenseApprovals.status, 'Approved')))
        const approvedByGroup = approvedRows.filter(r => groupStepIds.includes(String(r.stepId))).length
        const requiredPct = Number(percentageCond.conditionValue) || 100
        const pct = Math.round((approvedByGroup / total) * 100)
        if (pct >= requiredPct) {
          await db.update(expenses).set({ status: 'Approved' }).where(eq(expenses.id, expenseId))
          return NextResponse.json({ message: `Expense approved by reaching ${pct}% (>= ${requiredPct}%)` })
        }
      }
    }

    // If no conditional rule or conditions not satisfied, check if the entire group is approved (for sequence advancement)
    const groupStepIds = groupSteps.map(s => String(s.id))
    const approvalsForGroup = await db.select().from(expenseApprovals).where(and(eq(expenseApprovals.expenseId, expenseId), eq(expenseApprovals.status, 'Approved')))
    const approvedCountForGroup = approvalsForGroup.filter(r => groupStepIds.includes(String(r.stepId))).length

    // If every step in group has an approval (i.e., approvedCountForGroup >= groupSteps.length), advance
    if (approvedCountForGroup >= groupSteps.length) {
      // Advance to next stepOrder (smallest greater stepOrder)
      const nextSteps = await db.select().from(flowSteps).where(and(eq(flowSteps.flowId, step.flowId), gt(flowSteps.stepOrder, step.stepOrder))).orderBy(flowSteps.stepOrder)
      if (nextSteps.length > 0) {
        // Set currentFlowStepId to first step of next group
        const nextGroupOrder = nextSteps[0].stepOrder
        const nextGroup = nextSteps.filter(s => String(s.stepOrder) === String(nextGroupOrder))
        if (nextGroup.length > 0) {
          await db.update(expenses).set({ currentFlowStepId: nextGroup[0].id }).where(eq(expenses.id, expenseId))
          return NextResponse.json({ message: 'Moved to next approval step', nextStepId: nextGroup[0].id })
        }
      }

      // No next steps -> finalize Approved
      await db.update(expenses).set({ status: 'Approved', currentFlowStepId: null }).where(eq(expenses.id, expenseId))
      return NextResponse.json({ message: 'Expense approved (end of flow)' })
    }

    // Otherwise, remain in same group waiting for other approvers
    return NextResponse.json({ message: 'Approval recorded; waiting for other approvers in group' })
  } catch (err) {
    console.error('Error processing approval', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
