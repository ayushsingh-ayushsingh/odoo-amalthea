(async () => {})()

export async function POST(request: Request) {
	try {
		const payload = await request.json()
		// expected: userId, amount, currencyCode, description, expenseDate
		if (!payload || !payload.userId || !payload.amount) {
			return new Response('Missing fields', { status: 400 })
		}

		const { userId, amount, currencyCode = 'USD', description = '', expenseDate = new Date().toISOString(), categoryId = null } = payload

		// create expense record
		const { db } = await import('@/src')
		const { expenses, approvalFlows, flowSteps, companies } = await import('@/src/db/schema')

		// find company from user
		const [userRow] = await db.select().from((await import('@/src/db/schema')).users).where((await import('drizzle-orm')).eq((await import('@/src/db/schema')).users.id, userId)).limit(1)

		// fallback company
		let companyId = userRow?.companyId
		if (!companyId) {
			const [c] = await db.select().from(companies).limit(1)
			companyId = c?.id
		}

		// Insert expense
		const [newExp] = await db.insert(expenses).values({
			companyId,
			userId,
			amount,
			currencyCode,
			description,
			expenseDate: new Date(expenseDate),
			status: 'Pending',
		}).returning({ id: expenses.id })

		// find first approval flow for company
		const flows = await db.select().from(approvalFlows).where((await import('drizzle-orm')).eq(approvalFlows.companyId, companyId)).orderBy(approvalFlows.createdAt)
		if (flows.length > 0) {
			const flow = flows[0]
			const steps = await db.select().from(flowSteps).where((await import('drizzle-orm')).eq(flowSteps.flowId, flow.id)).orderBy(flowSteps.stepOrder)
			if (steps.length > 0) {
				// set first step as current
				await db.update(expenses).set({ currentFlowStepId: steps[0].id }).where((await import('drizzle-orm')).eq(expenses.id, newExp.id))
			}
		}

		return new Response(JSON.stringify({ id: newExp.id }), { status: 201 })
	} catch (err) {
		console.error('Error creating expense', err)
		return new Response('Internal Server Error', { status: 500 })
	}
}

