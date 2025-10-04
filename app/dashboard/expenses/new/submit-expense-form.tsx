"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign, FileText, Loader as Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect } from 'react'

// Initially empty; will be populated from fetched `rates` when available.
const STATIC_SYMBOLS: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: '$', AUD: '$'
}

export default function SubmitExpenseForm() {
    const [amount, setAmount] = useState('')
    const [currencyCode, setCurrencyCode] = useState('USD')
    const [description, setDescription] = useState('')
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
    const [submitting, setSubmitting] = useState(false)
    const [companyBaseCurrency, setCompanyBaseCurrency] = useState<string | null>(null)
    const [rates, setRates] = useState<Record<string, number> | null>(null)
    const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
    const [currencyList, setCurrencyList] = useState<{ code: string, symbol?: string, name?: string }[]>([])
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!amount || Number(amount) <= 0) {
            toast.error('Please enter a valid amount')
            return
        }

        if (!description.trim()) {
            toast.error('Please provide a description')
            return
        }

        setSubmitting(true)
        try {
            const userId = localStorage.getItem('userId')
            if (!userId) {
                throw new Error('User not authenticated')
            }

            const payload: any = {
                userId,
                amount: Number(amount),
                currencyCode,
                description: description.trim(),
                expenseDate,
                companyBaseCurrency: companyBaseCurrency || 'USD',
            }

            if (convertedAmount !== null) {
                payload.convertedAmount = Number(convertedAmount.toFixed(2))
            }

            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || 'Failed to submit expense')
            }

            const data = await res.json()
            // if a receipt was selected, upload it after creating the expense
            if (receiptFile && data?.id) {
                try {
                    const form = new FormData()
                    form.append('file', receiptFile)
                    form.append('expenseId', data.id)
                    const rres = await fetch('/api/receipts', {
                        method: 'POST',
                        body: form,
                    })
                    if (!rres.ok) {
                        console.warn('Receipt upload failed')
                    }
                } catch (err) {
                    console.error('Failed to upload receipt', err)
                }
            }
            // find symbol from dynamic list or fall back to STATIC_SYMBOLS or currency code
            const toastSymbol = (currencyList.find(c => c.code === currencyCode)?.symbol) || STATIC_SYMBOLS[currencyCode] || currencyCode
            toast.success('Expense submitted successfully', {
                description: `${toastSymbol}${amount} submitted for approval`
            })

            setAmount('')
            setDescription('')
            setExpenseDate(new Date().toISOString().slice(0, 10))
            // clear selected receipt
            setReceiptFile(null)
            setReceiptPreview(null)
        } catch (err: any) {
            console.error('Error submitting expense:', err)
            toast.error('Failed to submit expense', {
                description: err.message || 'Please try again'
            })
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        // load company base currency from /api/me
        let mounted = true
            ; (async () => {
                try {
                    const res = await fetch('/api/me')
                    if (!res.ok) return
                    const json = await res.json()
                    if (mounted && json?.companyBaseCurrency) setCompanyBaseCurrency(json.companyBaseCurrency)
                } catch (e) {
                    // ignore; default to USD
                }
            })()
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        let mounted = true
        if (!companyBaseCurrency) return
            ; (async () => {
                try {
                    // fetch rates with base as company currency
                    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${companyBaseCurrency}`)
                    if (!res.ok) return
                    const json = await res.json()
                    if (mounted && json?.rates) setRates(json.rates)
                } catch (e) {
                    // ignore
                }
            })()
        return () => { mounted = false }
    }, [companyBaseCurrency])

    useEffect(() => {
        if (!rates) {
            setConvertedAmount(null)
            setCurrencyList([])
            return
        }
        if (!currencyCode || !amount) {
            setConvertedAmount(null)
            return
        }
        const amt = Number(amount)
        if (isNaN(amt)) {
            setConvertedAmount(null)
            return
        }
        const rate = rates[currencyCode]
        if (!rate) {
            // If API returns rates where key is currency code relative to base
            // convert via 1 / (rate of selected currency) if needed
            setConvertedAmount(null)
            return
        }
        // rates are amount of target currency per 1 base currency
        // To convert from selected currency to base: amount_in_base = amount / rate_of_selected
        const converted = amt / rate
        setConvertedAmount(converted)
    }, [rates, currencyCode, amount])

    useEffect(() => {
        // Build a currency list from rates when available
        if (!rates) return
        try {
            // Intl.DisplayNames for currency long names (supported in modern browsers/node)
            // Fallback to code if not available.
            // For symbols, use Intl.NumberFormat where possible, else STATIC_SYMBOLS.
            const displayNames = (typeof Intl !== 'undefined' && (Intl as any).DisplayNames)
                ? new (Intl as any).DisplayNames(undefined, { type: 'currency' })
                : null

            const list = Object.keys(rates).sort().map((code) => {
                let name = displayNames ? displayNames.of(code) : code
                // Try to get symbol via Intl.NumberFormat
                let symbol: string | undefined
                try {
                    const nf = new Intl.NumberFormat(undefined, { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 })
                    // Format 0 to get currency display and extract symbol heuristically
                    const parts = nf.formatToParts ? nf.formatToParts(0) : []
                    const symPart = parts.find((p: any) => p.type === 'currency')
                    symbol = symPart ? symPart.value : STATIC_SYMBOLS[code]
                } catch (e) {
                    symbol = STATIC_SYMBOLS[code]
                }
                return { code, symbol, name }
            })
            setCurrencyList(list)
        } catch (e) {
            // fallback: show keys only
            setCurrencyList(Object.keys(rates).sort().map(c => ({ code: c })))
        }
    }, [rates])

    // handle local preview for the selected receipt
    function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null
        setReceiptFile(file)
        if (!file) {
            setReceiptPreview(null)
            return
        }
        // Generate a local preview (works for images)
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file)
            setReceiptPreview(url)
        } else {
            // for non-images (pdf), we won't create an object URL preview; show file name
            setReceiptPreview(null)
        }
    }

    const selectedCurrency = currencyList.find(c => c.code === currencyCode) || { code: currencyCode }

    return (
        <div className="container max-w-2xl mx-auto p-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Submit New Expense</CardTitle>
                            <CardDescription className='sr-only'>Enter your expense details for approval</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    Amount
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        {selectedCurrency?.symbol}
                                    </span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="pl-8"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                                    <SelectTrigger id="currency">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencyList.length > 0 ? currencyList.map((currency) => (
                                            <SelectItem key={currency.code} value={currency.code}>
                                                {currency.symbol ? `${currency.symbol} ` : ''}{currency.code}{currency.name ? ` - ${currency.name}` : ''}
                                            </SelectItem>
                                        )) : (
                                            // fallback small list while rates load
                                            <>
                                                <SelectItem value="USD">$ USD - US Dollar</SelectItem>
                                                <SelectItem value="EUR">€ EUR - Euro</SelectItem>
                                                <SelectItem value="GBP">£ GBP - British Pound</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                Expense Date
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                max={new Date().toISOString().slice(0, 10)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                Description
                            </Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter expense details (e.g., Client dinner, Office supplies, Travel expenses)"
                                className="resize-none min-h-[100px]"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                {description.length}/500 characters
                            </p>
                            <div className="mt-6">
                                <Label className="mb-2">Receipt (optional)</Label>
                                <Input type="file" accept="image/*,application/pdf" onChange={handleReceiptChange} />
                                <div className="mt-2">
                                    {receiptPreview ? (
                                        <img src={receiptPreview} alt="receipt preview" className="w-40 h-28 object-cover border rounded" />
                                    ) : receiptFile ? (
                                        <div className="text-sm text-muted-foreground">Selected file: {receiptFile.name}</div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">No receipt selected</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <div className="text-sm text-muted-foreground">
                                {amount && (
                                    <div className="space-y-1">
                                        <div>
                                            Total: <strong className="text-foreground">{selectedCurrency?.symbol}{Number(amount).toFixed(2)}</strong>
                                        </div>
                                        {convertedAmount !== null && companyBaseCurrency && (
                                            <div className="text-xs text-muted-foreground">
                                                Converted: <strong className="text-foreground">{Number(convertedAmount).toFixed(2)}</strong> {companyBaseCurrency}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Button
                                type="submit"
                                disabled={submitting || !amount || !description.trim()}
                                size="lg"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Submit Expense
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
