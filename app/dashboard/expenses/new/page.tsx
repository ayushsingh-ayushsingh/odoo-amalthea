import SubmitExpenseForm from './submit-expense-form'
import DashboardLayout from '@/app/dashboard/dashboard-layout'

export default function Page() {
  return (
    <DashboardLayout>
      <div className="px-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Submit Expense</h1>
        <div className="bg-card border rounded-md shadow-sm">
          <SubmitExpenseForm />
        </div>
      </div>
    </DashboardLayout>
  )
}
