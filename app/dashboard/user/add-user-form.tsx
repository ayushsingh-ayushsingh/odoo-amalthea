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
    const [state, formAction] = useActionState(createUserAction, initialState)

    // Handle form submission result
    useEffect(() => {
        if (state.status === 'success') {
            toast.success(state.message)
            setOpen(false)
            // Reset form
            const form = document.getElementById('add-user-form') as HTMLFormElement
            form?.reset()
            // Trigger table refresh
            onUserAdded?.()
        } else if (state.status === 'error' && state.message) {
            toast.error(state.message)
        }
    }, [state, onUserAdded])

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
                            <p className="text-sm text-red-500">{state.errors.password[0]}</p>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
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
                        <Input
                            id="managerId"
                            name="managerId"
                            placeholder="Manager ID (leave empty for top-level)"
                        />
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
