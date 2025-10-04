import ApprovalRulesForm from './approval-rules-form'
import DashboardLayout from "./dashboard-layout"

export default function Page() {
    return (
        <DashboardLayout>
            <div className="px-6 max-w-6xl mx-auto">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold">Admin - Approval Rules</h1>
                    <p className="text-sm text-muted-foreground">Create multi-level and conditional approval flows for expense requests.</p>
                </div>
                <div className="bg-card border rounded-md shadow-sm">
                    <ApprovalRulesForm />
                </div>
            </div>
        </DashboardLayout>
    )
}

