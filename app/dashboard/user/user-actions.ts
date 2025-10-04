"use server"

import { z } from "zod";
import * as bcrypt from 'bcryptjs';
import { db } from '@/src';
import { users, companies } from '@/src/db/schema';
import { eq, inArray } from 'drizzle-orm';

// --- 1. Schema for Creating a User ---
const createUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."), 
    role: z.enum(["Admin", "Manager", "Employee"] as const),
    managerId: z.string().optional().nullable(),
});

type CreateUserInputs = z.infer<typeof createUserSchema>;

// Define the server action response type
type ActionResponse = { 
    status: 'success' | 'error'; 
    message: string; 
    // allow partial errors so callers can return only the relevant field errors
    errors?: Partial<Record<keyof CreateUserInputs, string[]>>;
};

// Helper function to get or create a default company
async function getOrCreateDefaultCompany(): Promise<string> {
    try {
        // First, try to get the first company
        const existingCompanies = await db.select().from(companies).limit(1);
        
        if (existingCompanies.length > 0) {
            return existingCompanies[0].id;
        }
        
        // If no company exists, create a default one
        const [newCompany] = await db.insert(companies).values({
            name: "Default Company",
            baseCurrencyCode: "USD",
        }).returning({ id: companies.id });
        
        return newCompany.id;
    } catch (error) {
        console.error("Error getting/creating company:", error);
        throw new Error("Failed to get or create company");
    }
}

// --- 2. Create User Action ---

/**
 * Creates a new user in the database.
 * @param prevState The previous state (unused here but required by useFormState).
 * @param formData FormData containing user details.
 * @returns An ActionResponse indicating success or failure.
 */
export async function createUserAction(
    prevState: ActionResponse, 
    formData: FormData
): Promise<ActionResponse> {
    
    // TODO: Add authorization check
    // const session = await auth();
    // if (!session || session.user.role !== 'Admin') {
    //     return { status: 'error', message: 'Unauthorized: Must be an Admin to create users.' };
    // }
    
    // Translate form data; treat special "none" value as null for managerId
    const rawManagerId = formData.get('managerId')
    const managerIdValue = rawManagerId === 'none' ? null : rawManagerId

    const inputs = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        managerId: managerIdValue || null,
    };
    
    // Validation
    const validatedFields = createUserSchema.safeParse(inputs);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Validation failed. Check the fields for errors.',
            errors: validatedFields.error.flatten().fieldErrors as Partial<Record<keyof CreateUserInputs, string[]>>
        };
    }
    
    const { name, email, password, role, managerId } = validatedFields.data;

    try {
        // Get or create a default company
        const companyId = await getOrCreateDefaultCompany();
        
        // Check for existing user
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if (existingUser.length > 0) {
            return { 
                status: 'error', 
                message: 'A user with this email already exists.',
                errors: { email: ['Email already in use.'] }
            };
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert into database
        await db.insert(users).values({
            companyId,
            name,
            email,
            passwordHash,
            role,
            managerId: role === 'Employee' ? managerId : null,
        });
        
        return { status: 'success', message: `User "${name}" created successfully.` };

    } catch (e) {
        console.error("Database error during user creation:", e);
        
        if (e instanceof Error && e.message.includes('unique constraint "user_email_idx"')) {
            return { 
                status: 'error', 
                message: 'A user with this email already exists.',
                errors: { email: ['Email already in use.'] }
            };
        }
        
        return { status: 'error', message: 'Failed to create user due to a server error.' };
    }
}

// --- 3. Delete Users Action ---

/**
 * Deletes multiple users by ID.
 * @param userIds An array of user IDs to delete.
 * @returns A message string indicating the result.
 */
export async function deleteUsersAction(userIds: string[]): Promise<string> {
    // TODO: Add authorization check
    // const session = await auth();
    // if (!session || session.user.role !== 'Admin') {
    //     return 'Unauthorized: Must be an Admin to delete users.';
    // }

    if (userIds.length === 0) {
        return 'No users selected for deletion.';
    }

    try {
        // Delete from database
        await db.delete(users).where(inArray(users.id, userIds));

        return `Successfully deleted ${userIds.length} user(s).`;

    } catch (e) {
        console.error("Database error during user deletion:", e);
        return 'Failed to delete users due to a server error.';
    }
}

// --- 4. Get Users Action ---

/**
 * Fetches all users for the current company.
 * @returns Array of users with manager names populated.
 */
export async function getUsersAction() {
    try {
        // Get or create a default company
        const companyId = await getOrCreateDefaultCompany();
        
        // Fetch all users for the company
        const allUsers = await db.select().from(users).where(eq(users.companyId, companyId));
        
        // Create a map of user IDs to names for manager lookup
        const userMap = new Map(allUsers.map(user => [user.id, user.name]));
        
        // Process users to include manager names
        const processedUsers = allUsers.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            managerId: user.managerId,
            managerName: user.managerId ? userMap.get(user.managerId) || 'Unknown Manager' : null,
            createdAt: user.createdAt,
        }));
        
        return processedUsers;
        
    } catch (e) {
        console.error("Database error during user fetch:", e);
        // Return empty array instead of throwing to prevent app crash
        return [];
    }
}
