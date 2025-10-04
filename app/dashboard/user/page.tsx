import DashboardLayout from "../dashboard-layout"
import DataTableComponent from "./table"

export default function Page() {
    return (
        <DashboardLayout>
            <div className="px-6">
                <DataTableComponent />
            </div>
        </DashboardLayout>
    )
}
