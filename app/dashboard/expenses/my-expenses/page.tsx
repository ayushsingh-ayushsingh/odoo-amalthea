"use client"

import React, { useEffect, useState } from 'react'
import DashboardLayout from '@/app/dashboard/dashboard-layout'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

type Expense = {
  id: string
  amount: string
  currencyCode: string
  description: string
  expenseDate: string
  status: string
}

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const userId = localStorage.getItem('userId')
      const url = userId ? `/api/expenses?userId=${userId}` : '/api/expenses'
      const res = await fetch(url)
      if (!res.ok) return setExpenses([])
      const data = await res.json()
      setExpenses(data || [])
      setLoading(false)
    }
    load().catch(console.error)
  }, [])

  return (
    <DashboardLayout>
      <div className="px-6 max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">My Expenses</h1>
          <p className="text-sm text-muted-foreground">Your submitted expenses and their approval status.</p>
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
                    <TableCell>{e.status}</TableCell>
                    <TableCell><Button variant="ghost">View</Button></TableCell>
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
