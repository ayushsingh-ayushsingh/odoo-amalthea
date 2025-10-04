"use client"

import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard/dashboard-layout'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Pending = {
    expense: any
    step: any
    submitter: any
}

export default function Page() {
    const [items, setItems] = useState<Pending[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [teamView, setTeamView] = useState(false)
    const [me, setMe] = useState<any | null>(null)
    const [usersMap, setUsersMap] = useState<Record<string, any>>({})

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                // Try to get approver id from localStorage; fall back to /api/me
                let approverId = localStorage.getItem('userId')
                let companyBaseCurrency = null
                if (!approverId) {
                    try {
                        const meRes = await fetch('/api/me')
                        if (meRes.ok) {
                            const meJson = await meRes.json()
                            approverId = meJson?.id
                            companyBaseCurrency = meJson?.companyBaseCurrency
                            setMe(meJson)
                        }
                    } catch (e) {
                        // ignore
                    }
                } else {
                    // also try to populate company currency for display
                    try {
                        const meRes = await fetch(`/api/me?userId=${approverId}`)
                        if (meRes.ok) {
                            const meJson = await meRes.json()
                            companyBaseCurrency = meJson?.companyBaseCurrency
                            setMe(meJson)
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                if (!approverId) {
                    setItems([])
                    return
                }
                // If teamView, fetch team members and their expenses; otherwise, fetch approvals for this approver
                let res
                if (teamView) {
                    // fetch users to build a map for submitter names
                    let localUsersMap: Record<string, any> = {}
                    try {
                        const usersRes = await fetch('/api/users')
                        if (usersRes.ok) {
                            const usersJson = await usersRes.json()
                            usersJson.forEach((u: any) => (localUsersMap[u.id] = u))
                            setUsersMap(localUsersMap)
                        }
                    } catch (e) {
                        // ignore
                    }
                    // use server-side managerId filter
                    const teamRes = await fetch(`/api/expenses?managerId=${approverId}`)
                    if (!teamRes.ok) {
                        setItems([])
                        setLoading(false)
                        return
                    }
                    const teamJson = await teamRes.json()
                    // map to Pending[] shape and attach submitter if available
                    const shaped = teamJson.map((e: any) => ({ expense: e, step: null, submitter: (localUsersMap[e.userId] || null) }))
                    setItems(shaped)
                    setLoading(false)
                    return
                }
                res = await fetch(`/api/approvals?approverId=${approverId}`)
                if (!res.ok) {
                    setItems([])
                    return
                }
                const json = await res.json()
                setItems(json || [])
            } catch (err) {
                console.error('Failed to load approvals', err)
                setItems([])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [teamView])

    async function performAction(expenseId: string, action: 'Approved' | 'Rejected') {
        const approverId = localStorage.getItem('userId')
        if (!approverId) return toast.error('No approver id')
        setProcessing(expenseId)
        try {
            const res = await fetch(`/api/expenses/${expenseId}/approvals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approverId, action })
            })
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(txt || 'Approval action failed')
            }
            const json = await res.json()
            toast.success(json?.message || `${action}`)
            // update local list: remove or mark item as acted upon
            setItems((prev) => prev.map(it => it.expense.id === expenseId ? ({ ...it, expense: { ...it.expense, status: action } }) : it))
        } catch (err: any) {
            console.error('Approval error', err)
            toast.error(err?.message || 'Failed to perform action')
        } finally {
            setProcessing(null)
        }
    }

    async function escalate(expenseId: string) {
        setProcessing(expenseId)
        try {
            const res = await fetch(`/api/expenses/${expenseId}/escalate`, { method: 'POST' })
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(txt || 'Escalate failed')
            }
            const json = await res.json()
            toast.success(json?.message || 'Escalated')
            // reflect change locally
            setItems((prev) => prev.map(it => it.expense.id === expenseId ? ({ ...it, expense: { ...it.expense, status: 'Pending' } }) : it))
        } catch (err: any) {
            console.error('Escalate error', err)
            toast.error(err?.message || 'Failed to escalate')
        } finally {
            setProcessing(null)
        }
    }

    return (
        <DashboardLayout>
            <div className="px-6 max-w-6xl mx-auto">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Approvals to review</h1>
                        <p className="text-sm text-muted-foreground">Expenses awaiting your action</p>
                    </div>
                    <div>
                        <Button size="sm" variant={teamView ? 'secondary' : 'ghost'} onClick={() => setTeamView(v => !v)}>
                            {teamView ? 'Viewing team' : 'View team expenses'}
                        </Button>
                    </div>
                </div>

                <div className="bg-card border rounded-md shadow-sm p-4">
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableCell>Subject</TableCell>
                                    <TableCell>Owner</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Amount (company)</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map(({ expense, submitter }, idx) => (
                                    <TableRow key={expense.id || idx}>
                                        <TableCell>{expense.subject || 'none'}</TableCell>
                                        <TableCell>{submitter?.name || submitter?.email || 'Unknown'}</TableCell>
                                        <TableCell>{expense.category || 'General'}</TableCell>
                                        <TableCell>{expense.status}</TableCell>
                                        <TableCell>
                                            {expense.baseCurrencyAmount ? (
                                                <span className="text-sm text-foreground">{Number(expense.baseCurrencyAmount).toFixed(2)} {me?.companyBaseCurrency || expense.companyBaseCurrency || ''}</span>
                                            ) : expense.convertedAmount ? (
                                                <span className="text-sm text-foreground">{Number(expense.convertedAmount).toFixed(2)} {expense.companyBaseCurrency || me?.companyBaseCurrency || ''}</span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">{Number(expense.amount).toFixed(2)} {expense.currencyCode}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {expense.status === 'Pending' ? (
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="default" disabled={processing === expense.id} onClick={() => performAction(expense.id, 'Approved')}>Approve</Button>
                                                    <Button size="sm" variant="destructive" disabled={processing === expense.id} onClick={() => performAction(expense.id, 'Rejected')}>Reject</Button>
                                                    <Button size="sm" variant="outline" disabled={processing === expense.id} onClick={() => escalate(expense.id)}>Escalate</Button>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground">{expense.status}</div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
