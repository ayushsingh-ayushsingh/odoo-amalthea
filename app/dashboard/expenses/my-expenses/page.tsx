"use client"

import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard/dashboard-layout'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog'

type Expense = {
    id: string
    amount: number | string
    currencyCode: string
    description: string
    expenseDate: string
    status: string
}

export default function Page() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState<Expense | null>(null)
    const [receipts, setReceipts] = useState<Array<{ id: string; imageUrl: string }>>([])
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        async function load() {
            const userId = localStorage.getItem('userId')
            const url = userId ? `/api/expenses?userId=${userId}` : '/api/expenses'
            try {
                const res = await fetch(url)
                if (!res.ok) {
                    setExpenses([])
                    return
                }
                const data = await res.json()
                console.log(data)
                // Show all statuses (Pending/Approved/Rejected)
                setExpenses(data || [])
            } catch (err) {
                console.error('Failed to load expense history', err)
                setExpenses([])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    async function fetchReceipts(expenseId: string) {
        try {
            const res = await fetch(`/api/receipts?expenseId=${expenseId}`)
            if (!res.ok) return setReceipts([])
            const data = await res.json()
            setReceipts(data || [])
        } catch (err) {
            console.error('Failed to load receipts', err)
            setReceipts([])
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!selected) return
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const form = new FormData()
            form.append('file', file)
            form.append('expenseId', selected.id)
            const res = await fetch('/api/receipts', {
                method: 'POST',
                body: form,
            })
            if (!res.ok) {
                console.error('Upload failed')
                return
            }
            // refresh receipts after successful upload
            await fetchReceipts(selected.id)
        } catch (err) {
            console.error('Failed to upload receipt', err)
        } finally {
            setUploading(false)
            // reset file input value if needed
            if (e.target) e.target.value = ''
        }
    }

    return (
        <DashboardLayout>
            <div className="px-6 max-w-6xl mx-auto">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold">Expense History</h1>
                    <p className="text-sm text-muted-foreground">Your approved and rejected expenses.</p>
                </div>

                <div className="bg-card border rounded-md shadow-sm p-4">
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell>{e.amount} {e.currencyCode}</TableCell>
                                        <TableCell>{new Date(e.expenseDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{e.description}</TableCell>
                                        <TableCell>
                                            {e.status === 'Approved' ? (
                                                <span className="text-green-600 font-medium">
                                                    Approved
                                                </span>
                                            ) : e.status === 'Rejected' ? (
                                                <span className="text-red-600 font-medium">
                                                    Rejected
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 font-medium">
                                                    Submitted
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelected(e)
                                                    // fetch receipts for this expense
                                                    fetchReceipts(e.id)
                                                    setOpen(true)
                                                }}
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
                {/* Detail dialog */}
                <Dialog open={open} onOpenChange={(val) => { if (!val) setSelected(null); setOpen(val) }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Expense Details</DialogTitle>
                            <DialogDescription>Review the expense details and status.</DialogDescription>
                        </DialogHeader>
                        {selected ? (
                            <div className="mt-4 space-y-3">
                                <div>
                                    <strong>Amount:</strong> {selected.amount} {selected.currencyCode}
                                </div>
                                <div>
                                    <strong>Date:</strong> {new Date(selected.expenseDate).toDateString()}
                                </div>
                                <div>
                                    <strong>Description:</strong>
                                    <div className="mt-1 text-sm text-muted-foreground">{selected.description}</div>
                                </div>
                                <div>
                                    <strong>Status:</strong> {selected.status}
                                </div>
                                <div>
                                    <strong>Receipts:</strong>
                                    <div className="mt-2">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={handleFileChange}
                                            disabled={uploading}
                                            className="mb-2"
                                        />
                                        {uploading && <div className="text-sm text-muted-foreground">Uploading...</div>}
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {receipts.map((r) => (
                                                <div key={r.id} className="border rounded p-1">
                                                    <img src={r.imageUrl} alt="receipt" className="w-full h-24 object-cover" />
                                                </div>
                                            ))}
                                            {receipts.length === 0 && (
                                                <div className="text-sm text-muted-foreground">No receipts uploaded.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>Loading...</div>
                        )}
                        <DialogFooter className="mt-6">
                            <DialogClose asChild>
                                <Button variant="default">Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
