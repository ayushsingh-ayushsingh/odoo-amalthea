"use client"

import { useState, useActionState, useEffect } from "react"
import { createUserAction } from "./user-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

const initialState = {
    status: 'idle' as const,
    message: '',
    errors: undefined,
}

interface AddUserFormProps {
    onUserAdded?: () => void;
}

export default function AddUserForm({ onUserAdded }: AddUserFormProps) {
    const [open, setOpen] = useState(false)
    // Cast initialState to any to satisfy useActionState typing in this environment
    const [state, formAction] = useActionState(createUserAction as any, initialState as any)
    const [managers, setManagers] = useState<any[]>([])

    // Handle form submission result
    useEffect(() => {
        if (state.status === 'success') {
            toast.success(state.message)
            // Close the dialog after success
            setOpen(false)

            // Reset form only if it exists
            const form = document.getElementById('add-user-form') as HTMLFormElement | null
            if (form) setTimeout(() => form.reset(), 0)

            // Trigger table refresh
            onUserAdded?.()
        } else if (state.status === 'error' && state.message) {
            toast.error(state.message)
        }
    }, [state.status, state.message, onUserAdded])

    // Fetch managers when the dialog opens so user can pick a manager
    useEffect(() => {
        if (!open) return

        let mounted = true
            ; (async () => {
                try {
                    const res = await fetch('/api/users?role=Manager')
                    if (!res.ok) return
                    const data = await res.json()
                    if (mounted) setManagers(data || [])
                } catch (e) {
                    console.error('Failed to fetch managers', e)
                }
            })()

        return () => {
            mounted = false
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusIcon
                        className="-ms-1 opacity-60"
                        size={16}
                        aria-hidden="true"
                    />
                    Add user
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Create a new user account. The user will receive login credentials.
                    </DialogDescription>
                </DialogHeader>
                <form id="add-user-form" action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Enter full name"
                            required
                        />
                        {state.errors?.name && (
                            <p className="text-sm text-red-500">{state.errors.name[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Enter email address"
                            required
                        />
                        {state.errors?.email && (
                            <p className="text-sm text-red-500">{state.errors.email[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Enter password (min 8 characters)"
                            required
                        />
                        {state.errors?.password && (
                            <p className="text-sm text-destrctive">{state.errors.password[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin" disabled>Admin</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                                <SelectItem value="Employee">Employee</SelectItem>
                            </SelectContent>
                        </Select>
                        {state.errors?.role && (
                            <p className="text-sm text-red-500">{state.errors.role[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="managerId">Manager (Optional)</Label>
                        <Select name="managerId">
                            <SelectTrigger>
                                <SelectValue placeholder="Select manager (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Manager</SelectItem>
                                {managers.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {state.errors?.managerId && (
                            <p className="text-sm text-red-500">{state.errors.managerId[0]}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Create User</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
