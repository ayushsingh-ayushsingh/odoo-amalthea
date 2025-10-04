export type User = {
    id: string;
    name: string;
    email: string;
    role: "Admin" | "Manager" | "Employee";
    managerId: string | null;
    managerName?: string | null;
    createdAt: Date;
};