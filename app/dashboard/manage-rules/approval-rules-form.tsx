"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Users as UsersIcon, X as XIcon, Check as CheckIcon, Percent as PercentIcon, CircleArrowRight as ArrowRightCircle, Loader as Loader2, CircleUser as UserCircle, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type User = { id: string; name: string; role: 'Admin' | 'Manager' | 'Employee'; managerId?: string | null };
type ApproverState = { id: string; required: boolean };

const MOCK_USERS: User[] = [];

export default function ApprovalRulesForm() {
    const [users, setUsers] = useState<User[]>(MOCK_USERS);
    const [rules, setRules] = useState<any[]>([]);
    const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
    const [addApproverValue, setAddApproverValue] = useState<string | undefined>(undefined);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [description, setDescription] = useState('Default rule for employee requests.');
    const [defaultManagerId, setDefaultManagerId] = useState<string>('none');
    const [hasInvalidManager, setHasInvalidManager] = useState(false);

    const [isManagerApprover, setIsManagerApprover] = useState(true);
    const [customApprovers, setCustomApprovers] = useState<ApproverState[]>([]);
    const [isSequential, setIsSequential] = useState(false);

    const [minPercentage, setMinPercentage] = useState<number | ''>(60);
    const [specificApproverId, setSpecificApproverId] = useState<string>('none');

    const [isSaving, setIsSaving] = useState(false);

    const availableApprovers = useMemo(() => {
        return users.filter(u =>
            u.id !== selectedUserId && u.id !== defaultManagerId && u.role !== 'Employee'
        );
    }, [users, selectedUserId, defaultManagerId]);

    const userToConfigure = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

    useEffect(() => {
        if (!selectedUserId) return;
        const u = users.find(x => x.id === selectedUserId);
        const managerCandidateId = u?.managerId ?? null;
        if (!managerCandidateId) {
            setDefaultManagerId('none');
            setHasInvalidManager(false);
            return;
        }
        const mgr = users.find(x => x.id === managerCandidateId);
        if (mgr && mgr.role === 'Manager') {
            setDefaultManagerId(mgr.id);
            setHasInvalidManager(false);
        } else {
            setDefaultManagerId('none');
            setHasInvalidManager(true);
        }
    }, [selectedUserId, users]);

    useEffect(() => {
        let mounted = true;
        async function fetchUsers() {
            setIsLoadingUsers(true);
            try {
                const res = await fetch('/api/users');
                if (!res.ok) throw new Error('Failed to load users');
                const json = await res.json();
                if (!mounted) return;
                const mapped: User[] = json.map((u: any) => ({ id: u.id, name: u.name, role: u.role, managerId: u.managerId ?? null }));
                setUsers(mapped);
            } catch (err) {
                console.error('Error loading users for approval rules:', err);
                toast.error('Failed to load users.');
            } finally {
                if (mounted) setIsLoadingUsers(false);
            }
        }
        fetchUsers();
        // fetch rules list
        async function fetchRules() {
            try {
                const res = await fetch('/api/approval-rules');
                if (!res.ok) throw new Error('Failed to load rules');
                const json = await res.json();
                if (!mounted) return;
                setRules(json || []);
            } catch (err) {
                console.error('Error loading rules:', err);
            }
        }
        fetchRules();
        return () => { mounted = false };
    }, []);

    // Load a rule by id into the form
    const loadRule = async (id: string | null) => {
        if (!id) {
            // reset form
            setSelectedRuleId(null);
            setSelectedUserId('');
            setDescription('Default rule for employee requests.');
            setDefaultManagerId('none');
            setHasInvalidManager(false);
            setIsManagerApprover(true);
            setCustomApprovers([]);
            setIsSequential(false);
            setMinPercentage(60);
            setSpecificApproverId('none');
            return;
        }

        try {
            const res = await fetch(`/api/approval-rules/${id}`);
            if (!res.ok) {
                if (res.status === 404) {
                    toast.error('Rule not found');
                    await loadRule(null);
                    return;
                }
                const text = await res.text();
                throw new Error(text || 'Failed to load rule');
            }
            const json = await res.json();
            setSelectedRuleId(id);
            setDescription(json.description ?? '');

            // map conditions (support SpecificUser and legacy AutoApprove)
            if (json.conditions && Array.isArray(json.conditions)) {
                const pct = json.conditions.find((c: any) => String(c.conditionType) === 'Percentage');
                setMinPercentage(pct ? Number(pct.conditionValue) : '');
                const sp = json.conditions.find((c: any) => String(c.conditionType) === 'SpecificUser' || String(c.conditionType) === 'AutoApprove');
                setSpecificApproverId(sp ? sp.conditionValue : 'none');
            } else {
                setMinPercentage(60);
                setSpecificApproverId('none');
            }

            // map flowSteps
            if (json.flowSteps && Array.isArray(json.flowSteps)) {
                // manager step
                const managerStep = json.flowSteps.find((s: any) => s.isManagerApprover);
                if (managerStep) {
                    setIsManagerApprover(true);
                    setDefaultManagerId(managerStep.approverUserId ?? 'none');
                } else {
                    setIsManagerApprover(false);
                    setDefaultManagerId('none');
                }

                const other = json.flowSteps
                    .filter((s: any) => !s.isManagerApprover)
                    .map((s: any) => ({ id: s.approverUserId ?? 'none', required: !!s.required }))
                    .filter((x: any) => x && x.id && x.id !== 'none');

                setCustomApprovers(other);
            } else {
                setIsManagerApprover(true);
                setCustomApprovers([]);
            }

            // Set selectedUser if present on rule (we stored userId on payload)
            if (json.userId) setSelectedUserId(json.userId);
        } catch (err: any) {
            console.error('Failed to load rule', err);
            const msg = err?.message || String(err);
            toast.error('Failed to load rule', { description: msg });
        }
    }

    const handleUpdate = async () => {
        if (!selectedRuleId) return toast.error('No rule selected');
        const payload = {
            name: `Rule for ${userToConfigure?.name ?? selectedUserId}`,
            description,
            conditions: [],
            flowSteps: [],
        } as any;

        if (minPercentage !== '') payload.conditions.push({ conditionType: 'Percentage', conditionValue: String(minPercentage), logicOperator: 'NONE' });
        if (specificApproverId && specificApproverId !== 'none') payload.conditions.push({ conditionType: 'AutoApprove', conditionValue: specificApproverId, logicOperator: 'NONE' });

        let step = 1;
        if (isManagerApprover) payload.flowSteps.push({ stepOrder: step++, isManagerApprover: true, approverType: 'User', approverUserId: defaultManagerId === 'none' ? null : defaultManagerId });
        for (const a of customApprovers) payload.flowSteps.push({ stepOrder: step++, isManagerApprover: false, approverType: 'User', approverUserId: a.id, required: a.required });

        try {
            const res = await fetch(`/api/approval-rules/${selectedRuleId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('Failed to update');
            toast.success('Rule updated');
            // refresh list
            const list = await fetch('/api/approval-rules').then(r => r.json());
            setRules(list || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to update rule');
        }
    }

    const handleDelete = async () => {
        if (!selectedRuleId) return toast.error('No rule selected');
        if (!confirm('Delete rule? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/approval-rules/${selectedRuleId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Rule deleted');
            setSelectedRuleId(null);
            // refresh list
            const list = await fetch('/api/approval-rules').then(r => r.json());
            setRules(list || []);
            await loadRule(null);
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete rule');
        }
    }

    const handleToggleApprover = useCallback((id: string) => {
        setCustomApprovers((prev) => {
            if (prev.find((p) => p.id === id)) {
                return prev.filter((p) => p.id !== id);
            }
            return [...prev, { id, required: false }];
        });
    }, []);

    const handleToggleRequired = useCallback((id: string) => {
        setCustomApprovers((prev) => prev.map((p) => p.id === id ? { ...p, required: !p.required } : p));
    }, []);

    const getUserName = useCallback((id: string) => {
        const user = users.find(u => u.id === id);
        return user ? `${user.name} (${user.role})` : 'Unknown User';
    }, [users]);

    const approverList = useMemo(() => {
        return customApprovers
            .map(a => ({
                ...a,
                name: getUserName(a.id),
                step: isSequential ? customApprovers.findIndex(ca => ca.id === a.id) + 2 : null,
            }));
    }, [customApprovers, getUserName, isSequential]);

    const handleSave = async () => {
        if (!selectedUserId) {
            toast.error('Please select a user to configure the rule for.');
            return;
        }

        setIsSaving(true);

        const payload: any = {
            userId: selectedUserId,
            name: `Rule for ${userToConfigure?.name ?? selectedUserId}`,
            description: description || null,
            conditions: [],
            flowSteps: [],
        };

        let stepCounter = 1;
        if (isManagerApprover) {
            payload.flowSteps.push({
                stepOrder: stepCounter++,
                isManagerApprover: true,
                approverType: 'User',
                approverUserId: defaultManagerId === 'none' ? null : defaultManagerId,
            });
        }

        for (const a of customApprovers) {
            payload.flowSteps.push({
                stepOrder: stepCounter++,
                isManagerApprover: false,
                approverType: 'User',
                approverUserId: a.id,
                required: a.required,
            });
        }

        if (minPercentage !== '') {
            payload.conditions.push({
                conditionType: 'Percentage',
                conditionValue: String(minPercentage),
                logicOperator: 'NONE',
            });
        }

        if (specificApproverId && specificApproverId !== 'none') {
            payload.conditions.push({
                conditionType: 'AutoApprove',
                conditionValue: specificApproverId,
                logicOperator: 'NONE',
            });
        }

        try {
            const res = await fetch('/api/approval-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to save rule');
            }

            const json = await res.json();
            toast.success(`Rule saved successfully${json?.id ? ` (id: ${json.id})` : ''}`);
            setCustomApprovers([]);
            setIsSequential(false);
            setMinPercentage(60);
            setSpecificApproverId('none');

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error('Failed to save approval rule.', { description: msg });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex items-start gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <Settings2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedRuleId ?? 'none'} onValueChange={(v) => { if (!v || v === 'none') { setSelectedRuleId(null); loadRule(null); } else { setSelectedRuleId(v); loadRule(v); } }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Load existing rule" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">New Rule</SelectItem>
                            {rules.map(r => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => loadRule(null)}>New</Button>
                    <Button variant="ghost" onClick={handleUpdate} disabled={!selectedRuleId}>Update</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={!selectedRuleId}>
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5" />
                            Rule Subject
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="user-select">User to Configure Rule For</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger id="user-select">
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.filter(u => u.role === 'Employee' || u.role === 'Manager').map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name} ({u.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedUserId && (
                                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md text-sm text-primary">
                                    <ArrowRightCircle className="h-4 w-4" />
                                    <span>Rule applies to: <strong>{userToConfigure?.name}</strong></span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="manager-select">User's Default Manager</Label>
                            <Select value={defaultManagerId} onValueChange={(v) => { setDefaultManagerId(v); setHasInvalidManager(false); }}>
                                <SelectTrigger id="manager-select">
                                    <SelectValue placeholder="Select manager" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Default Manager</SelectItem>
                                    {users.filter(u => u.role === 'Manager').map((m) => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {hasInvalidManager && (
                                <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive">
                                    The selected user's current manager is not a Manager. Please assign a valid Manager.
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g., Rule for claims over $1000"
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UsersIcon className="h-5 w-5" />
                            Approval Flow & Sequence
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 rounded-lg">
                                <Checkbox
                                    id="manager-approver"
                                    checked={isManagerApprover}
                                    onCheckedChange={(v) => setIsManagerApprover(Boolean(v))}
                                />
                                <Label htmlFor="manager-approver" className="font-medium cursor-pointer">
                                    Manager must approve first
                                </Label>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg">
                                <Checkbox
                                    id="sequential"
                                    checked={isSequential}
                                    onCheckedChange={(v) => setIsSequential(Boolean(v))}
                                />
                                <Label htmlFor="sequential" className="font-medium cursor-pointer">
                                    Sequential approval (approvers must approve in order)
                                </Label>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Custom Approvers</Label>
                                <Badge variant="secondary">{customApprovers.length} added</Badge>
                            </div>

                            <Select
                                value={addApproverValue}
                                onValueChange={(id) => {
                                    if (!id) return;
                                    handleToggleApprover(id);
                                    setAddApproverValue(undefined);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Add approver (Manager/Admin)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableApprovers.filter(u => !customApprovers.find(a => a.id === u.id)).length > 0 ? (
                                        availableApprovers
                                            .filter(u => !customApprovers.find(a => a.id === u.id))
                                            .map(u => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name} ({u.role})
                                                </SelectItem>
                                            ))
                                    ) : (
                                        <SelectItem disabled value="none">
                                            No more users available
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>

                            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-background">
                                {approverList.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                        No custom approvers added
                                    </div>
                                ) : (
                                    approverList.map((approver, index) => (
                                        <div
                                            key={approver.id}
                                            className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {isSequential && (
                                                    <Badge variant="outline" className="bg-background">
                                                        Step {index + 2}
                                                    </Badge>
                                                )}
                                                <span className="font-medium text-sm">{approver.name}</span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`required-${approver.id}`}
                                                        checked={approver.required}
                                                        onCheckedChange={() => handleToggleRequired(approver.id)}
                                                    />
                                                    <Label htmlFor={`required-${approver.id}`} className="text-sm cursor-pointer">
                                                        Required
                                                    </Label>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleToggleApprover(approver.id)}
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <PercentIcon className="h-5 w-5 text-muted-foreground" />
                                <Label className="text-base font-semibold">Conditional Rules</Label>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="percentage">Minimum Approval Percentage</Label>
                                    <Input
                                        id="percentage"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={minPercentage === '' ? '' : String(minPercentage)}
                                        onChange={(e) => setMinPercentage(e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value))))}
                                        placeholder="e.g., 60"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Auto-approve if this % of optional approvers approve
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="auto-approve">Auto-Approval User</Label>
                                    <Select value={specificApproverId} onValueChange={setSpecificApproverId}>
                                        <SelectTrigger id="auto-approve">
                                            <SelectValue placeholder="Select user" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Disabled</SelectItem>
                                            {users.filter(u => u.role === 'Admin' || u.role === 'Manager').map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        This user's approval instantly approves the request
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="flex items-center justify-between p-6 py-0">
                    <div className="text-sm text-muted-foreground">
                        {isLoadingUsers ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading users...
                            </div>
                        ) : (
                            <span>{users.length} users available</span>
                        )}
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={!selectedUserId || isSaving || (customApprovers.length === 0 && !isManagerApprover) || (isManagerApprover && defaultManagerId === 'none')}
                        size="lg"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckIcon className="mr-2 h-4 w-4" />
                                Save Rule
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
