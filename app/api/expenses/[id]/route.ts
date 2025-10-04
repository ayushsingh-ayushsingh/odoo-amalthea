import { NextResponse } from 'next/server'
import { db } from '@/src'
import { expenses, expenseApprovals, receipts, users, flowSteps } from '@/src/db/schema'
import { eq, inArray } from 'drizzle-orm'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const expenseId = params.id

    const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1)
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

    // Fetch approvals and receipts
    const approvals = await db.select().from(expenseApprovals).where(eq(expenseApprovals.expenseId, expenseId)).orderBy(expenseApprovals.createdAt)
    const receiptsRows = await db.select().from(receipts).where(eq(receipts.expenseId, expenseId)).orderBy(receipts.createdAt)

    // Fetch approver user details and step details referenced by the approvals
    const approverIds = Array.from(new Set(approvals.map(a => String(a.approverId))))
    const stepIds = Array.from(new Set(approvals.map(a => String(a.stepId))))

    const approvers = approverIds.length > 0 ? await db.select().from(users).where(inArray(users.id, approverIds)) : []
    const steps = stepIds.length > 0 ? await db.select().from(flowSteps).where(inArray(flowSteps.id, stepIds)) : []

    const approvalsWithMeta = approvals.map(a => ({
      ...a,
      approver: approvers.find(u => String(u.id) === String(a.approverId)) || null,
      step: steps.find(s => String(s.id) === String(a.stepId)) || null,
    }))

    return NextResponse.json({ expense, approvals: approvalsWithMeta, receipts: receiptsRows })
  } catch (err) {
    console.error('Error fetching expense details', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
