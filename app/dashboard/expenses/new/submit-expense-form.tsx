"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SubmitExpenseForm() {
  const [amount, setAmount] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const userId = localStorage.getItem('userId')
      const payload = { userId, amount: Number(amount), currencyCode, description, expenseDate }
      const res = await fetch('/api/expenses', { method: 'POST', body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      toast.success('Expense submitted')
      // Reset
      setAmount('')
      setDescription('')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to submit expense')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="p-6 grid grid-cols-1 gap-4 max-w-2xl" onSubmit={handleSubmit}>
      <div>
        <Label>Amount</Label>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </div>

      <div>
        <Label>Currency</Label>
        <Input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} />
      </div>

      <div>
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <Label>Date</Label>
        <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Expense'}</Button>
      </div>
    </form>
  )
}
